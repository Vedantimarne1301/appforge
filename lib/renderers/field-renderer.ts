// lib/renderers/field-renderer.ts
// Stateless utility functions for rendering field values as strings.
// Used by DynamicTable for cell display and by CSV export if added later.

import { FieldConfig } from '@/types';

/**
 * Formats a raw record value for display in a table cell.
 * Never throws — always returns a safe string.
 */
export function formatFieldValue(value: unknown, field?: FieldConfig): string {
  if (value === null || value === undefined || value === '') return '—';

  // Boolean — respect checkbox semantics
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // If the field tells us it's a checkbox component, coerce truthy values
  if (field?.component === 'checkbox') return value ? 'Yes' : 'No';

  // Date — attempt ISO parse and reformat
  if (field?.component === 'date' || field?.type === 'date') {
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
      } catch {
        return value;
      }
    }
  }

  // Number — format with locale separators
  if (field?.component === 'number' || field?.type === 'number') {
    const num = Number(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat().format(num);
    }
  }

  // Array (e.g. multi-select if ever added)
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ');
  }

  // Object — JSON stringify with truncation
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > 80 ? str.slice(0, 80) + '…' : str;
    } catch {
      return '[Object]';
    }
  }

  // String — truncate very long values for display
  const str = String(value);
  return str.length > 120 ? str.slice(0, 120) + '…' : str;
}

/**
 * Returns a display label for a select option value.
 * Falls back to the raw value if no matching option found.
 */
export function resolveOptionLabel(
  value: unknown,
  options: FieldConfig['options']
): string {
  if (!options || !Array.isArray(options)) return String(value ?? '');

  for (const opt of options) {
    if (typeof opt === 'string') {
      if (opt === value) return opt;
    } else if (opt.value === value) {
      return opt.label;
    }
  }

  return String(value ?? '');
}

/**
 * Produces a plain-text summary of a record's data for preview/search.
 * Joins all field values into a searchable string.
 */
export function recordToSearchString(
  data: Record<string, unknown>,
  fields: FieldConfig[]
): string {
  return fields
    .filter((f) => !f.hidden)
    .map((f) => formatFieldValue(data[f.name], f))
    .filter((v) => v !== '—')
    .join(' ')
    .toLowerCase();
}
