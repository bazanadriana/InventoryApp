import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

type Snapshot = {
  companyName: string;
  jobTitle: string;
  phone: string;
  newsletterOptIn: boolean;
};

type Props = {
  onSuccess?: (data: {
    accountId: string;
    contactId: string;
    snapshot: Snapshot;
  }) => void;
};

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
      const resp = await fetch('/api/integrations/salesforce/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ companyName, jobTitle, phone, newsletterOptIn }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to sync');

      setMsg('Synced to Salesforce ✔︎');
      onSuccess?.({
        accountId: data.accountId,
        contactId: data.contactId,
        snapshot: { companyName, jobTitle, phone, newsletterOptIn },
      });
    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl space-y-4 p-6 rounded-2xl border border-slate-700 bg-slate-900/40 text-slate-100"
    >
      <h3 className="text-xl font-semibold">Send to Salesforce</h3>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">
          Company / Account Name<span className="text-red-400">*</span>
        </label>
        <input
          className="w-full rounded-lg border border-slate-600 p-2 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Inc."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">Job Title</label>
        <input
          className="w-full rounded-lg border border-slate-600 p-2 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Operations Manager"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-200">Phone</label>
        <input
          className="w-full rounded-lg border border-slate-600 p-2 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+52 55 1234 5678"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={newsletterOptIn}
          onChange={(e) => setNewsletterOptIn(e.target.checked)}
        />
        Subscribe to marketing newsletter
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
      >
        {loading ? 'Syncing…' : 'Create/Update in Salesforce'}
      </button>

      {msg && <p className="text-emerald-400">{msg}</p>}
      {err && <p className="text-rose-400">{err}</p>}
    </form>
  );
}
