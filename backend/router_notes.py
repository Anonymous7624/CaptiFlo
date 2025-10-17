"""
Notes router for SSE streaming of live notes.
"""
import asyncio
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from utils.session import session_manager
from notes import notes_generator

router = APIRouter()

@router.get("/notes")
async def notes_stream(session: str, mode: str = "default"):
    """Stream live notes for a session."""
    
    # Validate mode
    valid_modes = ["Biology", "Mandarin", "Spanish", "English", "Global History", "default"]
    if mode not in valid_modes:
        mode = "default"
    
    async def event_generator():
        last_sent_notes = ""
        last_text_hash = None
        
        try:
            while True:
                # Get session
                session_state = session_manager.get_session(session)
                if not session_state:
                    yield "event: end\ndata: {\"error\": \"Session not found or expired\"}\n\n"
                    break
                
                # Get recent text for notes generation
                recent_text = session_state.get_recent_text(count=20)
                
                if recent_text:
                    # Only generate notes if text has changed significantly
                    current_hash = hash(recent_text)
                    if current_hash != last_text_hash:
                        notes = await notes_generator.get_notes_for_session(
                            session, recent_text, mode
                        )
                        
                        if notes and notes != last_sent_notes:
                            yield f"data: {notes}\n\n"
                            last_sent_notes = notes
                        
                        last_text_hash = current_hash
                
                # Wait 5 seconds before next check
                await asyncio.sleep(5.0)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"Notes generation error: {str(e)}\"}}\n\n"
    
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