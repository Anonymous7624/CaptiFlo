from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from router_asr import router as asr_router
from router_notes import router as notes_router  # keep if you’ve added notes

app = FastAPI(title="CaptionsNotes", docs_url=None, redoc_url=None)

# CORS — tighten to your domains when you’re done testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# APIs
app.include_router(asr_router)
app.include_router(notes_router)

# Serve built frontend from ./public (index.html at /)
app.mount("/", StaticFiles(directory="public", html=True), name="frontend")

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)
