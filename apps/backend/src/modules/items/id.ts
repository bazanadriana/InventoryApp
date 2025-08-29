import crypto from 'crypto';
import { prisma } from '../../db/prisma';

export type IdElement =
  | { type: 'FIXED'; text: string }
  | { type: 'RANDOM20' }
  | { type: 'RAND32' }
  | { type: 'SEQ'; prefix?: string }
  | { type: 'GUID' }
  | { type: 'DATETIME'; format?: string };

function formatDate(fmt = 'yyyy'): string {
  const d = new Date();
  const pad = (n: number, l = 2) => n.toString().padStart(l, '0');
  return fmt
    .replace(/yyyy/g, String(d.getFullYear()))
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/dd/g, pad(d.getDate()))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()))
    .replace(/ss/g, pad(d.getSeconds()));
}

function randHex(bytes: number) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase();
}

async function nextSeq(inventoryId: number): Promise<number> {
  const count = await prisma.item.count({ where: { inventoryId } });
  return count + 1;
}

export async function generateCustomId(
  inventoryId: number,
  spec: IdElement[] | null | undefined
) {
  if (!spec || !Array.isArray(spec) || spec.length === 0) {
    return `ITEM_${randHex(3)}`;
  }
  const parts: string[] = [];
  for (const el of spec) {
    switch (el.type) {
      case 'FIXED': parts.push(el.text ?? ''); break;
      case 'RANDOM20': parts.push(randHex(3)); break;
      case 'RAND32': parts.push(randHex(4)); break;
      case 'GUID': parts.push(crypto.randomUUID()); break;
      case 'DATETIME': parts.push(formatDate(el.format || 'yyyy')); break;
      case 'SEQ': {
        const n = await nextSeq(inventoryId);
        parts.push(`${el.prefix ?? ''}${n}`);
        break;
      }
    }
  }
  return parts.join('');
}
