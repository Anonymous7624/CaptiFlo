"""
Audio processing, VAD, and Whisper transcription.
"""
import tempfile
import subprocess
import numpy as np
import shutil
import logging
from faster_whisper import WhisperModel
from settings import settings

# Initialize Whisper model once at module load
model = WhisperModel(settings.WHISPER_MODEL, compute_type=settings.COMPUTE_TYPE)

def find_ffmpeg() -> str:
    """
    Find FFmpeg binary and verify it exists.
    Returns the path to FFmpeg or raises an exception if not found.
    """
    ffmpeg_path = shutil.which(settings.FFMPEG_BIN)
    if not ffmpeg_path:
        error_msg = f"FFmpeg not found in PATH. Please install FFmpeg or set FFMPEG_BIN environment variable. Current FFMPEG_BIN: {settings.FFMPEG_BIN}"
        logging.error(error_msg)
        raise FileNotFoundError(error_msg)
    return ffmpeg_path

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
    Raises specific exceptions for different failure modes.
    """
    if not buffer:
        return b""
    
    # Verify FFmpeg is available
    try:
        ffmpeg_path = find_ffmpeg()
    except FileNotFoundError as e:
        raise FileNotFoundError("ffmpeg_missing") from e
    
    fin = None
    fout = None
    try:
        fin = tempfile.NamedTemporaryFile(suffix=".webm", delete=False)
        fout = tempfile.NamedTemporaryFile(suffix=".s16", delete=False)
        
        # Write input data and close handle (Windows requirement)
        fin.write(buffer)
        fin.close()
        fout.close()
        
        cmd = [
            ffmpeg_path, "-hide_banner", "-loglevel", "error",
            "-i", fin.name,
            "-ar", "16000",  # 16kHz sample rate
            "-ac", "1",      # mono
            "-f", "s16le",   # signed 16-bit little endian
            fout.name
        ]
        
        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            # Read the output file
            with open(fout.name, 'rb') as f:
                return f.read()
        except FileNotFoundError as e:
            raise FileNotFoundError("ffmpeg_missing") from e
        except subprocess.CalledProcessError as e:
            error_detail = f"FFmpeg decode failed: {e.stderr[:200] if e.stderr else str(e)}"
            raise subprocess.CalledProcessError(e.returncode, e.cmd, error_detail) from e
            
    finally:
        # Clean up temp files
        import os
        if fin and os.path.exists(fin.name):
            os.unlink(fin.name)
        if fout and os.path.exists(fout.name):
            os.unlink(fout.name)

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
