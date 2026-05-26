// app/(dashboard)/dashboard/configs/[configId]/ConfigDeleteButton.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConfigDeleteButtonProps {
  configId: string;
  configName: string;
  recordCount: number;
}

export function ConfigDeleteButton({ configId, configName, recordCount }: ConfigDeleteButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setPhase('deleting');
    setError(null);
    try {
      const res = await fetch(`/api/configs/${configId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard/configs');
        router.refresh();
      } else {
        setError(data.error ?? 'Delete failed');
        setPhase('idle');
      }
    } catch {
      setError('Network error');
      setPhase('idle');
    }
  };

  if (phase === 'confirm') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-stone-500">
          Delete <strong>{configName}</strong> and {recordCount} records?
        </span>
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium
            hover:bg-red-700 transition-colors"
        >
          Yes, delete permanently
        </button>
        <button
          onClick={() => setPhase('idle')}
          className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-600 text-xs
            hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setPhase('confirm')}
      disabled={phase === 'deleting'}
      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-sm
        hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {phase === 'deleting' ? 'Deleting…' : 'Delete Config'}
    </button>
  );
}
