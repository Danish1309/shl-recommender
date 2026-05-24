"""
Vector Store Module
Uses ChromaDB with default embedding function (no sentence-transformers)
to stay within Render free tier 512MB memory limit.
"""

import logging
from typing import Optional

import chromadb

logger = logging.getLogger(__name__)

COLLECTION_NAME = "shl_assessments"

_client: Optional[chromadb.Client] = None
_collection = None
_catalog: Optional[list[dict]] = None


def _build_document(item: dict) -> str:
    parts = [
        f"Assessment: {item['name']}",
        f"Type: {item.get('test_type_label', item.get('test_type', ''))}",
    ]
    if item.get("duration"):
        parts.append(f"Duration: {item['duration']}")
    if item.get("languages"):
        parts.append(f"Languages: {item['languages'][:200]}")
    if item.get("job_levels"):
        parts.append(f"Job Levels: {item['job_levels']}")
    if item.get("description"):
        parts.append(item["description"])
    return "\n".join(parts)


def init_vector_store(catalog: list[dict]) -> None:
    global _client, _collection, _catalog

    _catalog = catalog
    _client = chromadb.Client()

    # Use ChromaDB default embedding (no external model download)
    _collection = _client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

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
            "languages": item.get("languages", "")[:500],
        })

    _collection.add(documents=documents, ids=ids, metadatas=metadatas)
    logger.info(f"Vector store initialized with {len(catalog)} assessments")


def retrieve(query: str, n_results: int = 15) -> list[dict]:
    if _collection is None:
        raise RuntimeError("Vector store not initialized.")

    results = _collection.query(
        query_texts=[query],
        n_results=min(n_results, len(_catalog)),
    )

    retrieved = []
    ids = results["ids"][0]

    for item_id in ids:
        idx = int(item_id.split("_")[1])
        retrieved.append(_catalog[idx])

    return retrieved


def get_catalog() -> list[dict]:
    return _catalog or []


def is_initialized() -> bool:
    return _collection is not None
