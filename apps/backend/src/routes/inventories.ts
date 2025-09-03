import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

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

  // keep the where un-opinionated for TS; Prisma will validate at runtime
  const where: any = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (ownerId !== undefined) where.ownerId = ownerId;
  if (memberId !== undefined) where.members = { some: { userId: memberId } };

  const items = await prisma.inventory.findMany({
    where,
    orderBy: { id: "desc" },
  });

  res.json({ ok: true, items });
});

export default router;