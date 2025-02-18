export type User = {
  id: string;
  name: string;
  isAdmin: boolean;
  telegramLogin: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignees: User[];
  createdAt: string;
  status: TaskStatus;
  boardId: string;
  author: User;
};

export enum TaskStatus {
  NEW = 'new',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'on-hold',
  DONE = 'done'
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.NEW]: 'New',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.ON_HOLD]: 'On Hold',
  [TaskStatus.DONE]: 'Done'
};

export type Board = {
  id: string;
  title: string;
  users: User[];
}; 