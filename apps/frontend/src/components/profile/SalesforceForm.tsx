import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  onSuccess?: (ids: { accountId: string; contactId: string }) => void;
};

export default function SalesforceForm({ onSuccess }: Props) {
  const { token } = useAuth(); // your hook that stores JWT
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
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to sync');
      }

      setMsg('Synced to Salesforce ✔︎');
      onSuccess?.({ accountId: data.accountId, contactId: data.contactId });
    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 p-4 rounded-2xl border">
      <h3 className="text-xl font-semibold">Send to Salesforce</h3>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Company / Account Name<span className="text-red-500">*</span></label>
        <input
          className="w-full rounded-lg border p-2"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Inc."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Job Title</label>
        <input
          className="w-full rounded-lg border p-2"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Operations Manager"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Phone</label>
        <input
          className="w-full rounded-lg border p-2"
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

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
      >
        {loading ? 'Syncing…' : 'Create/Update in Salesforce'}
      </button>

      {msg && <p className="text-green-600">{msg}</p>}
      {err && <p className="text-red-600">{err}</p>}
    </form>
  );
}
