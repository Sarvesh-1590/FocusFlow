from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ml.embeddings import embed_single, load_embedding_model
from ml.rag import retrieve
from services.ollama_client import answer_question

router = APIRouter()

class QARequest(BaseModel):
    session_id: str
    question: str

@router.post("/ask")
async def ask_question(req: QARequest):
    """Answer a user question using RAG over the live transcript."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    embedder = load_embedding_model()
    query_embedding = embed_single(req.question, embedder)
    context_chunks = retrieve(req.session_id, query_embedding, top_k=6)

    if not context_chunks:
        return {
            "answer": "I don't have enough context from the meeting to answer that yet.",
            "sources": [],
        }

    answer = answer_question(req.question, context_chunks)
    return {"answer": answer, "sources": context_chunks}
