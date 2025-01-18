import { User } from '../types';
import db from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const userService = {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<{ user: User; password?: string }> {
    // Проверка существования telegram_login
    const existingUser = await db.query('SELECT id FROM users WHERE telegram_login = $1', [userData.telegramLogin]);
    if (existingUser.rows.length > 0) {
      throw new Error('Telegram login already exists');
    }

    const password = userData.password || crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await db.query(
      `INSERT INTO users (name, password_hash, is_admin, telegram_login)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, is_admin as "isAdmin", telegram_login as "telegramLogin", 
                created_at as "createdAt", updated_at as "updatedAt"`,
      [userData.name, passwordHash, userData.isAdmin, userData.telegramLogin]
    );
    
    return {
      user: result.rows[0],
      password: userData.password ? undefined : password
    };
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    if (userData.name) {
      updateFields.push(`name = $${valueIndex}`);
      values.push(userData.name);
      valueIndex++;
    }
    if (userData.isAdmin !== undefined) {
      updateFields.push(`is_admin = $${valueIndex}`);
      values.push(userData.isAdmin);
      valueIndex++;
    }
    if (userData.telegramLogin) {
      updateFields.push(`telegram_login = $${valueIndex}`);
      values.push(userData.telegramLogin);
      valueIndex++;
    }

    if (updateFields.length === 0) return null;

    values.push(id);
    const result = await db.query(
      `UPDATE users 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${valueIndex}
       RETURNING id, name, is_admin as "isAdmin", telegram_login as "telegramLogin",
                created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    return result.rows[0] || null;
  },

  async getUserById(id: string): Promise<User | null> {
    const result = await db.query(
      `SELECT id, name, is_admin as "isAdmin", telegram_login as "telegramLogin",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getUsers(): Promise<User[]> {
    const result = await db.query(
      `SELECT id, name, is_admin as "isAdmin", telegram_login as "telegramLogin",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM users`
    );
    return result.rows;
  },

  async login(telegramLogin: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const result = await db.query(
        `SELECT id, name, password_hash, is_admin as "isAdmin", 
                telegram_login as "telegramLogin", created_at as "createdAt", 
                updated_at as "updatedAt"
         FROM users WHERE telegram_login = $1`,
        [telegramLogin]
      );

      const user = result.rows[0];
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
      console.log(user);
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
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}; 