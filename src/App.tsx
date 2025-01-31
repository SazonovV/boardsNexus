import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import BoardsList from './components/BoardsList';
import Board from './components/Board';
import Header from './components/Header';
import UsersManagement from './components/UsersManagement';

const App: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show header on login page
  const showHeader = location.pathname !== '/login';

  return (
    <div className="app">
      {showHeader && user && <Header />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/"
          element={user ? <BoardsList /> : <Navigate to="/login" state={{ from: location.pathname }} />}
        />
        <Route
          path="/board/:id"
          element={user ? <Board /> : <Navigate to="/login" state={{ from: location.pathname }} />}
        />
        <Route
          path="/users"
          element={
            user?.isAdmin ? (
              <UsersManagement />
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/login" state={{ from: location.pathname }} />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App; 