export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  telegramLogin?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Board {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'new' | 'in-progress' | 'on-hold' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  position: number;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isAdmin: boolean;
      };
    }
  }
} 