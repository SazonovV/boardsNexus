import { Board, User } from '../types';
import db from '../db';

export const boardService = {
  async createBoard(data: { title: string, userIds: string[] }): Promise<Board> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Проверяем существование пользователей и убираем дубликаты
      const uniqueUserIds = [...new Set(data.userIds)];
      const [userCheck] = await connection.query(
        'SELECT id FROM users WHERE id IN (?)',
        [uniqueUserIds]
      );
      
      if (!Array.isArray(userCheck) || userCheck.length !== uniqueUserIds.length) {
        throw new Error('Some users not found');
      }

      const [boardResult] = await connection.query(
        'INSERT INTO boards (title) VALUES (?)',
        [data.title]
      );
      
      const boardId = (boardResult as any).insertId;
      
      // Используем уникальные ID пользователей
      await Promise.all(uniqueUserIds.map(userId =>
        connection.query(
          'INSERT INTO board_users (board_id, user_id) VALUES (?, ?)',
          [boardId, userId]
        )
      ));

      // Получаем пользователей доски
      const [usersResult] = await connection.query(
        `SELECT u.id, u.name, u.is_admin as isAdmin, 
                u.telegram_login as telegramLogin
         FROM users u
         JOIN board_users bu ON u.id = bu.user_id
         WHERE bu.board_id = ?`,
        [boardId]
      );
      
      await connection.commit();

      return {
        id: boardId,
        title: data.title,
        users: usersResult as User[]
      };
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getBoards(userId: string): Promise<Board[]> {
    const [result] = await db.query(
      `SELECT b.*,
         JSON_ARRAYAGG(
           JSON_OBJECT(
             'id', u2.id,
             'name', u2.name,
             'isAdmin', u2.is_admin,
             'telegramLogin', u2.telegram_login
           )
         ) as users
       FROM boards b
       JOIN board_users bu ON b.id = bu.board_id
       JOIN users u2 ON bu2.user_id = u2.id
       WHERE bu.user_id = ?
       GROUP BY b.id`,
      [userId]
    );
    
    return result as Board[];
  },

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const [boardResult] = await connection.query(
        'UPDATE boards SET title = COALESCE(?, title) WHERE id = ?',
        [data.title, id]
      );

      if (data.users) {
        await connection.query(
          'DELETE FROM board_users WHERE board_id = ?',
          [id]
        );

        await Promise.all(data.users.map((user: { id: string }) =>
          connection.query(
            'INSERT INTO board_users (board_id, user_id) VALUES (?, ?)',
            [id, user.id]
          )
        ));
      }

      await connection.commit();

      const [updatedBoard] = await connection.query(
        'SELECT * FROM boards WHERE id = ?',
        [id]
      );
      return (updatedBoard as any)[0];
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async deleteBoard(id: string): Promise<void> {
    await db.query('DELETE FROM boards WHERE id = ?', [id]);
  },

  async addUserToBoard(boardId: string, user: { id: string }): Promise<void> {
    await db.query(
      'INSERT INTO board_users (board_id, user_id) VALUES (?, ?)',
      [boardId, user.id]
    );
  },

  async getBoardUsers(boardId: string): Promise<User[]> {
    const [result] = await db.query(
      `SELECT u.id, u.name, u.is_admin as isAdmin, 
              u.telegram_login as telegramLogin
       FROM users u
       JOIN board_users bu ON u.id = bu.user_id
       WHERE bu.board_id = ?`,
      [boardId]
    );
    return result as User[];
  }
}; 