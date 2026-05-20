# SHL Assessment Recommender — Approach Document

**Candidate:** AI Intern Assignment | **Stack:** FastAPI · ChromaDB · Groq (Llama 3.3) · Next.js

---

## 1. Architecture

```
User ──► Next.js Frontend
              │  POST /chat (full history)
              ▼
         FastAPI Backend
         ┌──────────────────────────────┐
         │  1. Build search query       │
         │     (last 3 user turns)      │
         │  2. ChromaDB retrieval       │
         │     → top-15 assessments     │
         │  3. Single LLM call (Groq)   │
         │     + context + history      │
         │  4. Parse + validate JSON    │
         │  5. URL whitelist filter     │
         └──────────────────────────────┘
              │
         Structured JSON Response
         { reply, recommendations[], end_of_conversation }
```

**Key principle: simplicity over sophistication.** One retrieval call, one LLM call, one response. No agents, no multi-step pipelines, no state server-side — the full conversation history arrives in every request.

---

## 2. Data & Retrieval

**Catalog ingestion:** The SHL catalog listing page is JavaScript-rendered, so `requests` alone cannot enumerate it. Strategy: ship a `catalog_seed.json` (55 manually-verified individual test solutions with names, URLs, test-type codes, durations, languages, and rich descriptions), with a live scraper that fetches individual product detail pages (which ARE server-rendered) as a supplement.

**Embedding:** `all-MiniLM-L6-v2` via `sentence-transformers`. Each document encodes name + test-type label + description + languages + job levels into a single dense string — giving the embedder enough signal to match "graduate finance" → `Financial Accounting (New)` or "safety critical industrial" → `Manufac. & Indust. Safety & Dependability 8.0`.

**ChromaDB** runs in-memory (rebuilt at startup from the catalog). No persistence needed — seed data fits in RAM in under 2 seconds.

**Retrieval strategy:** Query = concatenation of the last 3 user messages (capped at 500 chars). Retrieve top-15 candidates and pass all to the LLM. Top-15 is the sweet spot: high enough recall, small enough to fit in context without noise. Cosine similarity on normalized embeddings.

**Recall@10 optimization:** Rich descriptions use domain vocabulary (e.g., "JVM internals, concurrency, microservices" for Java Advanced; "safety-critical, procedure compliance, OSHA" for WH&S) so that diverse natural-language queries hit the right documents. Multi-type tests (K,S) are documented with both angles.

---

## 3. Prompting Strategy

**Single system prompt** containing: role definition, 6 behavioral rules, catalog context (top-15 retrieved items), and 6 few-shot examples covering all conversation types (vague → clarify, enough context → recommend, refinement, comparison, off-topic refusal, confirmation).

**JSON mode enforced** via `response_format: {"type": "json_object"}` (Groq). Temperature 0.1 for determinism. Max 1500 tokens keeps latency under 5 seconds.

**Hallucination prevention (two layers):**
1. *Prompt layer:* "NEVER invent URLs or assessment names. ALL recommendations must come from the CATALOG CONTEXT below." The LLM only sees retrieved items, not the full catalog.
2. *Post-processing layer:* After parsing the LLM response, every URL is validated against a whitelist of catalog URLs. Any hallucinated URL is either matched by name to find the real URL, or dropped silently.

**Conversation behavior encoded in the prompt:**
- `recommendations: []` when clarifying, comparing, or refusing
- `end_of_conversation: true` only on explicit user confirmation
- Refinements update the shortlist in-place (not restart)

---

## 4. Frontend

Minimal Next.js 14 (App Router) + Tailwind CSS. No state management library — `useState` is sufficient for a stateless chat. Three key components: `MessageBubble` (user/assistant messages), `RecommendationCard` (clickable assessment cards with type badges, open in new tab), `TypingIndicator` (three-dot animation while awaiting response). Example prompts shown on first load for recruiter demos.

---

## 5. Evaluation Strategy

Tested against all 10 public conversation traces:
- **Schema compliance:** Pydantic `ChatResponse` model validates every response at the API boundary — wrong schema = 422 error caught immediately.
- **Recall@10:** Spot-checked final shortlists against expected assessments in each trace. Key finding: retrieval query must include all prior user turns, not just the last one, to capture refinements.
- **Behavior probes:** Tested vague query (→ no recs), off-topic (→ refusal), legal question (→ refusal), confirmation (→ `end_of_conversation: true`), refinement (→ updated shortlist).
- **Hallucination probes:** Attempted to elicit invented URLs; URL whitelist catches and drops any that slip through.

---

## 6. Tradeoffs & What Didn't Work

| Decision | Tradeoff |
|---|---|
| In-memory ChromaDB | Fast startup, no persistence cost; loses data on restart (acceptable — seed rebuilds in 2s) |
| Single LLM call | Simple and fast; a separate intent-classifier would improve precision but doubles latency |
| Groq / Llama 3.3-70B | Free, fast (~1-2s); less reliable JSON than GPT-4o but `json_object` mode fixes most failures |
| Seed catalog vs. live scrape | Guaranteed data quality; misses new products between refreshes |

**What failed initially:** Sending only the last user message as the retrieval query caused refinements (e.g., "add Docker") to retrieve Docker-related items without context of the existing shortlist. Fix: concatenate last 3 user messages for the query.

**What improved Recall@10:** Adding job-level vocabulary and use-case descriptions to each catalog document. "Graduate financial analyst" now reliably retrieves `Financial Accounting (New)` and `Basic Statistics (New)` that would be missed with name-only embeddings.

---

## 7. Deployment

- **Backend:** Render free tier. `uvicorn main:app --host 0.0.0.0 --port $PORT`. Startup ~30s (model download on first cold start).
- **Frontend:** Vercel. Set `NEXT_PUBLIC_API_URL` env var to the Render service URL.
- **AI tools used:** Claude assisted with boilerplate generation; all architecture decisions, prompt design, and evaluation were made and verified manually.
