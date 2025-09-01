import { prisma } from '../../db/prisma';

export async function upsertValues(itemId: number, values: Record<string, unknown>) {
  if (!values) return;

  const fieldIds = Object.keys(values).map(Number); 
  if (!fieldIds.length) return;

  const fields = await prisma.customField.findMany({
    where: { id: { in: fieldIds } },
    select: { id: true, kind: true }
  });

  const kindById = Object.fromEntries(
    fields.map((f: { id: number; kind: string }) => [f.id, f.kind])
  );

  for (const [fieldIdStr, raw] of Object.entries(values)) {
    const fieldId = Number(fieldIdStr);
    if (!Number.isFinite(fieldId)) continue;

    const kind = kindById[fieldId];
    if (!kind) continue;

    const data: any = { itemId, fieldId, s: null, t: null, n: null, l: null, b: null };
    switch (kind) {
      case 'STRING': data.s = String(raw ?? ''); break;
      case 'TEXT': data.t = String(raw ?? ''); break;
      case 'NUMBER': data.n = raw === null || raw === '' ? null : Number(raw); break;
      case 'LINK': data.l = String(raw ?? ''); break;
      case 'BOOLEAN': data.b = Boolean(raw); break;
      default: continue;
    }

    await prisma.itemValue.upsert({
      where: { itemId_fieldId: { itemId, fieldId } },
      update: data,
      create: data
    });
  }
}
