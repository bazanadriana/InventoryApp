import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type User = {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked' | 'deleted';
  lastLogin: string | null;     // ISO string
  createdAt: string;            // ISO string
};

type ApiList = {
  total: number;
  page: number;
  perPage: number;
  rows: User[];
};

const API = (import.meta as any).env?.VITE_API_URL || ''; // '' = same origin
const withQs = (url: string, params: Record<string, any>) =>
  url + '?' + new URLSearchParams(Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ) as any).toString();

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function StatusChip({ status }: { status: User['status'] }) {
  const map: Record<User['status'], string> = {
    active: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    blocked: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    deleted: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[status]}`}>
      {status}
    </span>
  );
}

export default function UsersGrid() {
  const { user } = useAuth() as { user?: { id?: string; role?: string } };
  const currentId = user?.id ?? null;

  // table state
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | User['status']>('');
  const [role, setRole] = useState<'' | User['role']>('');
  const [sort, setSort] = useState<'-lastLogin' | 'lastLogin' | 'name' | '-name'>('-lastLogin');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // selection
  const [sel, setSel] = useState<Set<string>>(new Set());

  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  function handleForbidden() {
    try { localStorage.removeItem('token'); } catch {}
    // If you have a logout() in useAuth, call it here instead:
    // logout();
    window.location.assign('/'); // force redirect to login/home
  }

  async function fetchUsers() {
    setLoading(true);
    setErr(null);
    try {
      const url = withQs(`${API}/api/users`, {
        q: query,
        status,
        role,
        sort,
        page,
        perPage,
      });
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 403) return handleForbidden();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiList;
      setRows(data.rows);
      setTotal(data.total);
      // maintain selection only for ids still in dataset
      setSel(prev => new Set([...prev].filter(id => data.rows.some(r => r.id === id))));
    } catch (e: any) {
      setErr(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); /* eslint-disable-next-line */ }, [page, perPage, sort, status, role]);
  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [query]);

  // actions
  async function mutate(path: string, body: any, method = 'PATCH') {
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (res.status === 403) return handleForbidden();
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      await fetchUsers();
    } catch (e: any) {
      alert(e.message || 'Request failed');
    }
  }

  const selected = useMemo(() => rows.filter(r => sel.has(r.id)), [rows, sel]);
  const allVisibleSelected = rows.length > 0 && rows.every(r => sel.has(r.id));
  const anySelected = sel.size > 0;

  function toggleRow(id: string) {
    setSel(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAllVisible() {
    setSel(prev => {
      const n = new Set(prev);
      if (allVisibleSelected) {
        rows.forEach(r => n.delete(r.id));
      } else {
        rows.forEach(r => n.add(r.id));
      }
      return n;
    });
  }

  function selectNonCurrent() {
    setSel(new Set(rows.filter(r => r.id !== currentId).map(r => r.id)));
  }

  function clearSelection() { setSel(new Set()); }

  // bulk endpoints (adjust paths if yours differ)
  function blockSelected()   { mutate('/api/users/block',   { ids: [...sel] }); }
  function unblockSelected() { mutate('/api/users/unblock', { ids: [...sel] }); }
  function deleteSelected()  { mutate('/api/users',         { ids: [...sel] }, 'DELETE'); }
  function blockAll()        { mutate('/api/users/block-all', {}); } // includes current user → triggers forced logout

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-sm backdrop-blur">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-56 rounded-md border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value as any); setPage(1); }}
            className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            value={role}
            onChange={e => { setRole(e.target.value as any); setPage(1); }}
            className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="-lastLogin">Last login ↓</option>
            <option value="lastLogin">Last login ↑</option>
            <option value="name">Name ↑</option>
            <option value="-name">Name ↓</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleAllVisible}
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10"
            title="Toggle select all (visible)"
          >
            {allVisibleSelected ? 'Unselect all' : 'Select all (visible)'}
          </button>
          <button
            onClick={selectNonCurrent}
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10"
            title="Select all except me"
          >
            Select non-current
          </button>
          {anySelected && (
            <span className="ml-1 text-sm text-slate-400">
              {sel.size} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={blockSelected}
            disabled={!anySelected}
            className="rounded-md border border-amber-500/30 px-3 py-1.5 text-sm text-amber-200/90 hover:bg-amber-500/10 disabled:opacity-40"
          >
            Block
          </button>
          <button
            onClick={unblockSelected}
            disabled={!anySelected}
            className="rounded-md border border-emerald-500/30 px-3 py-1.5 text-sm text-emerald-200/90 hover:bg-emerald-500/10 disabled:opacity-40"
          >
            Unblock
          </button>
          <button
            onClick={() => {
              if (sel.size === 0) return;
              if (confirm(`Delete ${sel.size} user(s)? This cannot be undone.`)) {
                deleteSelected();
                clearSelection();
              }
            }}
            disabled={!anySelected}
            className="rounded-md border border-rose-500/30 px-3 py-1.5 text-sm text-rose-200/90 hover:bg-rose-500/10 disabled:opacity-40"
          >
            Delete
          </button>
          <button
            onClick={() => {
              if (confirm('Block ALL users (including you)? This will log you out.')) {
                blockAll();
              }
            }}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10"
            title="Blocks everyone; backend should force 403 and your frontend will redirect to login"
          >
            Block ALL
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-slate-900/60">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-3">
                <input
                  aria-label="select all"
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                />
              </th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Last login</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/40">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            )}

            {!loading && rows.map(u => (
              <tr key={u.id} className="text-sm text-slate-200">
                <td className="px-3 py-2">
                  <input
                    aria-label={`select ${u.email}`}
                    type="checkbox"
                    checked={sel.has(u.id)}
                    onChange={() => toggleRow(u.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.name || '—'}</span>
                    {u.id === currentId && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-200 ring-1 ring-indigo-500/30">
                        you
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-300">{u.email}</td>
                <td className="px-3 py-2">
                  <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs">
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <StatusChip status={u.status} />
                </td>
                <td className="px-3 py-2 text-slate-300">{formatDate(u.lastLogin)}</td>
                <td className="px-3 py-2 text-slate-300">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          Showing <span className="text-slate-200">{total === 0 ? 0 : start}-{end}</span> of{' '}
          <span className="text-slate-200">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="w-10 text-center text-sm text-slate-300">{page}</span>
          <button
            onClick={() => setPage(p => (end < total ? p + 1 : p))}
            disabled={end >= total}
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
