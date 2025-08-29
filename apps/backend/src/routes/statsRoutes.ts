import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth/jwt.js';

const router = Router();

/** Return table counts for sidebar badges (Prisma Studio style). */
router.get('/counts', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "Inventory")        AS "Inventory",
        (SELECT COUNT(*)::int FROM "InventoryMember")  AS "InventoryMember",
        (SELECT COUNT(*)::int FROM "Item")             AS "Item",
        (SELECT COUNT(*)::int FROM "User")             AS "User"
    `);
    res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/stats/counts failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
