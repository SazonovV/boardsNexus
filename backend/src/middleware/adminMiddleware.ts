import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    id: string;
    telegramLogin: string;
    isAdmin: boolean;
}

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  req.user = decoded;
  if (!decoded?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}; 