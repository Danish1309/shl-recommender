"""
Vector Store Module
Manages ChromaDB collection for SHL assessment retrieval.
Uses sentence-transformers for embedding assessment documents.
"""

import logging
from typing import Optional

import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger(__name__)

COLLECTION_NAME = "shl_assessments"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Fast, good quality, 384 dims

# Global client and collection (initialized once)
_client: Optional[chromadb.Client] = None
_collection = None
_catalog: Optional[list[dict]] = None  # keep original catalog in memory


def _build_document(item: dict) -> str:
    """
    Build a rich text document for embedding.
    Packs name, test type, and description together for semantic search.
    """
    parts = [
        f"Assessment: {item['name']}",
        f"Type: {item.get('test_type_label', item.get('test_type', ''))}",
    ]
    if item.get("duration"):
        parts.append(f"Duration: {item['duration']}")
    if item.get("languages"):
        langs = item["languages"]
        # Truncate long language lists for embedding
        if len(langs) > 200:
            langs = langs[:200] + "..."
        parts.append(f"Languages: {langs}")
    if item.get("job_levels"):
        parts.append(f"Job Levels: {item['job_levels']}")
    if item.get("description"):
        parts.append(item["description"])
    return "\n".join(parts)


def init_vector_store(catalog: list[dict]) -> None:
    """
    Initialize ChromaDB in-memory and index all catalog items.
    Called once at startup.
    """
    global _client, _collection, _catalog

    _catalog = catalog

    # Use in-memory ChromaDB (no persistence needed - rebuilt on each startup)
    _client = chromadb.Client()

    # Use sentence-transformers for embeddings
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL
    )

    _collection = _client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

    # Build documents and index in batch
    documents = []
    ids = []
    metadatas = []

    for i, item in enumerate(catalog):
        doc = _build_document(item)
        documents.append(doc)
        ids.append(f"item_{i}")
        metadatas.append({
            "name": item["name"],
            "url": item["url"],
            "test_type": item.get("test_type", ""),
            "test_type_label": item.get("test_type_label", ""),
            "duration": item.get("duration", ""),
            "languages": item.get("languages", "")[:500],  # metadata size limit
        })

    _collection.add(documents=documents, ids=ids, metadatas=metadatas)
    logger.info(f"Vector store initialized with {len(catalog)} assessments")


def retrieve(query: str, n_results: int = 15) -> list[dict]:
    """
    Retrieve the top-n most relevant assessments for a query.
    Returns list of assessment dicts with all catalog fields.
    """
    if _collection is None:
        raise RuntimeError("Vector store not initialized. Call init_vector_store first.")

    results = _collection.query(
        query_texts=[query],
        n_results=min(n_results, len(_catalog)),
    )

    # Reconstruct full items from metadatas + original catalog
    retrieved = []
    ids = results["ids"][0]
    metadatas = results["metadatas"][0]

    for item_id, meta in zip(ids, metadatas):
        # Get full item from catalog by index
        idx = int(item_id.split("_")[1])
        full_item = _catalog[idx]
        retrieved.append(full_item)

    return retrieved


def get_catalog() -> list[dict]:
    """Return the full in-memory catalog."""
    return _catalog or []


def is_initialized() -> bool:
    return _collection is not None
