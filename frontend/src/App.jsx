import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';

function App() {
  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Header />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notes" element={<Notes />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;