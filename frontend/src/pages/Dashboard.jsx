import React, { useState, useEffect } from 'react';
import Controls from '../components/Controls';
import CaptionsPanel from '../components/CaptionsPanel';
import Banner from '../components/Banner';
import Toast from '../components/Toast';
import { useSessionStore } from '../store/session';

function Dashboard() {
  // Use session store
  const {
    classMode,
    grade,
    interval,
    isRecording,
    batches,
    connectionStatus,
    queueStatus,
    setClassMode,
    setGrade,
    setInterval,
    startRecording,
    stopRecording,
    restoreSession
  } = useSessionStore();

  // Local UI state
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);

  // Class options
  const classOptions = ['Biology', 'Mandarin', 'Spanish', 'English', 'Global History'];

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

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

  // Handle start recording with error handling
  const handleStartRecording = async () => {
    try {
      clearBanner();
      await startRecording();
      showToast('Recording started', 'success');
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error.name === 'NotAllowedError') {
        showBanner('Microphone access denied.', 'error');
      } else if (error.name === 'NotFoundError') {
        showBanner('No microphone found.', 'error');
      } else {
        showBanner('Failed to start recording.', 'error');
      }
    }
  };

  // Handle stop recording
  const handleStopRecording = async () => {
    try {
      await stopRecording();
      showToast('Recording stopped', 'info');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      showToast('Recording stopped', 'info'); // Still show success message
    }
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
        selectedClass={classMode}
        setSelectedClass={setClassMode}
        grade={grade}
        setGrade={setGrade}
        interval={interval}
        setInterval={setInterval}
        isRecording={isRecording}
        onStart={handleStartRecording}
        onStop={handleStopRecording}
        classOptions={classOptions}
        connectionStatus={connectionStatus}
        queueStatus={queueStatus}
      />

      <CaptionsPanel batches={batches} isRecording={isRecording} interval={interval} />
    </div>
  );
}

export default Dashboard;