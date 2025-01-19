import express from 'express';
import { userRoutes } from './userRoutes';
import { boardRoutes } from './boardRoutes';
import { taskRoutes } from './taskRoutes';
import { publicRoutes } from './publicRoutes';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Public routes
router.use('/public', publicRoutes);

// Protected routes
router.use('/auth', userRoutes);
router.use('/boards', authMiddleware, boardRoutes);
router.use('/tasks', authMiddleware, taskRoutes);
router.use('/users', authMiddleware, userRoutes);

export default router; 