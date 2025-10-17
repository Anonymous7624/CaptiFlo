import React, { useState, useRef, useEffect } from 'react';
import CaptionsPanel from './components/CaptionsPanel';
import NotesPanel from './components/NotesPanel';
import { ApiClient, LANGUAGE_MAP, generateSessionId } from './lib/api';

// Toast notification component
const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: bgColor,
      color: '#ffffff',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      maxWidth: '300px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            marginLeft: '12px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

function App() {
  // State management
  const [selectedClass, setSelectedClass] = useState(() => 
    localStorage.getItem('selectedClass') || 'Biology'
  );
  const [micSensitivity, setMicSensitivity] = useState(() => 
    parseInt(localStorage.getItem('micSensitivity')) || 2
  );
  const [isRecording, setIsRecording] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const apiClientRef = useRef(new ApiClient());

  // Class options
  const classOptions = ['Biology', 'Mandarin', 'Spanish', 'English', 'Global History'];

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('selectedClass', selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem('micSensitivity', micSensitivity.toString());
  }, [micSensitivity]);

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Generate new session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);

      // Get user media with enhanced audio settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with opus codec
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle audio data
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            const response = await apiClientRef.current.sendAudioBlob(
              event.data,
              newSessionId,
              LANGUAGE_MAP[selectedClass],
              micSensitivity
            );
            
            // Check for specific error responses
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              if (errorData.error === 'ffmpeg_missing') {
                showToast('Server needs FFmpeg installed. Please contact administrator.', 'error');
                stopRecording();
              } else if (errorData.error === 'capacity') {
                showToast(errorData.detail || 'At capacity (5 sessions)', 'error');
                stopRecording();
              } else if (errorData.error === 'decode_failed') {
                showToast('Audio format not supported', 'error');
              } else {
                showToast('Unable to send audio data', 'error');
              }
              return;
            }
          } catch (error) {
            console.error('Failed to send audio:', error);
            if (error.message.includes('At capacity')) {
              showToast(error.message, 'error');
              stopRecording();
            } else {
              showToast('Failed to send audio data', 'error');
            }
          }
        }
      };

      // Start recording with 1-second intervals
      mediaRecorder.start(1000);

      // Start SSE streams
      apiClientRef.current.startCaptionsStream(
        newSessionId,
        (data) => {
          if (data.text) {
            setCaptions(prev => [...prev, data.text]);
          }
        },
        (error) => {
          console.error('Captions stream error:', error);
          showToast('Captions connection lost', 'error');
        }
      );

      apiClientRef.current.startNotesStream(
        newSessionId,
        selectedClass,
        (data) => {
          if (data.note) {
            setNotes(prev => [...prev, data.note]);
          }
        },
        (error) => {
          console.error('Notes stream error:', error);
          showToast('Notes connection lost', 'error');
        }
      );

      setIsRecording(true);
      setCaptions([]);
      setNotes([]);
      showToast('Recording started', 'success');

    } catch (error) {
      console.error('Failed to start recording:', error);
      if (error.name === 'NotAllowedError') {
        showToast('Microphone permission denied. Please allow microphone access and try again.', 'error');
      } else if (error.name === 'NotFoundError') {
        showToast('No microphone found. Please connect a microphone and try again.', 'error');
      } else {
        showToast('Failed to start recording. Please check your microphone settings.', 'error');
      }
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close all SSE streams
    apiClientRef.current.closeAllStreams();

    // End session to free up capacity immediately
    if (sessionId) {
      await apiClientRef.current.endSession(sessionId);
    }

    setIsRecording(false);
    setSessionId(null);
    showToast('Recording stopped', 'info');
  };

  // Handle copy notes
  const handleCopyNotes = (message) => {
    showToast(message, 'success');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b0f1a',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main container */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header */}
        <header style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Live Captions & Notes
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#9ca3af',
            margin: 0
          }}>
            Real-time transcription and intelligent note-taking
          </p>
        </header>

        {/* Controls */}
        <div style={{
          backgroundColor: '#1a1f2e',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid #2d3748'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            alignItems: 'end'
          }}>
            {/* Class selector */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#e5e7eb',
                marginBottom: '8px'
              }}>
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isRecording}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: '#374151',
                  color: '#ffffff',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  opacity: isRecording ? 0.6 : 1
                }}
              >
                {classOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Mic sensitivity */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#e5e7eb',
                marginBottom: '8px'
              }}>
                Mic Sensitivity: {micSensitivity}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                value={micSensitivity}
                onChange={(e) => setMicSensitivity(parseInt(e.target.value))}
                disabled={isRecording}
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#374151',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  opacity: isRecording ? 0.6 : 1
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#9ca3af',
                marginTop: '4px'
              }}>
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Start/Stop button */}
            <div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: isRecording ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = isRecording ? '#dc2626' : '#059669';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = isRecording ? '#ef4444' : '#10b981';
                }}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="main-content" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px'
        }}>
          {/* Captions panel */}
          <CaptionsPanel captions={captions} isRecording={isRecording} />

          {/* Notes panel */}
          <NotesPanel notes={notes} onCopy={handleCopyNotes} />
        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          marginTop: '40px',
          padding: '20px 0',
          borderTop: '1px solid #2d3748',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            Live Captions & Notes • Built with React & Vite
          </p>
        </footer>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Responsive design */
        @media (min-width: 768px) {
          .main-content {
            grid-template-columns: 2fr 1fr !important;
          }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1a1f2e;
        }

        ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
}

export default App;