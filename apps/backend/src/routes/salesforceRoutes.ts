import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { upsertAccountByName, upsertContactByEmail } from '../integrations/salesforceClient';
import requireAuth from '../middleware/requireAuth';



const prisma = new PrismaClient();
const router = Router();

const payloadSchema = z.object({
  companyName: z.string().min(1, 'Company is required'),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
});

router.post('/sync', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const input = payloadSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) {
      return res.status(400).json({ error: 'User must have an email to sync to Salesforce' });
    }

    const first = (user.name ?? '').split(' ')[0] || undefined;
    const last =
      (user.name ?? '').split(' ').slice(1).join(' ').trim() || user.email.split('@')[0];

    const accountId = await upsertAccountByName(input.companyName, input.phone);
    const contactId = await upsertContactByEmail(user.email, accountId, {
      FirstName: first,
      LastName: last,
      Title: input.jobTitle,
      Phone: input.phone,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        salesforceAccountId: accountId,
        salesforceContactId: contactId,
      },
    });

    res.json({ ok: true, accountId, contactId, message: 'Synced to Salesforce' });
  } catch (err: any) {
    console.error('[salesforce sync] error:', err);
    res.status(500).json({ error: err?.message || 'Salesforce sync failed' });
  }
});

export default router;
