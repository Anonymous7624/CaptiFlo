from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
import asyncio
from asr import sessions, SessionState, enforce_session_limits, webm_to_pcm16, apply_vad, transcribe_chunk

router = APIRouter()

@router.post("/ingest")
async def ingest(request: Request, session: str, lang: str="auto", vad: int=1):
    if session not in sessions:
        if not enforce_session_limits():
            raise HTTPException(status_code=429, detail="At capacity (5 sessions). Try later.")
        sessions[session] = SessionState()
    buf = await request.body()
    if not buf:
        return JSONResponse({"ok": False, "msg": "no audio"})
    try:
        pcm = webm_to_pcm16(buf)
        pcm = apply_vad(pcm, int(vad))
        sessions[session].audio_pcm += pcm
        text = transcribe_chunk(pcm, lang)
        if text:
            sessions[session].last_text = text
            sessions[session].roll_text.append(text)
        return JSONResponse({"ok": True, "partial": text})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"decode/transcribe error: {e}")

@router.get("/captions")
async def captions(session: str):
    async def eventgen():
        last_sent = ""
        while True:
            if session not in sessions:
                yield "event: end\ndata: {}\n\n"; break
            text = sessions[session].last_text
            if text and text != last_sent:
                yield f"data: {text}\n\n"
                last_sent = text
            await asyncio.sleep(0.4)
    return EventSourceResponse(eventgen(), media_type="text/event-stream")
