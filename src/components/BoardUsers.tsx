import React, { useState, useEffect } from 'react';
import { Board, User } from '../types';
import { apiService } from '../services/api';

interface BoardUsersProps {
  board: Board;
  onClose: () => void;
  onUpdate: (board: Board) => void;
}

const BoardUsers: React.FC<BoardUsersProps> = ({ board, onClose, onUpdate }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    board.users.map(user => user.id)
  );

  useEffect(() => {
    const loadUsers = async () => {
      const users = await apiService.getUsers();
      setAllUsers(users);
    };
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = allUsers.filter(user => selectedUsers.includes(user.id));
    const updatedBoard = await apiService.updateBoard(board.id, { users: updatedUsers });
    onUpdate(updatedBoard);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Manage Board Users</h2>
        <form onSubmit={handleSubmit}>
          <div className="users-list">
            {allUsers.map(user => (
              <label key={user.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                    }
                  }}
                />
                {user.name} {user.isAdmin ? '(Admin)' : ''}
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BoardUsers; 