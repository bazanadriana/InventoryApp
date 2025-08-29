import { useMemo, useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
  type Control,
  useWatch,
} from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';

/* ---------- Types & Schemas ---------- */
type IdPartType = 'fixed' | 'rand20' | 'rand32' | 'rand6' | 'rand9' | 'guid' | 'datetime' | 'seq';

const IdPartSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('fixed'), text: z.string().default('') }),
  z.object({
    id: z.string(),
    type: z.literal('rand20'),
    width: z.number().int().min(1).max(64).default(5),
    base: z.enum(['hex', 'dec']).default('hex'),
  }),
  z.object({ id: z.string(), type: z.literal('rand32'), base: z.enum(['hex', 'dec']).default('hex') }),
  z.object({ id: z.string(), type: z.literal('rand6') }),
  z.object({ id: z.string(), type: z.literal('rand9') }),
  z.object({ id: z.string(), type: z.literal('guid') }),
  z.object({ id: z.string(), type: z.literal('datetime'), fmt: z.string().default('yyyyMMdd') }),
  z.object({
    id: z.string(),
    type: z.literal('seq'),
    width: z.number().int().min(1).max(9).default(3),
    pad: z.boolean().default(true),
  }),
]);

const FieldSchema = z.object({
  id: z.string(),
  kind: z.enum(['text1', 'textn', 'numeric', 'doc', 'bool']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  showInTable: z.boolean().default(true),
});

const InventorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tags: z.string().optional(),
  idParts: z.array(IdPartSchema).min(1).max(10),
  fields: z.array(FieldSchema).max(15),
});

type InventoryForm = z.infer<typeof InventorySchema>;
type IdPart = z.infer<typeof IdPartSchema>;
type Field = z.infer<typeof FieldSchema>;

/* ---------- Utilities ---------- */
const uid = () => Math.random().toString(36).slice(2, 10);

function randomHex(len: number) {
  const bytes = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, len)
    .toUpperCase();
}

function randomDecDigits(len: number) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function generatePreview(parts: IdPart[]) {
  return parts
    .map((p) => {
      switch (p.type) {
        case 'fixed':
          return p.text ?? '';
        case 'rand20': {
          const width = p.width ?? 5;
          return (p.base === 'hex' ? randomHex(width) : randomDecDigits(width)).padStart(width, '0');
        }
        case 'rand32':
          return (
            Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10)
          ).toUpperCase();
        case 'rand6':
          return String(Math.floor(100000 + Math.random() * 900000));
        case 'rand9':
          return String(Math.floor(100000000 + Math.random() * 900000000));
        case 'guid':
          return crypto.randomUUID().toUpperCase();
        case 'datetime': {
          const d = new Date();
          const pad = (n: number, len = 2) => String(n).padStart(len, '0');
          return (p.fmt ?? 'yyyyMMdd')
            .replace(/yyyy/g, String(d.getFullYear()))
            .replace(/MM/g, pad(d.getMonth() + 1))
            .replace(/dd/g, pad(d.getDate()))
            .replace(/HH/g, pad(d.getHours()))
            .replace(/mm/g, pad(d.getMinutes()))
            .replace(/ss/g, pad(d.getSeconds()));
        }
        case 'seq':
          return (1).toString().padStart((p.pad ?? true) ? (p.width ?? 3) : 1, '0');
      }
    })
    .join('_');
}

/* ---------- DnD item ---------- */
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded border bg-white p-3"
    >
      <button
        className="cursor-grab rounded border px-2 py-1 text-xs"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ---------- Main Page ---------- */
export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<
    'items' | 'chat' | 'customId' | 'fields' | 'access' | 'stats' | 'export'
  >('customId');

  const defaultValues: InventoryForm = {
    title: 'New Inventory',
    description: '',
    tags: '',
    idParts: [
      { id: uid(), type: 'fixed', text: 'INV' },
      { id: uid(), type: 'datetime', fmt: 'yyyy_MM_dd' },
      { id: uid(), type: 'seq', width: 3, pad: true },
    ],
    fields: [],
  };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryForm>({
    // NOTE: your local @hookform/resolvers expects 3 generics
    resolver: zodResolver<InventoryForm, any, InventoryForm>(InventorySchema),
    defaultValues,
    mode: 'onSubmit',
  });

  const idPartsFA = useFieldArray<InventoryForm, 'idParts', '_k'>({
    control,
    name: 'idParts',
    keyName: '_k',
  });

  const fieldsFA = useFieldArray<InventoryForm, 'fields', '_k'>({
    control,
    name: 'fields',
    keyName: '_k',
  });

  // Typed useWatch so downstream is strongly typed
  const idParts = (useWatch({ control, name: 'idParts' }) ?? []) as IdPart[];
  const fields = (useWatch({ control, name: 'fields' }) ?? []) as Field[];

  const idPreview = useMemo(() => generatePreview(idParts), [idParts]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const oldIdx = idPartsFA.fields.findIndex((f) => f.id === String(active.id));
    if (oldIdx === -1) return;

    // Drop outside list => delete
    if (!over) {
      idPartsFA.remove(oldIdx);
      return;
    }

    if (String(active.id) === String(over.id)) return;
    const newIdx = idPartsFA.fields.findIndex((f) => f.id === String(over.id));
    if (newIdx === -1) return;
    idPartsFA.move(oldIdx, newIdx);
  }

  const addIdPart = (type: IdPartType) => {
    if (idPartsFA.fields.length >= 10) return alert('You reached the maximum of 10 ID parts.');
    const id = uid();
    const base =
      type === 'fixed'
        ? ({ id, type, text: '' } as const)
        : type === 'rand20'
        ? ({ id, type, width: 5, base: 'hex' } as const)
        : type === 'rand32'
        ? ({ id, type, base: 'hex' } as const)
        : type === 'rand6'
        ? ({ id, type } as const)
        : type === 'rand9'
        ? ({ id, type } as const)
        : type === 'guid'
        ? ({ id, type } as const)
        : type === 'datetime'
        ? ({ id, type, fmt: 'yyyyMMdd' } as const)
        : ({ id, type, width: 3, pad: true } as const); // seq
    idPartsFA.append(base as IdPart);
  };

  const counts = useMemo(() => {
    const f = fields ?? [];
    return {
      text1: f.filter((x: Field) => x.kind === 'text1').length,
      textn: f.filter((x: Field) => x.kind === 'textn').length,
      numeric: f.filter((x: Field) => x.kind === 'numeric').length,
      doc: f.filter((x: Field) => x.kind === 'doc').length,
      bool: f.filter((x: Field) => x.kind === 'bool').length,
    };
  }, [fields]);

  const addField = (kind: 'text1' | 'textn' | 'numeric' | 'doc' | 'bool') => {
    const limits = { text1: 3, textn: 3, numeric: 3, doc: 3, bool: 3 } as const;
    const current = counts[kind];
    if (current >= limits[kind]) return alert(`Limit reached for ${kind}`);
    fieldsFA.append({ id: uid(), kind, title: '', description: '', showInTable: true });
  };

  const onSubmit: SubmitHandler<InventoryForm> = async (data) => {
    try {
      const res = await api.post('/api/inventories', data);
      console.log('Saved:', res.data);
      alert('Inventory saved!');
      // TODO: navigate to detail page
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save inventory. Check console for details.');
    }
  };

  const idPartsLimitReached = idPartsFA.fields.length >= 10;

  /* ---------- UI ---------- */
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Inventory</h1>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 text-sm">
        {(['items', 'chat', 'customId', 'fields', 'access', 'stats', 'export'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded px-3 py-1 ${
              activeTab === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {t === 'customId' ? 'Custom ID' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* General info */}
      <section className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input {...register('title')} className="mt-1 w-full rounded border p-2" />
          {errors.title && (
            <span className="mt-1 block text-xs text-red-600">{errors.title.message}</span>
          )}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Tags (comma separated)</span>
          <input
            {...register('tags')}
            className="mt-1 w-full rounded border p-2"
            placeholder="laptops, hp, 2023"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <textarea {...register('description')} rows={3} className="mt-1 w-full rounded border p-2" />
        </label>
      </section>

      {activeTab === 'customId' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Custom ID format</h2>
            <div className="text-sm">
              Example:{' '}
              <span className="rounded bg-gray-900 px-2 py-1 font-mono text-white">{idPreview}</span>
            </div>
          </div>

          {/* Add element buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {([
              ['fixed', 'Fixed'],
              ['rand20', '20-bit random'],
              ['rand32', '32-bit random'],
              ['rand6', '6-digit random'],
              ['rand9', '9-digit random'],
              ['guid', 'GUID'],
              ['datetime', 'Date/time'],
              ['seq', 'Sequence'],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => addIdPart(v)}
                disabled={idPartsLimitReached}
                className="rounded border bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                + {label}
              </button>
            ))}
            {idPartsLimitReached && <span className="text-xs text-gray-500">(Max 10 parts)</span>}
          </div>

          {/* DnD List */}
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={idPartsFA.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {idPartsFA.fields.map((row, idx) => (
                  <SortableRow key={row.id} id={row.id}>
                    <IdPartEditor index={idx} remove={() => idPartsFA.remove(idx)} control={control} />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-xs text-gray-600">
            Tip: drag to reorder; <span className="font-medium">drop outside the list to delete</span>.
          </p>
        </section>
      )}

      {activeTab === 'fields' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Custom Fields (limits per spec)</h2>
            <div className="text-sm text-gray-700">
              text(1): {counts.text1}/3 · text(n): {counts.textn}/3 · numeric: {counts.numeric}/3 · doc: {counts.doc}/3 · bool: {counts.bool}/3
            </div>
          </div>

          {/* Add field buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => addField('text1')}
              disabled={counts.text1 >= 3}
              className="rounded border bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              + Single-line text
            </button>
            <button
              onClick={() => addField('textn')}
              disabled={counts.textn >= 3}
              className="rounded border bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              + Multi-line text
            </button>
            <button
              onClick={() => addField('numeric')}
              disabled={counts.numeric >= 3}
              className="rounded border bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              + Numeric
            </button>
            <button
              onClick={() => addField('doc')}
              disabled={counts.doc >= 3}
              className="rounded border bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              + Document/image (URL)
            </button>
            <button
              onClick={() => addField('bool')}
              disabled={counts.bool >= 3}
              className="rounded border bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              + True/false
            </button>
          </div>

          <div className="space-y-2">
            {fieldsFA.fields.map((f, i) => (
              <div key={f.id} className="grid gap-3 rounded border bg-white p-3 md:grid-cols-5">
                <div className="md:col-span-1">
                  <span className="text-xs uppercase text-gray-500">Type</span>
                  <div className="font-mono text-sm">{f.kind}</div>
                </div>
                <label className="md:col-span-2">
                  <span className="text-xs uppercase text-gray-500">Title</span>
                  <input
                    {...register(`fields.${i}.title` as const)}
                    className="mt-1 w-full rounded border p-2"
                  />
                  {errors.fields?.[i]?.title && (
                    <span className="mt-1 block text-xs text-red-600">
                      {errors.fields?.[i]?.title?.message as string}
                    </span>
                  )}
                </label>
                <label className="md:col-span-2">
                  <span className="text-xs uppercase text-gray-500">Description</span>
                  <input
                    {...register(`fields.${i}.description` as const)}
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
                <label className="md:col-span-5 flex items-center gap-2">
                  <input type="checkbox" {...register(`fields.${i}.showInTable` as const)} />
                  <span className="text-sm">Show in items table</span>
                </label>
                <div className="md:col-span-5">
                  <button
                    type="button"
                    onClick={() => fieldsFA.remove(i)}
                    className="rounded bg-red-50 px-3 py-1 text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab !== 'customId' && activeTab !== 'fields' && (
        <section className="rounded border bg-white p-4 text-gray-600">
          “{activeTab}” tab placeholder — build later.
        </section>
      )}
    </div>
  );
}

/* ---------- Editors ---------- */
function IdPartEditor({
  index,
  remove,
  control,
}: {
  index: number;
  remove: () => void;
  control: Control<InventoryForm>;
}) {
  return (
    <Controller<InventoryForm>
      control={control}
      name={`idParts.${index}` as const}
      render={({ field }) => {
        const part = field.value as IdPart;
        return (
          <div className="grid w-full items-end gap-2 md:grid-cols-5">
            <div className="md:col-span-1">
              <span className="text-xs uppercase text-gray-500">Type</span>
              <div className="font-mono text-sm">{part.type}</div>
            </div>

            {part.type === 'fixed' && (
              <label className="md:col-span-3">
                <span className="text-xs uppercase text-gray-500">Text</span>
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={part.text ?? ''}
                  onChange={(e) => field.onChange({ ...part, text: e.target.value })}
                />
              </label>
            )}

            {part.type === 'rand20' && (
              <>
                <label>
                  <span className="text-xs uppercase text-gray-500">Width</span>
                  <input
                    type="number"
                    min={1}
                    max={64}
                    className="mt-1 w-full rounded border p-2"
                    value={part.width ?? 5}
                    onChange={(e) =>
                      field.onChange({ ...part, width: Number(e.target.value) || 1 })
                    }
                  />
                </label>
                <label>
                  <span className="text-xs uppercase text-gray-500">Base</span>
                  <select
                    className="mt-1 w-full rounded border p-2"
                    value={part.base ?? 'hex'}
                    onChange={(e) =>
                      field.onChange({ ...part, base: e.target.value as 'hex' | 'dec' })
                    }
                  >
                    <option value="hex">hex</option>
                    <option value="dec">dec</option>
                  </select>
                </label>
              </>
            )}

            {part.type === 'datetime' && (
              <label className="md:col-span-3">
                <span className="text-xs uppercase text-gray-500">
                  Format (yyyy, MM, dd, HH, mm, ss)
                </span>
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={part.fmt ?? 'yyyyMMdd'}
                  onChange={(e) => field.onChange({ ...part, fmt: e.target.value })}
                />
              </label>
            )}

            {part.type === 'seq' && (
              <>
                <label>
                  <span className="text-xs uppercase text-gray-500">Width</span>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    className="mt-1 w-full rounded border p-2"
                    value={part.width ?? 3}
                    onChange={(e) =>
                      field.onChange({ ...part, width: Number(e.target.value) || 1 })
                    }
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={part.pad ?? true}
                    onChange={(e) => field.onChange({ ...part, pad: e.target.checked })}
                  />
                  <span className="text-sm">Pad with zeros</span>
                </label>
              </>
            )}

            {(part.type === 'rand32' || part.type === 'rand6' || part.type === 'rand9' || part.type === 'guid') && (
              <div className="md:col-span-3 text-sm text-gray-500">No options</div>
            )}

            <div className="md:col-span-1 flex justify-end">
              <button onClick={remove} type="button" className="rounded bg-red-50 px-3 py-1 text-red-700">
                Remove
              </button>
            </div>
          </div>
        );
      }}
    />
  );
}
