// app/(dashboard)/dashboard/configs/[configId]/not-found.tsx
import Link from 'next/link';

export default function ConfigNotFound() {
  return (
    <div className="card p-12 text-center space-y-4">
      <div className="text-4xl">🔍</div>
      <h2 className="font-semibold text-stone-800">Config not found</h2>
      <p className="text-sm text-stone-400">
        This config doesn't exist or you don't have access to it.
      </p>
      <Link
        href="/dashboard/configs"
        className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium
          hover:bg-indigo-700 transition-colors"
      >
        Back to configs
      </Link>
    </div>
  );
}
