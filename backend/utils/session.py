"""
In-memory session store with TTL, capacity management, and queuing.
"""
import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import sys
import os
# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from settings import settings
except ImportError:
    from settings_fallback import settings

@dataclass
class QueueItem:
    client_id: str
    enqueued_at: float = field(default_factory=time.time)
    
    def is_expired(self, timeout_secs: int = 90) -> bool:
        """Check if queue item has expired (to avoid ghost entries)."""
        return (time.time() - self.enqueued_at) > timeout_secs

@dataclass
class SessionState:
    session_id: str
    start_ts: float = field(default_factory=time.time)
    last_text: str = ""
    rolling_text: List[str] = field(default_factory=list)
    text_timestamps: List[float] = field(default_factory=list)  # Track when each text was added
    last_activity: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    
    def add_text(self, text: str, max_rolling: int = 20):
        """Add text to rolling buffer, keeping only recent entries."""
        if text:
            current_time = time.time()
            self.last_text = text
            self.rolling_text.append(text)
            self.text_timestamps.append(current_time)
            
            # Keep only recent entries
            if len(self.rolling_text) > max_rolling:
                self.rolling_text = self.rolling_text[-max_rolling:]
                self.text_timestamps = self.text_timestamps[-max_rolling:]
            
            self.last_activity = current_time
            self.last_seen = current_time
    
    def get_recent_text(self, count: int = 20) -> str:
        """Get recent text entries joined together."""
        recent = self.rolling_text[-count:] if self.rolling_text else []
        return " ".join(recent)
    
    def get_text_from_last_seconds(self, seconds: int = 10) -> str:
        """Get text from the last N seconds."""
        if not self.rolling_text or not self.text_timestamps:
            return ""
        
        current_time = time.time()
        cutoff_time = current_time - seconds
        
        # Find text entries from the last N seconds
        recent_text = []
        for i, timestamp in enumerate(self.text_timestamps):
            if timestamp >= cutoff_time:
                recent_text.append(self.rolling_text[i])
        
        return " ".join(recent_text)
    
    def is_expired(self) -> bool:
        """Check if session has exceeded TTL."""
        return (time.time() - self.start_ts) > (settings.SESSION_MINUTES * 60)
    
    def is_inactive(self) -> bool:
        """Check if session has been inactive for too long."""
        return (time.time() - self.last_seen) > settings.INACTIVE_SECS
    
    def touch(self):
        """Update last_seen timestamp."""
        self.last_seen = time.time()

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, SessionState] = {}
        self.queue: List[QueueItem] = []
    
    def cleanup_expired(self):
        """Remove expired sessions."""
        expired_ids = [
            session_id for session_id, session in self.sessions.items()
            if session.is_expired()
        ]
        for session_id in expired_ids:
            del self.sessions[session_id]
        return len(expired_ids)
    
    def cleanup_queue(self):
        """Remove expired queue items."""
        initial_size = len(self.queue)
        self.queue = [item for item in self.queue if not item.is_expired()]
        return initial_size - len(self.queue)
    
    def cleanup_inactive(self):
        """Remove inactive sessions (garbage collection)."""
        inactive_ids = [
            session_id for session_id, session in self.sessions.items()
            if session.is_inactive()
        ]
        for session_id in inactive_ids:
            del self.sessions[session_id]
        return len(inactive_ids)
    
    def gc(self):
        """Run garbage collection - remove expired and inactive sessions and queue items."""
        expired_count = self.cleanup_expired()
        inactive_count = self.cleanup_inactive()
        queue_cleaned = self.cleanup_queue()
        return expired_count + inactive_count + queue_cleaned
    
    def can_create_session(self) -> bool:
        """Check if we can create a new session (under capacity)."""
        self.gc()  # Clean up expired and inactive sessions first
        return len(self.sessions) < settings.MAX_CONCURRENT_SESSIONS
    
    def get_or_create_session(self, session_id: str) -> Optional[SessionState]:
        """Get existing session or create new one if capacity allows."""
        if session_id in self.sessions:
            return self.sessions[session_id]
        
        if not self.can_create_session():
            return None
        
        session = SessionState(session_id=session_id)
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get existing session, None if not found or expired."""
        self.gc()  # Clean up expired and inactive sessions
        return self.sessions.get(session_id)
    
    def remove_session(self, session_id: str):
        """Remove a specific session and promote next in queue."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            # Promote next client from queue
            promoted_client = self.promote_next_in_queue()
            if promoted_client:
                print(f"Promoted client {promoted_client} from queue to active session")
    
    def get_active_count(self) -> int:
        """Get count of active sessions."""
        self.gc()  # Clean up expired and inactive sessions
        return len(self.sessions)
    
    def touch_session(self, session_id: str):
        """Update last_seen for a session."""
        session = self.sessions.get(session_id)
        if session:
            session.touch()
    
    def reserve_session(self, client_id: str) -> dict:
        """
        Reserve a session or add to queue.
        Returns: {"status": "active"} or {"status": "queued", "position": N, "size": Q}
        """
        self.gc()  # Clean up first
        
        # Check if client already has an active session
        if client_id in self.sessions:
            return {"status": "active"}
        
        # Check if client is already in queue
        for i, item in enumerate(self.queue):
            if item.client_id == client_id:
                return {
                    "status": "queued", 
                    "position": i + 1, 
                    "size": len(self.queue)
                }
        
        # Check if we have capacity
        if len(self.sessions) < settings.MAX_CONCURRENT_SESSIONS:
            # Create session immediately
            session = SessionState(session_id=client_id)
            self.sessions[client_id] = session
            return {"status": "active"}
        
        # Add to queue
        queue_item = QueueItem(client_id=client_id)
        self.queue.append(queue_item)
        return {
            "status": "queued", 
            "position": len(self.queue), 
            "size": len(self.queue)
        }
    
    def get_queue_status(self, client_id: str) -> dict:
        """
        Get queue status for a client.
        Returns: {"status": "active"} or {"status": "queued", "position": N, "size": Q} or {"status": "none"}
        """
        self.gc()  # Clean up first
        
        # Check if client has active session
        if client_id in self.sessions:
            return {"status": "active"}
        
        # Check if client is in queue
        for i, item in enumerate(self.queue):
            if item.client_id == client_id:
                return {
                    "status": "queued", 
                    "position": i + 1, 
                    "size": len(self.queue)
                }
        
        return {"status": "none"}
    
    def promote_next_in_queue(self):
        """Promote next client from queue to active session."""
        self.gc()  # Clean up first
        
        if not self.queue:
            return None
        
        # Get next client from queue
        next_item = self.queue.pop(0)
        client_id = next_item.client_id
        
        # Create session for them
        session = SessionState(session_id=client_id)
        self.sessions[client_id] = session
        
        return client_id

# Global session manager instance
session_manager = SessionManager()