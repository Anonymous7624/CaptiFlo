# Live Lecture Captions & Notes Backend

Production-quality backend for real-time lecture captioning and note generation. Designed for assistive technology use with privacy and performance in mind.

## Features

- **Live Captions**: Real-time speech-to-text using Whisper
- **Live Notes**: AI-generated bullet points every ~5 seconds using Ollama
- **Multi-language**: English, Spanish, Mandarin Chinese with auto-detection
- **Class-specific**: Optimized prompts for Biology, Mandarin, Spanish, English, Global History
- **Privacy-focused**: No audio storage, in-memory processing only
- **Concurrent Sessions**: Up to 5 simultaneous users with 40-minute TTL
- **Energy-efficient**: Uses Whisper "base" model with int8 quantization

## Quick Start (Windows)

### Prerequisites
- Python 3.8+ installed and in PATH
- FFmpeg installed and in PATH
- Ollama running locally on port 11434

### Installation & Startup

1. **Clone and setup**:
   ```cmd
   git clone <repository>
   cd <repository>
   ```

2. **Run the startup script**:
   ```cmd
   start_server.bat
   ```
   
   Or manually:
   ```cmd
   python -m venv .venv
   .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   cd backend
   ..\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
   ```

3. **Open browser**: Navigate to http://localhost:8080

## API Endpoints

### Health Check
```
GET /health
Response: {"ok": true}
```

### Audio Ingestion
```
POST /ingest?session=<UUID>&lang=<LANG>&vad=<0-3>
Content-Type: audio/webm;codecs=opus
Body: 1-second audio chunks

Parameters:
- session: UUID session identifier
- lang: auto|en|es|zh|Biology|Mandarin|Spanish|English|GlobalHistory
- vad: Voice Activity Detection sensitivity (0=most sensitive, 3=least)

Response: {"ok": true, "partial": "transcribed text"}
```

### Live Captions Stream
```
GET /captions?session=<UUID>
Response: Server-Sent Events stream of transcribed text
```

### Live Notes Stream
```
GET /notes?session=<UUID>&mode=<CLASS>
Parameters:
- mode: Biology|Mandarin|Spanish|English|GlobalHistory|default

Response: Server-Sent Events stream of AI-generated bullet points (every ~5s)
```

## Configuration

### Environment Variables
- `DEV_MODE=true` - Enables CORS for all origins (development only)

### Tunable Constants

**VAD Thresholds** (`asr.py`):
```python
thresholds = [150, 300, 500, 800]  # RMS thresholds for sensitivity levels 0-3
```

**Session Management** (`settings.py`):
```python
MAX_CONCURRENT_SESSIONS = 5    # Maximum simultaneous users
SESSION_MINUTES = 40           # Session timeout in minutes
```

**Notes Generation** (`router_notes.py`):
```python
await asyncio.sleep(5.0)       # Notes generation interval
recent_text = session_state.get_recent_text(count=20)  # Rolling window size
```

**Rate Limiting** (`utils/rate_limit.py`):
```python
RateLimiter(capacity=10.0, refill_rate=2.0)  # 10 requests max, 2/sec refill
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    FastAPI       │    │     Ollama      │
│   (Browser)     │◄──►│    Backend       │◄──►│   (Notes AI)    │
│                 │    │                  │    │                 │
│ • Audio capture │    │ • Session mgmt   │    │ • phi3:mini     │
│ • SSE streams   │    │ • Whisper ASR    │    │ • Class prompts │
│ • Live UI       │    │ • VAD filtering  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────┐
                       │   FFmpeg     │
                       │ (Audio decode)│
                       └──────────────┘
```

## Security & Privacy

- **No Persistence**: No audio files saved to disk (temp files auto-deleted)
- **No Logging**: Audio routes don't log request bodies
- **CORS Protection**: Production locked to https://ldawg7624.com domains
- **No PII**: No personal identifiers stored or transmitted
- **Memory Only**: All processing in RAM, no database

## Performance

- **Small Footprint**: Uses Whisper "base" model with int8 quantization
- **Efficient VAD**: Energy-gate algorithm without native dependencies
- **Streaming**: Real-time SSE for low latency
- **Concurrent**: Handles 5 simultaneous sessions efficiently

## Language Support

| Input | Whisper Code | Supported Classes |
|-------|--------------|-------------------|
| auto  | null (detect)| All               |
| en    | en           | Biology, English, Global History |
| es    | es           | Spanish           |
| zh    | zh           | Mandarin          |

## Troubleshooting

### Common Issues

1. **"FFmpeg not found"**
   - Install FFmpeg and add to Windows PATH
   - Verify: `ffmpeg -version`

2. **"Ollama connection failed"**
   - Start Ollama: `ollama serve`
   - Pull model: `ollama pull phi3:mini`
   - Verify: http://127.0.0.1:11434

3. **"Virtual environment creation failed"**
   - Install: `pip install virtualenv`
   - Or use: `python -m venv .venv`

4. **"Module not found errors"**
   - Ensure using venv Python: `.venv\Scripts\python.exe`
   - Reinstall deps: `.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`

### Performance Tuning

- **Lower latency**: Reduce VAD sensitivity (vad=0)
- **Better accuracy**: Use vad=2 or vad=3 for noisy environments
- **Faster processing**: Switch to Whisper "tiny" model in settings.py
- **More sessions**: Increase MAX_CONCURRENT_SESSIONS (requires more RAM)

## Development

### Project Structure
```
backend/
├── main.py              # FastAPI application
├── settings.py          # Configuration
├── asr.py              # Audio processing & Whisper
├── notes.py            # Ollama integration
├── router_asr.py       # ASR endpoints
├── router_notes.py     # Notes endpoints
├── utils/
│   ├── session.py      # Session management
│   └── rate_limit.py   # Rate limiting
├── public/             # Static frontend files
└── requirements.txt    # Dependencies
```

### Adding New Languages
1. Add language code to `LANGUAGE_MAP` in `asr.py`
2. Add class-specific prompt to `PROMPTS` in `notes.py`
3. Update API documentation

### Custom Prompts
Edit `PROMPTS` dictionary in `notes.py` to customize note generation for different subjects.