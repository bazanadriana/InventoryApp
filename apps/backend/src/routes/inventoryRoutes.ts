import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// Derive the exact "where" shape from the client (safer than Prisma.InventoryWhereInput)
type FindManyArgs = Parameters<typeof prisma.inventory.findMany>[0];
type InventoryWhere = FindManyArgs extends { where?: infer W } ? W : Record<string, never>;

/**
 * GET /api/inventories?q=&ownerId=&memberId=
 * - q: full-text-ish search on title/description
 * - ownerId: filter inventories by numeric ownerId
 * - memberId: inventories where a member with this userId exists
 */
router.get("/", async (req, res) => {
  const q =
    typeof req.query.q === "string" && req.query.q.trim().length
      ? req.query.q
      : undefined;

  const ownerId =
    typeof req.query.ownerId === "string" ? Number(req.query.ownerId) : undefined;

  const memberId =
    typeof req.query.memberId === "string" ? Number(req.query.memberId) : undefined;

  const where = {} as InventoryWhere;

  if (q) {
    (where as any).OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (Number.isFinite(ownerId)) (where as any).ownerId = ownerId!;
  if (Number.isFinite(memberId))
    (where as any).members = { some: { userId: memberId! } };

  const items = await prisma.inventory.findMany({
    where,
    orderBy: { id: "desc" },
  });

  res.json({ ok: true, items });
});

export default router;
