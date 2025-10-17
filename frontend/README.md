# Live Captions & Notes Frontend

A clean React/Vite frontend for real-time live captions and intelligent note-taking.

## Features

- **Class Selection**: Choose from Biology, Mandarin, Spanish, English, or Global History
- **Mic Sensitivity Control**: Adjustable VAD (Voice Activity Detection) levels 0-3
- **Real-time Captions**: Large, readable text display with history
- **Live Notes**: Bullet-point notes generated every ~5 seconds
- **Dark Theme**: Modern, high-contrast UI optimized for readability
- **Mobile Responsive**: Stacks notes under captions on narrow screens
- **Copy Functionality**: One-click copy of all notes to clipboard
- **Error Handling**: Toast notifications for capacity limits and mic issues
- **Persistence**: Remembers your last class and sensitivity settings

## Tech Stack

- React 18
- Vite 5
- Pure CSS (no UI library dependencies)
- Server-Sent Events (SSE) for real-time updates
- MediaRecorder API with WebM/Opus encoding

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Build Output

The build outputs to `frontend/dist/` and includes:
- `index.html` - Main HTML file
- `assets/` - Bundled CSS and JS files

## API Integration

The frontend connects to these backend endpoints:
- `POST /ingest` - Send audio chunks
- `GET /captions` - SSE stream for live captions
- `GET /notes` - SSE stream for live notes

## Browser Requirements

- Modern browser with MediaRecorder API support
- Microphone access permission
- JavaScript enabled