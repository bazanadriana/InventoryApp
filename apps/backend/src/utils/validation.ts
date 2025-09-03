import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate<T extends z.ZodTypeAny>(schema: T, where: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as any)[where]);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }
    (req as any)[where] = result.data;
    next();
  };
}