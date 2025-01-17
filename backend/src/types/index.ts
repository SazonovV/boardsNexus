export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  telegramLogin?: string;
  createdAt: Date;
  updatedAt: Date;
  password_hash?: string;
}

export interface Board {
  id: string;
  title: string;
  users: User[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
  boardId: string;
  assignees: User[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  NEW = 'new',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'on-hold',
  DONE = 'done'
} 