from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from router_asr import router as asr_router

app = FastAPI(title="CaptionsNotes")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

app.include_router(asr_router)

@app.get("/", response_class=HTMLResponse)
def index():
    return """<!doctype html>
<html><head><meta charset="utf-8"><title>CaptionsNotes</title></head>
<body style="font-family:system-ui;padding:24px;">
<h1>Captions & Notes API</h1>
<p>Server is running.</p>
<p>Health check: <a href="/health">/health</a></p>
</body></html>"""

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)
