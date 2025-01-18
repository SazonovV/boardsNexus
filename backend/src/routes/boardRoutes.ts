import express, { Request, Response } from 'express';
import { boardService } from '../services/boardService';
import { User } from '../types';
import { authMiddleware } from '../middleware/auth';

interface CreateBoardRequest {
  title: string;
  userIds: string[];
}

interface UpdateBoardRequest {
  title?: string;
  users?: User[];
}

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const boards = await boardService.getBoards(req.user.id);
    res.json(boards);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req: Request<{}, {}, CreateBoardRequest>, res: Response) => {
  try {
    const board = await boardService.createBoard(req.body);
    await boardService.addUserToBoard(board.id, req.user);
    res.status(201).json(board);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateBoardRequest>, res: Response) => {
  try {
    const board = await boardService.updateBoard(req.params.id, req.body);
    res.json(board);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await boardService.deleteBoard(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/users', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const users = await boardService.getBoardUsers(req.params.id);
    res.json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export const boardRoutes = router; 