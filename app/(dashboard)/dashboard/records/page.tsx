// app/(dashboard)/dashboard/records/page.tsx
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function RecordsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Aggregate record counts per config
  const configsWithCounts = await prisma.appConfig.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { appRecords: true } } },
  }).catch(() => []);

  const totalRecords = configsWithCounts.reduce((sum, c) => sum + c._count.appRecords, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">All Records</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {totalRecords} total record{totalRecords !== 1 ? 's' : ''} across {configsWithCounts.length} app{configsWithCounts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {configsWithCounts.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <div className="text-3xl">📂</div>
          <p className="text-stone-500 text-sm">No apps configured yet.</p>
          <Link
            href="/dashboard/configs?action=new"
            className="inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Create your first app →
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-stone-100">
          {configsWithCounts.map((config) => (
            <Link
              key={config.id}
              href={`/dashboard/configs/${config.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors group"
            >
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-stone-800 group-hover:text-indigo-600 transition-colors">
                  {config.name}
                </div>
                <div className="text-xs text-stone-400 font-mono">{config.resource}</div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="font-medium text-stone-700">{config._count.appRecords}</div>
                  <div className="text-xs text-stone-400">records</div>
                </div>
                {!config.isValid && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    ⚠ Config invalid
                  </span>
                )}
                <span className="text-stone-300 group-hover:text-stone-400 transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent uploads */}
      <RecentUploads userId={userId} />
    </div>
  );
}

async function RecentUploads({ userId }: { userId: string }) {
  const uploads = await prisma.upload.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  }).catch(() => []);

  if (uploads.length === 0) return null;

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-stone-100">
        <h2 className="section-heading">Recent CSV Imports</h2>
      </div>
      <div className="divide-y divide-stone-100">
        {uploads.map((upload) => (
          <div key={upload.id} className="flex items-center justify-between px-5 py-3.5">
            <div className="space-y-0.5">
              <div className="text-sm text-stone-700">{upload.originalName}</div>
              <div className="text-xs text-stone-400">
                {new Date(upload.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {upload.rowsImported != null && (
                <span className="text-green-600 font-medium">{upload.rowsImported} imported</span>
              )}
              <span className={`px-2 py-0.5 rounded font-medium
                ${upload.status === 'done' ? 'bg-green-100 text-green-700' : ''}
                ${upload.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                ${upload.status === 'processing' ? 'bg-blue-100 text-blue-700' : ''}
                ${upload.status === 'pending' ? 'bg-stone-100 text-stone-600' : ''}
              `}>
                {upload.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
