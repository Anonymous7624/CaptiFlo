"""
Google Cloud Speech-to-Text v2 client for batch transcription.
"""
import os
import logging
from typing import Optional
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech
from settings import settings

# Initialize Google Cloud Speech client
client = None

def initialize_speech_client():
    """Initialize Google Cloud Speech v2 client."""
    global client
    try:
        client = SpeechClient()
        logging.info("Google Cloud Speech v2 client initialized successfully")
        return client
    except Exception as e:
        logging.error(f"Failed to initialize Google Cloud Speech v2 client: {e}")
        raise

def get_project_id() -> str:
    """Get Google Cloud project ID from environment."""
    project_id = os.environ.get('GOOGLE_CLOUD_PROJECT')
    if not project_id:
        raise ValueError("GOOGLE_CLOUD_PROJECT environment variable must be set")
    return project_id

def get_recognizer_path() -> str:
    """Get the full recognizer path."""
    project_id = get_project_id()
    return f"projects/{project_id}/locations/{settings.GCP_LOCATION}/recognizers/{settings.GCP_RECOGNIZER_ID}"

def create_recognizer_if_not_exists():
    """Create recognizer if it doesn't exist."""
    global client
    if not client:
        client = initialize_speech_client()
    
    try:
        project_id = get_project_id()
        recognizer_path = get_recognizer_path()
        
        # Try to get existing recognizer
        try:
            request = cloud_speech.GetRecognizerRequest(name=recognizer_path)
            recognizer = client.get_recognizer(request=request)
            logging.info(f"Using existing recognizer: {recognizer_path}")
            return recognizer
        except Exception:
            # Recognizer doesn't exist, create it
            logging.info(f"Creating new recognizer: {recognizer_path}")
            
            parent = f"projects/{project_id}/locations/{settings.GCP_LOCATION}"
            
            recognizer_config = cloud_speech.Recognizer(
                default_recognition_config=cloud_speech.RecognitionConfig(
                    language_codes=["en-US"],  # Default language
                    model=settings.GCP_MODEL,
                    auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
                    features=cloud_speech.RecognitionFeatures(
                        enable_automatic_punctuation=True,
                        enable_word_time_offsets=False,
                        enable_word_confidence=False,
                    ),
                )
            )
            
            request = cloud_speech.CreateRecognizerRequest(
                parent=parent,
                recognizer_id=settings.GCP_RECOGNIZER_ID,
                recognizer=recognizer_config,
            )
            
            operation = client.create_recognizer(request=request)
            recognizer = operation.result()  # Wait for operation to complete
            logging.info(f"Created recognizer: {recognizer.name}")
            return recognizer
            
    except Exception as e:
        logging.error(f"Failed to create/get recognizer: {e}")
        raise

def recognize_short(audio_pcm16k_mono_bytes: bytes, language_code: str) -> str:
    """
    Recognize short audio (≤60s, ≤10MB) using Google Cloud Speech v2 synchronous API.
    
    Args:
        audio_pcm16k_mono_bytes: Raw 16kHz mono PCM audio data
        language_code: Language code (e.g., "en-US", "es", "cmn-Hans-CN")
    
    Returns:
        Transcribed text
    
    Raises:
        ValueError: If audio exceeds size/duration limits
        Exception: For other API errors
    """
    global client
    if not client:
        client = initialize_speech_client()
    
    # Enforce size guardrails
    max_size_bytes = 10 * 1024 * 1024  # 10 MB
    if len(audio_pcm16k_mono_bytes) > max_size_bytes:
        raise ValueError(f"Audio size {len(audio_pcm16k_mono_bytes)} bytes exceeds 10 MB limit")
    
    # Estimate duration (16kHz mono s16le = 32,000 bytes per second)
    estimated_duration_seconds = len(audio_pcm16k_mono_bytes) / 32000
    if estimated_duration_seconds > 60:
        raise ValueError(f"Audio duration ~{estimated_duration_seconds:.1f}s exceeds 60s limit")
    
    try:
        recognizer_path = get_recognizer_path()
        
        # Build recognition config with specified language
        config = cloud_speech.RecognitionConfig(
            language_codes=[language_code],
            model=settings.GCP_MODEL,
            auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
            features=cloud_speech.RecognitionFeatures(
                enable_automatic_punctuation=True,
                enable_word_time_offsets=False,
                enable_word_confidence=False,
            ),
        )
        
        # Build request
        request = cloud_speech.RecognizeRequest(
            recognizer=recognizer_path,
            config=config,
            content=audio_pcm16k_mono_bytes,
        )
        
        # Make the request
        response = client.recognize(request=request)
        
        # Extract transcript from results
        transcript_parts = []
        for result in response.results:
            if result.alternatives:
                # Take the first (most confident) alternative
                transcript_parts.append(result.alternatives[0].transcript)
        
        transcript = " ".join(transcript_parts).strip()
        return transcript
        
    except Exception as e:
        logging.error(f"Google Speech v2 recognition failed: {e}")
        raise

def map_language_to_gcp(language_input: str) -> str:
    """Map language input to Google Cloud Speech language code."""
    return settings.GCP_LANGUAGE_MAP.get(language_input, "en-US")

# Initialize client and recognizer on module import
try:
    client = initialize_speech_client()
    # Don't create recognizer on import - do it on first use to avoid startup delays
except Exception as e:
    logging.warning(f"Failed to initialize Google Speech client on import: {e}")
    client = None