// app/(dashboard)/dashboard/configs/NewConfigButton.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigEditor } from '@/components/dynamic/ConfigEditor';

interface Props {
  label?: string;
}

export function NewConfigButton({ label = 'New Config' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = async (json: string, name: string, description: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configJson: json, name, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsOpen(false);
        router.push(`/dashboard/configs/${data.data.config.id}`);
        router.refresh();
      } else {
        setError(data.error ?? 'Failed to save config');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium
          hover:bg-indigo-700 transition-colors"
      >
        + {label}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-xl border border-stone-200 shadow-xl
            w-full max-w-3xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-900">New App Config</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              {error && (
                <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}
              <ConfigEditor onSave={handleSave} isSaving={isSaving} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
