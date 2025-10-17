import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function NavTabs() {
  const location = useLocation();
  
  return (
    <nav className="nav">
      <Link 
        to="/" 
        className={location.pathname === '/' ? 'active' : ''}
      >
        Dash
      </Link>
      <Link 
        to="/notes" 
        className={location.pathname === '/notes' ? 'active' : ''}
      >
        Notes
      </Link>
      <Link 
        to="/games" 
        className={location.pathname === '/games' ? 'active' : ''}
      >
        Games
      </Link>
    </nav>
  );
}

export default NavTabs;