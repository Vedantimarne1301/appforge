// app/(dashboard)/dashboard/configs/page.tsx
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { NewConfigButton } from './NewConfigButton';

export default async function ConfigsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const configs = await prisma.appConfig.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { appRecords: true } } },
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">App Configs</h1>
          <p className="text-sm text-stone-500 mt-0.5">JSON-defined applications</p>
        </div>
        <NewConfigButton />
      </div>

      {configs.length === 0 ? (
        <div className="card p-16 text-center space-y-4">
          <div className="text-4xl">📋</div>
          <div>
            <h3 className="font-medium text-stone-800">No configs yet</h3>
            <p className="text-sm text-stone-400 mt-1">
              Define a JSON config to generate a full CRUD app instantly.
            </p>
          </div>
          <NewConfigButton label="Create your first config" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <Link
              key={config.id}
              href={`/dashboard/configs/${config.id}`}
              className="card p-5 hover:shadow-md transition-shadow space-y-3 group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h3 className="font-medium text-stone-900 truncate group-hover:text-indigo-600 transition-colors">
                    {config.name}
                  </h3>
                  {config.description && (
                    <p className="text-xs text-stone-400 truncate">{config.description}</p>
                  )}
                </div>
                {!config.isValid && (
                  <span className="ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    ⚠ Invalid
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded">
                  {config.resource}
                </span>
                <span>{config._count.appRecords} records</span>
              </div>

              <div className="text-xs text-stone-400">
                Updated {new Date(config.updatedAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
