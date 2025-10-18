import React, { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import ClassSelector from '../components/ClassSelector';
import { useSessionStore } from '../store/session';

function Notes() {
  // Use session store
  const {
    sessionId,
    classMode,
    grade,
    notes,
    connectionStatus,
    showEnglishCaptions,
    setClassMode,
    setGrade,
    setShowEnglishCaptions,
    startNotesStream,
    restoreSession
  } = useSessionStore();

  const [toast, setToast] = useState(null);
  const classOptions = ['Biology', 'Mandarin', 'Spanish', 'English', 'Global History'];
  const isLanguageClass = classMode === 'Spanish' || classMode === 'Mandarin';

  // Restore session on mount and start notes stream if session exists
  useEffect(() => {
    const restoredSessionId = restoreSession();
    if (restoredSessionId) {
      startNotesStream(restoredSessionId);
    }
  }, []);

  // Restart notes stream when class or grade changes
  useEffect(() => {
    if (sessionId) {
      startNotesStream(sessionId);
    }
  }, [classMode, grade]);

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
          <span className={`pill ${connectionStatus.notes ? 'live' : 'offline'}`}>
            {connectionStatus.notes ? '● Notes Live' : '○ Offline'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <ClassSelector
              selectedClass={classMode}
              onClassChange={setClassMode}
              classOptions={classOptions}
            />
          </div>
          
          <div style={{ minWidth: '120px' }}>
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value))}
              className="select"
              style={{ width: '100%' }}
            >
              {[6, 7, 8, 9, 10, 11, 12].map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          {isLanguageClass && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <input
                type="checkbox"
                checked={showEnglishCaptions}
                onChange={(e) => setShowEnglishCaptions(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--brand)'
                }}
              />
              English captions
            </label>
          )}
          
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