import { Task, TaskStatus } from '../types';
import db from '../db';

export const taskService = {
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const maxPosition = await client.query(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = $1 AND status = $2`,
        [taskData.boardId, taskData.status]
      );
      
      const position = maxPosition.rows[0].max_pos + 1;
      
      const taskResult = await client.query(
        `INSERT INTO tasks (title, description, status, position, board_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [taskData.title, taskData.description, taskData.status, position, taskData.boardId]
      );
      
      const task = taskResult.rows[0];
      
      await Promise.all(taskData.assignees.map(user =>
        client.query(
          `INSERT INTO task_assignees (task_id, user_id)
           VALUES ($1, $2)`,
          [task.id, user.id]
        )
      ));
      
      await client.query('COMMIT');
      
      return {
        ...task,
        assignees: taskData.assignees
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, position: number): Promise<Task> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Сдвигаем позиции существующих задач
      await client.query(
        `UPDATE tasks
         SET position = position + 1
         WHERE board_id = (SELECT board_id FROM tasks WHERE id = $1)
           AND status = $2
           AND position >= $3`,
        [taskId, status, position]
      );
      
      // Обновляем статус и позицию задачи
      const result = await client.query(
        `UPDATE tasks
         SET status = $2, position = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [taskId, status, position]
      );

      const assigneesResult = await client.query(
        `SELECT u.* FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = $1`,
        [taskId]
      );
      
      await client.query('COMMIT');
      
      return {
        ...result.rows[0],
        assignees: assigneesResult.rows
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async getBoardTasks(boardId: string): Promise<Task[]> {
    const result = await db.query(
      `SELECT t.*, json_agg(
         json_build_object(
           'id', u.id,
           'name', u.name,
           'email', u.email,
           'isAdmin', u.is_admin,
           'telegramLogin', u.telegram_login
         )
       ) as assignees
       FROM tasks t
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.board_id = $1
       GROUP BY t.id
       ORDER BY t.position`,
      [boardId]
    );
    
    return result.rows;
  },

  async deleteTask(id: string): Promise<void> {
    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  }
}; 