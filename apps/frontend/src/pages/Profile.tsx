// apps/frontend/src/pages/Profile.tsx
import { useState } from "react";
import SalesforceForm from "../components/profile/SalesforceForm";

export default function Profile() {
  const [sfIds, setSfIds] =
    useState<{ accountId: string; contactId: string } | null>(null);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {sfIds && (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-600/10 p-4 text-sm">
          <div className="font-medium mb-1">Salesforce IDs</div>
          <div>Account Id: <code>{sfIds.accountId}</code></div>
          <div>Contact Id: <code>{sfIds.contactId}</code></div>
        </div>
      )}

      <div className="border-t pt-6">
        <SalesforceForm onSuccess={setSfIds} />
      </div>
    </div>
  );
}
