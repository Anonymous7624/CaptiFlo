import React from 'react';

function Banner({ message, type = 'error', onDismiss }) {
  return (
    <div className={`banner banner-${type}`}>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '1.25rem',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
}

export default Banner;