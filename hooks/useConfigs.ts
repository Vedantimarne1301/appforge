// hooks/useConfigs.ts
'use client';
import { useState, useCallback } from 'react';
import { AppConfigRow, ApiResponse } from '@/types';

interface UseConfigsReturn {
  configs: AppConfigRow[];
  isLoading: boolean;
  error: string | null;
  fetchConfigs: () => Promise<void>;
  deleteConfig: (id: string) => Promise<boolean>;
}

export function useConfigs(): UseConfigsReturn {
  const [configs, setConfigs] = useState<AppConfigRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/configs');
      const json: ApiResponse<AppConfigRow[]> = await res.json();
      if (json.success) {
        setConfigs(json.data ?? []);
      } else {
        setError(json.error ?? 'Failed to fetch configs');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConfig = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/configs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setConfigs((prev) => prev.filter((c) => c.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return { configs, isLoading, error, fetchConfigs, deleteConfig };
}
