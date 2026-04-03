from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

from routers import session, transcript, qa, auth
from ml.model_cache import ModelCache
from auth import get_current_user

load_dotenv()

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.2)

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute", "10/second"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model_cache = ModelCache()
    print("Model cache initialized.")
    yield
    print("Shutting down.")

app = FastAPI(title="FocusFlow API", version="1.0.0", lifespan=lifespan)

if os.getenv("ENV", "dev").lower() == "prod":
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(SlowAPIMiddleware)
app.state.limiter = limiter

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler wiring
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please retry later."},
    )

app.add_middleware(SentryAsgiMiddleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(transcript.router, prefix="/transcript", tags=["transcript"])
app.include_router(qa.router, prefix="/qa", tags=["qa"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "FocusFlow API"}

from ml.rag import _session_stores
@app.get("/debug/rag/{session_id}")
def debug_rag(session_id: str):
    store = _session_stores.get(session_id)
    if not store:
        return {"status": "not_found", "total_sessions": list(_session_stores.keys())}
    return {
        "status": "found",
        "ntotal": store["index"].ntotal,
        "sentences": store["sentences"],
        "timestamps": store["timestamps"],
    }
