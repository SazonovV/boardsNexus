import axios from 'axios';
import { Board, Task, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Интерцептор для добавления токена к запросам
api.interceptors.request.use((config: { headers: { Authorization: string; }; }) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface CreateUserResponse {
  user: User;
  password?: string;
}

export const apiService = {
  // Auth
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    return data.user;
  },

  async logout() {
    localStorage.removeItem('token');
  },

  // Boards
  async getBoards(): Promise<Board[]> {
    const { data } = await api.get('/boards');
    return data;
  },

  async createBoard(title: string, userIds: User[]): Promise<Board> {
    const { data } = await api.post('/boards', { title, userIds });
    return data;
  },

  async updateBoard(id: string, boardData: Partial<Board>): Promise<Board> {
    const { data } = await api.put(`/boards/${id}`, boardData);
    return data;
  },

  async deleteBoard(id: string): Promise<void> {
    await api.delete(`/boards/${id}`);
  },

  // Tasks
  async getBoardTasks(boardId: string): Promise<Task[]> {
    const { data } = await api.get(`/tasks/board/${boardId}`);
    return data;
  },

  async createTask(boardId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const { data } = await api.post('/tasks', { ...taskData, boardId });
    return data;
  },

  async updateTask(id: string, taskData: Partial<Task & { position: number }>): Promise<Task> {
    const { data } = await api.put(`/tasks/${id}`, taskData);
    return data;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  // Users
  async getUsers(): Promise<User[]> {
    const { data } = await api.get('/users');
    return data;
  },

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<CreateUserResponse> {
    const { data } = await api.post('/users', userData);
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  }
}; 