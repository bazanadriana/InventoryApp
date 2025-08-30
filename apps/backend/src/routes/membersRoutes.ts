// apps/backend/src/routes/membersRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// PATCH /api/members/:id  { role: "VIEWER" | "EDITOR" | "OWNER" | ... }
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const role = String(req.body.role || 'VIEWER');

  const updated = await prisma.inventoryMember.update({
    where: { id },
    // if your field is an enum in Prisma, this still works;
    // if it's a string column, this is exactly right.
    data: { role: (role as any) },
  });

  res.json({ ok: true, member: updated });
});

export default router;
