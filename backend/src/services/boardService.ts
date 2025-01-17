import { Board } from '../types';
import db from '../db';


export const boardService = {
  async createBoard(data: { title: string, userIds: string[] }): Promise<Board> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const boardResult = await client.query(
        `INSERT INTO boards (title) VALUES ($1) RETURNING *`,
        [data.title]
      );
      
      const board = boardResult.rows[0];
      
      await Promise.all(data.userIds.map(userId => {
        console.log(board.id, userId);
        return client.query(
          `INSERT INTO board_users (board_id, user_id) VALUES ($1, $2)`,
          [board.id, userId]
        )
      }
      ));
      
      await client.query('COMMIT');
      return board;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async getBoards(userId: string): Promise<Board[]> {
    const result = await db.query(
      `SELECT b.*, json_agg(
         json_build_object(
           'id', u.id,
           'name', u.name,
           'email', u.email,
           'isAdmin', u.is_admin,
           'telegramLogin', u.telegram_login
         )
       ) as users
       FROM boards b
       JOIN board_users bu ON b.id = bu.board_id
       JOIN users u ON bu.user_id = u.id
       WHERE EXISTS (
         SELECT 1 FROM board_users
         WHERE board_id = b.id AND user_id = $1
       )
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
  }
}; 