import React from 'react';

const CaptionsPanel = ({ captions, isRecording }) => {
  const currentCaption = captions.length > 0 ? captions[captions.length - 1] : '';
  const history = captions.slice(0, -1);

  return (
    <div style={{
      backgroundColor: '#1a1f2e',
      borderRadius: '12px',
      padding: '24px',
      minHeight: '200px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      border: '1px solid #2d3748',
      position: 'relative'
    }}>
      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ef4444',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            animation: 'pulse 1.5s infinite'
          }}></div>
          Recording
        </div>
      )}

      {/* Caption history (faded) */}
      {history.length > 0 && (
        <div style={{
          marginBottom: '16px',
          opacity: 0.4,
          fontSize: '16px',
          lineHeight: '1.4',
          color: '#a0aec0'
        }}>
          {history.slice(-3).map((caption, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              {caption}
            </div>
          ))}
        </div>
      )}

      {/* Current caption (large and prominent) */}
      <div style={{
        fontSize: '28px',
        lineHeight: '1.3',
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '400',
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {currentCaption || (isRecording ? 'Listening...' : 'Press Start to begin')}
      </div>

      {/* Pulse animation for recording indicator */}
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