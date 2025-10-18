"""
Notes router for SSE streaming of live notes.
"""
import asyncio
import time
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from utils.session import session_manager
from notes import notes_generator
from settings import settings

router = APIRouter()

@router.get("/notes")
async def notes_stream(session: str, mode: str = "default", grade: int = 9):
    """Stream live notes for a session."""
    
    # Validate mode
    valid_modes = ["Biology", "Mandarin", "Spanish", "English", "Global History", "default"]
    if mode not in valid_modes:
        mode = "default"
    
    # Validate grade
    if grade < 6 or grade > 12:
        grade = 9
    
    async def event_generator():
        last_sent_notes = ""
        last_text_hash = None
        last_keepalive = time.time()
        
        try:
            while True:
                # Get session
                session_state = session_manager.get_session(session)
                if not session_state:
                    # Close stream cleanly without sending error frame
                    break
                
                # Touch session to mark it as active
                session_manager.touch_session(session)
                
                # Get text from last 10 seconds for notes generation
                recent_text = session_state.get_text_from_last_seconds(seconds=10)
                has_new_data = False
                
                if recent_text:
                    # Only generate notes if text has changed significantly
                    current_hash = hash(recent_text)
                    if current_hash != last_text_hash:
                        notes = await notes_generator.get_notes_for_session(
                            session, recent_text, mode, grade
                        )
                        
                        if notes and notes != last_sent_notes:
                            import json
                            data = json.dumps({"note": notes})
                            yield f"data: {data}\n\n"
                            last_sent_notes = notes
                            last_keepalive = time.time()
                            has_new_data = True
                        
                        last_text_hash = current_hash
                
                # Send keepalive if no new data and it's been too long
                if not has_new_data and (time.time() - last_keepalive) >= settings.KEEPALIVE_SECS:
                    yield ":keepalive\n\n"
                    last_keepalive = time.time()
                
                # Wait 10 seconds before next check (to match 10-second window)
                await asyncio.sleep(10.0)
                
        except asyncio.CancelledError:
            # Client disconnected
            pass
        except Exception as e:
            # Log error but don't send error frame to client
            print(f"Notes generation error: {e}")
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