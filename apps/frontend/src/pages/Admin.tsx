import UsersGrid from '../components/UsersGrid';

export default function Admin() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-white">Admin</h1>
      <p className="mt-1 text-slate-300">User management goes here.</p>

      <div className="mt-6">
        <UsersGrid />
      </div>
    </div>
  );
}
