import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';

interface UserFormData {
  email: string;
  name: string;
  isAdmin: boolean;
  telegramLogin: string;
  password?: string;
  generatePassword: boolean;
}

const initialFormData: UserFormData = {
  email: '',
  name: '',
  isAdmin: false,
  telegramLogin: '',
  password: '',
  generatePassword: true
};

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await apiService.getUsers();
    setUsers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { generatePassword, ...userData } = formData;
      const response = await apiService.createUser({
        ...userData,
        password: generatePassword ? undefined : userData.password
      });

      if (response.password) {
        setCreatedUserPassword(response.password);
      }

      setFormData(initialFormData);
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleClosePasswordModal = () => {
    setCreatedUserPassword(null);
    setShowForm(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiService.deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  return (
    <div className="users-management">
      <div className="users-header">
        <h2>Users Management</h2>
        <button onClick={() => setShowForm(true)} className="add-user-button">
          Add User
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New User</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Telegram Login:</label>
                <input
                  type="text"
                  value={formData.telegramLogin}
                  onChange={(e) => setFormData({ ...formData, telegramLogin: e.target.value })}
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.generatePassword}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      generatePassword: e.target.checked,
                      password: e.target.checked ? '' : formData.password 
                    })}
                  />
                  Generate Random Password
                </label>
              </div>
              {!formData.generatePassword && (
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isAdmin}
                    onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                  />
                  Is Admin
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit">Create</button>
                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdUserPassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>User Created Successfully</h3>
            <p>Generated password for the user:</p>
            <div className="password-display">
              {createdUserPassword}
            </div>
            <p className="password-warning">
              Please save this password as it won't be shown again!
            </p>
            <div className="modal-actions">
              <button onClick={handleClosePasswordModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="users-list-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Telegram</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.telegramLogin || '-'}</td>
                <td>{user.isAdmin ? 'Admin' : 'User'}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersManagement; 