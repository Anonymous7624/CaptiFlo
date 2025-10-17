import React from 'react';
import NavTabs from './NavTabs';

function Header({ onLogout }) {
  return (
    <header style={{
      padding: '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%'
    }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: 0,
        background: 'linear-gradient(135deg, var(--brand), var(--accent))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        CapiFlow
      </h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <NavTabs />
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = 'var(--brand)';
              e.target.style.color = 'var(--brand)';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.color = 'var(--muted)';
            }}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;