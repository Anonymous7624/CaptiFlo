import React, { useState } from 'react';

const CaptionsPanel = ({ batches, isRecording, interval }) => {
  const [expandedBatch, setExpandedBatch] = useState(null);

  const toggleBatch = (index) => {
    setExpandedBatch(expandedBatch === index ? null : index);
  };

  return (
    <div className="panel" style={{
      padding: '2rem',
      minHeight: '400px',
      marginTop: '2rem'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: 'var(--text)',
          marginBottom: '0.5rem'
        }}>
          Batch Transcription Results
        </h3>
        {isRecording && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'var(--accent)',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              animation: 'pulse 1.5s infinite'
            }}></div>
            Recording {interval}s batches...
          </div>
        )}
      </div>

      {/* Batch results */}
      {batches.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '1rem',
          padding: '3rem'
        }}>
          {isRecording ? 'Waiting for first batch...' : 'Press Start to begin batch recording'}
        </div>
      ) : (
        <div style={{
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          {batches.map((batch, index) => (
            <div
              key={index}
              style={{
                marginBottom: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {/* Batch header */}
              <div
                onClick={() => toggleBatch(index)}
                style={{
                  padding: '1rem',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: expandedBatch === index ? '1px solid var(--border)' : 'none'
                }}
              >
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text)',
                    marginBottom: '0.25rem'
                  }}>
                    Batch {index + 1} ({interval}s)
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted)'
                  }}>
                    {batch.timestamp} • {batch.notes.length} notes
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                  transform: expandedBatch === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▼
                </div>
              </div>

              {/* Notes (always visible) */}
              <div style={{
                padding: '1rem',
                background: 'var(--background)'
              }}>
                {batch.notes.length > 0 ? (
                  <div style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.5'
                  }}>
                    {batch.notes.map((note, noteIndex) => (
                      <div
                        key={noteIndex}
                        style={{
                          marginBottom: '0.5rem',
                          color: 'var(--text)'
                        }}
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted)',
                    fontStyle: 'italic'
                  }}>
                    No meaningful content in this batch
                  </div>
                )}
              </div>

              {/* Transcript (collapsible) */}
              {expandedBatch === index && batch.text && (
                <div style={{
                  padding: '1rem',
                  background: 'var(--surface)',
                  borderTop: '1px solid var(--border)'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--muted)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Transcript
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--text)',
                    lineHeight: '1.5',
                    fontStyle: 'italic'
                  }}>
                    "{batch.text}"
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default CaptionsPanel;