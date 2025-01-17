import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { logger } from './middleware/logger';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);
app.use('/api', routes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment:', {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    JWT_SECRET: process.env.JWT_SECRET?.slice(0, 5) + '...',
  });
}); 