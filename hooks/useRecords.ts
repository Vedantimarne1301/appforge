// hooks/useRecords.ts
'use client';
import { useState, useCallback } from 'react';
import { AppRecord, ApiResponse } from '@/types';

interface UseRecordsReturn {
  records: AppRecord[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  fetchRecords: (configId: string, page?: number) => Promise<void>;
  createRecord: (configId: string, data: Record<string, unknown>) => Promise<{ success: boolean; errors?: Record<string, string>; error?: string }>;
  updateRecord: (configId: string, recordId: string, data: Record<string, unknown>) => Promise<{ success: boolean; errors?: Record<string, string>; error?: string }>;
  deleteRecord: (configId: string, recordId: string) => Promise<boolean>;
}

export function useRecords(): UseRecordsReturn {
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRecords = useCallback(async (configId: string, p = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/records/${configId}?page=${p}`);
      const json: ApiResponse<AppRecord[]> = await res.json();
      if (json.success) {
        setRecords(json.data ?? []);
        setPage(json.meta?.page ?? 1);
        setTotalPages(json.meta?.totalPages ?? 1);
      } else {
        setError(json.error ?? 'Failed to fetch records');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (configId: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/records/${configId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json: ApiResponse<AppRecord> = await res.json();
      if (json.success && json.data) {
        setRecords((prev) => [json.data!, ...prev]);
        return { success: true };
      }
      // Map server validation errors
      const fieldErrors: Record<string, string> = {};
      json.errors?.forEach((e) => { fieldErrors[e.path] = e.message; });
      return { success: false, errors: fieldErrors, error: json.error };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const updateRecord = useCallback(async (configId: string, recordId: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/records/${configId}/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json: ApiResponse<AppRecord> = await res.json();
      if (json.success && json.data) {
        setRecords((prev) => prev.map((r) => r.id === recordId ? json.data! : r));
        return { success: true };
      }
      const fieldErrors: Record<string, string> = {};
      json.errors?.forEach((e) => { fieldErrors[e.path] = e.message; });
      return { success: false, errors: fieldErrors, error: json.error };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const deleteRecord = useCallback(async (configId: string, recordId: string) => {
    try {
      const res = await fetch(`/api/records/${configId}/${recordId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return { records, isLoading, error, page, totalPages, fetchRecords, createRecord, updateRecord, deleteRecord };
}
