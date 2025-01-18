import React from 'react';
import { Task, TaskStatusLabels } from '../types';
import '../styles/TasksByUser.css';

interface TasksByUserProps {
  tasks: { [userKey: string]: Task[] };
  onClose: () => void;
}

const TasksByUser: React.FC<TasksByUserProps> = ({ tasks, onClose }) => {
  const getTotalTasks = (userTasks: Task[]) => userTasks.length;
  const getCompletedTasks = (userTasks: Task[]) => 
    userTasks.filter(task => task.status === 'done').length;

  return (
    <div className="modal-overlay">
      <div className="modal-content tasks-by-user-modal">
        <div className="modal-header">
          <h2>Tasks Distribution</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="tasks-by-user">
          {Object.entries(tasks).map(([userKey, userTasks]) => (
            <div key={userKey} className="user-tasks">
              <div className="user-tasks-header">
                <h3>{userKey || 'No Telegram'}</h3>
                <div className="task-stats">
                  <span className="stat">
                    Total: {getTotalTasks(userTasks)}
                  </span>
                  <span className="stat">
                    Completed: {getCompletedTasks(userTasks)}
                  </span>
                </div>
              </div>
              <div className="tasks-list">
                {userTasks.length > 0 ? (
                  userTasks.map(task => (
                    <div key={task.id} className="task-item">
                      <div className="task-header">
                        <h4>{task.title}</h4>
                        <span className={`task-status status-${task.status}`}>
                          {TaskStatusLabels[task.status]}
                        </span>
                      </div>
                      <p className="task-description">{task.description}</p>
                      <div className="task-footer">
                        <span className="task-date">
                          Created: {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                        <span className="assignees">
                          Assignees: {task.assignees.map(a => a.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-tasks">No tasks assigned</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TasksByUser; 