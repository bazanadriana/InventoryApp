import { useEffect, useState } from 'react';

type Post = { id: string; body: string; createdAt: string; user?: { name: string | null; email: string } };

export default function Discussion({ inventoryId }: { inventoryId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState('');

  const load = async () => {
    const r = await fetch(`/api/inventories/${inventoryId}/comments`);
    setPosts(await r.json());
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [inventoryId]);

  const submit = async () => {
    if (!body.trim()) return;
    await fetch(`/api/inventories/${inventoryId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    setBody('');
    load();
  };

  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="border rounded p-3">
          <div className="text-xs text-zinc-500">
            {(p.user?.name ?? p.user?.email) || 'Unknown'} • {new Date(p.createdAt).toLocaleString()}
          </div>
          <div className="mt-1 whitespace-pre-wrap">{p.body}</div>
        </div>
      ))}
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment (Markdown allowed)…"
          className="flex-1 border rounded p-2"
        />
        <button onClick={submit} className="px-3 py-2 rounded bg-black text-white">
          Post
        </button>
      </div>
    </div>
  );
}
