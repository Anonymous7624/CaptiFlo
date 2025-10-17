"""
In-memory session store with TTL and capacity management.
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
class SessionState:
    session_id: str
    start_ts: float = field(default_factory=time.time)
    last_text: str = ""
    rolling_text: List[str] = field(default_factory=list)
    last_activity: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    
    def add_text(self, text: str, max_rolling: int = 20):
        """Add text to rolling buffer, keeping only recent entries."""
        if text:
            self.last_text = text
            self.rolling_text.append(text)
            if len(self.rolling_text) > max_rolling:
                self.rolling_text = self.rolling_text[-max_rolling:]
            self.last_activity = time.time()
            self.last_seen = time.time()
    
    def get_recent_text(self, count: int = 20) -> str:
        """Get recent text entries joined together."""
        recent = self.rolling_text[-count:] if self.rolling_text else []
        return " ".join(recent)
    
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
    
    def cleanup_expired(self):
        """Remove expired sessions."""
        expired_ids = [
            session_id for session_id, session in self.sessions.items()
            if session.is_expired()
        ]
        for session_id in expired_ids:
            del self.sessions[session_id]
        return len(expired_ids)
    
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
        """Run garbage collection - remove expired and inactive sessions."""
        expired_count = self.cleanup_expired()
        inactive_count = self.cleanup_inactive()
        return expired_count + inactive_count
    
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
        """Remove a specific session."""
        self.sessions.pop(session_id, None)
    
    def get_active_count(self) -> int:
        """Get count of active sessions."""
        self.gc()  # Clean up expired and inactive sessions
        return len(self.sessions)
    
    def touch_session(self, session_id: str):
        """Update last_seen for a session."""
        session = self.sessions.get(session_id)
        if session:
            session.touch()

# Global session manager instance
session_manager = SessionManager()