import React, { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useParams } from 'react-router-dom';
import { Board as BoardType, Task, TaskStatus, TaskStatusLabels } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TaskForm from './TaskForm';
import BoardUsers from './BoardUsers';

const Board: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showUsersModal, setShowUsersModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const loadBoard = async () => {
      if (!id) return;
      const boardData = await api.getBoards();
      const currentBoard = boardData.find(b => b.id === id);
      if (currentBoard) {
        setBoard(currentBoard);
        const boardTasks = await api.getBoardTasks(id);
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
    
    try {
      const updatedTask = await api.updateTask(draggableId, { status: newStatus });
      
      setTasks(prev => {
        const updatedTasks = prev.filter(task => task.id !== draggableId);
        const newIndex = destination.index;
        
        const task = prev.find(t => t.id === draggableId);
        if (!task) return prev;
        
        const newTask = { ...task, status: newStatus };
        updatedTasks.splice(newIndex, 0, newTask);
        
        return updatedTasks;
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, []);

  const handleTaskUpdate = async () => {
    if (!id) return;
    const boardTasks = await api.getBoardTasks(id);
    setTasks(boardTasks);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
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
                            {task.id}
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
    </div>
  );
};

export default Board; 