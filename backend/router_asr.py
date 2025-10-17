"""
ASR router for audio ingestion and caption streaming.
"""
import asyncio
import subprocess
import time
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from utils.session import session_manager
from utils.rate_limit import rate_limiter
from asr import webm_to_pcm16, apply_vad, transcribe_chunk
from settings import settings

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
        return JSONResponse(
            status_code=429,
            content={"error": "rate_limit", "detail": "Rate limit exceeded for session"}
        )
    
    # Get or create session
    session_state = session_manager.get_or_create_session(session)
    if not session_state:
        return JSONResponse(
            status_code=429,
            content={"error": "capacity", "detail": f"At capacity ({settings.MAX_CONCURRENT_SESSIONS} sessions)"}
        )
    
    # Check Content-Type (be flexible)
    content_type = request.headers.get("content-type", "").lower()
    allowed_types = ["audio/webm", "audio/ogg", "application/octet-stream"]
    if content_type and not any(ct in content_type for ct in allowed_types):
        return JSONResponse(
            status_code=400,
            content={"error": "invalid_content_type", "detail": f"Content-Type must be one of: {', '.join(allowed_types)}"}
        )
    
    # Get audio data
    audio_buffer = await request.body()
    if not audio_buffer:
        return JSONResponse(
            status_code=400,
            content={"error": "no_audio"}
        )
    
    try:
        # Decode audio
        pcm_data = webm_to_pcm16(audio_buffer)
        if not pcm_data:
            # Touch session even for empty results
            session_manager.touch_session(session)
            return JSONResponse({"ok": True, "partial": ""})
        
        # Apply VAD filtering
        filtered_pcm = apply_vad(pcm_data, vad)
        if not filtered_pcm:
            # Touch session even for filtered out audio
            session_manager.touch_session(session)
            return JSONResponse({"ok": True, "partial": ""})
        
        # Transcribe
        text = transcribe_chunk(filtered_pcm, lang)
        
        # Update session with new text (this also touches the session)
        if text:
            session_state.add_text(text)
        else:
            # Touch session even if no text was transcribed
            session_manager.touch_session(session)
        
        return JSONResponse({"ok": True, "partial": text})
        
    except FileNotFoundError as e:
        if "ffmpeg_missing" in str(e):
            return JSONResponse(
                status_code=503,
                content={"error": "ffmpeg_missing", "detail": "FFmpeg not found on server"}
            )
        raise
    except subprocess.CalledProcessError as e:
        return JSONResponse(
            status_code=400,
            content={"error": "decode_failed", "detail": str(e)[:200]}
        )
    except Exception as e:
        print(f"Ingest error for session {session}: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "detail": f"Processing error: {str(e)[:200]}"}
        )

@router.post("/end")
async def end_session(session: str):
    """
    End a session explicitly, freeing up capacity.
    
    Args:
        session: UUID session identifier
    """
    session_manager.remove_session(session)
    return JSONResponse({"ok": True, "message": "Session ended"})

@router.delete("/session")
async def delete_session(session: str):
    """
    Delete a session explicitly, freeing up capacity.
    
    Args:
        session: UUID session identifier
    """
    session_manager.remove_session(session)
    return JSONResponse({"ok": True, "message": "Session deleted"})

@router.get("/captions")
async def captions(session: str):
    """
    Stream live captions via SSE with keepalive for Cloudflare compatibility.
    
    Args:
        session: UUID session identifier
    """
    
    async def event_generator():
        last_sent_text = ""
        last_keepalive = time.time()
        
        try:
            while True:
                # Get session state
                session_state = session_manager.get_session(session)
                if not session_state:
                    yield "event: end\ndata: {\"error\": \"Session not found or expired\"}\n\n"
                    break
                
                # Touch session to mark it as active
                session_manager.touch_session(session)
                
                # Check for new text
                current_text = session_state.last_text
                has_new_data = False
                
                if current_text and current_text != last_sent_text:
                    yield f"data: {current_text}\n\n"
                    last_sent_text = current_text
                    last_keepalive = time.time()
                    has_new_data = True
                
                # Send keepalive if no new data and it's been too long
                if not has_new_data and (time.time() - last_keepalive) >= settings.KEEPALIVE_SECS:
                    yield ":keepalive\n\n"
                    last_keepalive = time.time()
                
                # Wait before next check
                await asyncio.sleep(0.4)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
        except Exception as e:
            try:
                yield f"event: error\ndata: {{\"error\": \"Caption stream error: {str(e)}\"}}\n\n"
            except:
                pass  # Stream already closed
    
    return EventSourceResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )
