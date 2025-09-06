import { Router, type Request, type Response, type NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

type AnyObj = Record<string, any>;

function modelKey(name: string) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function getDelegate(model: string) {
  const key = modelKey(model);
  const del = (prisma as AnyObj)[key];
  if (!del) {
    const err: any = new Error(`Unknown model: ${model}`);
    err.status = 400;
    throw err;
  }
  return del;
}

function getMeta(model: string) {
  const m = (Prisma as any).dmmf.datamodel.models.find((x: any) => x.name === model);
  if (!m) {
    const err: any = new Error(`Unknown model: ${model}`);
    err.status = 400;
    throw err;
  }
  return m;
}

function buildWhere(meta: any, q?: string) {
  if (!q) return undefined;
  const stringFields = meta.fields
    .filter((f: any) => f.kind === 'scalar' && f.type === 'String')
    .map((f: any) => f.name);
  if (stringFields.length === 0) return undefined;
  return { OR: stringFields.map((name: string) => ({ [name]: { contains: q, mode: 'insensitive' as const } })) };
}

function pickColumns(meta: any) {
  const preferred = ['id', 'name', 'title', 'email', 'label', 'sku', 'createdAt', 'updatedAt'];
  const out: string[] = [];
  for (const n of preferred) if (meta.fields.some((f: any) => f.name === n)) out.push(n);
  const extras = meta.fields
    .filter((f: any) => f.kind === 'scalar' && !out.includes(f.name))
    .map((f: any) => f.name);
  return Array.from(new Set([...out, ...extras])).slice(0, 8);
}

/* ----------------------------- LIST ROWS ----------------------------- */
router.get('/rows', async (req: Request, res: Response, next: NextFunction) => {
  const model = String(req.query.model || '');
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const perPage = Math.min(Math.max(parseInt(String(req.query.perPage || '25'), 10), 1), 100);
  const sort = String(req.query.sort || 'id');
  const order = String(req.query.order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  const q = req.query.q ? String(req.query.q) : undefined;

  try {
    const meta = getMeta(model);
    const del = getDelegate(model);
    const where = buildWhere(meta, q);
    const sortField = meta.fields.some((f: any) => f.name === sort) ? sort : 'id';

    const select = pickColumns(meta).reduce((acc: AnyObj, n: string) => {
      acc[n] = true;
      return acc;
    }, {} as AnyObj);

    const [total, rows] = await Promise.all([
      del.count({ where }),
      del.findMany({
        where,
        select,
        orderBy: { [sortField]: order as any },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    res.json({
      model,
      total,
      page,
      perPage,
      sort: sortField,
      order,
      columns: Object.keys(select),
      rows,
    });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------- CREATE ----------------------------- */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  const model = String((req.query.model || req.body.model || '') as string);
  const data: AnyObj = (req.body?.data ?? {}) as AnyObj;

  try {
    const meta = getMeta(model);
    const del = getDelegate(model);

    const currentUserId =
      (req as any).user?.id ??
      (req as any).userId ??
      (req as any).auth?.uid ??
      (req as any).auth?.id;

    // Auto-connect current user if model has required `user` relation
    const userRel = meta.fields.find(
      (f: any) => f.kind === 'object' && f.name === 'user' && f.isRequired,
    );
    if (userRel && !data.user && !data.userId) {
      if (!currentUserId) {
        const err: any = new Error("User relation is required. Provide 'userId' or login.");
        err.status = 400;
        throw err;
      }
      data.user = { connect: { id: Number(currentUserId) } };
    }

    // Convert any supplied "*Id" into proper connect for relation fields
    for (const f of meta.fields) {
      if (f.kind === 'object') {
        const idField = `${f.name}Id`;
        if (Object.prototype.hasOwnProperty.call(data, idField) && !data[f.name]) {
          data[f.name] = { connect: { id: data[idField] } };
        }
      }
    }

    // Check for any other required relations still missing
    const missingRequired = meta.fields
      .filter(
        (f: any) =>
          f.kind === 'object' &&
          f.isRequired &&
          !data[f.name] &&
          !data[`${f.name}Id`] &&
          !(f.name === 'user' && data.user),
      )
      .map((f: any) => f.name);

    if (missingRequired.length) {
      const err: any = new Error(
        `Required relation${missingRequired.length > 1 ? 's' : ''} ${missingRequired
          .map((n: string) => `'${n}'`)
          .join(', ')} ${missingRequired.length > 1 ? 'are' : 'is'} missing. Provide ${missingRequired
          .map((n: string) => `'${n}Id' or '${n}: { connect: { id } }'`)
          .join(', ')}.`,
      );
      err.status = 400;
      throw err;
    }

    const created = await del.create({ data });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      e.status = 409;
      e.message = 'Unique constraint failed.';
    } else if (e?.code === 'P2003') {
      e.status = 400;
      e.message = 'Invalid foreign key value.';
    }
    next(e);
  }
});

/* ----------------------------- BULK DELETE ----------------------------- */
router.delete('/rows', async (req: Request, res: Response, next: NextFunction) => {
  const model = String(req.query.model || req.body.model || '');
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids : [];

  try {
    if (!ids.length) {
      const err: any = new Error('No ids provided.');
      err.status = 400;
      throw err;
    }
    const del = getDelegate(model);
    const result = await del.deleteMany({ where: { id: { in: ids as any } } });
    res.json({ ok: true, count: result.count });
  } catch (err) {
    next(err);
  }
});

export default router;