// app/(dashboard)/dashboard/configs/[configId]/page.tsx
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { AppConfigSchema } from '@/types';
import { ConfigRuntime } from './ConfigRuntime';
import { ConfigDeleteButton } from './ConfigDeleteButton';
import Link from 'next/link';

export default async function ConfigDetailPage({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const config = await prisma.appConfig.findUnique({
    where: { id: configId },
    include: { _count: { select: { appRecords: true } } },
  }).catch(() => null);

  if (!config) notFound();
  if (config.userId !== userId) redirect('/dashboard/configs');

  const schema = config.rawConfig as AppConfigSchema;
  const validationErrors = config.validationErrors as { path: string; message: string }[] | null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-stone-400">
        <Link href="/dashboard/configs" className="hover:text-stone-600 transition-colors">
          Configs
        </Link>
        <span>/</span>
        <span className="text-stone-700 font-medium">{config.name}</span>
      </div>

      {/* Config header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-stone-900">{config.name}</h1>
            {!config.isValid && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                Config has errors
              </span>
            )}
          </div>
          {config.description && (
            <p className="text-sm text-stone-500 mt-0.5">{config.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
            <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded">{config.resource}</span>
            <span>{config._count.appRecords} records</span>
            <span>Updated {new Date(config.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ConfigActionsMenu
          configId={config.id}
          configName={config.name}
          recordCount={config._count.appRecords}
        />
      </div>

      {/* Validation errors banner */}
      {!config.isValid && validationErrors && validationErrors.length > 0 && (
        <div className="card border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="text-sm font-medium text-amber-800">
            Configuration issues found — some fields may not render correctly.
          </div>
          {validationErrors.slice(0, 5).map((e, i) => (
            <div key={i} className="text-xs font-mono text-amber-700">
              [{e.path}] {e.message}
            </div>
          ))}
        </div>
      )}

      {/* Runtime */}
      <ConfigRuntime config={schema} configId={config.id} />
    </div>
  );
}

function ConfigActionsMenu({
  configId,
  configName,
  recordCount,
}: {
  configId: string;
  configName: string;
  recordCount: number;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/dashboard/configs/${configId}/edit`}
        className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-sm
          hover:bg-stone-50 transition-colors"
      >
        Edit Config
      </Link>
      <ConfigDeleteButton
        configId={configId}
        configName={configName}
        recordCount={recordCount}
      />
    </div>
  );
}
