import { useState } from "react";
import SalesforceForm from "../components/profile/SalesforceForm";

export default function Profile() {
  const [sfIds, setSfIds] =
    useState<{ accountId: string; contactId: string } | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Profile</h1>
      <hr className="my-6 border-slate-800" />

      {sfIds && (
        <div className="mx-auto mb-6 max-w-xl rounded-xl border border-emerald-700/40 bg-emerald-600/10 p-4 text-sm text-emerald-200">
          <div className="font-medium mb-1">Salesforce IDs</div>
          <div>Account Id: <code>{sfIds.accountId}</code></div>
          <div>Contact Id: <code>{sfIds.contactId}</code></div>
        </div>
      )}

      {/* Center the form */}
      <div className="flex justify-center">
        <SalesforceForm onSuccess={setSfIds} />
      </div>
    </div>
  );
}
