// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center space-y-4 px-4">
        <div className="text-6xl font-bold text-stone-200">404</div>
        <h1 className="text-xl font-semibold text-stone-800">Page not found</h1>
        <p className="text-stone-500 text-sm">The page you're looking for doesn't exist.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium
            hover:bg-indigo-700 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
