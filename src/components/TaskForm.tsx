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
      const data = await apiService.getBoardUsers(boardId);
      setUsers(data);
    };
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignees = users.filter(user => selectedUsers.includes(user.id));

    if (task) {
      await apiService.updateTaskDetails(task.id, {
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

  const selectRandomAssignee = () => {
    if (users.length > 0) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      setSelectedUsers([randomUser.id]);
    }
  };

  const selectLeads = () => {
      setSelectedUsers(["4864b34d-ddb5-11ef-bd40-52540023d762", "5574e392-de1e-11ef-bd40-52540023d762", "8525e54b-de46-11ef-bd40-52540023d762", "a01a05f2-de46-11ef-bd40-52540023d762", "e723d226-de46-11ef-bd40-52540023d762", "f07a5440-dfcf-11ef-bd40-52540023d762", "f82d08d9-de34-11ef-bd40-52540023d762", "fc61e8b4-de1d-11ef-bd40-52540023d762"]);
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
            />
          </div>
          <div className="form-group">
            <div className="assignees-header">
              <label>Assignees:</label>
              <div className='assignees-buttons'>
                <button 
                  type="button" 
                  onClick={selectRandomAssignee}
                  className="find-random-button"
                >
                  Найти крайнего
                </button>
                <button 
                  type="button" 
                  onClick={selectLeads}
                  className="find-random-button"
                >
                  Выбрать лидов
                </button>
              </div>
            </div>
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
            <button type="submit">Сохранить</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm; 