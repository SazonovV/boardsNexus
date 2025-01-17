import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus } from '../types';
import { apiService } from '../services/api';

interface TaskFormProps {
  boardId: string;
  task?: Task;
  onSubmit: () => void;
  onClose: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ boardId, task, onSubmit, onClose }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    task?.assignees.map(user => user.id) || []
  );
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      const data = await apiService.getUsers();
      setUsers(data);
    };
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignees = users.filter(user => selectedUsers.includes(user.id));

    if (task) {
      await apiService.updateTask(task.id, {
        title,
        description,
        assignees,
      });
    } else {
      await apiService.createTask(boardId, {
        title,
        description,
        assignees,
        status: TaskStatus.NEW,
        boardId,
      } as Task);
    }

    onSubmit();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{task ? 'Edit Task' : 'Create Task'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Assignees:</label>
            <div className="assignees-list">
              {users.map(user => (
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
                  {user.name}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="submit">{task ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm; 