import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

async function canEdit(userId: number, inventoryId: number) {
  const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inv) return { ok: false, status: 404 as const };
  if (inv.ownerId === userId) return { ok: true, status: 200 as const };
  const mem = await prisma.inventoryMember.findUnique({
    where: { inventoryId_userId: { inventoryId, userId } }
  });
  return mem && (mem.role === 'EDITOR' || mem.role === 'OWNER')
    ? { ok: true, status: 200 as const }
    : { ok: false, status: 403 as const };
}

router.get('/inventories/:id/fields', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const rows = await prisma.customField.findMany({
      where: { inventoryId: invId },
      orderBy: { position: 'asc' }
    });
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/inventories/:id/fields', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    if (Number.isNaN(invId)) return res.status(400).json({ error: 'Bad inventory id' });

    const chk = await canEdit(Number((req.user as any).id), invId);
    if (!chk.ok) return res.sendStatus(chk.status);

    const { name, kind, position = 0, showInTable = true, description } = req.body as {
      name: string; kind: 'STRING'|'TEXT'|'NUMBER'|'LINK'|'BOOLEAN'; position?: number; showInTable?: boolean; description?: string;
    };

    const count = await prisma.customField.count({ where: { inventoryId: invId, kind } });
    if (count >= 3) return res.status(400).json({ error: 'Limit reached for this field type (3).' });

    const row = await prisma.customField.create({
      data: { inventoryId: invId, name, kind, position, showInTable, description }
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.patch('/inventories/:id/fields/:fieldId', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    const fieldId = Number(req.params.fieldId);
    if (Number.isNaN(invId) || Number.isNaN(fieldId)) {
      return res.status(400).json({ error: 'Bad ids' });
    }

    const chk = await canEdit(Number((req.user as any).id), invId);
    if (!chk.ok) return res.sendStatus(chk.status);

    const row = await prisma.customField.update({
      where: { id: fieldId },
      data: req.body as any
    });
    res.json(row);
  } catch (e) { next(e); }
});

router.delete('/inventories/:id/fields/:fieldId', requireAuth, async (req, res, next) => {
  try {
    const invId = Number(req.params.id);
    const fieldId = Number(req.params.fieldId);
    if (Number.isNaN(invId) || Number.isNaN(fieldId)) {
      return res.status(400).json({ error: 'Bad ids' });
    }

    const chk = await canEdit(Number((req.user as any).id), invId);
    if (!chk.ok) return res.sendStatus(chk.status);

    await prisma.customField.delete({ where: { id: fieldId } });
    res.sendStatus(204);
  } catch (e) { next(e); }
});

export default router;
