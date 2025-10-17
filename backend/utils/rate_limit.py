"""
Simple token bucket rate limiter per session.
"""
import time
from typing import Dict
from dataclasses import dataclass

@dataclass
class TokenBucket:
    capacity: float
    tokens: float
    refill_rate: float  # tokens per second
    last_refill: float
    
    def refill(self):
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
    
    def consume(self, tokens: float = 1.0) -> bool:
        """Try to consume tokens. Returns True if successful."""
        self.refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

class RateLimiter:
    def __init__(self, capacity: float = 10.0, refill_rate: float = 2.0):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.buckets: Dict[str, TokenBucket] = {}
    
    def is_allowed(self, session_id: str, tokens: float = 1.0) -> bool:
        """Check if request is allowed for session."""
        if session_id not in self.buckets:
            self.buckets[session_id] = TokenBucket(
                capacity=self.capacity,
                tokens=self.capacity,
                refill_rate=self.refill_rate,
                last_refill=time.time()
            )
        
        return self.buckets[session_id].consume(tokens)
    
    def cleanup_old_buckets(self, max_age: float = 3600):
        """Remove buckets that haven't been used recently."""
        now = time.time()
        old_sessions = [
            session_id for session_id, bucket in self.buckets.items()
            if (now - bucket.last_refill) > max_age
        ]
        for session_id in old_sessions:
            del self.buckets[session_id]

# Global rate limiter - allows 10 requests per session with 2/sec refill
rate_limiter = RateLimiter(capacity=10.0, refill_rate=2.0)