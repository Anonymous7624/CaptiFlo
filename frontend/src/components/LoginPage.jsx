import React, { useState } from 'react';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Check if password is correct
    if (password === 'Password123') {
      // Set login cookie
      document.cookie = 'mathrise_logged_in=true; path=/; max-age=86400'; // 24 hours
      onLogin();
    } else if (!username.trim()) {
      setError('Username required');
    } else {
      setError('Invalid credentials');
    }
  };

  // Generate random math symbols for background
  const mathSymbols = ['∑', '∫', '∂', '√', '∞', 'π', 'θ', 'α', 'β', 'γ', 'δ', 'λ', 'μ', 'σ', 'φ', '≤', '≥', '≠', '≈', '±', '×', '÷', '²', '³', '∴', '∵', '∈', '∉', '⊂', '⊃', '∪', '∩'];
  
  const backgroundElements = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    symbol: mathSymbols[Math.floor(Math.random() * mathSymbols.length)],
    size: Math.random() * 40 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    opacity: Math.random() * 0.3 + 0.1,
    rotation: Math.random() * 360
  }));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Math symbols background */}
      {backgroundElements.map(element => (
        <div
          key={element.id}
          style={{
            position: 'absolute',
            left: `${element.x}%`,
            top: `${element.y}%`,
            fontSize: `${element.size}px`,
            color: '#ddd',
            opacity: element.opacity,
            transform: `rotate(${element.rotation}deg)`,
            userSelect: 'none',
            pointerEvents: 'none',
            fontFamily: 'serif'
          }}
        >
          {element.symbol}
        </div>
      ))}

      {/* Login form */}
      <div style={{
        background: 'white',
        border: '2px solid #333',
        padding: '3rem',
        width: '400px',
        maxWidth: '90vw',
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            color: '#333',
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: '0 0 0.5rem 0',
            fontFamily: 'serif'
          }}>
            MathRise
          </h1>
          <p style={{
            color: '#666',
            margin: 0,
            fontSize: '1rem'
          }}>
            Educational Platform Login
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#333',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              Username/Email:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #333',
                background: 'white',
                color: '#333',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your username or email"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#333',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem'
            }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #333',
                background: 'white',
                color: '#333',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div style={{
              color: '#d32f2f',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              textAlign: 'center',
              padding: '0.5rem',
              border: '1px solid #d32f2f',
              background: '#ffebee'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#333',
              color: 'white',
              border: '1px solid #333',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#555'}
            onMouseOut={(e) => e.target.style.background = '#333'}
          >
            LOGIN
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: '#666'
        }}>
          <a href="#" style={{ color: '#333', textDecoration: 'underline' }}>
            Forgot Password?
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;