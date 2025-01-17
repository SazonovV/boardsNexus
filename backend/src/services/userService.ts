import { User } from '../types';
import db from '../db';
import bcrypt from 'bcrypt';

export const userService = {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const result = await db.query(
      `INSERT INTO users (email, name, password_hash, is_admin, telegram_login)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, is_admin as "isAdmin", telegram_login as "telegramLogin", 
                created_at as "createdAt", updated_at as "updatedAt"`,
      [userData.email, userData.name, passwordHash, userData.isAdmin, userData.telegramLogin]
    );
    
    return result.rows[0];
  },

  async getUsers(): Promise<User[]> {
    const result = await db.query(
      `SELECT id, email, name, is_admin as "isAdmin", telegram_login as "telegramLogin",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM users`
    );
    return result.rows;
  },

  async login(email: string, password: string): Promise<User | null> {
    const result = await db.query(
      `SELECT id, email, name, password_hash, is_admin as "isAdmin", 
              telegram_login as "telegramLogin", created_at as "createdAt", 
              updated_at as "updatedAt"
       FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    delete user.password_hash;
    return user;
  },

  async deleteUser(id: string): Promise<void> {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}; 