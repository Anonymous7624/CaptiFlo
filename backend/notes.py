"""
Ollama integration for live note generation.
"""
import asyncio
import httpx
from typing import Dict, Optional
from settings import settings

# Class-specific prompts for different lecture types
PROMPTS = {
    "Biology": """Based on this biology lecture transcript, create concise bullet points covering key concepts, processes, and terminology. Focus on:
- Main biological processes or systems discussed
- Key terminology and definitions
- Important relationships or mechanisms
- Any examples or case studies mentioned

Transcript: {text}

Generate 2-4 concise bullet points:""",

    "Mandarin": """Based on this Mandarin language lesson transcript, create concise bullet points covering:
- New vocabulary words and their meanings
- Grammar patterns or structures introduced
- Cultural context or usage notes
- Pronunciation or tone information if mentioned

Transcript: {text}

Generate 2-4 concise bullet points:""",

    "Spanish": """Based on this Spanish language lesson transcript, create concise bullet points covering:
- New vocabulary and phrases
- Grammar rules or conjugations discussed
- Cultural context or regional variations
- Practice exercises or examples mentioned

Transcript: {text}

Generate 2-4 concise bullet points:""",

    "English": """Based on this English class transcript, create concise bullet points covering:
- Literary devices, themes, or analysis discussed
- Writing techniques or grammar concepts
- Key readings or texts mentioned
- Important assignments or deadlines

Transcript: {text}

Generate 2-4 concise bullet points:""",

    "Global History": """Based on this global history lecture transcript, create concise bullet points covering:
- Historical events, dates, and key figures
- Cause and effect relationships
- Geographic regions or civilizations discussed
- Important themes or patterns in history

Transcript: {text}

Generate 2-4 concise bullet points:""",

    "default": """Based on this lecture transcript, create concise bullet points covering the main topics, key concepts, and important information discussed.

Transcript: {text}

Generate 2-4 concise bullet points:"""
}

class NotesGenerator:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.last_notes_cache: Dict[str, str] = {}
    
    async def generate_notes(self, text: str, mode: str = "default") -> Optional[str]:
        """Generate notes from text using Ollama."""
        if not text.strip():
            return None
        
        # Get appropriate prompt
        prompt_template = PROMPTS.get(mode, PROMPTS["default"])
        prompt = prompt_template.format(text=text)
        
        try:
            payload = {
                "model": settings.NOTES_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "max_tokens": 200
                }
            }
            
            response = await self.client.post(
                settings.OLLAMA_URL,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                notes = result.get("response", "").strip()
                return notes if notes else None
            else:
                print(f"Ollama error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Notes generation error: {e}")
            return None
    
    async def get_notes_for_session(self, session_id: str, text: str, mode: str = "default") -> Optional[str]:
        """Generate notes and cache to avoid duplicates."""
        if not text:
            return None
        
        # Check if we already generated notes for this exact text
        cache_key = f"{session_id}:{mode}:{hash(text)}"
        if cache_key in self.last_notes_cache:
            return self.last_notes_cache[cache_key]
        
        notes = await self.generate_notes(text, mode)
        if notes:
            self.last_notes_cache[cache_key] = notes
            # Keep cache size manageable
            if len(self.last_notes_cache) > 100:
                # Remove oldest entries
                old_keys = list(self.last_notes_cache.keys())[:-50]
                for key in old_keys:
                    del self.last_notes_cache[key]
        
        return notes
    
    async def close(self):
        """Clean up HTTP client."""
        await self.client.aclose()

# Global notes generator instance
notes_generator = NotesGenerator()