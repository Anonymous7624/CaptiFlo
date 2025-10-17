"""
Main FastAPI application for live lecture captioning and notes.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from router_asr import router as asr_router
from router_notes import router as notes_router
from notes import notes_generator
from settings import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    print(f"Starting {settings.APP_NAME}")
    print(f"Max sessions: {settings.MAX_CONCURRENT_SESSIONS}")
    print(f"Session TTL: {settings.SESSION_MINUTES} minutes")
    print(f"Whisper model: {settings.WHISPER_MODEL} ({settings.COMPUTE_TYPE})")
    print(f"CORS origins: {settings.cors_origins}")
    
    yield
    
    # Shutdown
    await notes_generator.close()
    print("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Live lecture captioning and notes generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(asr_router, tags=["ASR"])
app.include_router(notes_router, tags=["Notes"])

# Health check endpoint
@app.get("/health", tags=["Health"])
def health():
    """Health check endpoint."""
    return {"ok": True}

# Favicon handler to keep logs clean
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Return 204 for favicon to keep logs clean."""
    return Response(status_code=204)

# Serve static frontend files
# Create public directory if it doesn't exist
public_dir = os.path.join(os.path.dirname(__file__), "public")
if not os.path.exists(public_dir):
    os.makedirs(public_dir)

# Mount static files - this should be last to catch all remaining routes
app.mount("/", StaticFiles(directory=public_dir, html=True), name="frontend")
