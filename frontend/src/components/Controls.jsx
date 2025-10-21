import React from 'react';
import ClassSelector from './ClassSelector';

function Controls({
  selectedClass,
  setSelectedClass,
  grade,
  setGrade,
  micSensitivity,
  setMicSensitivity,
  interval,
  setInterval,
  isRecording,
  onStart,
  onStop,
  classOptions,
  connectionStatus,
  queueStatus
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

        {/* Batch interval selector */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: 'var(--text)',
            marginBottom: '0.5rem'
          }}>
            Batch Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value))}
            disabled={isRecording}
            className="select"
            style={{
              width: '100%',
              opacity: isRecording ? 0.6 : 1,
              cursor: isRecording ? 'not-allowed' : 'pointer'
            }}
          >
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
          </select>
        </div>

        {/* Start/Stop button */}
        <div>
          {queueStatus && queueStatus.status === 'queued' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text)',
                  marginBottom: '0.25rem'
                }}>
                  You're in the queue
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted)'
                }}>
                  {queueStatus.position}/{queueStatus.size} — {queueStatus.position === 1 ? 'first in line' : `${queueStatus.position} in line`}
                </div>
              </div>
              <button
                onClick={onStop}
                className="button button-secondary"
                style={{ width: '100%' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={isRecording ? onStop : onStart}
              className={`button ${isRecording ? 'button-danger' : 'button-primary'}`}
              style={{ width: '100%' }}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          )}
        </div>
      </div>


      {/* Batch status indicator */}
      {isRecording && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '1.5rem',
          justifyContent: 'center'
        }}>
          <span className={`pill ${connectionStatus.batch ? 'live' : 'offline'}`}>
            {connectionStatus.batch ? '● Batch Processing' : '○ Batch Offline'}
          </span>
        </div>
      )}
    </div>
  );
}

export default Controls;