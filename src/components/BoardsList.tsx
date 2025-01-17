import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Board } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const BoardsList: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadBoards = async () => {
      const data = await apiService.getBoards();
      setBoards(data);
    };
    loadBoards();
  }, []);

  const handleCreateBoard = async () => {
    if (!user) return;
    
    const title = prompt('Enter board title:');
    if (!title) return;

    try {
      const newBoard = await apiService.createBoard(title, [user]);
      setBoards(prev => [...prev, newBoard]);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  return (
    <div className="boards-list">
      <h1>My Boards</h1>
      {user?.isAdmin && (
        <button onClick={handleCreateBoard}>Create New Board</button>
      )}
      <div className="boards-grid">
        {boards.map(board => (
          <Link key={board.id} to={`/board/${board.id}`} className="board-card">
            <h3>{board.title}</h3>
            <p>Members: {board.users.length}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BoardsList; 