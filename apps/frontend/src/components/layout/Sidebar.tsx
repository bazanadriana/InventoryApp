// apps/frontend/src/components/layout/Sidebar.tsx
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

export type ModelKey = 'Inventory' | 'InventoryMember' | 'Item' | 'User';

type Counts = Partial<Record<ModelKey, number>>;

type Props = {
  selected: ModelKey;
  onSelect: (model: ModelKey) => void;
  /** Optional: supply extra counts (e.g., from an admin endpoint). */
  counts?: Counts;
  className?: string;
};

type Inventory = { id: number; title: string; itemCount?: number };

const MODELS: { key: ModelKey; label: string }[] = [
  { key: 'Inventory', label: 'Inventory' },
  { key: 'InventoryMember', label: 'InventoryMember' },
  { key: 'Item', label: 'Item' },
  { key: 'User', label: 'User' },
];

export default function Sidebar({
  selected,
  onSelect,
  counts: countsProp = {},
  className,
}: Props) {
  const [q, setQ] = useState('');
  const [autoCounts, setAutoCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(false);

  /**
   * Fetch counts for all models (Prisma Studio-style badges).
   * Primary source:  GET /stats/counts  -> { Inventory, InventoryMember, Item, User }
   * Fallback:        GET /inventories?flat=1  -> infer Inventory and Item totals
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Record<ModelKey, number>>('/stats/counts');
        if (!ignore) setAutoCounts(data as Counts);
      } catch {
        // Fallback to inventories flat response for Inventory & Item counts
        try {
          const res = await api.get('/inventories?flat=1');
          const invs: Inventory[] = Array.isArray(res.data)
            ? (res.data as Inventory[])
            : Array.isArray((res.data as any)?.inventories)
            ? ((res.data as any).inventories as Inventory[])
            : Array.isArray((res.data as any)?.data)
            ? ((res.data as any).data as Inventory[])
            : [];

          if (!ignore) {
            setAutoCounts({
              Inventory: invs.length,
              Item: invs.reduce((sum, i) => sum + (i.itemCount ?? 0), 0),
            });
          }
        } finally {
          if (!ignore) setLoading(false);
        }
        return;
      }
      if (!ignore) setLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const mergedCounts = { ...autoCounts, ...countsProp };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? MODELS.filter((m) => m.label.toLowerCase().includes(term)) : MODELS;
  }, [q]);

  return (
    <aside
      className={
        className ??
        'w-64 shrink-0 border-r border-white/10 bg-white/5 p-3 dark:border-white/10'
      }
    >
      {/* Search */}
      <div className="mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search models…"
          className="w-full rounded border border-white/20 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white"
        />
      </div>

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        All Models
      </div>

      {/* Model list */}
      <ul className="space-y-1">
        {filtered.map(({ key, label }) => {
          const active = key === selected;
          const count = mergedCounts[key];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(key)}
                className={[
                  'flex w-full items-center justify-between rounded px-2 py-2 text-left',
                  active
                    ? 'bg-white/10 text-slate-900 dark:text-white'
                    : 'hover:bg-white/10 text-slate-900 dark:text-white',
                ].join(' ')}
              >
                <span className="truncate">{label}</span>
                <span
                  className={[
                    'ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs',
                    active ? 'bg-white/20' : 'bg-white/10',
                  ].join(' ')}
                  title={
                    loading && (key === 'Inventory' || key === 'InventoryMember' || key === 'Item' || key === 'User')
                      ? 'Loading…'
                      : ''
                  }
                >
                  {typeof count === 'number' ? count : '—'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {loading ? 'Loading counts…' : '\u00A0'}
      </div>
    </aside>
  );
}
