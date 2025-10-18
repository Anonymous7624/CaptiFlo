import React from 'react';
import ClassSelector from './ClassSelector';

function Controls({
  selectedClass,
  setSelectedClass,
  grade,
  setGrade,
  micSensitivity,
  setMicSensitivity,
  showEnglishCaptions,
  setShowEnglishCaptions,
  isRecording,
  onStart,
  onStop,
  classOptions,
  connectionStatus
}) {
  const isLanguageClass = selectedClass === 'Spanish' || selectedClass === 'Mandarin';
  return (
    <div className="panel" style={{
      padding: '2rem',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.5rem',
        alignItems: 'end'
      }}>
        {/* Class selector */}
        <div>
          <ClassSelector
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            classOptions={classOptions}
            disabled={isRecording}
          />
        </div>

        {/* Grade selector */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text)',
            marginBottom: '0.5rem'
          }}>
            Grade Level
          </label>
          <select
            value={grade}
            onChange={(e) => setGrade(parseInt(e.target.value))}
            disabled={isRecording}
            className="select"
            style={{
              width: '100%',
              opacity: isRecording ? 0.6 : 1,
              cursor: isRecording ? 'not-allowed' : 'pointer'
            }}
          >
            {[6, 7, 8, 9, 10, 11, 12].map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>

        {/* Mic sensitivity */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text)',
            marginBottom: '0.5rem'
          }}>
            Sensitivity: {micSensitivity}
          </label>
          <input
            type="range"
            min="0"
            max="3"
            value={micSensitivity}
            onChange={(e) => setMicSensitivity(parseInt(e.target.value))}
            disabled={isRecording}
            className="slider"
            style={{
              opacity: isRecording ? 0.6 : 1,
              cursor: isRecording ? 'not-allowed' : 'pointer'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--muted)',
            marginTop: '0.25rem'
          }}>
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Start/Stop button */}
        <div>
          <button
            onClick={isRecording ? onStop : onStart}
            className={`button ${isRecording ? 'button-danger' : 'button-primary'}`}
            style={{ width: '100%' }}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
      </div>

      {/* Language toggle for Spanish/Mandarin */}
      {isLanguageClass && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(122, 162, 255, 0.05)',
          border: '1px solid rgba(122, 162, 255, 0.1)'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={showEnglishCaptions}
              onChange={(e) => setShowEnglishCaptions(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--brand)'
              }}
            />
            Show captions in English
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              fontWeight: '400'
            }}>
              (UI only - translation coming soon)
            </span>
          </label>
        </div>
      )}

      {/* Connection status indicators */}
      {isRecording && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '1.5rem',
          justifyContent: 'center'
        }}>
          <span className={`pill ${connectionStatus.captions ? 'live' : (connectionStatus.reconnecting ? 'reconnecting' : 'offline')}`}>
            {connectionStatus.captions ? '● Captions Live' : (connectionStatus.reconnecting ? '○ Reconnecting...' : '○ Captions Offline')}
          </span>
          <span className={`pill ${connectionStatus.notes ? 'live' : 'offline'}`}>
            {connectionStatus.notes ? '● Notes Live' : '○ Notes Offline'}
          </span>
        </div>
      )}
    </div>
  );
}

export default Controls;