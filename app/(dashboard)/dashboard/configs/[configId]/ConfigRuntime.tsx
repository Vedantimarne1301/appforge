// app/(dashboard)/dashboard/configs/[configId]/ConfigRuntime.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AppConfigSchema, AppRecord } from '@/types';
import { DynamicForm } from '@/components/dynamic/DynamicForm';
import { DynamicTable } from '@/components/dynamic/DynamicTable';
import { CsvImporter } from '@/components/dynamic/CsvImporter';
import { useRecords } from '@/hooks/useRecords';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface ConfigRuntimeProps {
  config: AppConfigSchema;
  configId: string;
}

type ViewMode = 'table' | 'create' | 'edit';

export function ConfigRuntime({ config, configId }: ConfigRuntimeProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editingRecord, setEditingRecord] = useState<AppRecord | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { records, isLoading, error, page, totalPages, fetchRecords, createRecord, updateRecord, deleteRecord } = useRecords();

  useEffect(() => {
    fetchRecords(configId, 1);
  }, [configId]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCreate = async (data: Record<string, unknown>) => {
    setServerErrors({});
    const result = await createRecord(configId, data);
    if (result.success) {
      setViewMode('table');
      showToast('Record created successfully');
    } else if (result.errors) {
      setServerErrors(result.errors);
    } else {
      showToast(result.error ?? 'Failed to create record', 'error');
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingRecord) return;
    setServerErrors({});
    const result = await updateRecord(configId, editingRecord.id, data);
    if (result.success) {
      setViewMode('table');
      setEditingRecord(null);
      showToast('Record updated');
    } else if (result.errors) {
      setServerErrors(result.errors);
    } else {
      showToast(result.error ?? 'Failed to update record', 'error');
    }
  };

  const handleDelete = async (record: AppRecord) => {
    if (deleteConfirm !== record.id) {
      setDeleteConfirm(record.id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    const ok = await deleteRecord(configId, record.id);
    setDeleteConfirm(null);
    if (ok) {
      showToast('Record deleted');
    } else {
      showToast('Failed to delete record', 'error');
    }
  };

  const handleEdit = (record: AppRecord) => {
    setEditingRecord(record);
    setServerErrors({});
    setViewMode('edit');
  };

  const layout = config.layout ?? 'both';
  const allowCreate = config.settings?.allowCreate !== false;
  const allowCsvImport = config.settings?.allowCsvImport === true;
  const showForm = layout === 'form' || layout === 'both';
  const showTable = layout === 'table' || layout === 'both';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
          transition-all duration-300`}>
          {toast.msg}
        </div>
      )}

      {/* View toggle (only for 'both' layout) */}
      {layout === 'both' && viewMode === 'table' && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            {allowCreate && (
              <button
                onClick={() => { setViewMode('create'); setServerErrors({}); }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium
                  hover:bg-indigo-700 transition-colors"
              >
                + Add Record
              </button>
            )}
            {allowCsvImport && (
              <button
                onClick={() => setShowCsvImport(!showCsvImport)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm
                  hover:bg-stone-50 transition-colors"
              >
                {showCsvImport ? 'Hide CSV' : 'Import CSV'}
              </button>
            )}
          </div>
          {records.length > 0 && (
            <span className="text-sm text-stone-400">{records.length} records</span>
          )}
        </div>
      )}

      {/* CSV Import */}
      {showCsvImport && (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-medium text-stone-700">Import CSV</h3>
          <p className="text-xs text-stone-400">
            Headers must match field names:{' '}
            <span className="font-mono">{config.fields.filter(f => !f.hidden).map(f => f.name).join(', ')}</span>
          </p>
          <CsvImporter
            configId={configId}
            onImportComplete={() => {
              fetchRecords(configId, 1);
              setShowCsvImport(false);
              showToast('CSV imported successfully');
            }}
          />
        </div>
      )}

      {/* Create form */}
      {viewMode === 'create' && (showForm || config.layout === 'both') && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-stone-800">New Record</h3>
            <button
              onClick={() => setViewMode('table')}
              className="text-stone-400 hover:text-stone-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <ErrorBoundary context="DynamicForm">
            <DynamicForm
              config={config}
              onSubmit={handleCreate}
              onCancel={() => setViewMode('table')}
              submitLabel="Create Record"
              serverErrors={serverErrors}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Edit form */}
      {viewMode === 'edit' && editingRecord && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-stone-800">Edit Record</h3>
            <button
              onClick={() => { setViewMode('table'); setEditingRecord(null); }}
              className="text-stone-400 hover:text-stone-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <ErrorBoundary context="DynamicForm">
            <DynamicForm
              config={config}
              initialData={editingRecord.data}
              onSubmit={handleUpdate}
              onCancel={() => { setViewMode('table'); setEditingRecord(null); }}
              submitLabel="Update Record"
              serverErrors={serverErrors}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Table */}
      {(showTable || config.layout === 'both') && viewMode === 'table' && (
        <div className="card p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}
          <ErrorBoundary context="DynamicTable">
            <DynamicTable
              config={config}
              records={records}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              pagination={totalPages > 1 ? {
                page,
                totalPages,
                onPageChange: (p) => fetchRecords(configId, p),
              } : undefined}
            />
          </ErrorBoundary>
          {deleteConfirm && (
            <div className="text-xs text-amber-600 text-center">
              Click Delete again to confirm
            </div>
          )}
        </div>
      )}

      {/* Form-only layout */}
      {layout === 'form' && viewMode === 'table' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-medium text-stone-800">
            {config.name}
          </h3>
          <ErrorBoundary context="DynamicForm">
            <DynamicForm
              config={config}
              onSubmit={handleCreate}
              submitLabel="Submit"
              serverErrors={serverErrors}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
