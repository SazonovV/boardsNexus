import { Task, TaskStatus } from '../types';
import db from '../db';
import { CreatePublicTaskRequest } from '../routes/publicRoutes';

interface TaskSummary {
  title: string;
  description: string;
  status: TaskStatus;
}

export const taskService = {
  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { authorTelegramLogin: string }): Promise<Task> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Получаем id автора по telegram_login
      const [authorResult] = await connection.query(
        'SELECT id FROM users WHERE telegram_login = ?',
        [data.authorTelegramLogin]
      );
      
      if (!Array.isArray(authorResult) || authorResult.length === 0) {
        throw new Error('Author not found');
      }
      
      const authorId = authorResult[0].id;
      
      // Получаем максимальную позицию для текущего статуса и доски
      const [maxPosition] = await connection.query(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = ? AND status = ?`,
        [data.boardId, data.status]
      );
      
      const position = maxPosition[0].max_pos + 1;
      
      const [taskResult] = await connection.query(
        `INSERT INTO tasks (title, description, status, position, board_id, author_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.title, data.description, data.status, position, data.boardId, authorId]
      );
      
      const taskId = (taskResult as any).insertId;
      
      if (data.assignees) {
        await Promise.all(data.assignees.map((user: { id: string }) =>
          connection.query(
            'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
            [taskId, user.id]
          )
        ));
      }

      // Получаем информацию об авторе
      const [authorInfoResult] = await connection.query(
        `SELECT id, name, is_admin as isAdmin, telegram_login as telegramLogin
         FROM users WHERE id = ?`,
        [authorId]
      );

      // Получаем информацию об исполнителях
      const [assigneesResult] = await connection.query(
        `SELECT u.id, u.name, u.is_admin as isAdmin, u.telegram_login as telegramLogin
         FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = ?`,
        [taskId]
      );
      
      await connection.commit();

      const [taskDetails] = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      return {
        ...taskDetails[0],
        author: authorInfoResult[0],
        assignees: assigneesResult
      };
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async updateTaskStatus(taskId: string, status: TaskStatus, position: number): Promise<Task> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Сдвигаем позиции существующих задач
      await connection.query(
        `UPDATE tasks
         SET position = position + 1
         WHERE board_id = (SELECT board_id FROM tasks WHERE id = ?)
           AND status = ?
           AND position >= ?`,
        [taskId, status, position]
      );
      
      // Обновляем статус и позицию задачи
      await connection.query(
        `UPDATE tasks
         SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, position, taskId]
      );

      const [taskResult] = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      const [assigneesResult] = await connection.query(
        `SELECT u.id, u.name, u.is_admin as isAdmin, u.telegram_login as telegramLogin
         FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = ?`,
        [taskId]
      );
      
      await connection.commit();
      
      return {
        ...taskResult[0],
        assignees: assigneesResult
      };
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getBoardTasks(boardId: string): Promise<Task[]> {
    const [result] = await db.query(
      `SELECT t.*,
        JSON_OBJECT(
          'id', u.id,
          'name', u.name,
          'isAdmin', u.is_admin,
          'telegramLogin', u.telegram_login
        ) as author,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', u2.id,
            'name', u2.name,
            'isAdmin', u2.is_admin,
            'telegramLogin', u2.telegram_login
          )
        ) as assignees
      FROM tasks t
      LEFT JOIN users u ON t.author_id = u.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u2 ON ta.user_id = u2.id
      WHERE t.board_id = ?
      GROUP BY t.id
      ORDER BY t.position`,
      [boardId]
    );
    
    return result.map((task: any) => ({
      ...task,
      author: JSON.parse(task.author),
      assignees: JSON.parse(task.assignees)
    }));
  },

  async deleteTask(id: string): Promise<void> {
    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Обновляем основные поля задачи
      await connection.query(
        `UPDATE tasks 
         SET title = COALESCE(?, title),
             description = COALESCE(?, description)
         WHERE id = ?`,
        [data.title, data.description, id]
      );

      // Если переданы исполнители, обновляем их
      if (data.assignees) {
        // Удаляем старых исполнителей
        await connection.query(
          'DELETE FROM task_assignees WHERE task_id = ?',
          [id]
        );

        // Добавляем новых исполнителей
        if (data.assignees.length > 0) {
          await Promise.all(data.assignees.map(user =>
            connection.query(
              'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
              [id, user.id]
            )
          ));
        }
      }

      const [taskResult] = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [id]
      );

      const [assigneesResult] = await connection.query(
        `SELECT u.id, u.name, u.is_admin as isAdmin, u.telegram_login as telegramLogin
         FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = ?`,
        [id]
      );

      await connection.commit();

      return {
        ...taskResult[0],
        assignees: assigneesResult
      };
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getBoardTasksByUser(boardId: string): Promise<{ [userKey: string]: Task[] }> {
    const [result] = await db.query(
      `SELECT 
        u.id as user_id,
        u.telegram_login,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', t.id,
            'title', t.title,
            'description', t.description,
            'status', t.status,
            'position', t.position,
            'boardId', t.board_id,
            'createdAt', t.created_at,
            'assignees', (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
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
        ) as tasks
      FROM users u
      JOIN board_users bu ON u.id = bu.user_id
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id AND t.board_id = ?
      WHERE bu.board_id = ?
      GROUP BY u.id, u.telegram_login
      HAVING COUNT(t.id) > 0`,
      [boardId, boardId]
    );

    const tasksByUser: { [userKey: string]: Task[] } = {};
    result.forEach((row: any) => {
      const key = row.telegram_login || row.user_id;
      if (row.tasks) {
        tasksByUser[key] = JSON.parse(row.tasks);
      }
    });

    return tasksByUser;
  },

  async createPublicTask(data: CreatePublicTaskRequest): Promise<Task> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Получаем id автора по telegram_login
      const [authorResult] = await connection.query(
        'SELECT id FROM users WHERE telegram_login = ?',
        [data.authorTelegramLogin]
      );
      
      if (!Array.isArray(authorResult) || authorResult.length === 0) {
        throw new Error('Author not found');
      }
      
      const authorId = authorResult[0].id;
      
      // Получаем максимальную позицию
      const [maxPosition] = await connection.query(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = ? AND status = ?`,
        [data.boardId, data.status]
      );
      
      const position = maxPosition[0].max_pos + 1;
      
      // Создаем задачу
      const [taskResult] = await connection.query(
        `INSERT INTO tasks (title, description, status, position, board_id, author_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.title, data.description, data.status, position, data.boardId, authorId]
      );
      
      const taskId = (taskResult as any).insertId;

      // Добавляем исполнителей, если они указаны
      if (data.assignees && data.assignees.length > 0) {
        const assigneeIds = await Promise.all(
          data.assignees.map(async (assignee) => {
            const [result] = await connection.query(
              'SELECT id FROM users WHERE telegram_login = ?',
              [assignee.telegramLogin]
            );
            return result[0]?.id;
          })
        );

        const validAssigneeIds = assigneeIds.filter(id => id);
        
        await Promise.all(
          validAssigneeIds.map(assigneeId =>
            connection.query(
              'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
              [taskId, assigneeId]
            )
          )
        );
      }

      const [taskDetails] = await connection.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      await connection.commit();
      return taskDetails[0];
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getPublicBoardTasksSummary(boardId: string): Promise<{ [telegramLogin: string]: TaskSummary[] }> {
    const [result] = await db.query(
      `SELECT 
        u.telegram_login,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'title', t.title,
            'description', t.description,
            'status', t.status
          )
        ) as tasks
      FROM users u
      JOIN board_users bu ON u.id = bu.user_id
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id AND t.board_id = ?
      WHERE bu.board_id = ?
      GROUP BY u.telegram_login
      HAVING COUNT(t.id) > 0`,
      [boardId, boardId]
    );

    const tasksByUser: { [key: string]: TaskSummary[] } = {};
    result.forEach((row: any) => {
      if (row.tasks) {
        tasksByUser[row.telegram_login] = JSON.parse(row.tasks);
      }
    });

    return tasksByUser;
  }
}; 