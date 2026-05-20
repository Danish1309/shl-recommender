# SHL Assessment Recommender

A conversational AI agent that helps recruiters and HR managers discover, search, and shortlist SHL assessments from the product catalog.

---

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=nextdotjs)](https://nextjs.org)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5.23-orange)](https://www.trychroma.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- Add screenshot here -->

---

## Features

- **Semantic Assessment Search**: Leverages dense embeddings and a ChromaDB vector store to semantically match natural language recruiter queries (e.g., "senior Java developer" or "safety-critical operations") directly to the relevant test catalog.
- **Intelligent Conversational Agent**: Guides recruiters step-by-step by asking focused clarifying questions for vague queries, refining the shortlist in-place, and comparing assessment properties.
- **Strict Output Compliance**: Utilizes Pydantic boundary models to guarantee that all API responses match the specified JSON schema structure (`reply`, `recommendations`, `end_of_conversation`).
- **Hallucination Protection**: Employs a URL whitelist filter to check every recommended product link, matching them only with verified URLs from the official catalog.
- **Multi-Type Assessment Support**: Gracefully parses and displays Knowledge, Personality, Ability, Situational Judgment, and Simulation assessments.

---

## How It Works

### ASCII Flow Diagram

```
User ──► Next.js Frontend ──► POST /chat (full history) ──► FastAPI Backend
                                                                    │
     ┌──────────────────────────────────────────────────────────────┘
     ▼
   1. Extract last 3 user turns ──► 2. Generate Dense Embedding (all-MiniLM-L6-v2)
                                                 │
     ┌───────────────────────────────────────────┘
     ▼
   3. Query in-memory ChromaDB ──► 4. Retrieve top-15 assessments
                                                │
     ┌──────────────────────────────────────────┘
     ▼
   5. Inject Context into Prompt ──► 6. Single LLM Call (Groq Llama 3.3 / Gemini fallback)
                                                 │
     ┌───────────────────────────────────────────┘
     ▼
   7. Parse JSON + Validate URLs ──► Return ChatResponse (reply, recommendations, end)
```

### Process Step-by-Step

1. **Stateless Request**: The user enters a query in the Next.js frontend, which immediately posts the entire, raw message history to the backend `/chat` endpoint.
2. **Context Synthesis**: The backend extracts and concatenates the last 3 user turns to capture the current intent alongside recent refinements.
3. **Dense Embedding**: The query text is encoded into a 384-dimensional vector using the `all-MiniLM-L6-v2` transformer.
4. **Vector Similarity Search**: ChromaDB performs a cosine-similarity query against the pre-indexed catalog to fetch the top 15 most relevant assessments.
5. **Contextual Prompting**: The retrieved assessments and the full conversation history are injected into a structured system prompt.
6. **Single-Turn Inference**: A single deterministic call is made to Groq (fallback to Gemini) with JSON schema requirements enforced.
7. **Strict Sanitation**: The response is parsed, and any recommended URLs are matched against a strict whitelisted set of official catalog URLs before returning to the user.

---

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Backend** | FastAPI, Uvicorn, Pydantic | Lightweight web framework, ASGI server, and validation boundary. |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, TypeScript | Premium, dark-themed responsive UI. |
| **AI / Vector Store** | ChromaDB, Sentence-Transformers, Groq / Gemini | Vector database, embedding generation (`all-MiniLM-L6-v2`), and LLMs. |
| **Deployment** | Render, Vercel | Seamless container deployment and static frontend hosting. |

---

## Project Structure

```
shl-recommender/
├── backend/
│   ├── .env.example             # Example configuration file for backend environment variables
│   ├── agent.py                 # Chat agent core logic, prompting, and LLM call handling
│   ├── catalog_cache.json       # Ingested catalog cache to bypass slow web scraping during startup
│   ├── catalog_seed.json        # Manually curated database of 55 SHL assessments used as initial seed data
│   ├── main.py                  # Entrypoint for the FastAPI application exposing endpoints and lifespan setup
│   ├── render.yaml              # Configuration file for deployment on Render
│   ├── requirements.txt         # List of Python backend dependencies
│   ├── scraper.py               # SHL product catalog web scraper with fallback to seed data
│   └── vector_store.py          # Vector store manager for ChromaDB embeddings and retrieval
├── frontend/
│   ├── app/
│   │   ├── globals.css          # Global CSS containing Tailwind rules and theme tokens
│   │   ├── layout.tsx           # Main application root layout wrapping pages
│   │   └── page.tsx             # Interactive chatbot UI home page using react hooks
│   ├── components/
│   │   ├── MessageBubble.tsx    # Visual component rendering user and assistant chat bubbles
│   │   ├── RecommendationCard.tsx # Component representing a recommended assessment with test type badges
│   │   └── TypingIndicator.tsx  # Interactive three-dot loading spinner during API requests
│   ├── lib/
│   │   ├── api.ts               # API service client utilizing fetch for communication with the backend
│   │   └── types.ts             # TypeScript interface definitions for API responses and component props
│   ├── next.config.js           # Configuration file for Next.js options
│   ├── package.json             # Manifest file containing frontend scripts and package dependencies
│   ├── postcss.config.js        # PostCSS configuration for styling and autoprefixer
│   ├── tailwind.config.js       # Tailwind CSS configuration specifying design system details
│   └── vercel.json              # Configuration file for Vercel deployment
├── APPROACH.md                  # Comprehensive document outlining architecture, data retrieval, and evaluation
├── README.md                    # This master documentation file
└── test_agent.py                # Core testing script containing unit tests and e2e integration tests
```

---

## Quick Start — Local Setup

### Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.11+**
- **Node.js 18+** & **npm 9+**
- A valid **Groq API Key** (and optionally **Gemini API Key**)

### Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Copy the example environment file and open it to fill in your API key:
   ```bash
   cp .env.example .env
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Launch the Uvicorn local server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
5. Verify that the server is healthy by hitting [http://localhost:8000/health](http://localhost:8000/health). You should see `{"status":"ok"}`.

### Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Set up the development API URL variable:
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
   ```
3. Install frontend node modules:
   ```bash
   npm install
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Environment Variables

| Variable | Target File | Source / Value | Description |
|---|---|---|---|
| `GROQ_API_KEY` | `backend/.env` | [console.groq.com](https://console.groq.com) | Primary API Key used to query Llama-3.3-70b. |
| `GEMINI_API_KEY` | `backend/.env` | [aistudio.google.com](https://aistudio.google.com) | Optional fallback API Key for Gemini-1.5-flash. |
| `PORT` | `backend/.env` | `8000` (default) | Port to bind the FastAPI backend server. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8000` | Frontend target base URL for API requests. |

---

## API Reference

### Health Check

`GET /health`

**Example Response:**
```json
{
  "status": "ok"
}
```

### Chat Completion

`POST /chat`

**Example Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I need to hire a senior Java backend engineer with Spring Boot and AWS experience"
    }
  ]
}
```

**Example Response:**
```json
{
  "reply": "For a senior Java backend engineer with Spring Boot and AWS experience, here are the recommended assessments:",
  "recommendations": [
    {
      "name": "Core Java (Advanced Level) (New)",
      "url": "https://www.shl.com/products/product-catalog/view/core-java-advanced-level-new/",
      "test_type": "K"
    },
    {
      "name": "Spring (New)",
      "url": "https://www.shl.com/products/product-catalog/view/spring-new/",
      "test_type": "K"
    },
    {
      "name": "Amazon Web Services (AWS) Development (New)",
      "url": "https://www.shl.com/products/product-catalog/view/amazon-web-services-aws-development-new/",
      "test_type": "K"
    },
    {
      "name": "SHL Verify Interactive G+",
      "url": "https://www.shl.com/products/product-catalog/view/shl-verify-interactive-g/",
      "test_type": "A"
    }
  ],
  "end_of_conversation": false
}
```

### Schema Rules
- `recommendations` is empty (`[]`) when the agent is clarifying parameters, comparing solutions, refusing out-of-scope/legal requests, or when confirmation is completed.
- `end_of_conversation` is set to `true` if and only if the user explicitly registers final confirmation (e.g., "Perfect", "Confirmed").

---

## Conversation Behaviors

| Behavior | What Agent Does |
|---|---|
| **Vague Query** | Asks exactly ONE focused clarifying question to gather target roles/domain. Returns `recommendations=[]`. |
| **Sufficient Context** | Pulls 1–10 exact matches from vector context, returning them alongside descriptions and links. |
| **User Refinement** | Receives feedback (e.g., "add personality tests") and modifies the active shortlist in-place. |
| **Comparison** | Formulates a strict, factual textual breakdown between two tests without recommending new items. |
| **Out-of-Scope / Legal** | Politely refuses to give legal, general HR, or scripting advice. Returns `recommendations=[]`. |
| **Confirmation** | Solidifies the candidate list, ending the conversation by setting `end_of_conversation=true`. |

---

## Test Type Reference

| Code | Label | Description |
|---|---|---|
| **A** | Ability & Aptitude | Measures cognitive power, numerical, deductive, and inductive reasoning. |
| **B** | Situational Judgment | Measures work-context decision making, professional judgment, and value alignment. |
| **C** | Competencies | Self-reported skills assessing universal framework competencies. |
| **D** | Development & 360 | Personalized development feedback planning and skills gap metrics. |
| **E** | Assessment Exercises | Interactive offline/online work sample evaluation tasks. |
| **K** | Knowledge & Skills | Specific technical/domain knowledge (e.g., Spring Boot, SQL, medical terms). |
| **P** | Personality & Behavior | Behavioral characteristics and personality dynamics (e.g., OPQ32r). |
| **S** | Simulations | Practical, hands-on tools (e.g., Excel/Word simulation, Spoken English). |

---

## Deployment

### Backend to Render

1. Log into **Render** and link your GitHub repository.
2. Select **New +** > **Web Service**.
3. Choose the `Docker` environment, or deploy natively using:
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables in the setup dashboard:
   - `GROQ_API_KEY` = `<your-groq-key>`
   - `GEMINI_API_KEY` = `<your-gemini-key>` (optional)
5. Select **Deploy Web Service**.

### Frontend to Vercel

1. Log into **Vercel** and select **Add New** > **Project**.
2. Select your repository, pointing the root directory to the `frontend` subfolder.
3. Configure the build settings (Framework: Next.js) and add the environment variable:
   - `NEXT_PUBLIC_API_URL` = `<your-render-deployment-url>` *(must have no trailing slash)*
4. Select **Deploy**.

---

## Running Tests

### Unit Tests
Run standard unit tests validating model schemas, query compilers, and seed loading (requires no active API keys):
```bash
python test_agent.py
```

### Integration & E2E Tests
Run full behavioral tests against a live backend server checking vague responses, Refusals, and Conversational traces:
```bash
$env:BACKEND_URL="http://localhost:8000"
python test_agent.py --e2e
```

---

## Key Design Decisions

1. **In-Memory Vector Database**: Utilizes ChromaDB in-memory. Since the primary catalog is small (55+ items), this delivers extremely fast search latencies, keeps startup under 2 seconds, and costs zero persistent server side database overhead.
2. **Concatenated Search Memory**: Combines the last 3 user turns for context searches rather than just the last turn. This ensures that incremental adjustments (e.g. "add Docker") are evaluated correctly within context.
3. **Strict Whitelist Post-Filtering**: Hard-validates any recommended URL against a verified catalog whitelist at the API boundary, dropping or correcting any hallucinated links generated by the LLM.
4. **Stateless Architecture**: Leverages single-turn history passing. Complete message histories are sent on each POST, removing server-side session constraints.
5. **Caching Fallback Strategy**: Employs an instant cached load from `catalog_cache.json` (seeded from `catalog_seed.json`) on startup, preventing slow scraping overhead from causing timeout errors on server boot.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| **Render cold start takes 30s** | Render free tier containers spin down after 15 minutes of quiet time. | Implement a health check ping routine or upgrade to the starter tier to ensure permanent uptime. |
| **`GROQ_API_KEY` not found** | `.env` was placed in the project root instead of inside the `backend/` folder. | Move the `.env` file into the `backend/` subdirectory. Ensure `load_dotenv` is executed inside `main.py`. |
| **Frontend API Error** | `NEXT_PUBLIC_API_URL` was saved with a trailing slash (e.g. `http://localhost:8000/`). | Remove the trailing slash from `NEXT_PUBLIC_API_URL` in `.env.local` so it is exactly `http://localhost:8000`. |
| **Port 8000 already in use** | A prior uvicorn execution is still listening on port 8000 in the background. | Execute `Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force` (or `kill -9 $(lsof -t -i:8000)` on Unix). |

---

## Built With

- [FastAPI](https://fastapi.tiangolo.com) - High-performance Python web framework.
- [Next.js](https://nextjs.org) - React framework for frontend development.
- [ChromaDB](https://www.trychroma.com) - Open-source AI embedding vector database.
- [Groq Cloud](https://groq.com) - Ultra-fast inference API engine.
- [Tailwind CSS](https://tailwindcss.com) - Utility-first styling framework.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) or the MIT standard details for full rights.
