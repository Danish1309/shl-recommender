"""
SHL Assessment Recommender - FastAPI Application
Exposes /health and /chat endpoints.
Initializes vector store on startup.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # Load environmental variables from .env file

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

import vector_store
from agent import chat
from scraper import get_catalog

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Startup: load catalog and init vector store
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up SHL Recommender...")
    try:
        catalog = get_catalog(force_scrape=False)
        vector_store.init_vector_store(catalog)
        logger.info(f"Ready with {len(catalog)} assessments in vector store")
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    yield
    logger.info("Shutting down...")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SHL Assessment Recommender",
    description="Conversational agent for recommending SHL assessments",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow all origins for demo/evaluation
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class Message(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ("user", "assistant"):
            raise ValueError("role must be 'user' or 'assistant'")
        return v


class ChatRequest(BaseModel):
    messages: list[Message]

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, v):
        if not v:
            raise ValueError("messages cannot be empty")
        if len(v) > 20:
            raise ValueError("Too many messages (max 20)")
        return v


class Recommendation(BaseModel):
    name: str
    url: str
    test_type: str


class ChatResponse(BaseModel):
    reply: str
    recommendations: list[Recommendation]
    end_of_conversation: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Readiness check."""
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Stateless conversational endpoint.
    Full conversation history must be sent on each call.
    """
    if not vector_store.is_initialized():
        raise HTTPException(status_code=503, detail="Service not ready")

    # Convert Pydantic models to dicts for agent
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    # Call agent
    result = chat(messages)

    return ChatResponse(
        reply=result["reply"],
        recommendations=[
            Recommendation(**rec) for rec in result["recommendations"]
        ],
        end_of_conversation=result["end_of_conversation"],
    )
