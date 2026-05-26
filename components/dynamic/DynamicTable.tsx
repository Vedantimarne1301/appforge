// components/dynamic/DynamicTable.tsx
'use client';
import React from 'react';
import { AppConfigSchema, AppRecord } from '@/types';

interface DynamicTableProps {
  config: AppConfigSchema;
  records: AppRecord[];
  isLoading?: boolean;
  onEdit?: (record: AppRecord) => void;
  onDelete?: (record: AppRecord) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

function getDisplayColumns(config: AppConfigSchema) {
  const allFields = config.fields ?? [];
  const visibleFields = allFields.filter((f) => !f.hidden);

  if (config.tableColumns && config.tableColumns.length > 0) {
    const fieldMap = new Map(visibleFields.map((f) => [f.name, f]));
    return config.tableColumns
      .map((name) => fieldMap.get(name))
      .filter(Boolean) as typeof visibleFields;
  }

  // Default: first 5 visible fields
  return visibleFields.slice(0, 5);
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '[Object]'; }
  }
  const str = String(value);
  return str.length > 100 ? str.slice(0, 100) + '…' : str;
}

export const DynamicTable: React.FC<DynamicTableProps> = ({
  config,
  records,
  isLoading = false,
  onEdit,
  onDelete,
  pagination,
}) => {
  const columns = getDisplayColumns(config);
  const hasActions = !!(onEdit || onDelete);
  const allowEdit = config.settings?.allowEdit !== false;
  const allowDelete = config.settings?.allowDelete !== false;

  if (columns.length === 0) {
    return (
      <div className="p-6 text-center text-stone-400 text-sm border border-stone-200 rounded-lg">
        No visible columns configured.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="text-left px-4 py-3 font-medium text-stone-600 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              <th className="text-left px-4 py-3 font-medium text-stone-400 text-xs whitespace-nowrap">
                Created
              </th>
              {hasActions && (
                <th className="px-4 py-3 font-medium text-stone-400 text-xs text-right whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-stone-100">
                  {columns.map((col) => (
                    <td key={col.name} className="px-4 py-3">
                      <div className="h-4 bg-stone-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="h-4 bg-stone-100 rounded animate-pulse w-20" />
                  </td>
                  {hasActions && <td className="px-4 py-3" />}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1 + (hasActions ? 1 : 0)}
                  className="px-4 py-10 text-center text-stone-400"
                >
                  No records yet. Create one above.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.name} className="px-4 py-3 text-stone-700 max-w-xs truncate">
                      {formatCellValue(record.data?.[col.name])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </td>
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {onEdit && allowEdit && (
                          <button
                            onClick={() => onEdit(record)}
                            className="text-xs px-2.5 py-1 rounded border border-stone-200 text-stone-600
                              hover:bg-stone-100 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && allowDelete && (
                          <button
                            onClick={() => onDelete(record)}
                            className="text-xs px-2.5 py-1 rounded border border-red-200 text-red-500
                              hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 rounded border border-stone-200 hover:bg-stone-50
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 rounded border border-stone-200 hover:bg-stone-50
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
