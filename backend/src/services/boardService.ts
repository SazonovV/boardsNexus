import { Board, User } from '../types';
import db, { BoardRow, UserRow } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const mapUserRowToUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  isAdmin: row.is_admin,
  telegramLogin: row.telegram_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapBoardRowToBoard = (row: BoardRow, users: User[] = []): Board => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  users
});

export const boardService = {
  async createBoard(data: { title: string, userIds: string[] }): Promise<Board> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Проверяем существование пользователей и убираем дубликаты
      const uniqueUserIds = [...new Set(data.userIds)];
      const placeholders = uniqueUserIds.map(() => '?').join(',');
      const [userCheck] = await connection.query<UserRow[]>(
        `SELECT id FROM users WHERE id IN (${placeholders})`,
        uniqueUserIds
      );
      
      if (!Array.isArray(userCheck) || userCheck.length !== uniqueUserIds.length) {
        throw new Error('Some users not found');
      }

      // Генерируем UUID для новой доски
      const [[{ boardId }]] = await connection.query<(RowDataPacket & { boardId: string })[]>(
        'SELECT UUID() as boardId'
      );

      // Создаем доску с сгенерированным UUID
      await connection.query<ResultSetHeader>(
        'INSERT INTO boards (id, title) VALUES (?, ?)',
        [boardId, data.title]
      );
      
      // Используем уникальные ID пользователей
      await Promise.all(uniqueUserIds.map(userId =>
        connection.query(
          'INSERT INTO board_users (board_id, user_id) VALUES (?, ?)',
          [boardId, userId]
        )
      ));

      // Получаем пользователей доски
      const [usersResult] = await connection.query<UserRow[]>(
        `SELECT u.id, u.name, u.is_admin, 
                u.telegram_login, u.created_at, u.updated_at
         FROM users u
         JOIN board_users bu ON u.id = bu.user_id
         WHERE bu.board_id = ?`,
        [boardId]
      );

      const [boardRows] = await connection.query<BoardRow[]>(
        'SELECT * FROM boards WHERE id = ?',
        [boardId]
      );
      
      await connection.commit();

      return mapBoardRowToBoard(boardRows[0], usersResult.map(mapUserRowToUser));
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getBoards(userId: string): Promise<Board[]> {
    const [result] = await db.query<(BoardRow & { users_json: string | null })[]>(
      `SELECT b.*, 
         COALESCE(
           JSON_ARRAYAGG(
             JSON_OBJECT(
               'id', u.id,
               'name', u.name,
               'is_admin', u.is_admin,
               'telegram_login', u.telegram_login,
               'created_at', u.created_at,
               'updated_at', u.updated_at
             )
           ),
           '[]'
         ) as users_json
       FROM boards b
       LEFT JOIN board_users bu ON b.id = bu.board_id
       LEFT JOIN users u ON bu.user_id = u.id
       WHERE EXISTS (
         SELECT 1 FROM board_users 
         WHERE board_id = b.id AND user_id = ?
       )
       GROUP BY b.id, b.title, b.created_at, b.updated_at`,
      [userId]
    );
    
    return result.map(row => {
      const users = JSON.parse(row.users_json || '[]').map((u: any) => ({
        id: u.id,
        name: u.name,
        isAdmin: u.is_admin,
        telegramLogin: u.telegram_login,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }));
      return mapBoardRowToBoard(row, users);
    });
  },

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      if (data.title) {
        await connection.query(
          'UPDATE boards SET title = ? WHERE id = ?',
          [data.title, id]
        );
      }

      if (data.users) {
        await connection.query(
          'DELETE FROM board_users WHERE board_id = ?',
          [id]
        );

        await Promise.all(data.users.map((user: User) =>
          connection.query(
            'INSERT INTO board_users (board_id, user_id) VALUES (?, ?)',
            [id, user.id]
          )
        ));
      }

      const [boardRows] = await connection.query<BoardRow[]>(
        'SELECT * FROM boards WHERE id = ?',
        [id]
      );

      const [usersResult] = await connection.query<UserRow[]>(
        `SELECT u.id, u.name, u.is_admin, 
                u.telegram_login, u.created_at, u.updated_at
         FROM users u
         JOIN board_users bu ON u.id = bu.user_id
         WHERE bu.board_id = ?`,
        [id]
      );

      await connection.commit();
      return mapBoardRowToBoard(boardRows[0], usersResult.map(mapUserRowToUser));
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

  async addUserToBoard(boardId: string, user: User): Promise<void> {
    await db.query(
      'INSERT INTO board_users (board_id, user_id) VALUES (?, ?)',
      [boardId, user.id]
    );
  },

  async getBoardUsers(boardId: string): Promise<User[]> {
    const [result] = await db.query<UserRow[]>(
      `SELECT u.id, u.name, u.is_admin, 
              u.telegram_login, u.created_at, u.updated_at
       FROM users u
       JOIN board_users bu ON u.id = bu.user_id
       WHERE bu.board_id = ?`,
      [boardId]
    );
    return result.map(mapUserRowToUser);
  }
}; 