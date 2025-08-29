// apps/frontend/src/components/MembersGrid.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Member = {
  id: number;
  inventoryId: number;
  userId: number;
  role: 'OWNER' | 'EDITOR' | 'VIEWER' | string;
  email: string;
  name: string | null;
  image?: string | null;
};

type Props = { inventoryId: number };

export default function MembersGrid({ inventoryId }: Props) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // "Add record" UI state
  const [adding, setAdding] = useState(false);
  const [addUserId, setAddUserId] = useState<string>('');
  const [addRole, setAddRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.get<Member[]>(`/inventories/${inventoryId}/members`, {
        params: { q },
      });
      setRows(r.data ?? []);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || 'Failed to load members');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryId, q]);

  const addMember = async () => {
    const uid = Number(addUserId);
    if (!Number.isFinite(uid) || uid <= 0) {
      setAddErr('Valid user ID is required.');
      return;
    }
    setAddBusy(true);
    setAddErr(null);
    try {
      await api.post(`/inventories/${inventoryId}/members`, {
        userId: uid,
        role: addRole,
      });
      // refresh + reset
      setAdding(false);
      setAddUserId('');
      setAddRole('EDITOR');
      await fetchData();
    } catch (e: any) {
      setAddErr(e?.response?.data?.error || e?.message || 'Failed to add member');
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
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              placeholder="User ID *"
              className="w-28 rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder-slate-400 dark:text-white"
            />
            <label className="text-sm text-slate-900 dark:text-white">
              Role
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="ml-2 rounded border border-white/20 bg-transparent px-2 py-1 text-sm"
              >
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </label>
            <button
              onClick={addMember}
              disabled={addBusy || !addUserId.trim()}
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name/email…"
          className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder-slate-400 dark:text-white"
        />
        <div className="ml-auto text-sm text-slate-600 dark:text-slate-300">
          Showing {rows.length}
        </div>
      </div>

      {/* Grid */}
      {err ? (
        <div className="rounded border border-amber-400/40 bg-amber-50/50 p-3 text-amber-800 dark:border-amber-400/30 dark:bg-amber-800/10 dark:text-amber-200">
          {err}
        </div>
      ) : loading ? (
        <div className="text-slate-600 dark:text-slate-300">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="px-3 py-2 text-slate-900 dark:text-white">
                    {m.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {m.email}
                  </td>
                  <td className="px-3 py-2 text-slate-900 dark:text-white">
                    {m.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
