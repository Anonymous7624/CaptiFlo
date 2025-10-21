from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    APP_NAME: str = "CaptionsNotes"
    MAX_CONCURRENT_SESSIONS: int = 1
    SESSION_MINUTES: int = 40
    
    # CORS settings - production vs dev
    ALLOWED_ORIGINS: List[str] = [
        "https://ldawg7624.com",
        "https://www.ldawg7624.com",
        "http://localhost:5173"  # for dev
    ]
    
    # Transcription engine settings
    TRANSCRIBE_ENGINE: str = "google_stt_v2"  # "whisper" or "google_stt_v2"
    
    # Whisper settings (kept for fallback)
    WHISPER_MODEL: str = "large-v3"
    WHISPER_DEVICE: str = "auto"  # auto|cuda|cpu
    WHISPER_COMPUTE_TYPE_CUDA: str = "float16"
    WHISPER_COMPUTE_TYPE_CPU: str = "int8"
    
    # Google Cloud Speech-to-Text v2 settings
    GCP_LOCATION: str = "global"  # or a region like "us-central1"
    GCP_RECOGNIZER_ID: str = "capiflow-default"
    GCP_MODEL: str = "short"  # use "short" for ≤60s; later we can try "chirp" or "long"
    GCP_LANGUAGE_MAP: dict = {
        "Mandarin": "cmn-Hans-CN",
        "Spanish": "es",
        "English": "en-US",
        "Biology": "en-US",
        "Global History": "en-US",
    }
    
    # Ollama settings
    NOTES_MODEL: str = "phi3:mini"
    OLLAMA_URL: str = "http://127.0.0.1:11434/api/generate"
    
    # Logging
    LOG_LEVEL: str = "warning"
    
    # Dev mode detection
    DEV_MODE: bool = os.getenv("DEV_MODE", "false").lower() == "true"
    
    # FFmpeg settings
    FFMPEG_BIN: str = "ffmpeg"
    
    # Session management
    INACTIVE_SECS: int = 90
    KEEPALIVE_SECS: int = 10
    
    # Raw PCM ingest fallback
    ALLOW_RAW_INGEST: bool = True
    
    @property
    def cors_origins(self) -> List[str]:
        if self.DEV_MODE:
            return ["*"]
        return self.ALLOWED_ORIGINS
    
    class Config:
        env_file = ".env"

settings = Settings()
