import time
import os

print(f"--- [STARTUP] Initializing FocusFlow API at {time.ctime()} ---")
start_time = time.time()

from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
print(f"--- [STARTUP] Core FastAPI imports done in {time.time() - start_time:.2f}s")

now = time.time()
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
print(f"--- [STARTUP] SlowAPI imports done in {time.time() - now:.2f}s")

now = time.time()
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
print(f"--- [STARTUP] Sentry imports done in {time.time() - now:.2f}s")

now = time.time()
from routers import session, transcript, qa, auth
print(f"--- [STARTUP] Routers imported in {time.time() - now:.2f}s")

now = time.time()
from ml.model_cache import ModelCache
print(f"--- [STARTUP] ModelCache imported in {time.time() - now:.2f}s")

from auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.2)

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute", "10/second"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"--- [LIFESPAN] Initializing app state at {time.ctime()} ---")
    now = time.time()
    app.state.model_cache = ModelCache()
    print(f"--- [LIFESPAN] Model cache initialized in {time.time() - now:.2f}s")
    yield
    print("--- [LIFESPAN] Shutting down. ---")

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
