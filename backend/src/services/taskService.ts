import { Task, TaskStatus } from '../types';
import db from '../db';

export const taskService = {
  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Получаем максимальную позицию для текущего статуса и доски
      const maxPosition = await client.query(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = $1 AND status = $2`,
        [data.boardId, data.status]
      );
      
      const position = maxPosition.rows[0].max_pos + 1;
      
      const taskResult = await client.query(
        `INSERT INTO tasks (title, description, status, position, board_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.title, data.description, data.status, position, data.boardId]
      );
      
      const task = taskResult.rows[0];
      
      if (data.assignees) {
        await Promise.all(data.assignees.map((user: { id: string }) =>
          client.query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)`,
            [task.id, user.id]
          )
        ));
      }
      
      await client.query('COMMIT');
      return task;
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
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Обновляем основные поля задачи
      const taskResult = await client.query(
        `UPDATE tasks 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description)
         WHERE id = $3
         RETURNING *`,
        [data.title, data.description, id]
      );

      // Если переданы исполнители, обновляем их
      if (data.assignees) {
        // Удаляем старых исполнителей
        await client.query(
          'DELETE FROM task_assignees WHERE task_id = $1',
          [id]
        );

        // Добавляем новых исполнителей
        if (data.assignees.length > 0) {
          await Promise.all(data.assignees.map(user =>
            client.query(
              'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
              [id, user.id]
            )
          ));
        }
      }

      // Получаем обновленных исполнителей
      const assigneesResult = await client.query(
        `SELECT u.* FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = $1`,
        [id]
      );

      await client.query('COMMIT');

      return {
        ...taskResult.rows[0],
        assignees: assigneesResult.rows
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async getBoardTasksByUser(boardId: string): Promise<{ [userKey: string]: Task[] }> {
    const result = await db.query(
      `SELECT 
        u.id as user_id,
        u.telegram_login as telegram_login,
        json_agg(
          json_build_object(
            'id', t.id,
            'title', t.title,
            'description', t.description,
            'status', t.status,
            'position', t.position,
            'boardId', t.board_id,
            'createdAt', t.created_at,
            'assignees', (
              SELECT json_agg(
                json_build_object(
                  'id', u2.id,
                  'name', u2.name,
                  'isAdmin', u2.is_admin,
                  'telegramLogin', u2.telegram_login
                )
              )
              FROM task_assignees ta2
              JOIN users u2 ON ta2.user_id = u2.id
              WHERE ta2.task_id = t.id
            )
          )
        ) FILTER (WHERE t.id IS NOT NULL) as tasks
      FROM users u
      JOIN board_users bu ON u.id = bu.user_id
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id AND t.board_id = $1
      WHERE bu.board_id = $1
      GROUP BY u.id, u.telegram_login
      HAVING COUNT(t.id) > 0`,
      [boardId]
    );

    const tasksByUser: { [userKey: string]: Task[] } = {};
    result.rows.forEach(row => {
      const key = row.telegram_login || row.user_id;
      if (row.tasks && row.tasks.length > 0) {
        tasksByUser[key] = row.tasks;
      }
    });

    return tasksByUser;
  }
}; 