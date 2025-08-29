import { useEffect, useMemo, useState } from 'react';

type Item = { id: string; customId: string; createdAt: string };
type PageResp = { items: Item[]; total: number; page: number; perPage: number };

type Props = {
  fetchPage: (opts: { page: number; q: string }) => Promise<PageResp>;
  onDelete: (ids: string[]) => Promise<void>;
};

export default function ItemsTable({ fetchPage, onDelete }: Props) {
  const [rows, setRows] = useState<Item[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchPage({ page, q }).then((d) => setRows(d.items));
  }, [page, q]);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => checked[r.id]),
    [rows, checked]
  );
  const selectedIds = useMemo(
    () => Object.entries(checked).filter(([, v]) => v).map(([k]) => k),
    [checked]
  );

  function toggleAll(v: boolean) {
    setChecked((prev) => {
      const next = { ...prev };
      rows.forEach((r) => (next[r.id] = v));
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <span>Select all</span>
        </label>
        <button
          disabled={!selectedIds.length}
          onClick={() => onDelete(selectedIds)}
          className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
        >
          Delete
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter…"
          className="ml-auto px-3 py-1 rounded border"
        />
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={!!checked[r.id]}
                    onChange={(e) =>
                      setChecked((s) => ({ ...s, [r.id]: e.target.checked }))
                    }
                  />
                </td>
                <td className="p-3 font-medium">{r.customId}</td>
                <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button className="px-2 py-1 border rounded" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span className="text-sm">Page {page}</span>
        <button className="px-2 py-1 border rounded" onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
