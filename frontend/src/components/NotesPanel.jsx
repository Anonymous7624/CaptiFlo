import React from 'react';

const NotesPanel = ({ notes, onCopy }) => {
  const handleCopy = async () => {
    if (notes.length === 0) return;
    
    const notesText = notes.map(note => `• ${note}`).join('\n');
    
    try {
      await navigator.clipboard.writeText(notesText);
      onCopy && onCopy('Notes copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy notes:', err);
      onCopy && onCopy('Failed to copy notes');
    }
  };

  return (
    <div style={{
      backgroundColor: '#1a1f2e',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #2d3748',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with copy button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #2d3748',
        paddingBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Notes
        </h3>
        
        <button
          onClick={handleCopy}
          disabled={notes.length === 0}
          style={{
            backgroundColor: notes.length > 0 ? '#3b82f6' : '#374151',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: notes.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            opacity: notes.length > 0 ? 1 : 0.5
          }}
          onMouseOver={(e) => {
            if (notes.length > 0) {
              e.target.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseOut={(e) => {
            if (notes.length > 0) {
              e.target.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          Copy All
        </button>
      </div>

      {/* Notes list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '400px'
      }}>
        {notes.length === 0 ? (
          <div style={{
            color: '#6b7280',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '40px'
          }}>
            Notes will appear here as they are generated...
          </div>
        ) : (
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            {notes.map((note, index) => (
              <li
                key={index}
                style={{
                  color: '#e5e7eb',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  marginBottom: '12px',
                  paddingLeft: '20px',
                  position: 'relative',
                  animation: index === notes.length - 1 ? 'fadeIn 0.3s ease-in' : 'none'
                }}
              >
                {/* Bullet point */}
                <span style={{
                  position: 'absolute',
                  left: '0',
                  color: '#3b82f6',
                  fontWeight: 'bold'
                }}>
                  •
                </span>
                {note}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fade in animation for new notes */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotesPanel;