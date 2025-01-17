import express from 'express';
import { userService } from '../services/userService';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

// Аутентификация
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Получение списка пользователей (только для админов)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Создание нового пользователя (только для админов)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await userService.createUser(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'Email already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Обновление пользователя (только для админов)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Удаление пользователя (только для админов)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Получение текущего пользователя
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await userService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export const userRoutes = router; 