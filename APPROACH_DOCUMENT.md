# SHL Assessment Recommender — Approach Document
## SHL Labs AI Intern Assignment

### 1. OVERVIEW
The system recommends SHL assessments based on natural language queries from recruiters. It takes full conversation history as input and returns a structured JSON response. A core constraint is the stateless design, enforcing strict JSON schema and no hallucinated URLs.

### 2. ARCHITECTURE
The system follows a stateless design where the frontend posts full history per request. The FastAPI backend makes a single LLM call per turn using an in-memory ChromaDB rebuilt at startup.

User → Frontend → POST /chat → FastAPI → ChromaDB retrieval → LLM (Groq) → JSON parse → URL validation → Response

### 3. RETRIEVAL SETUP
- Model: all-MiniLM-L6-v2 via sentence-transformers
- Database: ChromaDB in-memory, cosine similarity
- Catalog: 55 SHL individual test solutions in catalog_seed.json
- Document structure: name + test-type + duration + languages + job-levels + description
- Query: concatenation of last 3 user messages (capped 500 chars)
- Retrieval: top-15 candidates passed as context to LLM
- Why top-15: high enough recall, small enough to avoid context noise
- Recall improvement: added domain vocabulary to descriptions

### 4. PROMPT DESIGN
- Single system prompt containing role definition, 6 behavior rules, context, and examples
- Few-shot examples cover vague queries, context, refinements, comparisons, and refusals
- JSON mode enforced via response_format json_object (Groq)
- Temperature 0.1 for determinism
- Behavior: recommendations=[] when clarifying, comparing, or refusing
- Behavior: end_of_conversation=true only on explicit user confirmation
- Behavior: refinements update shortlist in place, not restart

### 5. HALLUCINATION PREVENTION
Layer 1 — Prompt: LLM is instructed to only use names and URLs from the retrieved context.
Layer 2 — Post-processing: every URL is checked against a whitelist of 55 catalog URLs.
Any URL not in the whitelist is matched by assessment name or silently dropped.
Result: impossible for a hallucinated URL to reach the response.

### 6. EVALUATION APPROACH
- Schema compliance validated by Pydantic ChatResponse at the API boundary
- Vague query → no recommendations, clarifying question returned
- Enough context → correct assessments recommended
- Refinement → shortlist updated, not restarted
- Comparison → informative reply, empty recommendations
- Off-topic/legal → refused with empty recommendations
- Confirmation → end_of_conversation set to true
- Recall@10 verified by matching final shortlists against expected assessments

### 7. WHAT DIDN'T WORK + HOW IT IMPROVED
Issue 1: Single message queries caused refinements to lose existing shortlist context. Fix: concatenate last 3 user messages for query to improve refinement accuracy.
Issue 2: Name-only embeddings caused misses for domain-specific queries. Fix: added rich domain vocabulary to each assessment description to improve recall.
Issue 3: Groq occasionally returned JSON with invented assessment names. Fix: added name-matching fallback in URL validator to recover real URLs.

### 8. AI TOOLS USED
Agentic coding assistant (Claude) used for:
- Boilerplate generation (FastAPI structure, Pydantic models, Next.js components)
- First-draft prompt template which was then manually refined
All architecture decisions, retrieval strategy, and evaluations were made manually.
