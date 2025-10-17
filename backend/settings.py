from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "CaptionsNotes"
    MAX_CONCURRENT_SESSIONS: int = 5   # cap at 5 users
    SESSION_MINUTES: int = 40          # auto-expire sessions
    CORS_ALLOW_ORIGINS: list[str] = ["*"]
    NOTES_ENABLED: bool = True         # real-time notes engine toggle
    WHISPER_MODEL: str = "base"        # "tiny" (faster) or "base" (better)
    COMPUTE_TYPE: str = "int8"         # faster-whisper compute type
    LOG_LEVEL: str = "warning"         # uvicorn log level

settings = Settings()
