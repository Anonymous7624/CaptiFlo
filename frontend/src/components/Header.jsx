import React from 'react';
import NavTabs from './NavTabs';

function Header() {
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
      
      <NavTabs />
    </header>
  );
}

export default Header;