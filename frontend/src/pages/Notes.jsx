import React, { useState, useRef, useEffect } from 'react';
import Toast from '../components/Toast';
import ClassSelector from '../components/ClassSelector';
import { ApiClient } from '../lib/api';

function Notes() {
  const [notes, setNotes] = useState([]);
  const [sessionId, setSessionId] = useState(() => 
    sessionStorage.getItem('sessionId') || null
  );
  const [selectedClass, setSelectedClass] = useState(() => 
    localStorage.getItem('selectedClass') || 'Biology'
  );
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState(null);
  
  const apiClientRef = useRef(new ApiClient());
  const classOptions = ['Biology', 'Mandarin', 'Spanish', 'English', 'Global History'];

  // Start notes stream when session is available
  useEffect(() => {
    if (sessionId) {
      apiClientRef.current.startNotesStream(
        sessionId,
        selectedClass,
        (data) => {
          if (data.note) {
            setNotes(prev => [...prev, data.note]);
          }
          setIsConnected(true);
        },
        (error) => {
          console.error('Notes stream error:', error);
          setIsConnected(false);
        }
      );
    } else {
      setIsConnected(false);
    }

    return () => {
      apiClientRef.current.closeStream('/notes');
    };
  }, [sessionId, selectedClass]);

  // Listen for session changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newSessionId = sessionStorage.getItem('sessionId');
      setSessionId(newSessionId);
      if (!newSessionId) {
        setNotes([]);
        setIsConnected(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for session changes within the same tab
    const interval = setInterval(() => {
      const currentSessionId = sessionStorage.getItem('sessionId');
      if (currentSessionId !== sessionId) {
        setSessionId(currentSessionId);
        if (!currentSessionId) {
          setNotes([]);
          setIsConnected(false);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sessionId]);

  // Copy all notes to clipboard
  const copyAllNotes = async () => {
    if (notes.length === 0) return;
    
    const notesText = notes.join('\n• ');
    const fullText = `• ${notesText}`;
    
    try {
      await navigator.clipboard.writeText(fullText);
      setToast({ message: 'Notes copied to clipboard', type: 'success' });
    } catch (error) {
      console.error('Failed to copy notes:', error);
      setToast({ message: 'Failed to copy notes', type: 'error' });
    }
  };

  // Handle class change
  const handleClassChange = (newClass) => {
    setSelectedClass(newClass);
    localStorage.setItem('selectedClass', newClass);
    
    // Clear current notes and restart stream with new class
    setNotes([]);
    if (sessionId) {
      apiClientRef.current.closeStream('/notes');
      
      // Restart with new class
      setTimeout(() => {
        apiClientRef.current.startNotesStream(
          sessionId,
          newClass,
          (data) => {
            if (data.note) {
              setNotes(prev => [...prev, data.note]);
            }
            setIsConnected(true);
          },
          (error) => {
            console.error('Notes stream error:', error);
            setIsConnected(false);
          }
        );
      }, 100);
    }
  };

  if (!sessionId) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div className="panel" style={{
          padding: '3rem',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            marginBottom: '1rem',
            color: 'var(--muted)'
          }}>
            No Active Session
          </h2>
          <p style={{
            color: 'var(--muted)',
            marginBottom: '2rem'
          }}>
            Start recording on the Dash page to begin taking notes.
          </p>
          <a 
            href="/"
            className="button button-primary"
            style={{ textDecoration: 'none' }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header with controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: 0
          }}>
            Notes
          </h1>
          <span className={`pill ${isConnected ? 'live' : 'offline'}`}>
            {isConnected ? '● Notes Live' : '○ Offline'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '300px' }}>
            <ClassSelector
              selectedClass={selectedClass}
              onClassChange={handleClassChange}
              classOptions={classOptions}
            />
          </div>
          
          <button
            onClick={copyAllNotes}
            disabled={notes.length === 0}
            className="button button-secondary"
            style={{
              opacity: notes.length === 0 ? 0.5 : 1,
              cursor: notes.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Copy All
          </button>
        </div>
      </div>

      {/* Notes content */}
      <div className="panel" style={{
        padding: '2rem',
        minHeight: '400px'
      }}>
        {notes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--muted)',
            padding: '3rem'
          }}>
            <p>No notes yet. Notes will appear here as they are generated from your recording.</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {notes.map((note, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(122, 162, 255, 0.05)',
                  border: '1px solid rgba(122, 162, 255, 0.1)'
                }}
              >
                <span style={{
                  color: 'var(--brand)',
                  fontWeight: '600',
                  fontSize: '1.2rem',
                  lineHeight: 1,
                  marginTop: '0.1rem'
                }}>
                  •
                </span>
                <span style={{
                  flex: 1,
                  lineHeight: 1.5
                }}>
                  {note}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notes;