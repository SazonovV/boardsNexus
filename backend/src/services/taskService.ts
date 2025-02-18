import { Task, TaskStatus, User } from '../types';
import db, { TaskRow, UserRow } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { CreatePublicTaskRequest } from '../routes/publicRoutes';

interface TaskSummary {
  title: string;
  description: string;
  status: TaskStatus;
}

interface MaxPositionResult extends RowDataPacket {
  max_pos: number;
}

const mapUserRowToUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  isAdmin: row.is_admin,
  telegramLogin: row.telegram_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapTaskRowToTask = (row: TaskRow, author: User | null, assignees: User[] = []): Task => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status as TaskStatus,
  boardId: row.board_id,
  position: row.position,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author,
  assignees
});

export const taskService = {
  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { authorTelegramLogin: string }): Promise<Task> {
    // Validate input data
    if (!data.title || !data.boardId || !data.authorTelegramLogin) {
      throw new Error('Missing required fields: title, boardId, or authorTelegramLogin');
    }

    if (!data.status) {
      data.status = TaskStatus.NEW;
    }

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Получаем id автора по telegram_login
      const [authorResult] = await connection.query<UserRow[]>(
        'SELECT * FROM users WHERE telegram_login = ?',
        [data.authorTelegramLogin]
      );
      
      if (authorResult.length === 0) {
        throw new Error('Author not found');
      }
      
      const author = mapUserRowToUser(authorResult[0]);
      
      // Получаем максимальную позицию для текущего статуса и доски
      const [maxPosition] = await connection.query<MaxPositionResult[]>(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = ? AND status = ?`,
        [data.boardId, data.status]
      );
      
      const position = maxPosition[0].max_pos + 1;
      
      // Генерируем UUID для новой задачи
      const [[{ taskId }]] = await connection.query<(RowDataPacket & { taskId: string })[]>(
        'SELECT UUID() as taskId'
      );

      // Создаем задачу с сгенерированным UUID
      await connection.query(
        `INSERT INTO tasks (id, title, description, status, position, board_id, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [taskId, data.title, data.description, data.status, position, data.boardId, author.id]
      );
      
      if (data.assignees?.length) {
        await Promise.all(data.assignees.map(user =>
          connection.query(
            'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
            [taskId, user.id]
          )
        ));
      }

      // Получаем информацию об исполнителях
      const [assigneesResult] = await connection.query<UserRow[]>(
        `SELECT u.* FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = ?`,
        [taskId]
      );

      const [taskDetails] = await connection.query<TaskRow[]>(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      if (!taskDetails[0]) {
        throw new Error('Failed to create task: Task not found after insertion');
      }

      await connection.commit();

      return mapTaskRowToTask(
        taskDetails[0],
        author,
        assigneesResult.map(mapUserRowToUser)
      );
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
      
      // Сначала получаем board_id задачи
      const [taskResult] = await connection.query<TaskRow[]>(
        'SELECT board_id FROM tasks WHERE id = ?',
        [taskId]
      );

      if (!taskResult[0]) {
        throw new Error('Task not found');
      }

      const boardId = taskResult[0].board_id;
      
      // Теперь сдвигаем позиции существующих задач
      await connection.query(
        `UPDATE tasks
         SET position = position + 1
         WHERE board_id = ?
           AND status = ?
           AND position >= ?`,
        [boardId, status, position]
      );
      
      // Обновляем статус и позицию задачи
      await connection.query(
        `UPDATE tasks
         SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, position, taskId]
      );

      const [updatedTaskResult] = await connection.query<TaskRow[]>(
        `SELECT t.*, 
                u.id as author_id, u.name as author_name, 
                u.is_admin as author_is_admin, 
                u.telegram_login as author_telegram_login,
                u.created_at as author_created_at,
                u.updated_at as author_updated_at
         FROM tasks t
         LEFT JOIN users u ON t.author_id = u.id
         WHERE t.id = ?`,
        [taskId]
      );

      const [assigneesResult] = await connection.query<UserRow[]>(
        `SELECT u.* FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = ?`,
        [taskId]
      );
      
      await connection.commit();

      const author = updatedTaskResult[0].author_id ? {
        id: updatedTaskResult[0].author_id,
        name: updatedTaskResult[0].author_name,
        isAdmin: updatedTaskResult[0].author_is_admin,
        telegramLogin: updatedTaskResult[0].author_telegram_login,
        createdAt: updatedTaskResult[0].author_created_at,
        updatedAt: updatedTaskResult[0].author_updated_at
      } : null;
      
      return mapTaskRowToTask(
        updatedTaskResult[0],
        author,
        assigneesResult.map(mapUserRowToUser)
      );
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getBoardTasks(boardId: string): Promise<Task[]> {
    const [tasks] = await db.query<TaskRow[]>(
      `SELECT t.*, 
              u.id as author_id, u.name as author_name, 
              u.is_admin as author_is_admin, 
              u.telegram_login as author_telegram_login,
              u.created_at as author_created_at,
              u.updated_at as author_updated_at,
              COALESCE(
                JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', u2.id,
                    'name', u2.name,
                    'is_admin', u2.is_admin,
                    'telegram_login', u2.telegram_login,
                    'created_at', u2.created_at,
                    'updated_at', u2.updated_at
                  )
                ),
                '[]'
              ) as assignees_json
       FROM tasks t
       LEFT JOIN users u ON t.author_id = u.id
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN users u2 ON ta.user_id = u2.id
       WHERE t.board_id = ?
       GROUP BY t.id, t.title, t.description, t.status, t.position, t.board_id, t.created_at, t.updated_at,
                u.id, u.name, u.is_admin, u.telegram_login, u.created_at, u.updated_at
       ORDER BY t.position`,
      [boardId]
    );
    
    return tasks.map(task => {
      const author = task.author_id ? {
        id: task.author_id,
        name: task.author_name,
        isAdmin: task.author_is_admin,
        telegramLogin: task.author_telegram_login,
        createdAt: task.author_created_at,
        updatedAt: task.author_updated_at
      } : null;

      const assignees = JSON.parse(task.assignees_json || '[]').map((u: any) => ({
        id: u.id,
        name: u.name,
        isAdmin: u.is_admin,
        telegramLogin: u.telegram_login,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }));

      return mapTaskRowToTask(task, author, assignees);
    });
  },

  async deleteTask(id: string): Promise<void> {
    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Обновляем основные поля задачи
      if (data.title || data.description) {
        await connection.query(
          `UPDATE tasks 
           SET title = COALESCE(?, title),
               description = COALESCE(?, description)
           WHERE id = ?`,
          [data.title, data.description, id]
        );
      }

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

      const [taskResult] = await connection.query<TaskRow[]>(
        `SELECT t.*, 
                u.id as author_id, u.name as author_name, 
                u.is_admin as author_is_admin, 
                u.telegram_login as author_telegram_login,
                u.created_at as author_created_at,
                u.updated_at as author_updated_at
         FROM tasks t
         LEFT JOIN users u ON t.author_id = u.id
         WHERE t.id = ?`,
        [id]
      );

      const [assigneesResult] = await connection.query<UserRow[]>(
        `SELECT u.* FROM users u
         JOIN task_assignees ta ON u.id = ta.user_id
         WHERE ta.task_id = ?`,
        [id]
      );

      await connection.commit();

      const author = taskResult[0].author_id ? {
        id: taskResult[0].author_id,
        name: taskResult[0].author_name,
        isAdmin: taskResult[0].author_is_admin,
        telegramLogin: taskResult[0].author_telegram_login,
        createdAt: taskResult[0].author_created_at,
        updatedAt: taskResult[0].author_updated_at
      } : null;

      return mapTaskRowToTask(
        taskResult[0],
        author,
        assigneesResult.map(mapUserRowToUser)
      );
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getBoardTasksByUser(boardId: string): Promise<{ [userKey: string]: Task[] }> {
    const [result] = await db.query<(UserRow & { tasks_json: string })[]>(
      `SELECT 
        u.id, u.name, u.is_admin, u.telegram_login,
        u.created_at, u.updated_at,
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', t.id,
              'title', t.title,
              'description', t.description,
              'status', t.status,
              'position', t.position,
              'board_id', t.board_id,
              'created_at', t.created_at,
              'updated_at', t.updated_at,
              'author', JSON_OBJECT(
                'id', au.id,
                'name', au.name,
                'is_admin', au.is_admin,
                'telegram_login', au.telegram_login,
                'created_at', au.created_at,
                'updated_at', au.updated_at
              ),
              'assignees', COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', u2.id,
                      'name', u2.name,
                      'is_admin', u2.is_admin,
                      'telegram_login', u2.telegram_login,
                      'created_at', u2.created_at,
                      'updated_at', u2.updated_at
                    )
                  )
                  FROM task_assignees ta2
                  JOIN users u2 ON ta2.user_id = u2.id
                  WHERE ta2.task_id = t.id
                ),
                '[]'
              )
            )
          ),
          '[]'
        ) as tasks_json
      FROM users u
      JOIN board_users bu ON u.id = bu.user_id
      LEFT JOIN task_assignees ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id AND t.board_id = ?
      LEFT JOIN users au ON t.author_id = au.id
      WHERE bu.board_id = ?
      GROUP BY u.id, u.name, u.is_admin, u.telegram_login, u.created_at, u.updated_at
      HAVING COUNT(t.id) > 0`,
      [boardId, boardId]
    );

    const tasksByUser: { [userKey: string]: Task[] } = {};
    result.forEach(row => {
      const user = mapUserRowToUser(row);
      const key = user.telegramLogin || user.id;
      if (row.tasks_json) {
        const tasks = JSON.parse(row.tasks_json).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          position: t.position,
          boardId: t.board_id,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          author: t.author ? {
            id: t.author.id,
            name: t.author.name,
            isAdmin: t.author.is_admin,
            telegramLogin: t.author.telegram_login,
            createdAt: t.author.created_at,
            updatedAt: t.author.updated_at
          } : null,
          assignees: Array.isArray(t.assignees) ? t.assignees.map((a: any) => ({
            id: a.id,
            name: a.name,
            isAdmin: a.is_admin,
            telegramLogin: a.telegram_login,
            createdAt: a.created_at,
            updatedAt: a.updated_at
          })) : []
        }));
        tasksByUser[key] = tasks;
      }
    });

    return tasksByUser;
  },

  async createPublicTask(data: CreatePublicTaskRequest): Promise<Task> {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Получаем id автора по telegram_login
      const [authorResult] = await connection.query<UserRow[]>(
        'SELECT * FROM users WHERE telegram_login = ?',
        [data.authorTelegramLogin]
      );
      
      if (authorResult.length === 0) {
        throw new Error('Author not found');
      }
      
      const author = mapUserRowToUser(authorResult[0]);
      
      // Получаем максимальную позицию
      const [maxPosition] = await connection.query<MaxPositionResult[]>(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = ? AND status = ?`,
        [data.boardId, data.status]
      );
      
      const position = maxPosition[0].max_pos + 1;
      
      // Генерируем UUID для новой задачи
      const [[{ taskId }]] = await connection.query<(RowDataPacket & { taskId: string })[]>(
        'SELECT UUID() as taskId'
      );
      
      // Создаем задачу с сгенерированным UUID
      await connection.query(
        `INSERT INTO tasks (id, title, description, status, position, board_id, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [taskId, data.title, data.description, data.status, position, data.boardId, author.id]
      );

      // Добавляем исполнителей, если они указаны
      const assignees: User[] = [];
      if (data.assignees?.length) {
        for (const assignee of data.assignees) {
          const [result] = await connection.query<UserRow[]>(
            'SELECT * FROM users WHERE telegram_login = ?',
            [assignee.telegramLogin]
          );
          if (result[0]) {
            const user = mapUserRowToUser(result[0]);
            assignees.push(user);
            await connection.query(
              'INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)',
              [taskId, user.id]
            );
          }
        }
      }

      const [taskDetails] = await connection.query<TaskRow[]>(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      if (!taskDetails[0]) {
        throw new Error('Failed to create task: Task not found after insertion');
      }

      await connection.commit();
      return mapTaskRowToTask(taskDetails[0], author, assignees);
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async getPublicBoardTasksSummary(boardId: string): Promise<{ [telegramLogin: string]: TaskSummary[] }> {
    const [result] = await db.query<(UserRow & { tasks_json: string })[]>(
      `SELECT 
        u.telegram_login,
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'title', t.title,
              'description', t.description,
              'status', t.status
            )
          ),
          '[]'
        ) as tasks_json
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
    result.forEach(row => {
      if (row.tasks_json) {
        tasksByUser[row.telegram_login] = JSON.parse(row.tasks_json);
      }
    });

    return tasksByUser;
  },

  async getMaxPosition(boardId: string, status: TaskStatus): Promise<number> {
    const connection = await db.getConnection();
    
    try {
      const [maxPosition] = await connection.query<MaxPositionResult[]>(
        `SELECT COALESCE(MAX(position), 0) as max_pos
         FROM tasks
         WHERE board_id = ? AND status = ?`,
        [boardId, status]
      );
      
      return maxPosition[0].max_pos;
    } finally {
      connection.release();
    }
  }
}; 