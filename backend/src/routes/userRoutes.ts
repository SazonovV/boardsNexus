import express, { Request, Response } from 'express';
import { userService } from '../services/userService';
import { authMiddleware } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { User } from '../types';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  password: string;
}

const router = express.Router();

router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await userService.login(email, password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export const userRoutes = router; 