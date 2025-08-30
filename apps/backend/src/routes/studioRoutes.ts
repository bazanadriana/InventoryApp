// apps/backend/src/routes/studioRoutes.ts
import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const router = Router();

/** Read Prisma data model (DMMF) so we can discover models/fields at runtime */
const DMMF = (Prisma as any).dmmf as {
  datamodel: { models: Array<{ name: string; fields: any[] }> };
};

type ScalarKind = 'scalar' | 'enum';
type FieldMeta = {
  name: string;
  type: string;
  kind: ScalarKind | 'object';
  isId?: boolean;
  isRequired?: boolean;
  isList?: boolean;
  isReadOnly?: boolean;
  hasDefaultValue?: boolean;
  /** When a relation stores scalar FK(s) on this model, they appear here */
  relationFromFields?: string[];
};

type ModelMeta = {
  name: string;
  delegate: string; // prisma[delegate]
  fields: FieldMeta[];
  scalarFields: FieldMeta[];
  stringFields: FieldMeta[];
  idField: FieldMeta | null;
};

/** Map "User" -> "user", "InventoryTag" -> "inventoryTag" (Prisma client delegate names) */
function delegateFor(modelName: string): string | null {
  const delegate = modelName.slice(0, 1).toLowerCase() + modelName.slice(1);
  return (prisma as any)[delegate] ? delegate : null;
}

function collectModels(): ModelMeta[] {
  return DMMF.datamodel.models
    .map((m) => {
      const delegate = delegateFor(m.name);
      if (!delegate) return null;
      const fields: FieldMeta[] = m.fields;
      const scalarFields = fields.filter(
        (f) => f.kind === 'scalar' || f.kind === 'enum'
      ) as FieldMeta[];
      const stringFields = scalarFields.filter((f) => f.type === 'String');
      const idField =
        (fields.find((f) => f.isId) as FieldMeta | undefined) ?? null;
      return { name: m.name, delegate, fields, scalarFields, stringFields, idField };
    })
    .filter(Boolean) as ModelMeta[];
}

const MODELS: ModelMeta[] = collectModels();

/** Helpers: ID typing & casting */
type IdType = 'number' | 'string';
function getIdType(model: ModelMeta): IdType {
  const t = model.idField?.type;
  if (!t) return 'number';
  // Treat numeric primitives as 'number', String/UUID/CUID as 'string'
  return t === 'String' ? 'string' : 'number';
}
function castId(value: any, asType: IdType) {
  if (asType === 'number') {
    const n = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(n) ? n : undefined;
  }
  // keep as string
  if (value == null) return undefined;
  return String(value);
}
function castIds(values: any[], asType: IdType) {
  return (Array.isArray(values) ? values : [])
    .map((v) => castId(v, asType))
    .filter((v) => v !== undefined);
}

/** Build a Prisma "where" for text search across string columns */
function buildSearchWhere(model: ModelMeta, q?: string) {
  if (!q || !q.trim() || model.stringFields.length === 0) return undefined;
  return {
    OR: model.stringFields.map((f) => ({
      [f.name]: { contains: q, mode: 'insensitive' as const },
    })),
  };
}

/** Pick only scalar/enums from client data; optional allowTimestampsOnCreate */
function pickScalarData(
  model: ModelMeta,
  raw: Record<string, any>,
  opts?: { allowTimestampsOnCreate?: boolean }
) {
  const allowed = new Set(model.scalarFields.map((f) => f.name));
  const data: Record<string, any> = {};
  for (const k of Object.keys(raw ?? {})) {
    if (allowed.has(k)) data[k] = raw[k];
  }
  // Never allow changing id or updatedAt directly
  if (model.idField) delete data[model.idField.name];
  if ('updatedAt' in data) delete data.updatedAt;
  // Allow createdAt only on create if asked
  if (!opts?.allowTimestampsOnCreate && 'createdAt' in data) delete data.createdAt;
  return data;
}

/** Normalize an incoming connect id: prefer number if numeric string, otherwise string */
function normalizeConnectId(v: any) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v);
  }
  if (typeof v === 'string') return v;
  return undefined;
}

/** Safely pass-through `{ relation: { connect: { id } } }` if present */
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

/** Try to resolve a numeric userId from req or payload */
function resolveUserId(req: any, raw?: Record<string, any>) {
  const candidate =
    raw?.userId ??
    raw?.userid ??
    req?.user?.id ??
    req?.user?.userId ??
    req?.user?.sub;
  const n = typeof candidate === 'string' ? Number(candidate) : candidate;
  return typeof n === 'number' && !Number.isNaN(n) ? n : undefined;
}

/**
 * Convert synthetic `<relation>NameId` fields to `{ relationName: { connect: { id } } }`.
 * NOTE: We **always** connect the User relation via `{ user: { connect: { id } } }` on create
 * to avoid naming mismatches like `userid` vs `userId`.
 */
function buildSyntheticConnects(
  model: ModelMeta,
  raw: Record<string, any>,
  onCreate = false,
  req?: any
) {
  const out: Record<string, any> = {};

  for (const f of model.fields) {
    if (f.kind !== 'object' || f.isList) continue;

    // --- Always object-connect User on create if we can resolve the id ---
    if (onCreate && f.type === 'User') {
      const uid = resolveUserId(req, raw);
      if (uid != null) {
        out[f.name] = { connect: { id: uid } };
      }
      // allow explicit payload to override if provided
    }

    // --- Synthetic "<relation>Id" when the relation does NOT expose a scalar FK ---
    const hasScalarFk =
      Array.isArray(f.relationFromFields) && f.relationFromFields.length > 0;
    if (!hasScalarFk) {
      const syntheticKey = `${f.name}Id`; // e.g. "itemId" for relation field "item"
      const rawVal = raw?.[syntheticKey];
      if (rawVal !== '' && rawVal != null) {
        const norm = normalizeConnectId(rawVal);
        if (norm !== undefined) {
          out[f.name] = { connect: { id: norm } };
        }
      }
    }
  }

  return out;
}

/** After composing payload, ensure required relations are satisfied (nice error) */
function ensureRequiredRelations(model: ModelMeta, payload: Record<string, any>) {
  for (const f of model.fields) {
    if (f.kind !== 'object' || f.isList || !f.isRequired) continue;

    const hasObjectConnect = payload[f.name]?.connect?.id != null;
    const fkName = f.relationFromFields?.[0];
    const hasScalarFk = !!fkName && payload[fkName] != null;

    if (!hasObjectConnect && !hasScalarFk) {
      if (f.type === 'User') {
        throw new Error(
          'User relation is required. Make sure you are authenticated or provide a userId.'
        );
      }
      throw new Error(
        `Required relation "${f.name}" is missing. Provide "${f.name}Id" or a "${f.name}: { connect: { id } }".`
      );
    }
  }
}

/** Choose a safe sort key for /rows */
function chooseSortKey(model: ModelMeta, requested?: string): string | undefined {
  const scalarNames = new Set(model.scalarFields.map((f) => f.name));
  if (requested && scalarNames.has(requested)) return requested;
  if (model.idField && scalarNames.has(model.idField.name)) return model.idField.name;
  return model.scalarFields[0]?.name; // fall back to first scalar or undefined
}

/** ------------------------- Manual cascade map --------------------------- */
/** Delete these children before deleting the parent model. */
type CascadeRule = { delegate: keyof PrismaClient; fk: string };
const CASCADE: Record<string, CascadeRule[]> = {
  User: [
    { delegate: 'comment', fk: 'userId' },
    { delegate: 'like', fk: 'userId' },
    { delegate: 'inventoryMember', fk: 'userId' },
    // If you also hard-link ownership, consider nulling instead of delete:
    // { delegate: 'inventory', fk: 'ownerId' },
    // { delegate: 'item', fk: 'ownerId' },
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

/** ------------------------------ Routes --------------------------------- */

/** /api/studio/models  -> list models, fields, counts */
router.get('/models', async (_req, res) => {
  const payload = await Promise.all(
    MODELS.map(async (m) => {
      const count = await (prisma as any)[m.delegate].count();
      return {
        name: m.name,
        delegate: m.delegate,
        count,
        idField: m.idField?.name ?? null,
        fields: m.fields.map((f) => ({
          name: f.name,
          type: f.type,
          kind: f.kind,
          isId: !!f.isId,
          isRequired: !!f.isRequired,
          isList: !!f.isList,
          isReadOnly: !!f.isReadOnly,
          relationFromFields: f.relationFromFields ?? [],
        })),
      };
    })
  );
  res.json({ models: payload });
});

/** /api/studio/rows?model=Item&page=1&perPage=25&sort=id&order=asc&q=text */
router.get('/rows', async (req, res) => {
  const modelName = String(req.query.model || '');
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
  const perPage = Math.min(
    100,
    Math.max(parseInt(String(req.query.perPage || '25'), 10) || 25, 1)
  );
  const requestedSort =
    typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const order = String(req.query.order || 'asc') === 'desc' ? 'desc' : 'asc';
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;

  const model = MODELS.find((m) => m.name === modelName);
  if (!model) return res.status(400).json({ error: 'Unknown model' });

  const where = buildSearchWhere(model, q);
  const skip = (page - 1) * perPage;
  const take = perPage;

  const sortKey = chooseSortKey(model, requestedSort);

  // select only scalar/enums
  const select = Object.fromEntries(model.scalarFields.map((f) => [f.name, true]));

  try {
    const [total, rows] = await Promise.all([
      (prisma as any)[model.delegate].count({ where }),
      (prisma as any)[model.delegate].findMany({
        where,
        select,
        orderBy: sortKey ? ({ [sortKey]: order } as any) : undefined,
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
    res.status(500).json({ error: 'Failed to fetch rows' });
  }
});

/** Create a record (accept scalars + safe relation connects + synthetic `<rel>Id`) */
router.post('/create', async (req: any, res) => {
  const { model: modelName, data: rawData } = req.body || {};
  const model = MODELS.find((m) => m.name === modelName);
  if (!model) return res.status(400).json({ error: 'Unknown model' });

  try {
    const scalar = pickScalarData(model, rawData || {}, { allowTimestampsOnCreate: true });
    const patchRelations = pickSafeRelationObjects(model, rawData || {});
    const syntheticConnect = buildSyntheticConnects(
      model,
      rawData || {},
      /* onCreate */ true,
      req
    );

    const payload: Record<string, any> = { ...scalar, ...patchRelations, ...syntheticConnect };

    // Ensure required relations present (esp. User)
    ensureRequiredRelations(model, payload);

    const created = await (prisma as any)[model.delegate].create({ data: payload });
    res.json({ ok: true, row: created });
  } catch (e: any) {
    console.error('Studio /create error:', e);
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/** Update a record by id (accept scalars + safe relation connects + synthetic `<rel>Id`) */
router.patch('/update', async (req, res) => {
  const { model: modelName, id, data: rawData } = req.body || {};
  const model = MODELS.find((m) => m.name === modelName);
  if (!model || !model.idField)
    return res.status(400).json({ error: 'Unknown model or id field' });

  try {
    const idType = getIdType(model);
    const castedId = castId(id, idType);
    if (castedId === undefined)
      return res.status(400).json({ error: 'Invalid id value' });

    const where = { [model.idField.name]: castedId } as any;

    const scalar = pickScalarData(model, rawData || {}, { allowTimestampsOnCreate: false });
    const patchRelations = pickSafeRelationObjects(model, rawData || {});
    const syntheticConnect = buildSyntheticConnects(model, rawData || {}, false, req);

    const data = { ...scalar, ...patchRelations, ...syntheticConnect };

    const updated = await (prisma as any)[model.delegate].update({ where, data });
    res.json({ ok: true, row: updated });
  } catch (e: any) {
    console.error('Studio /update error:', e);
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

/** Bulk delete by ids (casts id types + manual cascade in a transaction) */
router.delete('/delete', async (req, res) => {
  const { model: modelName, ids: rawIds } = req.body || {};
  const model = MODELS.find((m) => m.name === modelName);
  if (!model || !model.idField)
    return res.status(400).json({ error: 'Unknown model or id field' });

  const idType = getIdType(model);
  const ids = castIds(Array.isArray(rawIds) ? rawIds : [], idType);
  if (!ids.length) return res.status(400).json({ error: 'No valid IDs provided' });

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rules = CASCADE[model.name] ?? [];
  
      for (const r of rules) {
        // @ts-ignore dynamic delegate
        await tx[r.delegate].deleteMany({ where: { [r.fk]: { in: ids } } });
      }
  
      // @ts-ignore dynamic delegate
      const deleted = await tx[model.delegate].deleteMany({
        where: { [model.idField!.name]: { in: ids } } as any,
      });
      return deleted;
    });
  
    res.json({ ok: true, ...result });
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2003') {
      return res.status(409).json({
        ok: false,
        error: 'Cannot delete record(s) because related records still exist.',
        code: 'P2003',
        details: e.meta ?? null,
      });
    }
    console.error('Studio /delete error:', e);
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
