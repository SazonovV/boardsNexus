import { User } from '../types';
import db from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const userService = {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<{ user: User; password?: string }> {
    const [existingUser] = await db.query('SELECT id FROM users WHERE telegram_login = ?', [userData.telegramLogin]);
    if (existingUser.length > 0) {
      throw new Error('Telegram login already exists');
    }

    const password = userData.password || crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    
    const [result] = await db.query(
      `INSERT INTO users (name, password_hash, is_admin, telegram_login)
       VALUES (?, ?, ?, ?)`,
      [userData.name, passwordHash, userData.isAdmin, userData.telegramLogin]
    );
    
    const [newUser] = await db.query(
      `SELECT id, name, is_admin as isAdmin, telegram_login as telegramLogin, 
              created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [result.insertId]
    );
    
    return {
      user: newUser[0],
      password: userData.password ? undefined : password
    };
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const updateFields = [];
    const values = [];

    if (userData.name) {
      updateFields.push('name = ?');
      values.push(userData.name);
    }
    if (userData.isAdmin !== undefined) {
      updateFields.push('is_admin = ?');
      values.push(userData.isAdmin);
    }
    if (userData.telegramLogin) {
      updateFields.push('telegram_login = ?');
      values.push(userData.telegramLogin);
    }

    if (updateFields.length === 0) return null;

    values.push(id);
    const [result] = await db.query(
      `UPDATE users 
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) return null;

    const [updatedUser] = await db.query(
      `SELECT id, name, is_admin as isAdmin, telegram_login as telegramLogin,
              created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [id]
    );

    return updatedUser[0] || null;
  },

  async getUserById(id: string): Promise<User | null> {
    const [result] = await db.query(
      `SELECT id, name, is_admin as isAdmin, telegram_login as telegramLogin,
              created_at as createdAt, updated_at as updatedAt
       FROM users WHERE id = ?`,
      [id]
    );
    return result[0] || null;
  },

  async getUsers(): Promise<User[]> {
    const [result] = await db.query(
      `SELECT id, name, is_admin as isAdmin, telegram_login as telegramLogin,
              created_at as createdAt, updated_at as updatedAt
       FROM users`
    );
    return result;
  },

  async login(telegramLogin: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const [result] = await db.query(
        `SELECT id, name, password_hash, is_admin as isAdmin, 
                telegram_login as telegramLogin, created_at as createdAt, 
                updated_at as updatedAt
         FROM users WHERE telegram_login = ?`,
        [telegramLogin]
      );

      const user = result[0];
      if (!user) {
        console.log('User not found:', telegramLogin);
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        console.log('Invalid password for user:', telegramLogin);
        return null;
      }

      delete user.password_hash;
      const token = jwt.sign(
        { id: user.id, telegramLogin: user.telegramLogin, isAdmin: user.isAdmin },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  async deleteUser(id: string): Promise<void> {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }
}; 