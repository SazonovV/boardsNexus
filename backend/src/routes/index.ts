import express, { Router } from 'express';
import { userRoutes } from './userRoutes';
import { boardRoutes } from './boardRoutes';
import { taskRoutes } from './taskRoutes';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

router.use('/auth', userRoutes);
router.use('/boards', authMiddleware, boardRoutes);
router.use('/tasks', authMiddleware, taskRoutes);

export default router; 