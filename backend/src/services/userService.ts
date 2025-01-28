import { User } from '../types';
import db, { UserRow } from '../db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ResultSetHeader } from 'mysql2';
import { RowDataPacket } from 'mysql2';

const mapUserRowToUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  isAdmin: row.is_admin,
  telegramLogin: row.telegram_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const userService = {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<{ user: User; password?: string }> {
    const [existingUsers] = await db.query<UserRow[]>(
      'SELECT id FROM users WHERE telegram_login = ?',
      [userData.telegramLogin]
    );
    
    if (existingUsers.length > 0) {
      throw new Error('Telegram login already exists');
    }

    const password = userData.password || crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    
    const [[{ userId }]] = await db.query<(RowDataPacket & { userId: string })[]>(
      'SELECT UUID() as userId'
    );

    await db.query(
      `INSERT INTO users (id, name, password_hash, is_admin, telegram_login)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, userData.name, passwordHash, userData.isAdmin, userData.telegramLogin]
    );
    
    const [newUsers] = await db.query<UserRow[]>(
      `SELECT id, name, is_admin, telegram_login, 
              created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );
    
    return {
      user: mapUserRowToUser(newUsers[0]),
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
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE users 
       SET ${updateFields.join(', ')}
       WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) return null;

    const [updatedUsers] = await db.query<UserRow[]>(
      `SELECT id, name, is_admin, telegram_login,
              created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

    return updatedUsers[0] ? mapUserRowToUser(updatedUsers[0]) : null;
  },

  async getUserById(id: string): Promise<User | null> {
    const [users] = await db.query<UserRow[]>(
      `SELECT id, name, is_admin, telegram_login,
              created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );
    return users[0] ? mapUserRowToUser(users[0]) : null;
  },

  async getUsers(): Promise<User[]> {
    const [users] = await db.query<UserRow[]>(
      `SELECT id, name, is_admin, telegram_login,
              created_at, updated_at
       FROM users`
    );
    return users.map(mapUserRowToUser);
  },

  async login(telegramLogin: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const [users] = await db.query<(UserRow & { password_hash: string })[]>(
        `SELECT id, name, password_hash, is_admin, 
                telegram_login, created_at, updated_at
         FROM users WHERE telegram_login = ?`,
        [telegramLogin]
      );

      const user = users[0];
      if (!user) {
        console.log('User not found:', telegramLogin);
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        console.log('Invalid password for user:', telegramLogin);
        return null;
      }

      const { password_hash, ...userRow } = user;
      const mappedUser = mapUserRowToUser(userRow);
      const token = jwt.sign(
        { id: mappedUser.id, telegramLogin: mappedUser.telegramLogin, isAdmin: mappedUser.isAdmin },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      return { user: mappedUser, token };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  async deleteUser(id: string): Promise<void> {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
  }
}; 