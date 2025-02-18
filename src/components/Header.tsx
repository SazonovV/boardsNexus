import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          {location.pathname !== '/' && (
            <Link to="/" className="nav-link">
              <span className="back-arrow">←</span> My Boards
            </Link>
          )}
        </div>
        <div className="header-right">
          {!!user.isAdmin && (
            <Link to="/users" className="nav-link">
              Manage Users
            </Link>
          )}
          <div className="user-info">
            <span>{user.name}</span>
            <span className="user-role">({user.isAdmin ? 'Admin' : 'User'})</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 