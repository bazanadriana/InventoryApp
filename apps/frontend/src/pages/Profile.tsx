import { useEffect, useMemo, useState } from "react";
import TopNav from "../components/layout/TopNav";
import SalesforceForm from "../components/profile/SalesforceForm";
import { useAuth } from "../hooks/useAuth";

type Me = {
  id: number;
  email: string;
  name?: string | null;
  image?: string | null;
  salesforceAccountId?: string | null;
  salesforceContactId?: string | null;
};

type Inventory = {
  id: number;
  title: string;
  createdAt: string;
  ownerId: number;
};

export default function Profile() {
  const { token } = useAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // last Salesforce sync (from the form)
  const [lastSync, setLastSync] = useState<{
    accountId: string;
    contactId: string;
    snapshot: { companyName: string; jobTitle: string; phone: string; newsletterOptIn: boolean };
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // ---- 1) current user (handle both `{...}` and `{ user: {...} }` shapes)
        const userResp = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userResp.ok) {
          const t = await userResp.text();
          throw new Error(t || `GET /api/users/me failed (${userResp.status})`);
        }

        const raw = await userResp.json();
        const user: Me = (raw && typeof raw === "object" && "user" in raw) ? (raw as any).user : raw;
        if (mounted) setMe(user);

        // ---- 2) inventories (use studio list, filter by ownerId === me.id)
        const rowsResp = await fetch(
          "/api/studio/rows?model=Inventory&perPage=100&sort=createdAt&order=desc",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!rowsResp.ok) {
          const t = await rowsResp.text();
          throw new Error(t || `GET /api/studio/rows failed (${rowsResp.status})`);
        }

        const payload = await rowsResp.json();
        const mine: Inventory[] = (payload?.rows || []).filter((x: any) => x.ownerId === user.id);
        if (mounted) setInventories(mine);
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message || "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const createdCount = inventories.length;
  const latestFive = useMemo(() => inventories.slice(0, 5), [inventories]);

  function fmt(d: string) {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />

      <div className="mx-auto max-w-6xl px-4 py-8">
  
        <hr className="my-6 border-slate-800" />

        {error && (
          <div className="mb-6 rounded-lg border border-rose-600/40 bg-rose-600/10 text-rose-200 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* User info + inventories */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-lg font-semibold mb-3">Your info</div>
            {loading && <div className="opacity-70">Loading…</div>}
            {!loading && !me && !error && (
              <div className="opacity-70 text-sm">No user data found.</div>
            )}
            {me && (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-40 opacity-70">Name</dt>
                  <dd>{me.name || "—"}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-40 opacity-70">Email</dt>
                  <dd>{me.email}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-40 opacity-70">SF Account Id</dt>
                  <dd className="break-all">{me.salesforceAccountId || "—"}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-40 opacity-70">SF Contact Id</dt>
                  <dd className="break-all">{me.salesforceContactId || "—"}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-lg font-semibold mb-3">
              Your inventories <span className="opacity-70">({createdCount})</span>
            </div>
            {loading && <div className="opacity-70">Loading…</div>}
            {!loading && createdCount === 0 && (
              <div className="opacity-70 text-sm">You don’t own any inventories yet.</div>
            )}
            {createdCount > 0 && (
              <ul className="space-y-2 text-sm">
                {latestFive.map((inv) => (
                  <li
                    key={inv.id}
                    className="rounded-lg border border-slate-800/70 bg-slate-900/60 px-3 py-2 flex items-center justify-between"
                  >
                    <span className="font-medium">{inv.title}</span>
                    <span className="opacity-70">{fmt(inv.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Salesforce form + last sync snapshot */}
        <section className="mt-10">
          {lastSync && (
            <div className="mx-auto mb-6 max-w-xl rounded-xl border border-emerald-700/40 bg-emerald-600/10 p-4 text-sm text-emerald-200">
              <div className="font-medium mb-1">Last Salesforce sync</div>
              <div className="grid grid-cols-1 gap-1">
                <div>Account Id: <code className="break-all">{lastSync.accountId}</code></div>
                <div>Contact Id: <code className="break-all">{lastSync.contactId}</code></div>
                <div className="mt-2 opacity-80">Snapshot</div>
                <div>Company: {lastSync.snapshot.companyName}</div>
                <div>Job Title: {lastSync.snapshot.jobTitle || "—"}</div>
                <div>Phone: {lastSync.snapshot.phone || "—"}</div>
                <div>Newsletter: {lastSync.snapshot.newsletterOptIn ? "Yes" : "No"}</div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <SalesforceForm
              onSuccess={(data) => {
                setLastSync(data);
                // Optimistically reflect SF IDs in the summary
                setMe((prev) =>
                  prev
                    ? {
                        ...prev,
                        salesforceAccountId: data.accountId,
                        salesforceContactId: data.contactId,
                      }
                    : prev
                );
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
