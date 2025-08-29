// apps/frontend/src/components/UsersGrid.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';

type User = {
  id: number;
  email: string;
  name: string | null;
  image?: string | null;
  createdAt?: string;
};

type UsersResp = { users: User[]; page: number; perPage: number; total: number } | User[];

export default function UsersGrid() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState<'id' | 'email' | 'name' | 'createdAt'>('id');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const parseResp = (d: UsersResp) =>
    Array.isArray(d)
      ? { users: d, total: d.length }
      : { users: d.users ?? [], total: d.total ?? (d.users?.length ?? 0) };

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.get<UsersResp>('/users', {
        params: { q, page, perPage, sort, order },
      });
      const { users, total } = parseResp(r.data);
      setRows(users);
      setTotal(total);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to load users');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, perPage, sort, order]);

  const toggleSort = (col: typeof sort) => {
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSort(col);
      setOrder('asc');
    }
  };

  return (
    <div className="rounded border border-white/10 bg-white/5 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Filters
        </span>
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search name/email…"
          className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder-slate-400 dark:text-white"
        />
        <div className="ml-auto text-sm text-slate-600 dark:text-slate-300">
          Showing {rows.length} of {total}
        </div>
      </div>

      {err ? (
        <div className="rounded border border-amber-400/40 bg-amber-50/50 p-3 text-amber-800 dark:border-amber-400/30 dark:bg-amber-800/10 dark:text-amber-200">
          {err}
        </div>
      ) : loading ? (
        <div className="text-slate-600 dark:text-slate-300">Loading…</div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 text-sm">
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

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  <th
                    className="cursor-pointer px-3 py-2 text-left"
                    onClick={() => toggleSort('email')}
                  >
                    Email {sort === 'email' ? (order === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left"
                    onClick={() => toggleSort('name')}
                  >
                    Name {sort === 'name' ? (order === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left"
                    onClick={() => toggleSort('createdAt')}
                  >
                    Created {sort === 'createdAt' ? (order === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="px-3 py-2 text-slate-900 dark:text-white">{u.email}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {u.name ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
