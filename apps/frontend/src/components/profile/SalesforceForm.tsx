import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getApiBase } from '../../lib/apiBase';

type Props = {
  onSuccess?: (ids: {
    accountId: string;
    contactId: string;
    snapshot: { companyName: string; jobTitle: string; phone: string; newsletterOptIn: boolean };
  }) => void;
};

const API_BASE = getApiBase();

async function getJsonOrText(res: Response) {
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson
      ? (body as any)?.error || (body as any)?.message || JSON.stringify(body)
      : (body as string)?.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export default function SalesforceForm({ onSuccess }: Props) {
  const { token } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/integrations/salesforce/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyName, jobTitle, phone, newsletterOptIn }),
      });

      const data = await getJsonOrText(resp);
      setMsg('Synced to Salesforce ✔︎');

      onSuccess?.({
        accountId: (data as any).accountId,
        contactId: (data as any).contactId,
        snapshot: { companyName, jobTitle, phone, newsletterOptIn },
      });
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl w-full space-y-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/40"
    >
      <h3 className="text-xl font-semibold">Send to Salesforce</h3>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Company / Account Name<span className="text-red-500">*</span>
        </label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Inc."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Job Title</label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Operations Manager"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Phone</label>
        <input
          type="tel"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+52 55 1234 5678"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={newsletterOptIn}
          onChange={(e) => setNewsletterOptIn(e.target.checked)}
        />
        Subscribe to marketing newsletter
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Syncing…' : 'Create/Update in Salesforce'}
        </button>
      </div>

      {msg && <p className="text-emerald-400">{msg}</p>}
      {err && <p className="text-rose-400">{err}</p>}
    </form>
  );
}
