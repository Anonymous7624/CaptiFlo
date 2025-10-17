import React, { useEffect } from 'react';

function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontSize: '1.25rem',
            cursor: 'pointer',
            marginLeft: '0.75rem',
            padding: '0',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;