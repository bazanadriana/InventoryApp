import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const router = Router();

/** ---------- DMMF helpers ---------- */
const DMMF = Prisma.dmmf;

type ModelMeta = {
  name: string;
  delegate: string;
  fields: any[];
  scalarFields: any[];
  stringFields: any[];
  idField: { name: string; type: string } | null;
};

function delegateFor(modelName: string): string | null {
  const delegate = modelName.slice(0, 1).toLowerCase() + modelName.slice(1);
  return (prisma as any)[delegate] ? delegate : null;
}

function collectModels(): ModelMeta[] {
  return DMMF.datamodel.models
    .map((m: any) => {
      const delegate = delegateFor(m.name);
      if (!delegate) return null;
      const fields = m.fields;
      const scalarFields = fields.filter((f: any) => f.kind === 'scalar' || f.kind === 'enum');
      const stringFields = scalarFields.filter((f: any) => f.type === 'String');
      const idField = (fields.find((f: any) => f.isId) ?? null) as ModelMeta['idField'];
      return { name: m.name, delegate, fields, scalarFields, stringFields, idField };
    })
    .filter(Boolean) as ModelMeta[];
}

const MODELS = collectModels();

function getIdType(model: ModelMeta): 'number' | 'string' {
  const t = model.idField?.type;
  if (!t) return 'number';
  return t === 'String' ? 'string' : 'number';
}
function castId(value: unknown, asType: 'number' | 'string') {
  if (asType === 'number') {
    const n = typeof value === 'string' ? Number(value) : (value as number);
    return Number.isFinite(n) ? n : undefined;
  }
  if (value == null) return undefined;
  return String(value);
}
function castIds(values: unknown[], asType: 'number' | 'string') {
  return (Array.isArray(values) ? values : [])
    .map((v) => castId(v, asType))
    .filter((v): v is number | string => v !== undefined);
}

function buildSearchWhere(model: ModelMeta, q?: string) {
  if (!q || !q.trim() || model.stringFields.length === 0) return undefined;
  return {
    OR: model.stringFields.map((f) => ({
      [f.name]: { contains: q, mode: 'insensitive' as const },
    })),
  };
}

function pickScalarData(
  model: ModelMeta,
  raw: Record<string, unknown>,
  opts?: { allowTimestampsOnCreate?: boolean }
) {
  const allowed = new Set(model.scalarFields.map((f) => f.name));
  const data: Record<string, unknown> = {};
  for (const k of Object.keys(raw ?? {})) {
    if (allowed.has(k)) data[k] = raw[k];
  }
  if (model.idField) delete data[model.idField.name];
  if ('updatedAt' in data) delete (data as any).updatedAt;
  if (!opts?.allowTimestampsOnCreate && 'createdAt' in data) delete (data as any).createdAt;
  return data;
}

function normalizeConnectId(v: unknown) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  if (typeof v === 'string') return v;
  return undefined;
}

function pickSafeRelationObjects(model: ModelMeta, raw: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const f of model.fields) {
    if (f.kind !== 'object' || f.isList) continue;
    const v = raw?.[f.name];
    if (
      v &&
      typeof v === 'object' &&
      v.connect &&
      typeof v.connect === 'object' &&
      (typeof v.connect.id === 'number' || typeof v.connect.id === 'string')
    ) {
      const norm = normalizeConnectId(v.connect.id);
      if (norm !== undefined) out[f.name] = { connect: { id: norm } };
    }
  }
  return out;
}

function resolveUserId(req: Request, raw: Record<string, any>) {
  const candidate =
    raw?.userId ?? raw?.userid ?? (req as any)?.user?.id ?? (req as any)?.user?.userId ?? (req as any)?.user?.sub;
  const n = typeof candidate === 'string' ? Number(candidate) : candidate;
  return typeof n === 'number' && !Number.isNaN(n) ? n : undefined;
}

function buildSyntheticConnects(
  model: ModelMeta,
  raw: Record<string, any>,
  onCreate = false,
  req: Request
) {
  const out: Record<string, any> = {};
  for (const f of model.fields) {
    if (f.kind !== 'object' || f.isList) continue;

    if (onCreate && f.type === 'User') {
      const uid = resolveUserId(req, raw);
      if (uid != null) out[f.name] = { connect: { id: uid } };
    }

    const hasScalarFk = Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0;
    if (!hasScalarFk) {
      const syntheticKey = `${f.name}Id`;
      const rawVal = raw?.[syntheticKey];
      if (rawVal !== '' && rawVal != null) {
        const norm = normalizeConnectId(rawVal);
        if (norm !== undefined) out[f.name] = { connect: { id: norm } };
      }
    }
  }
  return out;
}

function ensureRequiredRelations(model: ModelMeta, payload: Record<string, any>) {
  for (const f of model.fields) {
    if (f.kind !== 'object' || f.isList || !f.isRequired) continue;
    const hasObjectConnect = payload[f.name]?.connect?.id != null;
    const fkName = f.relationFromFields?.[0];
    const hasScalarFk = !!fkName && payload[fkName] != null;
    if (!hasObjectConnect && !hasScalarFk) {
      if (f.type === 'User') {
        throw new Error('User relation is required. Make sure you are authenticated or provide a userId.');
      }
      throw new Error(
        `Required relation "${f.name}" is missing. Provide "${f.name}Id" or a "${f.name}: { connect: { id } }".`
      );
    }
  }
}

function chooseSortKey(model: ModelMeta, requested?: string) {
  const scalarNames = new Set(model.scalarFields.map((f) => f.name));
  if (requested && scalarNames.has(requested)) return requested;
  if (model.idField && scalarNames.has(model.idField.name)) return model.idField.name;
  return model.scalarFields[0]?.name as string | undefined;
}

const CASCADE: Record<
  string,
  { delegate: string; fk: string }[]
> = {
  User: [
    { delegate: 'comment', fk: 'userId' },
    { delegate: 'like', fk: 'userId' },
    { delegate: 'inventoryMember', fk: 'userId' },
  ],
  Item: [
    { delegate: 'comment', fk: 'itemId' },
    { delegate: 'like', fk: 'itemId' },
    { delegate: 'itemValue', fk: 'itemId' },
  ],
  Inventory: [
    { delegate: 'item', fk: 'inventoryId' },
    { delegate: 'inventoryMember', fk: 'inventoryId' },
    { delegate: 'inventoryTag', fk: 'inventoryId' },
    { delegate: 'customField', fk: 'inventoryId' },
  ],
  Tag: [{ delegate: 'inventoryTag', fk: 'tagId' }],
  CustomField: [{ delegate: 'itemValue', fk: 'fieldId' }],
  InventoryMember: [],
  InventoryTag: [],
  ItemValue: [],
  Comment: [],
  Like: [],
};

/* =========================== Routes ============================ */

router.get('/health', (_req, res) => res.json({ ok: true }));

/** GET /api/studio/models  – resilient */
router.get('/models', async (_req, res) => {
  try {
    const models: any[] = [];
    for (const m of MODELS) {
      try {
        const count = await (prisma as any)[m.delegate].count();
        models.push({
          name: m.name,
          delegate: m.delegate,
          count,
          idField: m.idField?.name ?? null,
          fields: m.fields.map((f: any) => ({
            name: f.name,
            type: f.type,
            kind: f.kind,
            isId: !!f.isId,
            isRequired: !!f.isRequired,
            isList: !!f.isList,
            isReadOnly: !!f.isReadOnly,
            relationFromFields: f.relationFromFields ?? [],
          })),
        });
      } catch (e: any) {
        models.push({
          name: m.name,
          delegate: m.delegate,
          count: 0,
          idField: m.idField?.name ?? null,
          fields: m.fields.map((f: any) => ({
            name: f.name,
            type: f.type,
            kind: f.kind,
            isId: !!f.isId,
            isRequired: !!f.isRequired,
            isList: !!f.isList,
            isReadOnly: !!f.isReadOnly,
            relationFromFields: f.relationFromFields ?? [],
          })),
          error: e?.message || String(e),
        });
      }
    }
    res.json({ models });
  } catch (err: any) {
    console.error('Studio /models fatal:', err);
    res.status(500).json({ error: err?.message || 'server_error' });
  }
});

/** GET /api/studio/rows?model=Item&page=1&perPage=25&sort=id&order=asc&q=text */
router.get('/rows', async (req: Request, res: Response) => {
  const modelName = String(req.query.model || '');
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
  const perPage = Math.min(200, Math.max(parseInt(String(req.query.perPage || '25'), 10) || 25, 1));
  const requestedSort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const order = String(req.query.order || 'asc') === 'desc' ? 'desc' : 'asc';
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  const model = MODELS.find((m) => m.name === modelName);
  if (!model) return res.status(400).json({ error: 'Unknown model' });

  const where = buildSearchWhere(model, q);
  const skip = (page - 1) * perPage;
  const take = perPage;
  const sortKey = chooseSortKey(model, requestedSort);

  const select = Object.fromEntries(model.scalarFields.map((f) => [f.name, true]));

  try {
    const [total, rows] = await Promise.all([
      (prisma as any)[model.delegate].count({ where }),
      (prisma as any)[model.delegate].findMany({
        where,
        select,
        orderBy: sortKey ? { [sortKey]: order } : undefined,
        skip,
        take,
      }),
    ]);

    res.json({
      model: model.name,
      page,
      perPage,
      total,
      rows,
      columns: model.scalarFields.map((f) => ({
        key: f.name,
        type: f.type,
        isId: !!f.isId,
        readOnly: !!f.isReadOnly || f.isId,
      })),
    });
  } catch (e: any) {
    console.error('Studio /rows error:', e);
    res.status(500).json({ error: e?.message || 'Failed to fetch rows' });
  }
});

/** POST /api/studio/rows/:model   body = data */
router.post('/rows/:model', async (req: Request, res: Response) => {
  const modelName = String(req.params.model || '');
  const rawData = (req.body || {}) as Record<string, any>;
  const model = MODELS.find((m) => m.name === modelName);
  if (!model) return res.status(400).json({ error: 'Unknown model' });

  try {
    const scalar = pickScalarData(model, rawData, { allowTimestampsOnCreate: true });
    const patchRelations = pickSafeRelationObjects(model, rawData);
    const syntheticConnect = buildSyntheticConnects(model, rawData, true, req);
    const payload = { ...scalar, ...patchRelations, ...syntheticConnect };

    ensureRequiredRelations(model, payload);

    const created = await (prisma as any)[model.delegate].create({ data: payload });
    res.json(created);
  } catch (e: any) {
    console.error('Studio create error:', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

/** PATCH /api/studio/rows/:model/:id   body = partial fields */
router.patch('/rows/:model/:id', async (req: Request, res: Response) => {
  const modelName = String(req.params.model || '');
  const idParam = req.params.id;
  const rawData = (req.body || {}) as Record<string, any>;
  const model = MODELS.find((m) => m.name === modelName);
  if (!model || !model.idField) return res.status(400).json({ error: 'Unknown model or id field' });

  try {
    const idType = getIdType(model);
    const castedId = castId(idParam, idType);
    if (castedId === undefined) return res.status(400).json({ error: 'Invalid id value' });

    const where = { [model.idField.name]: castedId } as any;
    const scalar = pickScalarData(model, rawData, { allowTimestampsOnCreate: false });
    const patchRelations = pickSafeRelationObjects(model, rawData);
    const syntheticConnect = buildSyntheticConnects(model, rawData, false, req);
    const data = { ...scalar, ...patchRelations, ...syntheticConnect };

    const updated = await (prisma as any)[model.delegate].update({ where, data });
    res.json(updated);
  } catch (e: any) {
    console.error('Studio update error:', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

/** POST /api/studio/rows/:model/bulk-delete   body = { ids: [...] } */
router.post('/rows/:model/bulk-delete', async (req: Request, res: Response) => {
  const modelName = String(req.params.model || '');
  const rawIds = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]) : [];
  const model = MODELS.find((m) => m.name === modelName);
  if (!model || !model.idField) return res.status(400).json({ error: 'Unknown model or id field' });

  const idType = getIdType(model);
  const ids = castIds(rawIds, idType);
  if (!ids.length) return res.status(400).json({ error: 'No valid IDs provided' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rules = CASCADE[model.name] ?? [];
      for (const r of rules) {
        await (tx as any)[r.delegate].deleteMany({ where: { [r.fk]: { in: ids } } });
      }
      const deleted = await (tx as any)[model.delegate].deleteMany({
        where: { [model.idField.name]: { in: ids } },
      });
      return deleted;
    });
    res.json({ deleted: result.count });
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2003') {
      return res.status(409).json({
        error: 'Cannot delete record(s) because related records still exist.',
        code: 'P2003',
        details: e.meta ?? null,
      });
    }
    console.error('Studio bulk-delete error:', e);
    res.status(400).json({ error: e?.message || String(e) });
  }
});

export default router;
