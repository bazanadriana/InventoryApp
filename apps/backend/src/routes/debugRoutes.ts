import { Router } from 'express';
const r = Router();

const BASE = process.env.API_BASE_URL || 'http://localhost:4000';

r.get('/_debug', (_req, res) => {
  res.json({
    google_callback: `${BASE}/auth/google/callback`,
    github_callback: `${BASE}/auth/github/callback`,
    base: BASE,
  });
});

export default r;