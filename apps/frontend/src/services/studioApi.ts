import { api } from './api'; 

export type StudioModel = {
  name: string;
  delegate: string;
  count: number;
  idField: string | null;
  fields: {
    name: string;
    type: string;
    kind: 'scalar' | 'enum' | 'object';
    isId?: boolean;
    isRequired?: boolean;
    isList?: boolean;
    isReadOnly?: boolean;
    relationFromFields?: string[];  
  }[];
};

export type RowsResp = {
  model: string;
  page: number;
  perPage: number;
  total: number;
  rows: Record<string, any>[];
  columns: { key: string; type: string; isId?: boolean; readOnly?: boolean }[];
};

/* ----------------------------- Utils ----------------------------- */

function isProbablyDateString(v: string) {
  const d = new Date(v);
  return !isNaN(d.getTime());
}
function toISO(v: unknown): string | undefined {
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v.toISOString();
  if (typeof v === 'string' && v.trim() && isProbablyDateString(v)) {
    const d = new Date(v);
    return d.toISOString();
  }
  return undefined;
}

function toBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', '0', 'no', 'n'].includes(s)) return false;
  }
  return undefined;
}

/**
 * Clean payload before sending to Studio API:
 * - drop empty strings
 * - coerce *At fields (createdAt/updatedAt/etc.) to ISO
 * - coerce common boolean string values
 * (Number coercion is handled server-side; we keep it conservative here.)
 */
function cleanData(input: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(input ?? {})) {
    if (val === '' || val === undefined || val === null) continue;

    // Dates: any key ending with "At" or Date instances / date-like strings
    if (key.endsWith('At') || val instanceof Date || typeof val === 'string') {
      const iso = toISO(val);
      if (iso) {
        out[key] = iso;
        continue;
      }
    }

    // Booleans from strings
    const bool = toBoolean(val);
    if (bool !== undefined) {
      out[key] = bool;
      continue;
    }

    out[key] = val;
  }
  return out;
}

/* ------------------------------ API ------------------------------ */

export const studioApi = {
  async getModels() {
    const r = await api.get<{ models: StudioModel[] }>('/studio/models');
    return r.data.models;
  },

  async getRows(params: {
    model: string;
    page?: number;
    perPage?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    q?: string;
  }) {
    const r = await api.get<RowsResp>('/studio/rows', { params });
    return r.data;
  },

  async create(model: string, data: Record<string, any>) {
    const payload = { model, data: cleanData(data) };
    const r = await api.post('/studio/create', payload);
    return r.data;
  },

  async update(model: string, id: any, data: Record<string, any>) {
    const payload = { model, id, data: cleanData(data) };
    const r = await api.patch('/studio/update', payload);
    return r.data;
  },

  async destroy(model: string, ids: any[]) {
    const r = await api.delete('/studio/delete', { data: { model, ids } });
    return r.data;
  },
};
