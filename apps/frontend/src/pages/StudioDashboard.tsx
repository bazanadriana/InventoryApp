import { useEffect, useMemo, useRef, useState } from 'react';
import { studioApi, StudioModel } from '../services/studioApi';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';

type Col = { key: string; type: string; isId?: boolean; readOnly?: boolean };

export default function StudioDashboard() {
  const [models, setModels] = useState<StudioModel[]>([]);
  const [active, setActive] = useState<string>('');
  const [searchModel, setSearchModel] = useState('');
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [cols, setCols] = useState<Col[]>([]);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<string>('id');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [q, setQ] = useState('');

  // modal state
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  // Fields popover
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsRef = useRef<HTMLDivElement>(null);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };
  const goAdmin = () => {
    navigate('/admin');
  };

  const activeModel = useMemo(
    () => models.find((m) => m.name === active) || null,
    [models, active]
  );

  useEffect(() => {
    (async () => {
      const ms = await studioApi.getModels();
      setModels(ms);
      if (!active && ms.length) setActive(ms[0].name);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, page, perPage, sort, order]);

  // Close Fields popover on outside click / Escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!fieldsRef.current) return;
      if (!fieldsRef.current.contains(e.target as Node)) setFieldsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFieldsOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function extractError(err: any) {
    return (
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Request failed'
    );
  }

  async function load(customQ?: string) {
    if (!active) return;
    setLoading(true);
    try {
      const resp = await studioApi.getRows({
        model: active,
        page,
        perPage,
        sort,
        order,
        q: typeof customQ === 'string' ? customQ : q,
      });
      setRows(resp.rows);
      setCols(resp.columns);
      setSelectedCols((prev) => (prev.length ? prev : resp.columns.map((c) => c.key)));
      setTotal(resp.total);
      setSelectedIds([]);
    } catch (err) {
      console.error('Load error:', err);
      alert(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  const visibleCols = cols.filter((c) => selectedCols.includes(c.key));

  function toggleCol(k: string) {
    setSelectedCols((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function toggleAllSelected(checked: boolean) {
    if (!activeModel?.idField) return;
    setSelectedIds(checked ? rows.map((r) => r[activeModel.idField!]) : []);
  }

  function toggleRowSelected(row: any) {
    if (!activeModel?.idField) return;
    const id = row[activeModel.idField];
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleDeleteSelected() {
    if (!activeModel?.idField || selectedIds.length === 0) return;
    try {
      await studioApi.destroy(active, selectedIds);
      await load();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(extractError(err));
    }
  }

  function headerLabel(k: string) {
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }

  function inputFor(col: Col, v: any, onChange: (val: any) => void) {
    if (col.readOnly) {
      return <span className="opacity-60">{v ?? ''}</span>;
    }
    switch (col.type) {
      case 'Int':
      case 'BigInt':
      case 'Float':
      case 'Decimal':
        return (
          <input
            type="number"
            className="w-full bg-transparent outline-none"
            value={v ?? ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
          />
        );
      case 'Boolean':
        return (
          <input
            type="checkbox"
            checked={!!v}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
      case 'DateTime':
        return (
          <input
            type="datetime-local"
            className="w-full bg-transparent outline-none"
            value={v ? toLocalDateTime(v) : ''}
            onChange={(e) =>
              onChange(
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
          />
        );
      default:
        return (
          <input
            type="text"
            className="w-full bg-transparent outline-none"
            value={v ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  function toLocalDateTime(v: any) {
    try {
      const d = typeof v === 'string' ? new Date(v) : v;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  const commitInline = async (row: any, key: string, value: any) => {
    if (!activeModel?.idField) return;
    const id = row[activeModel.idField];
    const prevValue = row[key];

    // optimistic update
    setRows((prev) =>
      prev.map((r) => (r[activeModel.idField!] === id ? { ...r, [key]: value } : r))
    );

    try {
      await studioApi.update(active, id, { [key]: value });
    } catch (err) {
      console.error('Update failed:', err);
      // revert on error
      setRows((prev) =>
        prev.map((r) => (r[activeModel.idField!] === id ? { ...r, [key]: prevValue } : r))
      );
      alert(extractError(err));
    }
  };

  // --- Required single relations (except User) → add synthetic "<name>Id" field ---
  const requiredSingleRelations = useMemo(() => {
    if (!activeModel) return [] as any[];
    return (activeModel.fields as any[]).filter(
      (f) => f.kind === 'object' && !f.isList && f.isRequired && f.type !== 'User'
    );
  }, [activeModel]);

  function relationHasScalarFK(_relName: string, relationFromFields?: string[]) {
    const fk = relationFromFields && relationFromFields[0];
    if (!fk) return false;
    return cols.some((c) => c.key === fk && !c.readOnly);
  }

  async function handleAdd() {
    if (!activeModel) return;
    const blank: Record<string, any> = {};
    cols.forEach((c) => {
      if (c.isId || c.readOnly) return;
      blank[c.key] = null;
    });
    // add synthetic relation ids if needed
    requiredSingleRelations.forEach((rel: any) => {
      if (!relationHasScalarFK(rel.name, rel.relationFromFields)) {
        const synthetic = `${rel.name}Id`;
        if (!(synthetic in blank)) blank[synthetic] = '';
      }
    });
    setDraft(blank);
    setModalError('');
    setAdding(true);
  }

  // Turn any synthetic `<relation>Id` into nested `{ relation: { connect: { id } } }`
  function withRelationConnects(payload: Record<string, any>) {
    const out: Record<string, any> = { ...payload };
    requiredSingleRelations.forEach((rel: any) => {
      if (relationHasScalarFK(rel.name, rel.relationFromFields)) return; // scalar FK exists; keep as-is
      const key = `${rel.name}Id`; // e.g., itemId
      const raw = out[key];
      if (raw !== '' && raw != null) {
        const id = typeof raw === 'string' ? Number(raw) : raw;
        if (!Number.isNaN(id)) {
          delete out[key];
          out[rel.name] = { connect: { id } };
        }
      }
    });
    return out;
  }

  async function saveDraft() {
    setSaving(true);
    setModalError('');
    try {
      const payload = withRelationConnects(draft);
      await studioApi.create(active, payload);
      setAdding(false);
      await load();
    } catch (err) {
      console.error('Create failed:', err);
      setModalError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Studio-only header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-semibold">InventoryApp</div>
        <nav className="flex items-center gap-6">
          <Link className="hover:text-white" to="/dashboard">
            Dashboard
          </Link>
          {/* Force navigation out of Studio to the Admin app route */}
          <button type="button" onClick={goAdmin} className="hover:text-white">
            Admin
          </button>
          <button onClick={handleLogout} className="hover:text-white">
            Logout
          </button>
        </nav>
      </header>

      <div className="grid grid-cols-[320px_1fr] gap-6 p-6">
        {/* Sidebar */}
        <aside className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="text-sm opacity-80 mb-2">Search models…</div>
          <input
            value={searchModel}
            onChange={(e) => setSearchModel(e.target.value)}
            placeholder="Search models…"
            className="w-full mb-4 bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 outline-none"
          />
          <div className="text-xs uppercase tracking-wide opacity-60 mb-2">All Models</div>
          <div className="space-y-1">
            {models
              .filter((m) => m.name.toLowerCase().includes(searchModel.toLowerCase()))
              .map((m) => (
                <button
                  key={m.name}
                  onClick={() => {
                    setActive(m.name);
                    setPage(1);
                    setQ('');
                  }}
                  className={clsx(
                    'w-full flex items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-800/70',
                    active === m.name && 'bg-slate-800/80'
                  )}
                >
                  <span>{m.name}</span>
                  <span className="text-xs bg-slate-700 rounded-md px-2 py-0.5">{m.count}</span>
                </button>
              ))}
          </div>
        </aside>

        {/* Main */}
        <main className="bg-slate-900/60 border border-slate-800 rounded-2xl">
          {/* Tabs bar */}
          <div className="px-4 pt-4">
            <div className="inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="text-sm">{active || '—'}</div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
            <div className="flex items-center gap-2">
              <button className="text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5">
                Filters <span className="opacity-60">None</span>
              </button>

              {/* Fields popover */}
              <div className="relative" ref={fieldsRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={fieldsOpen}
                  onClick={() => setFieldsOpen((o) => !o)}
                  className="text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-1"
                >
                  Fields <ChevronDown size={16} />
                </button>

                {fieldsOpen && (
                  <div
                    role="menu"
                    className="absolute z-20 right-0 bg-slate-900 border border-slate-700 rounded-xl mt-1 p-2 min-w-[240px] shadow-xl"
                  >
                    {cols.map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCols.includes(c.key)}
                          onChange={() => toggleCol(c.key)}
                          onClick={(e) => e.stopPropagation()} // don’t close
                        />
                        <span className="text-sm">{c.key}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5">
                Showing <span className="font-medium">{rows.length}</span> of{' '}
                <span className="font-medium">{total}</span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(e.currentTarget.value)}
                placeholder="Search…"
                className="bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5 outline-none"
              />
              <button
                onClick={() => load()}
                className="text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5"
              >
                Apply
              </button>
              <button
                onClick={handleAdd}
                className="text-sm bg-emerald-600 hover:bg-emerald-500 rounded-xl px-3 py-1.5 flex items-center gap-1"
              >
                <Plus size={16} /> Add record
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="px-4 pb-4">
            <div className="overflow-auto mt-4 rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/70 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 && selectedIds.length === rows.length
                        }
                        onChange={(e) => toggleAllSelected(e.target.checked)}
                      />
                    </th>
                    {visibleCols.map((c) => (
                      <th
                        key={c.key}
                        className="px-3 py-2 text-left font-medium cursor-pointer select-none"
                        onClick={() => {
                          if (sort === c.key) setOrder(order === 'asc' ? 'desc' : 'asc');
                          setSort(c.key);
                        }}
                      >
                        {headerLabel(c.key)}
                        {sort === c.key && (
                          <span className="ml-1 opacity-60">
                            {order === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={visibleCols.length + 1}
                        className="px-4 py-8 text-center opacity-70"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleCols.length + 1}
                        className="px-4 py-12 text-center opacity-70"
                      >
                        No {active} yet.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((r) => (
                      <tr
                        key={
                          activeModel?.idField
                            ? r[activeModel.idField]
                            : JSON.stringify(r)
                        }
                        className="odd:bg-slate-900/40 even:bg-slate-900/20"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={
                              !!activeModel?.idField &&
                              selectedIds.includes(r[activeModel.idField!])
                            }
                            onChange={() => toggleRowSelected(r)}
                          />
                        </td>
                        {visibleCols.map((c) => (
                          <td key={c.key} className="px-3 py-2 align-top">
                            {inputFor(
                              c,
                              r[c.key],
                              async (val) => await commitInline(r, c.key, val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Bulk actions & pagination */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <button
                  disabled={!selectedIds.length}
                  onClick={handleDeleteSelected}
                  className={clsx(
                    'text-sm rounded-xl px-3 py-1.5 flex items-center gap-1',
                    selectedIds.length
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-slate-800/60 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Trash2 size={16} /> Delete
                </button>
                {selectedIds.length > 0 && (
                  <span className="text-xs opacity-70">{selectedIds.length} selected</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5"
                >
                  Prev
                </button>
                <span className="text-sm opacity-80">Page {page}</span>
                <button
                  onClick={() => setPage((p) => (p * perPage < total ? p + 1 : p))}
                  className="text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5"
                >
                  Next
                </button>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="bg-slate-800/70 border border-slate-700 rounded-xl px-2 py-1.5"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Record Drawer */}
      {adding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[680px] max-w-[92vw] bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="text-lg font-semibold mb-4">Add {active}</div>

            {modalError && (
              <div className="mb-4 rounded-lg border border-rose-600/40 bg-rose-600/10 text-rose-200 px-3 py-2 text-sm">
                {modalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Scalars */}
              {cols
                .filter((c) => !c.isId && !c.readOnly)
                .map((c) => (
                  <label key={c.key} className="text-sm">
                    <div className="mb-1 opacity-80">{headerLabel(c.key)}</div>
                    <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2">
                      {inputFor(c, draft[c.key], (val) =>
                        setDraft((d) => ({ ...d, [c.key]: val }))
                      )}
                    </div>
                  </label>
                ))}

              {/* Required single relations without scalar FK → synthetic `<name>Id` number input */}
              {requiredSingleRelations
                .filter((rel: any) => !relationHasScalarFK(rel.name, rel.relationFromFields))
                .map((rel: any) => {
                  const key = `${rel.name}Id`;
                  return (
                    <label key={key} className="text-sm">
                      <div className="mb-1 opacity-80">{headerLabel(key)}</div>
                      <div className="bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-2">
                        <input
                          type="number"
                          className="w-full bg-transparent outline-none"
                          value={draft[key] ?? ''}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [key]: e.target.value ? Number(e.target.value) : '',
                            }))
                          }
                          placeholder="Enter related record id"
                        />
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                disabled={saving}
                onClick={() => setAdding(false)}
                className={clsx(
                  'text-sm bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5',
                  saving && 'opacity-60 cursor-not-allowed'
                )}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={saveDraft}
                className={clsx(
                  'text-sm bg-emerald-600 hover:bg-emerald-500 rounded-xl px-3 py-1.5 flex items-center gap-1',
                  saving && 'opacity-60 cursor-not-allowed'
                )}
              >
                <Check size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
