import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

function toKind(input?: string) {
  const k = String(input || '').toUpperCase();
  const map: Record<string, any> = {
    TEXT: (Prisma as any).FieldKind?.TEXT ?? 'TEXT',
    NUMBER: (Prisma as any).FieldKind?.NUMBER ?? 'NUMBER',
    LINK: (Prisma as any).FieldKind?.LINK ?? 'LINK',
    BOOLEAN: (Prisma as any).FieldKind?.BOOLEAN ?? 'BOOLEAN',
  };
  return map[k] ?? map.TEXT;
}

// POST /api/fields
router.post('/', async (req, res) => {
  const inventoryId = Number(req.body.inventoryId);
  const name = String(req.body.name || '');
  const kind = toKind(req.body.kind);
  const position =
    Number.isFinite(Number(req.body.position)) ? Number(req.body.position) : 0;

  if (!inventoryId || !name) {
    return res.status(400).json({ error: 'inventoryId and name required' });
  }

  const field = await prisma.customField.create({
    data: { inventoryId, name, kind, position } as any,
  });

  res.json({ ok: true, field });
});

export default router;
