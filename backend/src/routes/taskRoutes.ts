import express, { Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { Task, TaskStatus } from '../types';

interface CreateTaskRequest extends Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {}

interface UpdateTaskStatusRequest {
  status: TaskStatus;
  position: number;
}

const router = express.Router();

router.get('/board/:boardId', async (req: Request<{ boardId: string }>, res: Response) => {
  try {
    const tasks = await taskService.getBoardTasks(req.params.boardId);
    res.json(tasks);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req: Request<{}, {}, CreateTaskRequest>, res: Response) => {
  try {
    const taskData = {
      ...req.body,
      authorTelegramLogin: req.user.telegramLogin // Используем telegram_login из JWT токена
    };
    
    const task = await taskService.createTask(taskData);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    if (error instanceof Error && error.message === 'Author not found') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

router.put('/:id/move', async (req: Request<{ id: string }, {}, UpdateTaskStatusRequest>, res: Response) => {
  try {
    const task = await taskService.updateTaskStatus(
      req.params.id,
      req.body.status,
      req.body.position
    );
    res.json(task);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await taskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', async (req: Request<{ id: string }, {}, Partial<Task>>, res: Response) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    res.json(task);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/board/:boardId/by-user', async (req: Request<{ boardId: string }>, res: Response) => {
  try {
    const tasks = await taskService.getBoardTasksByUser(req.params.boardId);
    res.json(tasks);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export const taskRoutes = router; 