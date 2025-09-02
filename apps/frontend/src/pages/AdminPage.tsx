import UsersGrid from '../components/UsersGrid';

export default function Admin() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">
        Admin page mounted ✓ (if you still see Studio here, routing is wrong)
      </div>
      <h1 className="text-2xl font-semibold text-white">Admin</h1>
      <p className="mt-1 text-slate-300">User management</p>
      <div className="mt-6">
        <UsersGrid />
      </div>
    </div>
  );
}
