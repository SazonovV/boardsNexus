import { Board, User } from '../types';
import db from '../db';


export const boardService = {
  async createBoard(data: { title: string, userIds: string[] }): Promise<Board> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Проверяем существование пользователей и убираем дубликаты
      const uniqueUserIds = [...new Set(data.userIds)];
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = ANY($1)',
        [uniqueUserIds]
      );
      
      if (userCheck.rows.length !== uniqueUserIds.length) {
        throw new Error('Some users not found');
      }

      const boardResult = await client.query(
        `INSERT INTO boards (title) VALUES ($1) RETURNING *`,
        [data.title]
      );
      
      const board = boardResult.rows[0];
      
      // Используем уникальные ID пользователей
      await Promise.all(uniqueUserIds.map(userId =>
        client.query(
          `INSERT INTO board_users (board_id, user_id) VALUES ($1, $2)`,
          [board.id, userId]
        )
      ));

      // Получаем пользователей доски
      const usersResult = await client.query(
        `SELECT u.id, u.name, u.is_admin as "isAdmin", 
                u.telegram_login as "telegramLogin"
         FROM users u
         JOIN board_users bu ON u.id = bu.user_id
         WHERE bu.board_id = $1`,
        [board.id]
      );
      
      await client.query('COMMIT');

      return {
        ...board,
        users: usersResult.rows
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async getBoards(userId: string): Promise<Board[]> {
    const result = await db.query(
      `SELECT b.*,
         (
           SELECT json_agg(
             json_build_object(
               'id', u2.id,
               'name', u2.name,
               'isAdmin', u2.is_admin,
               'telegramLogin', u2.telegram_login
             )
           )
           FROM board_users bu2
           JOIN users u2 ON bu2.user_id = u2.id
           WHERE bu2.board_id = b.id
         ) as users
       FROM boards b
       JOIN board_users bu ON b.id = bu.board_id
       WHERE bu.user_id = $1
       GROUP BY b.id`,
      [userId]
    );
    
    return result.rows;
  },

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const boardResult = await client.query(
        `UPDATE boards SET title = COALESCE($1, title)
         WHERE id = $2 RETURNING *`,
        [data.title, id]
      );

      if (data.users) {
        await client.query(
          `DELETE FROM board_users WHERE board_id = $1`,
          [id]
        );

        await Promise.all(data.users.map((user: { id: string }) =>
          client.query(
            `INSERT INTO board_users (board_id, user_id) VALUES ($1, $2)`,
            [id, user.id]
          )
        ));
      }

      await client.query('COMMIT');
      return boardResult.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async deleteBoard(id: string): Promise<void> {
    await db.query('DELETE FROM boards WHERE id = $1', [id]);
  },

  async addUserToBoard(boardId: string, user: { id: string }): Promise<void> {
    await db.query(
      'INSERT INTO board_users (board_id, user_id) VALUES ($1, $2)',
      [boardId, user.id]
    );
  },

  async getBoardUsers(boardId: string): Promise<User[]> {
    const result = await db.query(
      `SELECT u.id, u.name, u.is_admin as "isAdmin", 
              u.telegram_login as "telegramLogin"
       FROM users u
       JOIN board_users bu ON u.id = bu.user_id
       WHERE bu.board_id = $1`,
      [boardId]
    );
    return result.rows;
  }
}; 