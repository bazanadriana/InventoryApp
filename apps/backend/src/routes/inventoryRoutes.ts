// apps/backend/src/routes/inventoryRoutes.ts
import { requireAuth } from '../auth/jwt.js';
import { Router, type Request, type Response } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';

const router = Router();

/** Get authenticated user id as a number */
function getUserIdNum(req: Request): number {
  const u: any = (req as any).user;
  const id = u?.sub ?? u?.userId ?? u?.id;
  const n = Number(id);
  return Number.isFinite(n) ? n : NaN;
}

/** List members of an inventory (read: owner OR any member) */
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });

    const invId = Number(req.params.id);
    const q = (req.query.q as string | undefined)?.trim() ?? '';

    // READ access: owner OR any member
    const canRead = await pool.query(
      `
      SELECT (i."ownerId" = $2)
          OR EXISTS (SELECT 1 FROM "InventoryMember" m
                     WHERE m."inventoryId" = i."id" AND m."userId" = $2) AS "canRead"
      FROM "Inventory" i
      WHERE i."id" = $1
      `,
      [invId, userId]
    );
    if (!canRead.rowCount || !canRead.rows[0].canRead) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const term = q ? `%${q}%` : null;

    const { rows } = await pool.query(
      `
      SELECT
        m."id",
        m."inventoryId",
        m."userId",
        m."role",
        u."email",
        u."name",
        u."image"
      FROM "InventoryMember" m
      JOIN "User" u ON u."id" = m."userId"
      WHERE m."inventoryId" = $1
        AND ($2::text IS NULL OR u."email" ILIKE $2 OR u."name" ILIKE $2)
      ORDER BY COALESCE(u."name",'') ASC, u."email" ASC
      `,
      [invId, term]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /api/inventories/:id/members failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });

    if ('flat' in req.query) {
      const { rows } = await pool.query(
        `
        SELECT DISTINCT
          i."id",
          i."title",
          i."description",
          i."createdAt",
          i."updatedAt",
          COALESCE((
            SELECT COUNT(*)::int
            FROM "Item" it
            WHERE it."inventoryId" = i."id"
          ), 0) AS "itemCount"
        FROM "Inventory" i
        LEFT JOIN "InventoryMember" m ON m."inventoryId" = i."id"
        WHERE i."ownerId" = $1 OR m."userId" = $1
        ORDER BY i."updatedAt" DESC
        `,
        [userId]
      );
      return res.json(rows);
    }

    // owned
    const owned = await pool.query(
      `
      SELECT
        "id",
        "title",
        "description",
        "createdAt",
        "updatedAt",
        COALESCE((
          SELECT COUNT(*)::int FROM "Item" it WHERE it."inventoryId" = "Inventory"."id"
        ), 0) AS "itemCount"
      FROM "Inventory"
      WHERE "ownerId" = $1
      ORDER BY "updatedAt" DESC
      `,
      [userId]
    );

    // write (editor)
    const write = await pool.query(
      `
      SELECT
        i."id",
        i."title",
        i."description",
        i."createdAt",
        i."updatedAt",
        COALESCE((
          SELECT COUNT(*)::int FROM "Item" it WHERE it."inventoryId" = i."id"
        ), 0) AS "itemCount"
      FROM "Inventory" AS i
      JOIN "InventoryMember" AS m
        ON m."inventoryId" = i."id"
       AND LOWER(m."role"::text) = 'editor'
      WHERE m."userId" = $1
      ORDER BY i."updatedAt" DESC
      `,
      [userId]
    );

    res.json({ owned: owned.rows, write: write.rows });
  } catch (e) {
    console.error('GET /api/inventories failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Create inventory (current user becomes owner) */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });

    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const { rows } = await pool.query(
      `
      INSERT INTO "Inventory" ("ownerId", "title", "description")
      VALUES ($1, $2, $3)
      RETURNING "id", "title", "description", "createdAt", "updatedAt", "ownerId"
      `,
      [userId, body.title, body.description ?? null]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/inventories failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Get single inventory (must have read access) */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });
    const invId = Number(req.params.id);

    const { rows } = await pool.query(
      `
      SELECT i.*
           , (i."ownerId" = $2) AS "isOwner"
           , EXISTS (
               SELECT 1 FROM "InventoryMember" m
                WHERE m."inventoryId" = i."id" AND m."userId" = $2
             ) AS "isMember"
           , EXISTS (
               SELECT 1 FROM "InventoryMember" m
                WHERE m."inventoryId" = i."id" AND m."userId" = $2
                  AND LOWER(m."role"::text) = 'editor'
             ) AS "canWrite"
        FROM "Inventory" i
       WHERE i."id" = $1
      `,
      [invId, userId]
    );

    const inv = rows[0];
    if (!inv) return res.status(404).json({ error: 'not_found' });
    if (!(inv.isOwner || inv.isMember)) return res.status(403).json({ error: 'forbidden' });

    res.json(inv);
  } catch (e) {
    console.error('GET /api/inventories/:id failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Add/Update member role (owner only) */
router.post('/:id/members', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });
    const invId = Number(req.params.id);

    const schema = z.object({
      userId: z.coerce.number().int().positive(),
      role: z.union([z.enum(['viewer', 'editor']), z.enum(['VIEWER', 'EDITOR'])]),
    });
    const body = schema.parse(req.body);

    const normalizedRole =
      typeof body.role === 'string' && body.role === body.role.toUpperCase()
        ? body.role
        : body.role.toLowerCase() === 'editor'
        ? 'EDITOR'
        : 'VIEWER';

    // owner check
    const own = await pool.query(
      `SELECT 1 FROM "Inventory" WHERE "id" = $1 AND "ownerId" = $2`,
      [invId, userId]
    );
    if (!own.rowCount) return res.status(403).json({ error: 'forbidden' });

    const { rows } = await pool.query(
      `
      INSERT INTO "InventoryMember" ("inventoryId", "userId", "role")
      VALUES ($1, $2, $3)
      ON CONFLICT ("inventoryId", "userId")
      DO UPDATE SET "role" = EXCLUDED."role"
      RETURNING "inventoryId", "userId", "role"
      `,
      [invId, body.userId, normalizedRole]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error('POST /api/inventories/:id/members failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Create item (write required: owner OR editor) */
router.post('/:id/items', requireAuth, async (req: Request, res: Response) => {
  try {
    const invId = Number(req.params.id);
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });

    const schema = z.object({
      title: z.string().trim().min(1),
      description: z.string().optional(),
      qty: z.coerce.number().int().min(0).optional(),
    });
    const body = schema.parse(req.body);

    // write access: owner or editor
    const can = await pool.query(
      `
      SELECT (i."ownerId" = $2) OR EXISTS (
               SELECT 1 FROM "InventoryMember" m
                WHERE m."inventoryId" = i."id"
                  AND m."userId" = $2
                  AND LOWER(m."role"::text) = 'editor'
             ) AS "canWrite"
        FROM "Inventory" i
       WHERE i."id" = $1
      `,
      [invId, userId]
    );
    if (!can.rowCount || !can.rows[0].canWrite) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // ✅ set timestamps explicitly
    const { rows } = await pool.query(
      `
      INSERT INTO "Item"
        ("inventoryId", "title", "description", "qty", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, $4, NOW(), NOW())
      RETURNING
        "id", "inventoryId", "title", "description", "qty", "createdAt", "updatedAt"
      `,
      [invId, body.title, body.description ?? null, body.qty ?? 0]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/inventories/:id/items failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});


/** List items (read access; supports q/sort/order/page/perPage) */
router.get('/:id/items', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });

    const invId = Number(req.params.id);

    // Check READ access
    const canRead = await pool.query(
      `
      SELECT (i."ownerId" = $2)
          OR EXISTS (
              SELECT 1 FROM "InventoryMember" m
              WHERE m."inventoryId" = i."id" AND m."userId" = $2
          ) AS "canRead"
      FROM "Inventory" i
      WHERE i."id" = $1
      `,
      [invId, userId]
    );
    if (!canRead.rowCount || !canRead.rows[0].canRead) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // validate & normalize query params
    const qp = z
      .object({
        q: z.string().trim().optional().default(''),
        sort: z.enum(['id', 'title', 'qty', 'createdAt', 'updatedAt']).optional().default('id'),
        order: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional().default('desc'),
        page: z.coerce.number().int().positive().optional().default(1),
        perPage: z.coerce.number().int().positive().max(50).optional().default(10),
      })
      .parse(req.query);

    const orderDir = (qp.order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortCol =
      qp.sort === 'id'
        ? '"id"'
        : qp.sort === 'title'
        ? '"title"'
        : qp.sort === 'qty'
        ? '"qty"'
        : qp.sort === 'createdAt'
        ? '"createdAt"'
        : '"updatedAt"';

    const whereParams: any[] = [invId];
    const whereSql =
      qp.q.length > 0
        ? 'WHERE it."inventoryId" = $1 AND (it."title" ILIKE $2 OR it."description" ILIKE $2)'
        : 'WHERE it."inventoryId" = $1';
    if (qp.q.length > 0) whereParams.push(`%${qp.q}%`);

    // total count
    const countSql = `SELECT COUNT(*)::int AS cnt FROM "Item" it ${whereSql}`;
    const countRes = await pool.query(countSql, whereParams);
    const total = Number(countRes.rows[0]?.cnt ?? 0);

    // pagination
    const offset = (qp.page - 1) * qp.perPage;
    const params = [...whereParams, qp.perPage, offset]; // perPage is $N-1, offset is $N
    const limitParam = params.length - 1; // 1-based index for perPage
    const offsetParam = params.length;    // 1-based index for offset

    const rowsSql = `
      SELECT
        it."id",
        it."title",
        it."description",
        it."qty",
        it."createdAt",
        it."updatedAt"
      FROM "Item" it
      ${whereSql}
      ORDER BY ${sortCol} ${orderDir}
      LIMIT $${limitParam}::int OFFSET $${offsetParam}::int
    `;
    const { rows } = await pool.query(rowsSql, params);

    res.setHeader('x-total-count', String(total));
    res.json(rows);
  } catch (e) {
    console.error('GET /api/inventories/:id/items failed:', e);
    res.status(500).json({
      error: 'Server error',
      detail: process.env.NODE_ENV !== 'production' ? String((e as any)?.message ?? e) : undefined,
    });
  }
});

/** Update item (no optimistic locking; version optional/ignored) */
router.put('/items/:itemId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserIdNum(req);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: 'Auth required' });

    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      qty: z.coerce.number().int().min(0).optional(),
      // `version` left optional to stay compatible with callers that still send it
      version: z.coerce.number().int().positive().optional(),
    });
    const body = schema.parse(req.body);
    const itemId = Number(req.params.itemId);

    // Check write access via inventory
    const access = await pool.query(
      `
      SELECT i."inventoryId",
             inv."ownerId" = $2 OR EXISTS (
               SELECT 1 FROM "InventoryMember" m
                WHERE m."inventoryId" = inv."id"
                  AND m."userId" = $2
                  AND LOWER(m."role"::text) = 'editor'
             ) AS "canWrite"
        FROM "Item" i
        JOIN "Inventory" inv ON inv."id" = i."inventoryId"
       WHERE i."id" = $1
      `,
      [itemId, userId]
    );
    if (!access.rowCount || !access.rows[0].canWrite) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Build dynamic SETs; $1=id, so next param is $2
    const params: any[] = [itemId];
    const sets: string[] = [];

    const pushSet = (col: string, val: unknown) => {
      if (val !== undefined) {
        params.push(val);
        sets.push(`"${col}" = $${params.length}`);
      }
    };

    pushSet('title', body.title);
    pushSet('description', body.description);
    pushSet('qty', body.qty);

    const sql = `
      UPDATE "Item"
         SET ${sets.length ? sets.join(', ') + ', ' : ''}"updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING *
    `;
    const { rows } = await pool.query(sql, params);

    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('PUT /api/inventories/items/:itemId failed:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
