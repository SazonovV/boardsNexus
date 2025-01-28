import mysql, { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface MySQLResultRow extends RowDataPacket {
  [column: string]: any;
}

export interface UserRow extends MySQLResultRow {
  id: string;
  name: string;
  is_admin: boolean;
  telegram_login: string;
  created_at: Date;
  updated_at: Date;
}

export interface BoardRow extends MySQLResultRow {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskRow extends MySQLResultRow {
  id: string;
  title: string;
  description: string;
  status: string;
  position: number;
  board_id: string;
  author_id: string;
  created_at: Date;
  updated_at: Date;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

export type QueryResult<T = MySQLResultRow> = [T[], ResultSetHeader];
export default pool; 