import { Board, Task, User, TaskStatus } from '../types';

// Вспомогательная функция для генерации уникальных ID
const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}`;

// Моковые данные
let mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    isAdmin: true,
    telegramLogin: '@admin'
  },
  {
    id: 'user-2',
    email: 'user1@example.com',
    name: 'John Doe',
    isAdmin: false,
    telegramLogin: '@johndoe'
  },
  {
    id: 'user-3',
    email: 'user2@example.com',
    name: 'Jane Smith',
    isAdmin: false,
    telegramLogin: '@janesmith'
  }
];

let mockBoards: Board[] = [
  {
    id: 'board-1',
    title: 'Development Board',
    users: mockUsers
  }
];

let mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Implement Authentication',
    description: 'Add user authentication using JWT',
    assignees: [mockUsers[1]],
    createdAt: new Date(),
    status: TaskStatus.NEW,
    boardId: 'board-1'
  },
  {
    id: 'task-2',
    title: 'Create API Documentation',
    description: 'Document all API endpoints',
    assignees: [mockUsers[0], mockUsers[2]],
    createdAt: new Date(),
    status: TaskStatus.IN_PROGRESS,
    boardId: 'board-1'
  }
];

export const api = {
  // Boards
  getBoards: async (): Promise<Board[]> => {
    return mockBoards;
  },

  createBoard: async (title: string, users: User[]): Promise<Board> => {
    const newBoard = {
      id: `board-${generateId()}`,
      title,
      users,
    };
    mockBoards.push(newBoard);
    return newBoard;
  },

  updateBoard: async (id: string, data: Partial<Board>): Promise<Board> => {
    const index = mockBoards.findIndex(board => board.id === id);
    if (index === -1) throw new Error('Board not found');
    
    mockBoards[index] = { ...mockBoards[index], ...data };
    return mockBoards[index];
  },

  deleteBoard: async (id: string): Promise<void> => {
    mockBoards = mockBoards.filter(board => board.id !== id);
    mockTasks = mockTasks.filter(task => task.boardId !== id);
  },

  // Tasks
  getBoardTasks: async (boardId: string): Promise<Task[]> => {
    return mockTasks.filter(task => task.boardId === boardId);
  },

  createTask: async (boardId: string, data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const newTask = {
      ...data,
      id: `task-${generateId()}`,
      createdAt: new Date(),
      boardId,
    };
    mockTasks.push(newTask);
    return newTask;
  },

  updateTask: async (id: string, data: Partial<Task>): Promise<Task> => {
    const index = mockTasks.findIndex(task => task.id === id);
    if (index === -1) throw new Error('Task not found');
    
    mockTasks[index] = { ...mockTasks[index], ...data };
    return mockTasks[index];
  },

  deleteTask: async (id: string): Promise<void> => {
    mockTasks = mockTasks.filter(task => task.id !== id);
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    return mockUsers;
  },

  createUser: async (userData: Omit<User, 'id'>): Promise<User> => {
    const newUser = {
      ...userData,
      id: `user-${generateId()}`,
    };
    mockUsers.push(newUser);
    return newUser;
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const index = mockUsers.findIndex(user => user.id === id);
    if (index === -1) throw new Error('User not found');
    
    mockUsers[index] = { ...mockUsers[index], ...data };
    return mockUsers[index];
  },

  deleteUser: async (id: string): Promise<void> => {
    mockUsers = mockUsers.filter(user => user.id !== id);
  },
}; 