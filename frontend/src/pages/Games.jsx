import React from 'react';
import FlappyBird from '../components/FlappyBird';

function Games() {
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          Games
        </h1>
        <p style={{
          color: 'var(--muted)',
          fontSize: '1.1rem',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Play games while the servant does the note-taking
        </p>
      </div>

      <div className="panel" style={{
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '2rem',
          color: 'var(--text)'
        }}>
          Flappy Bird
        </h2>
        
        <FlappyBird />
      </div>
    </div>
  );
}

export default Games;