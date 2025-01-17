import express, { Request, Response } from 'express';
import { boardService } from '../services/boardService';
import { Board } from '../types';

interface CreateBoardRequest {
  title: string;
  userIds: string[];
}

interface UpdateBoardRequest {
  title?: string;
  users?: string[];
}

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const boards = await boardService.getBoards(req.user.id);
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req: Request<{}, {}, CreateBoardRequest>, res: Response) => {
  try {
    const { title, userIds } = req.body;
    const board = await boardService.createBoard(title, userIds);
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req: Request<{ id: string }, {}, UpdateBoardRequest>, res: Response) => {
  try {
    const board = await boardService.updateBoard(req.params.id, req.body);
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await boardService.deleteBoard(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export const boardRoutes = router; 