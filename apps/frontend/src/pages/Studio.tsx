import { useEffect, useState } from 'react';
import Sidebar, { type ModelKey } from '../components/layout/Sidebar';
import Dashboard from './Dashboard';
import ItemsGrid from '../components/ItemsGrid';
import MembersGrid from '../components/MembersGrid';
import UsersGrid from '../components/UsersGrid';
import { api } from '../services/api';

type Inventory = { id: number; title: string };

export default function Studio() {
  const [model, setModel] = useState<ModelKey>('Inventory');

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [invId, setInvId] = useState<number | ''>('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/inventories?flat=1');
        const list: Inventory[] = Array.isArray(r.data)
          ? r.data
          : r.data?.inventories ?? r.data?.data ?? [];
        setInventories(list);
        if (list.length && invId === '') setInvId(list[0].id);
      } catch {
        setInventories([]);
        setInvId('');
      }
    })();
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <Sidebar selected={model} onSelect={setModel} />
      <main className="flex-1 p-4">
        {model === 'Inventory' && <Dashboard />}

        {model === 'Item' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Inventory</span>
              <select
                className="rounded border border-white/20 bg-transparent p-1 text-slate-900 dark:text-white"
                value={invId}
                onChange={(e) => setInvId(Number(e.target.value))}
              >
                {inventories.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.title}
                  </option>
                ))}
              </select>
            </div>
            {invId !== '' && <ItemsGrid inventoryId={Number(invId)} />}
          </div>
        )}

        {model === 'InventoryMember' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Inventory</span>
              <select
                className="rounded border border-white/20 bg-transparent p-1 text-slate-900 dark:text-white"
                value={invId}
                onChange={(e) => setInvId(Number(e.target.value))}
              >
                {inventories.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.title}
                  </option>
                ))}
              </select>
            </div>
            {invId !== '' && <MembersGrid inventoryId={Number(invId)} />}
          </div>
        )}

        {model === 'User' && <UsersGrid />}
      </main>
    </div>
  );
}
