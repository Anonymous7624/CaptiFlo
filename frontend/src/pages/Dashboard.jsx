import React, { useState, useRef, useEffect } from 'react';
import Controls from '../components/Controls';
import CaptionsPanel from '../components/CaptionsPanel';
import Banner from '../components/Banner';
import Toast from '../components/Toast';
import { ApiClient, LANGUAGE_MAP, generateSessionId } from '../lib/api';
import { AudioRecorder } from '../lib/audio';

function Dashboard() {
  // State management
  const [selectedClass, setSelectedClass] = useState(() => 
    localStorage.getItem('selectedClass') || 'Biology'
  );
  const [micSensitivity, setMicSensitivity] = useState(() => 
    parseInt(localStorage.getItem('micSensitivity')) || 2
  );
  const [isRecording, setIsRecording] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [sessionId, setSessionId] = useState(() => 
    sessionStorage.getItem('sessionId') || null
  );
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    captions: false,
    notes: false
  });

  // Refs
  const apiClientRef = useRef(new ApiClient());
  const audioRecorderRef = useRef(null);

  // Class options
  const classOptions = ['Biology', 'Mandarin', 'Spanish', 'English', 'Global History'];

  // Persist settings
  useEffect(() => {
    localStorage.setItem('selectedClass', selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem('micSensitivity', micSensitivity.toString());
  }, [micSensitivity]);

  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem('sessionId', sessionId);
    } else {
      sessionStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  // Show banner
  const showBanner = (message, type = 'error') => {
    setBanner({ message, type });
  };

  // Clear banner
  const clearBanner = () => {
    setBanner(null);
  };

  // Show toast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Start recording
  const startRecording = async () => {
    try {
      clearBanner();
      
      // Generate new session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);

      // Create audio recorder
      const audioRecorder = new AudioRecorder();
      audioRecorderRef.current = audioRecorder;

      // Start recording
      await audioRecorder.start({
        onDataAvailable: async (audioBlob) => {
          try {
            const response = await apiClientRef.current.sendAudioBlob(
              audioBlob,
              newSessionId,
              LANGUAGE_MAP[selectedClass],
              micSensitivity
            );
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              if (errorData.error === 'ffmpeg_missing') {
                showBanner('Server needs FFmpeg installed.', 'error');
                stopRecording();
              } else if (errorData.error === 'capacity') {
                showBanner('At capacity (5 sessions). Try later.', 'error');
                stopRecording();
              } else {
                console.error('Audio upload failed:', response.status);
              }
            }
          } catch (error) {
            console.error('Failed to send audio:', error);
          }
        },
        onError: (error) => {
          console.error('Audio recording error:', error);
          if (error.name === 'NotAllowedError') {
            showBanner('Microphone access denied.', 'error');
          } else if (error.name === 'NotFoundError') {
            showBanner('No microphone found.', 'error');
          } else {
            showBanner('Failed to start recording.', 'error');
          }
          stopRecording();
        }
      });

      // Start SSE streams
      apiClientRef.current.startCaptionsStream(
        newSessionId,
        (data) => {
          if (data.text) {
            setCaptions(prev => [...prev, data.text]);
          }
          setConnectionStatus(prev => ({ ...prev, captions: true }));
        },
        (error) => {
          console.error('Captions stream error:', error);
          setConnectionStatus(prev => ({ ...prev, captions: false }));
        }
      );

      apiClientRef.current.startNotesStream(
        newSessionId,
        selectedClass,
        (data) => {
          // Notes are handled in the Notes page
          setConnectionStatus(prev => ({ ...prev, notes: true }));
        },
        (error) => {
          console.error('Notes stream error:', error);
          setConnectionStatus(prev => ({ ...prev, notes: false }));
        }
      );

      setIsRecording(true);
      setCaptions([]);
      showToast('Recording started', 'success');

    } catch (error) {
      console.error('Failed to start recording:', error);
      showBanner('Failed to start recording.', 'error');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }

    // Close all SSE streams
    apiClientRef.current.closeAllStreams();

    // End session
    if (sessionId) {
      await apiClientRef.current.endSession(sessionId);
    }

    setIsRecording(false);
    setSessionId(null);
    setConnectionStatus({ captions: false, notes: false });
    showToast('Recording stopped', 'info');
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
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {banner && (
        <Banner
          message={banner.message}
          type={banner.type}
          onDismiss={clearBanner}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Controls
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        micSensitivity={micSensitivity}
        setMicSensitivity={setMicSensitivity}
        isRecording={isRecording}
        onStart={startRecording}
        onStop={stopRecording}
        classOptions={classOptions}
        connectionStatus={connectionStatus}
      />

      <CaptionsPanel captions={captions} isRecording={isRecording} />
    </div>
  );
}

export default Dashboard;