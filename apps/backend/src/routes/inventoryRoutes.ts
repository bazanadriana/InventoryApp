import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// derive the exact "where" shape from the client
type FindManyArgs = Parameters<typeof prisma.inventory.findMany>[0];
type InventoryWhere = FindManyArgs extends { where?: infer W } ? W : Record<string, never>;

// helper: string | string[] | undefined -> number | undefined
function toInt(v: unknown): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const n = typeof s === "string" ? Number(s) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/**
 * GET /api/inventories?q=&ownerId=&memberId=
 */
router.get("/", async (req, res) => {
  const q =
    typeof req.query.q === "string" && req.query.q.trim().length
      ? req.query.q
      : undefined;

  const ownerId = toInt(req.query.ownerId);
  const memberId = toInt(req.query.memberId);

  const where = {} as InventoryWhere;

  if (q) {
    (where as any).OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (ownerId !== undefined) (where as any).ownerId = ownerId;
  if (memberId !== undefined)
    (where as any).members = { some: { userId: memberId } };

  const items = await prisma.inventory.findMany({
    where,
    orderBy: { id: "desc" },
  });

  res.json({ ok: true, items });
});

export default router;
