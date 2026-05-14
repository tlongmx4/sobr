import jwt from 'jsonwebtoken';

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
  } catch {
    return null;
  }
}