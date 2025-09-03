import type { Response } from 'express';

export function setAuthCookie(res: Response, token: string) {
  res.cookie('ia_jwt', token, {
    httpOnly: true,
    secure: true,          // required for SameSite=None
    sameSite: 'none',      // allow Netlify (different site) to send it
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });
}
