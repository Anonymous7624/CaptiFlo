"""
ASR router for audio ingestion and caption streaming.
"""
import asyncio
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from utils.session import session_manager
from utils.rate_limit import rate_limiter
from asr import webm_to_pcm16, apply_vad, transcribe_chunk

router = APIRouter()

@router.post("/ingest")
async def ingest(request: Request, session: str, lang: str = "auto", vad: int = 1):
    """
    Ingest audio chunks for transcription.
    
    Args:
        session: UUID session identifier
        lang: Language (auto, en, es, zh, or class names)
        vad: VAD sensitivity level (0-3)
    """
    
    # Rate limiting per session
    if not rate_limiter.is_allowed(session, tokens=1.0):
        raise HTTPException(status_code=429, detail="Rate limit exceeded for session")
    
    # Get or create session
    session_state = session_manager.get_or_create_session(session)
    if not session_state:
        raise HTTPException(
            status_code=429, 
            detail="At capacity (5 sessions). Try later."
        )
    
    # Get audio data
    audio_buffer = await request.body()
    if not audio_buffer:
        return JSONResponse({"ok": False, "error": "No audio data"})
    
    try:
        # Decode audio
        pcm_data = webm_to_pcm16(audio_buffer)
        if not pcm_data:
            return JSONResponse({"ok": True, "partial": ""})
        
        # Apply VAD filtering
        filtered_pcm = apply_vad(pcm_data, vad)
        if not filtered_pcm:
            return JSONResponse({"ok": True, "partial": ""})
        
        # Transcribe
        text = transcribe_chunk(filtered_pcm, lang)
        
        # Update session with new text
        if text:
            session_state.add_text(text)
        
        return JSONResponse({"ok": True, "partial": text})
        
    except Exception as e:
        print(f"Ingest error for session {session}: {e}")
        raise HTTPException(status_code=400, detail=f"Processing error: {str(e)}")

@router.get("/captions")
async def captions(session: str):
    """
    Stream live captions via SSE.
    
    Args:
        session: UUID session identifier
    """
    
    async def event_generator():
        last_sent_text = ""
        
        try:
            while True:
                # Get session state
                session_state = session_manager.get_session(session)
                if not session_state:
                    yield "event: end\ndata: {\"error\": \"Session not found or expired\"}\n\n"
                    break
                
                # Check for new text
                current_text = session_state.last_text
                if current_text and current_text != last_sent_text:
                    yield f"data: {current_text}\n\n"
                    last_sent_text = current_text
                
                # Wait before next check
                await asyncio.sleep(0.4)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"Caption stream error: {str(e)}\"}}\n\n"
    
    return EventSourceResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )
