import React, { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useParams } from 'react-router-dom';
import { Board as BoardType, Task, TaskStatus, TaskStatusLabels } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TaskForm from './TaskForm';
import BoardUsers from './BoardUsers';
import TasksByUser from './TasksByUser';

const Board: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showTasksByUser, setShowTasksByUser] = useState(false);
  const [tasksByUser, setTasksByUser] = useState<{ [key: string]: Task[] }>({});
  const { user } = useAuth();

  useEffect(() => {
    const loadBoard = async () => {
      if (!id) return;
      const boardData = await apiService.getBoards();
      const currentBoard = boardData.find(b => b.id === id);
      if (currentBoard) {
        setBoard(currentBoard);
        const boardTasks = await apiService.getBoardTasks(id);
        setTasks(boardTasks);
      }
    };
    loadBoard();
  }, [id]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const taskToUpdate = tasks.find(t => t.id === draggableId);
    
    if (!taskToUpdate) return;

    setTasks(prev => {
      const updatedTasks = prev.filter(task => task.id !== draggableId);
      const newTask = { ...taskToUpdate, status: newStatus };
      
      updatedTasks.splice(destination.index, 0, newTask);
      
      return updatedTasks;
    });

    try {
      await apiService.updateTask(draggableId, { 
        status: newStatus,
        position: destination.index 
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
      
      setTasks(prev => {
        const revertedTasks = prev.filter(task => task.id !== draggableId);
        const originalTask = { ...taskToUpdate, status: source.droppableId as TaskStatus };
        
        revertedTasks.splice(source.index, 0, originalTask);
        
        return revertedTasks;
      });

      alert('Failed to update task status. Please try again.');
    }
  }, [tasks]);

  const handleTaskUpdate = async () => {
    if (!id) return;
    const boardTasks = await apiService.getBoardTasks(id);
    setTasks(boardTasks);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await apiService.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    }
  };

  const handleShowTasksByUser = async () => {
    try {
      const data = await apiService.getBoardTasksByUser(id);
      setTasksByUser(data);
      setShowTasksByUser(true);
    } catch (error) {
      console.error('Failed to load tasks by user:', error);
    }
  };

  if (!board) return <div>Loading...</div>;

  const columns = Object.values(TaskStatus).map(status => ({
    id: status,
    title: TaskStatusLabels[status],
    tasks: tasks.filter(task => task.status === status)
  }));

  return (
    <div className="board">
      <div className="board-header">
        <h2>{board.title}</h2>
        <div className="board-actions">
          <button onClick={() => setShowTaskForm(true)}>Add Task</button>
          {user?.isAdmin && (
            <button onClick={() => setShowUsersModal(true)}>Manage Users</button>
          )}
          <button onClick={handleShowTasksByUser}>Show Tasks by User</button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns">
          {columns.map(column => (
            <div key={column.id} className="column">
              <h3>{column.title}</h3>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`task-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                          >
                            <div className="task-header">
                              <h4>{task.title}</h4>
                              <div className="task-actions">
                                <button onClick={() => {
                                  setEditingTask(task);
                                  setShowTaskForm(true);
                                }}>Edit</button>
                                <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
                              </div>
                            </div>
                            <p>{task.description}</p>
                            <div className="task-meta">
                              <span>Assignees: {task.assignees.map(u => u.name).join(', ')}</span>
                              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showTaskForm && (
        <TaskForm
          boardId={board.id}
          task={editingTask}
          onSubmit={handleTaskUpdate}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
          }}
        />
      )}

      {showUsersModal && (
        <BoardUsers
          board={board}
          onClose={() => setShowUsersModal(false)}
          onUpdate={setBoard}
        />
      )}

      {showTasksByUser && (
        <TasksByUser
          tasks={tasksByUser}
          onClose={() => setShowTasksByUser(false)}
        />
      )}
    </div>
  );
};

export default Board; 