// components/dynamic/DynamicForm.tsx
'use client';
import React, { useState, useCallback } from 'react';
import { AppConfigSchema, FieldConfig } from '@/types';
import { resolveFieldComponent } from './component-registry';

interface DynamicFormProps {
  config: AppConfigSchema;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  serverErrors?: Record<string, string>;
}

// Build initial form state from config defaults
function buildInitialState(
  fields: FieldConfig[],
  initial?: Record<string, unknown>
): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.hidden) continue;
    state[field.name] =
      initial?.[field.name] ??
      field.defaultValue ??
      (field.component === 'checkbox' ? false : '');
  }
  return state;
}

// Client-side validation matching server-side rules
function validateForm(
  data: Record<string, unknown>,
  fields: FieldConfig[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.hidden || field.readonly) continue;
    const value = data[field.name];
    const isEmpty = value === undefined || value === null || value === '';

    if (field.required && isEmpty) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }
    if (isEmpty) continue;

    const v = field.validation;
    if (!v) continue;

    if (typeof value === 'string') {
      if (v.minLength && value.length < v.minLength) {
        errors[field.name] = `Must be at least ${v.minLength} characters`;
      } else if (v.maxLength && value.length > v.maxLength) {
        errors[field.name] = `Must be at most ${v.maxLength} characters`;
      } else if (v.pattern) {
        try {
          if (!new RegExp(v.pattern).test(value)) {
            errors[field.name] = `${field.label} format is invalid`;
          }
        } catch { /* invalid regex — skip */ }
      }
    }

    if (field.component === 'number' || field.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        errors[field.name] = 'Must be a valid number';
      } else if (v.min !== undefined && num < v.min) {
        errors[field.name] = `Must be at least ${v.min}`;
      } else if (v.max !== undefined && num > v.max) {
        errors[field.name] = `Must be at most ${v.max}`;
      }
    }
  }
  return errors;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  config,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Submit',
  serverErrors = {},
}) => {
  const visibleFields = (config.fields ?? []).filter((f) => !f.hidden);

  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    buildInitialState(visibleFields, initialData)
  );
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const errors = { ...clientErrors, ...serverErrors };

  const handleChange = useCallback((fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (touched.has(fieldName)) {
      // Re-validate just this field on change
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  }, [touched]);

  const handleBlur = useCallback((fieldName: string) => {
    setTouched((prev) => new Set(prev).add(fieldName));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(formData, visibleFields);
    if (Object.keys(errs).length > 0) {
      setClientErrors(errs);
      setTouched(new Set(visibleFields.map((f) => f.name)));
      return;
    }
    setClientErrors({});
    await onSubmit(formData);
  };

  // Safety: if no fields, show a graceful message
  if (visibleFields.length === 0) {
    return (
      <div className="p-4 rounded-md border border-stone-200 bg-stone-50 text-sm text-stone-500 text-center">
        This form has no visible fields configured.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {visibleFields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          value={formData[field.name]}
          onChange={(val) => handleChange(field.name, val)}
          onBlur={() => handleBlur(field.name)}
          error={touched.has(field.name) ? errors[field.name] : undefined}
          disabled={isLoading}
        />
      ))}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium
            hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
            disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2
            focus:ring-indigo-400 focus:ring-offset-1"
        >
          {isLoading ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2 rounded-md border border-stone-300 text-stone-700 text-sm
              hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, value, onChange, onBlur, error, disabled }) => {
  const FieldComponent = resolveFieldComponent(field.component as string);
  const isCheckbox = field.component === 'checkbox';

  return (
    <div className="space-y-1" onBlur={onBlur}>
      {/* Label — skip for checkbox (inline label) */}
      {!isCheckbox && (
        <label htmlFor={field.name} className="block text-sm font-medium text-stone-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
          {field.readonly && (
            <span className="ml-2 text-xs text-stone-400 font-normal">(read-only)</span>
          )}
        </label>
      )}

      <FieldComponent
        field={field}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
      />

      {field.helpText && !error && (
        <p className="text-xs text-stone-400">{field.helpText}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
};
