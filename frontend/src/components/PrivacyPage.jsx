import React from 'react';

const PrivacyPage = ({ onBack }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b0f1a',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #4b5563',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '16px',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: 0
          }}>
            Privacy Policy
          </h1>
        </header>

        {/* Content */}
        <div style={{
          backgroundColor: '#1a1f2e',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid #2d3748',
          lineHeight: '1.6'
        }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#3b82f6', fontSize: '20px', marginBottom: '16px' }}>
              Data Collection
            </h2>
            <p style={{ color: '#e5e7eb', marginBottom: '16px' }}>
              This application processes audio data in real-time to provide live captions and notes. 
              Audio data is processed on our servers but is not permanently stored.
            </p>
            <ul style={{ color: '#e5e7eb', paddingLeft: '20px' }}>
              <li>Audio streams are processed in real-time</li>
              <li>Transcriptions are generated and sent back to your browser</li>
              <li>No audio recordings are saved to disk</li>
              <li>Session data is cleared when you stop recording</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#3b82f6', fontSize: '20px', marginBottom: '16px' }}>
              Local Storage
            </h2>
            <p style={{ color: '#e5e7eb', marginBottom: '16px' }}>
              We store minimal preferences locally in your browser:
            </p>
            <ul style={{ color: '#e5e7eb', paddingLeft: '20px' }}>
              <li>Your last selected class</li>
              <li>Your preferred microphone sensitivity setting</li>
            </ul>
            <p style={{ color: '#e5e7eb' }}>
              This data never leaves your device and can be cleared by clearing your browser data.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#3b82f6', fontSize: '20px', marginBottom: '16px' }}>
              Microphone Access
            </h2>
            <p style={{ color: '#e5e7eb', marginBottom: '16px' }}>
              This application requires microphone access to function. Your browser will ask for 
              permission before accessing your microphone. You can revoke this permission at any 
              time through your browser settings.
            </p>
            <p style={{ color: '#e5e7eb' }}>
              Audio data is only transmitted when you actively start a recording session.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#3b82f6', fontSize: '20px', marginBottom: '16px' }}>
              Third-Party Services
            </h2>
            <p style={{ color: '#e5e7eb' }}>
              This application does not integrate with any third-party analytics or tracking services.
            </p>
          </section>

          <section>
            <h2 style={{ color: '#3b82f6', fontSize: '20px', marginBottom: '16px' }}>
              Contact
            </h2>
            <p style={{ color: '#e5e7eb' }}>
              If you have questions about this privacy policy or how your data is handled, 
              please contact the system administrator.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          marginTop: '32px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPage;