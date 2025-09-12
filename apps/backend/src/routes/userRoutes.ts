import { Router, type Request, type Response } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth/jwt.js';

const router = Router();

/**
 * GET /api/users/me
 * Return the currently authenticated user's profile.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // support either req.user.id or req.userId depending on middleware
    const userId =
      (req as any)?.user?.id ??
      (req as any)?.userId ??
      null;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows } = await pool.query(
      `
      SELECT
        u."id",
        u."email",
        u."name",
        u."image",
        u."salesforceAccountId",
        u."salesforceContactId",
        u."createdAt",
        u."updatedAt"
      FROM "User" u
      WHERE u."id" = $1
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Respond with the user object directly
    res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/users/me failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** List users with search/sort/paging (basic) */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim() ?? '';
    const page = Math.max(1, Number(req.query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 10)));
    const order = String(req.query.order ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const sort = ['id', 'email', 'name', 'createdAt'].includes(String(req.query.sort))
      ? String(req.query.sort)
      : 'id';

    const term = q ? `%${q}%` : null;

    const totalRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM "User" u
      WHERE ($1::text IS NULL OR u."email" ILIKE $1 OR u."name" ILIKE $1)
      `,
      [term]
    );
    const total = totalRes.rows[0].total as number;

    const { rows } = await pool.query(
      `
      SELECT
        u."id",
        u."email",
        u."name",
        u."image",
        u."createdAt"
      FROM "User" u
      WHERE ($1::text IS NULL OR u."email" ILIKE $1 OR u."name" ILIKE $1)
      ORDER BY ${
        sort === 'email'
          ? 'u."email"'
          : sort === 'name'
          ? 'u."name"'
          : sort === 'createdAt'
          ? 'u."createdAt"'
          : 'u."id"'
      } ${order}
      LIMIT $2 OFFSET $3
      `,
      [term, perPage, (page - 1) * perPage]
    );

    res.json({ users: rows, page, perPage, total });
  } catch (e) {
    console.error('GET /api/users failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
