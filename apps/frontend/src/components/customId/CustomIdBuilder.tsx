import { useEffect, useState } from 'react';

type Element =
  | { id: string; type: 'FIXED'; text?: string }
  | { id: string; type: 'RANDOM20' }
  | { id: string; type: 'RAND32' }
  | { id: string; type: 'SEQ'; prefix?: string }
  | { id: string; type: 'GUID' }
  | { id: string; type: 'DATETIME'; format?: string };

type Props = {
  load: () => Promise<Element[]>;
  save: (els: Element[]) => Promise<void>;
};

export default function CustomIdBuilder({ load, save }: Props) {
  const [els, setEls] = useState<Element[]>([]);

  useEffect(() => { load().then(setEls); }, []);

  const example = renderExample(els);

  function add() {
    setEls((a) => [...a, { id: crypto.randomUUID(), type: 'FIXED', text: '-' }]);
  }
  function remove(i: number) { setEls((a) => a.filter((_, k) => k !== i)); }
  function move(i: number, d: number) {
    setEls((a) => {
      const b = [...a]; const j = i + d;
      if (j < 0 || j >= b.length) return a;
      const t = b[i]; b[i] = b[j]; b[j] = t;
      return b;
    });
  }
  function edit(i: number, patch: Partial<Element>) {
    setEls((a) => a.map((x, k) => (k === i ? { ...x, ...patch } as Element : x)));
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-600">
        Example: <span className="font-mono">{example}</span>
      </div>

      <div className="grid gap-2">
        {els.map((e, idx) => (
          <div key={e.id} className="flex items-center gap-2 border p-2 rounded">
            <button onClick={() => move(idx, -1)} className="px-1 border rounded">↑</button>
            <button onClick={() => move(idx, 1)} className="px-1 border rounded">↓</button>

            <select
              value={e.type}
              onChange={(ev) =>
                edit(idx, { type: ev.target.value as Element['type'] })
              }
              className="border rounded px-2 py-1"
            >
              <option value="FIXED">Fixed</option>
              <option value="RANDOM20">20-bit random</option>
              <option value="RAND32">32-bit random</option>
              <option value="SEQ">Sequence</option>
              <option value="GUID">GUID</option>
              <option value="DATETIME">Date/time</option>
            </select>

            {e.type === 'FIXED' && (
              <input
                value={(e as any).text ?? ''}
                onChange={(ev) => edit(idx, { text: ev.target.value })}
                className="border rounded px-2 py-1 flex-1"
                placeholder="fixed text (emoji ok)"
              />
            )}
            {e.type === 'SEQ' && (
              <input
                value={(e as any).prefix ?? ''}
                onChange={(ev) => edit(idx, { prefix: ev.target.value })}
                className="border rounded px-2 py-1"
                placeholder="prefix e.g. D3_"
              />
            )}
            {e.type === 'DATETIME' && (
              <input
                value={(e as any).format ?? 'yyyy'}
                onChange={(ev) => edit(idx, { format: ev.target.value })}
                className="border rounded px-2 py-1"
                placeholder="format e.g. yyyy-MM"
              />
            )}

            <button onClick={() => remove(idx)} className="ml-auto text-red-600">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={add} className="px-3 py-1 rounded border">Add element</button>
        <button onClick={() => save(els)} className="px-3 py-1 rounded bg-black text-white">Save</button>
      </div>
    </div>
  );
}

function renderExample(a: Element[]) {
  return a
    .map((e) => {
      switch (e.type) {
        case 'FIXED': return (e as any).text ?? '';
        case 'RANDOM20': return 'A7E3A';
        case 'RAND32': return '0135ABCD';
        case 'SEQ': return (e as any).prefix ?? 'D3_';
        case 'GUID': return '550e8400-e29b-41d4-a716-446655440000';
        case 'DATETIME': return (e as any).format ?? 'yyyy';
      }
    })
    .join('');
}
