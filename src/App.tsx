import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import BoardsList from './components/BoardsList';
import Board from './components/Board';
import Header from './components/Header';
import UsersManagement from './components/UsersManagement';

const App: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<BoardsList />} />
        <Route path="/board/:id" element={<Board />} />
        <Route 
          path="/users" 
          element={user.isAdmin ? <UsersManagement /> : <Navigate to="/" replace />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App; 