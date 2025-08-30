import { Router } from 'express';
import { PrismaClient, InventoryRole } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// PATCH /api/members/:id  { role: "VIEWER" | "EDITOR" | "OWNER" }
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const roleStr = String(req.body.role || 'VIEWER').toUpperCase() as keyof typeof InventoryRole;
  const role = InventoryRole[roleStr] ?? InventoryRole.VIEWER;

  const updated = await prisma.inventoryMember.update({
    where: { id },
    data: { role: { set: role } } // <- enum update input
  });

  res.json({ ok: true, member: updated });
});

export default router;
