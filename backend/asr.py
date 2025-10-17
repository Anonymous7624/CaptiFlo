"""
Audio processing, VAD, and Whisper transcription.
"""
import tempfile
import subprocess
import numpy as np
from faster_whisper import WhisperModel
from settings import settings

# Initialize Whisper model once at module load
model = WhisperModel(settings.WHISPER_MODEL, compute_type=settings.COMPUTE_TYPE)

# Language mapping as specified
LANGUAGE_MAP = {
    "Mandarin": "zh",
    "Spanish": "es",
    "Biology": "en",
    "English": "en", 
    "Global History": "en",
    "auto": None,
    "en": "en",
    "es": "es", 
    "zh": "zh"
}

def webm_to_pcm16(buffer: bytes) -> bytes:
    """
    Decode audio/webm to 16kHz mono s16le PCM using ffmpeg.
    Uses temporary files that are automatically cleaned up.
    """
    if not buffer:
        return b""
    
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as fin, \
         tempfile.NamedTemporaryFile(suffix=".s16", delete=True) as fout:
        
        fin.write(buffer)
        fin.flush()
        
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", fin.name,
            "-ar", "16000",  # 16kHz sample rate
            "-ac", "1",      # mono
            "-f", "s16le",   # signed 16-bit little endian
            fout.name
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return fout.read()
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg decode error: {e}")
            return b""

def apply_vad(pcm16: bytes, sensitivity: int) -> bytes:
    """
    Simple energy-gate VAD without native dependencies.
    
    Args:
        pcm16: Raw 16kHz mono s16le PCM data
        sensitivity: 0=most sensitive (keep more), 3=least sensitive (keep only loud)
    
    Returns:
        Filtered PCM data with silence removed
    """
    if not pcm16:
        return b""
    
    # Clamp sensitivity to valid range
    sensitivity = max(0, min(int(sensitivity), 3))
    
    # Energy thresholds tuned for 16kHz mono s16le
    # Higher values = less sensitive (more filtering)
    thresholds = [150, 300, 500, 800]  # RMS thresholds for 30ms frames
    threshold = thresholds[sensitivity]
    
    # Convert to numpy array
    audio = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32)
    
    if len(audio) == 0:
        return b""
    
    # Frame size: 30ms at 16kHz = 480 samples
    frame_size = 480
    
    # Pad to frame boundary
    pad_length = (-len(audio)) % frame_size
    if pad_length:
        audio = np.pad(audio, (0, pad_length), mode='constant')
    
    # Reshape into frames
    frames = audio.reshape(-1, frame_size)
    
    # Calculate RMS energy per frame
    rms = np.sqrt(np.mean(frames**2, axis=1))
    
    # Keep frames above threshold
    mask = rms >= threshold
    kept_frames = frames[mask]
    
    if len(kept_frames) == 0:
        return b""
    
    # Convert back to bytes
    result = kept_frames.flatten().astype(np.int16).tobytes()
    return result

def map_language(lang_input: str) -> str:
    """Map language input to Whisper language code."""
    return LANGUAGE_MAP.get(lang_input, None)

def transcribe_chunk(pcm16: bytes, language: str = "auto") -> str:
    """
    Transcribe PCM audio chunk using Whisper.
    
    Args:
        pcm16: Raw 16kHz mono s16le PCM data
        language: Language code or "auto" for detection
    
    Returns:
        Transcribed text, empty string if no speech detected
    """
    if not pcm16:
        return ""
    
    try:
        # Convert PCM to float32 normalized audio
        audio = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32) / 32768.0
        
        if len(audio) == 0:
            return ""
        
        # Map language
        whisper_lang = map_language(language)
        
        # Transcribe
        segments, _ = model.transcribe(
            audio,
            language=whisper_lang,
            vad_filter=False,  # We handle VAD ourselves
            word_timestamps=False,
            condition_on_previous_text=False
        )
        
        # Concatenate all segments
        text = "".join(segment.text for segment in segments).strip()
        return text
        
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""
