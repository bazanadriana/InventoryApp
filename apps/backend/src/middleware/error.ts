import { NextFunction, Request, Response } from 'express';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

export function onError(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const code = err?.code ?? 'INTERNAL_ERROR';
  const message = err?.message ?? 'Unexpected error';
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', { status, code, message, stack: err?.stack });
  }
  res.status(status).json({ error: message, code });
}