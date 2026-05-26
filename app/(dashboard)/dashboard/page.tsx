// app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Fetch stats — all in parallel, errors handled gracefully
  const [configCount, recordCount, recentConfigs] = await Promise.all([
    prisma.appConfig.count({ where: { userId } }).catch(() => 0),
    prisma.appRecord.count({ where: { userId } }).catch(() => 0),
    prisma.appConfig.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { _count: { select: { appRecords: true } } },
    }).catch(() => []),
  ]);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Good {getGreeting()}, {firstName}
        </h1>
        <p className="text-stone-500 text-sm mt-1">Here's what's happening with your apps.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="App Configs" value={configCount} />
        <StatCard label="Total Records" value={recordCount} />
        <StatCard label="Platform Status" value="Healthy" isText />
      </div>

      {/* Quick actions */}
      <div className="card p-5 space-y-3">
        <h2 className="section-heading">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/configs?action=new"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium
              hover:bg-indigo-700 transition-colors"
          >
            + New Config
          </Link>
          <Link
            href="/dashboard/configs"
            className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm
              hover:bg-stone-50 transition-colors"
          >
            View all configs
          </Link>
        </div>
      </div>

      {/* Recent configs */}
      {recentConfigs.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="section-heading">Recent apps</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {recentConfigs.map((config) => (
              <Link
                key={config.id}
                href={`/dashboard/configs/${config.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-stone-800">{config.name}</div>
                  <div className="text-xs text-stone-400 font-mono">{config.resource}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400">
                    {config._count.appRecords} records
                  </span>
                  {!config.isValid && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                      Invalid config
                    </span>
                  )}
                  <span className="text-stone-300 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentConfigs.length === 0 && (
        <div className="card p-12 text-center space-y-4">
          <div className="text-4xl">🧩</div>
          <div>
            <h3 className="font-medium text-stone-800">No apps yet</h3>
            <p className="text-sm text-stone-400 mt-1">
              Create your first app config to get started.
            </p>
          </div>
          <Link
            href="/dashboard/configs?action=new"
            className="inline-block px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium
              hover:bg-indigo-700 transition-colors"
          >
            Create first app
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="card p-4 space-y-1">
      <div className="text-xs text-stone-400">{label}</div>
      <div className={`font-semibold ${isText ? 'text-green-600 text-sm' : 'text-2xl text-stone-900'}`}>
        {isText ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {value}
          </span>
        ) : value}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
