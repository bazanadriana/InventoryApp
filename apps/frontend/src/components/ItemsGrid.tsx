// frontend/src/components/ItemsGrid.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

type Item = {
  id: number;
  title: string;
  description: string | null;
  qty: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type ItemsObjResp = { items: Item[]; page?: number; perPage?: number; total?: number };
type ItemsResp = ItemsObjResp | Item[];

type Props = { inventoryId: number };

export default function ItemsGrid({ inventoryId }: Props) {
  const [q, setQ] = useState('');
  const [sort, setSort] =
    useState<'id' | 'title' | 'description' | 'qty' | 'createdAt' | 'updatedAt'>('id');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [data, setData] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [cols, setCols] = useState<{ [k: string]: boolean }>({
    title: true,
    description: true,
    qty: true,
  });

  // Add-record UI
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState<number | ''>('');
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const allChecked = useMemo(
    () => data.length > 0 && data.every((it) => selected.has(it.id)),
    [data, selected]
  );
  const someChecked = selected.size > 0 && !allChecked;

  // make header checkbox show indeterminate when partially selected
  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const parseResp = (payload: ItemsResp) => {
    if (Array.isArray(payload)) {
      return { items: payload, total: payload.length };
    }
    return {
      items: payload.items ?? [],
      total: payload.total ?? (payload.items ? payload.items.length : 0),
    };
  };

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.get<ItemsResp>(`/inventories/${inventoryId}/items`, {
        params: { q, sort, order, page, perPage },
      });
      const { items, total } = parseResp(r.data);
      setData(items ?? []);
      setTotal(typeof total === 'number' ? total : 0);
      setSelected(new Set());
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to load items');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, order, page, perPage, inventoryId]);

  const toggleSort = (col: typeof sort) => {
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSort(col);
      setOrder('asc');
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    for (const id of selected) await api.delete(`/inventories/items/${id}`);
    fetchData();
  };

  const addItem = async () => {
    if (!newTitle.trim()) {
      setAddErr('Title is required.');
      return;
    }
    setAddBusy(true);
    setAddErr(null);
    try {
      await api.post(`/inventories/${inventoryId}/items`, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        qty: newQty === '' ? 0 : Number(newQty),
      });
      // reset + refresh to reflect the new row
      setAdding(false);
      setNewTitle('');
      setNewDesc('');
      setNewQty('');
      setPage(1);
      await fetchData();
    } catch (e: any) {
      setAddErr(e?.response?.data?.error || e?.message || 'Failed to add item');
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded border border-white/10 bg-white/5 p-3">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setAdding((v) => !v);
            setAddErr(null);
          }}
          className="rounded border border-white/20 px-2 py-1 text-sm text-slate-900 hover:bg-white/10 dark:text-white"
        >
          {adding ? 'Cancel' : 'Add record'}
        </button>

        {adding && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 dark:text-white"
              placeholder="Title *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 dark:text-white"
              placeholder="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <input
              type="number"
              min={0}
              className="w-24 rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 dark:text-white"
              placeholder="Qty"
              value={newQty}
              onChange={(e) =>
                setNewQty(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
            <button
              onClick={addItem}
              disabled={addBusy || !newTitle.trim()}
              className="rounded border border-white/20 px-2 py-1 text-sm text-emerald-600 hover:bg-white/10 dark:text-emerald-300 disabled:opacity-50"
            >
              {addBusy ? 'Saving…' : 'Save'}
            </button>
            {addErr && (
              <span className="text-sm text-amber-500 dark:text-amber-300">{addErr}</span>
            )}
          </div>
        )}

        <span className="ml-4 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Filters
        </span>
        <input
          placeholder="Search title/description…"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder-slate-400 dark:text-white"
        />
        <span className="ml-4 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Fields
        </span>
        {(['title', 'description', 'qty'] as const).map((c) => (
          <label key={c} className="cursor-pointer text-sm text-slate-900 dark:text-white">
            <input
              type="checkbox"
              className="mr-1 align-middle"
              checked={!!cols[c]}
              onChange={() => setCols((s) => ({ ...s, [c]: !s[c] }))}
            />
            {c}
          </label>
        ))}
        <div className="ml-auto text-sm text-slate-600 dark:text-slate-300">
          Showing {data.length} of {total}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={bulkDelete}
          className="rounded border border-white/20 px-2 py-1 text-sm text-red-600 hover:bg-white/10 dark:text-red-300 disabled:opacity-50"
          disabled={selected.size === 0}
          title="Delete selected"
        >
          Delete
        </button>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="text-slate-600 dark:text-slate-300">
            Per page
            <select
              className="ml-1 rounded border border-white/20 bg-transparent p-1"
              value={perPage}
              onChange={(e) => {
                setPage(1);
                setPerPage(Number(e.target.value));
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-slate-600 dark:text-slate-300">Page {page}</span>
          <button
            className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
            onClick={() => setPage((p) => (p * perPage < total ? p + 1 : p))}
            disabled={page * perPage >= total}
          >
            Next
          </button>
        </div>
      </div>

      {/* Table */}
      {err ? (
        <div className="rounded border border-amber-400/40 bg-amber-50/50 p-3 text-amber-800 dark:border-amber-400/30 dark:bg-amber-800/10 dark:text-amber-200">
          {err}
        </div>
      ) : loading ? (
        <div className="text-slate-600 dark:text-slate-300">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border-collapse">
            {/* Ensure header & rows share identical column widths */}
            <colgroup>
              <col className="w-10" />
              {cols.title && <col />}
              {cols.description && <col />}
              {cols.qty && <col className="w-16" />}
            </colgroup>

            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                <th className="w-10 px-2 py-2 text-left align-middle">
                  <input
                    ref={headerCbRef}
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(data.map((d) => d.id)));
                      else setSelected(new Set());
                    }}
                    className="h-4 w-4 align-middle"
                    aria-label="Select all"
                  />
                </th>
                {cols.title && (
                  <th
                    className="cursor-pointer px-3 py-2 text-left align-middle"
                    onClick={() => toggleSort('title')}
                  >
                    Title {sort === 'title' ? (order === 'asc' ? '▲' : '▼') : ''}
                  </th>
                )}
                {cols.description && (
                  <th
                    className="cursor-pointer px-3 py-2 text-left align-middle"
                    onClick={() => toggleSort('description')}
                  >
                    Description {sort === 'description' ? (order === 'asc' ? '▲' : '▼') : ''}
                  </th>
                )}
                {cols.qty && (
                  <th
                    className="cursor-pointer px-3 py-2 text-right align-middle"
                    onClick={() => toggleSort('qty')}
                  >
                    Qty {sort === 'qty' ? (order === 'asc' ? '▲' : '▼') : ''}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {data.map((it) => (
                <tr key={it.id} className="border-b border-white/5">
                  <td className="w-10 px-2 py-2 align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(it.id)}
                      onChange={(e) => {
                        setSelected((s) => {
                          const n = new Set(s);
                          e.target.checked ? n.add(it.id) : n.delete(it.id);
                          return n;
                        });
                      }}
                      className="h-4 w-4 align-middle"
                      aria-label={`Select ${it.title}`}
                    />
                  </td>
                  {cols.title && (
                    <td className="px-3 py-2 align-middle text-slate-900 dark:text-white">
                      {it.title}
                    </td>
                  )}
                  {cols.description && (
                    <td className="px-3 py-2 align-middle text-slate-700 dark:text-slate-300">
                      {it.description ?? '—'}
                    </td>
                  )}
                  {cols.qty && (
                    <td className="px-3 py-2 text-right align-middle tabular-nums text-slate-900 dark:text-white">
                      {it.qty ?? 0}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
