import React from 'react';

function ClassSelector({ selectedClass, onClassChange, classOptions, disabled = false }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'var(--text)',
        marginBottom: '0.75rem'
      }}>
        Class
      </label>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {classOptions.map(option => (
          <button
            key={option}
            onClick={() => onClassChange(option)}
            disabled={disabled}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '50px',
              border: selectedClass === option ? '2px solid var(--brand)' : '2px solid var(--border)',
              background: selectedClass === option ? 'rgba(122, 162, 255, 0.2)' : 'var(--panel)',
              color: selectedClass === option ? 'var(--brand)' : 'var(--text)',
              fontSize: '0.875rem',
              fontWeight: selectedClass === option ? '600' : '500',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.2s ease',
              transform: selectedClass === option ? 'scale(1.05)' : 'scale(1)',
              boxShadow: selectedClass === option ? '0 2px 8px rgba(122, 162, 255, 0.3)' : 'none'
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ClassSelector;