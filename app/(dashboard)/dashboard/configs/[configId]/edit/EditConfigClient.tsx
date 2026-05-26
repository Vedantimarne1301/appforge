// app/(dashboard)/dashboard/configs/[configId]/edit/EditConfigClient.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigEditor } from '@/components/dynamic/ConfigEditor';

interface Props {
  configId: string;
  initialJson: string;
  initialName: string;
  initialDescription: string;
}

export function EditConfigClient({ configId, initialJson, initialName, initialDescription }: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (json: string, name: string, description: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/configs/${configId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configJson: json, name: name || initialName, description: description || initialDescription }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/configs/${configId}`);
        router.refresh();
      } else {
        setError(data.error ?? 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card p-5">
      {error && (
        <div className="mb-4 px-3 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
      <ConfigEditor
        initialValue={initialJson}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
