import express, { Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { Task, TaskStatus } from '../types/index';

const router = express.Router();

export interface CreatePublicTaskRequest {
  title: string;
  description: string;
  boardId: string;
  authorTelegramLogin: string;
  status?: TaskStatus;
  assignees?: { telegramLogin: string }[];
}

// POST /api/public/tasks
router.post('/tasks', async (req: Request<{}, {}, CreatePublicTaskRequest>, res: Response) => {
  try {
    const { authorTelegramLogin, assignees, ...taskData } = req.body;

    // Проверяем обязательные поля
    if (!taskData.title || !taskData.boardId || !authorTelegramLogin) {
      return res.status(400).json({ 
        message: 'Required fields: title, boardId, authorTelegramLogin' 
      });
    }

    console.log('Creating public task with data:', {
      ...taskData,
      status: taskData.status || TaskStatus.NEW,
      authorTelegramLogin,
      assignees: assignees || []
    });

    const task = await taskService.createPublicTask({
      ...taskData,
      status: taskData.status || TaskStatus.NEW,
      authorTelegramLogin,
      assignees: assignees || [{ telegramLogin: authorTelegramLogin }]
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create public task error:', error);
    if (error instanceof Error && error.message === 'Author not found') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// GET /api/public/boards/:boardId/tasks-summary
router.get('/boards/:boardId/tasks-summary', async (req: Request<{ boardId: string }>, res: Response) => {
  try {
    const tasks = await taskService.getPublicBoardTasksSummary(req.params.boardId);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export const publicRoutes = router; 