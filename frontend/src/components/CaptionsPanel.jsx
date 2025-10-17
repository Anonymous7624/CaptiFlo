import React from 'react';

const CaptionsPanel = ({ captions, isRecording }) => {
  const currentCaption = captions.length > 0 ? captions[captions.length - 1] : '';
  const recentCaptions = captions.slice(-8, -1); // Show last 7 captions before current

  return (
    <div className="panel" style={{
      padding: '3rem 2rem',
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      {/* Recent captions (faded, smaller) */}
      {recentCaptions.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          maxWidth: '800px'
        }}>
          {recentCaptions.map((caption, index) => (
            <div 
              key={index} 
              className="caption-recent"
              style={{
                marginBottom: '0.5rem',
                opacity: 0.4 + (index * 0.1) // Gradually increase opacity
              }}
            >
              {caption}
            </div>
          ))}
        </div>
      )}

      {/* Current caption (large and prominent) */}
      <div 
        className="caption-big"
        style={{
          maxWidth: '900px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentCaption ? 'var(--text)' : 'var(--muted)'
        }}
      >
        {currentCaption || (isRecording ? 'Listening...' : 'Press Start to begin recording')}
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          alignItems: 'center',
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
          Recording in progress
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