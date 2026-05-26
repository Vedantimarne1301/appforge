// app/(dashboard)/dashboard/configs/[configId]/edit/page.tsx
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { EditConfigClient } from './EditConfigClient';

export default async function EditConfigPage({ params }: { params: Promise<{ configId: string }> }) {
  const { configId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const config = await prisma.appConfig.findUnique({ where: { id: configId } }).catch(() => null);
  if (!config) notFound();
  if (config.userId !== userId) redirect('/dashboard/configs');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Edit Config</h1>
        <p className="text-sm text-stone-500 mt-0.5">{config.name}</p>
      </div>
      <EditConfigClient
        configId={config.id}
        initialJson={JSON.stringify(config.rawConfig, null, 2)}
        initialName={config.name}
        initialDescription={config.description ?? ''}
      />
    </div>
  );
}
