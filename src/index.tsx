import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/main.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const root = createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
); 