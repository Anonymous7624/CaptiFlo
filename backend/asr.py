import asyncio, tempfile, subprocess, time
import numpy as np
from faster_whisper import WhisperModel

# Load whisper once
model = WhisperModel("base", compute_type="int8")

class SessionState:
    def __init__(self):
        self.audio_pcm = b""
        self.last_text = ""
        self.start_ts = time.time()
        self.roll_text = []  # optional rolling transcript

sessions = {}

def enforce_session_limits(max_sessions=5, max_minutes=40):
    now = time.time()
    expired = [k for k,v in sessions.items() if (now - v.start_ts) > max_minutes*60]
    for k in expired:
        sessions.pop(k, None)
    return len(sessions) < max_sessions

def webm_to_pcm16(buffer: bytes) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as fin, \
         tempfile.NamedTemporaryFile(suffix=".s16", delete=True) as fout:
        fin.write(buffer); fin.flush()
        cmd = ["ffmpeg","-hide_banner","-loglevel","error","-i",fin.name,
               "-ar","16000","-ac","1","-f","s16le",fout.name]
        subprocess.run(cmd, check=True)
        return fout.read()

def apply_vad(pcm16: bytes, level: int) -> bytes:
    """
    Simple energy-gate VAD (no C++ build). Sensitivity: 0=most sensitive (keep more), 3=least (keep only loud).
    """
    if not pcm16: return b""
    level = int(level) if str(level).isdigit() else 1
    level = max(0, min(level, 3))
    # thresholds tuned roughly for 16k mono s16le
    thresholds = [200, 350, 600, 900]  # RMS per 30ms
    thr = thresholds[level]

    frame_size = 480 * 2  # 30ms @16kHz * 2 bytes
    out = bytearray()
    a = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32)
    # pad to frame boundary
    pad = (-len(a)) % 480
    if pad: a = np.pad(a, (0,pad))
    frames = a.reshape(-1,480)
    rms = np.sqrt(np.mean(frames**2, axis=1))
    mask = rms >= thr
    kept = frames[mask].astype(np.int16).tobytes()
    out.extend(kept)
    return bytes(out)

def transcribe_chunk(pcm16: bytes, language: str = "auto") -> str:
    if not pcm16: return ""
    audio = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32) / 32768.0
    segments, _ = model.transcribe(
        audio,
        language=None if language=="auto" else language,
        vad_filter=False  # we're already gating
    )
    text = "".join(seg.text for seg in segments).strip()
    return text
