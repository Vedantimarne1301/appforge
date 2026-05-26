// components/dynamic/component-registry.tsx
// The registry maps component names to React implementations.
// Any unknown component name falls through to FallbackField.
// Extending the platform = adding an entry here.

import React from 'react';
import { FieldRendererProps } from '@/types';

// ─── Individual Field Components ─────────────────────────────────────────────

const InputField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => (
  <input
    id={field.name}
    type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
    value={typeof value === 'string' ? value : ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder}
    disabled={disabled || field.readonly}
    className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors
      ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
      focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`}
  />
);

const NumberField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => (
  <input
    id={field.name}
    type="number"
    value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
    onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    placeholder={field.placeholder}
    min={field.validation?.min}
    max={field.validation?.max}
    disabled={disabled || field.readonly}
    className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors
      ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
      focus:outline-none focus:ring-2 disabled:opacity-50`}
  />
);

const TextareaField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => (
  <textarea
    id={field.name}
    value={typeof value === 'string' ? value : ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder}
    disabled={disabled || field.readonly}
    rows={4}
    className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors resize-y
      ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
      focus:outline-none focus:ring-2 disabled:opacity-50`}
  />
);

const SelectField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => {
  const options = normalizeOptions(field.options);
  return (
    <select
      id={field.name}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || field.readonly}
      className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors
        ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
        focus:outline-none focus:ring-2 disabled:opacity-50`}
    >
      <option value="">{field.placeholder ?? `Select ${field.label}…`}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

const CheckboxField: React.FC<FieldRendererProps> = ({ field, value, onChange, disabled }) => (
  <label className="flex items-center gap-2 cursor-pointer w-fit">
    <input
      id={field.name}
      type="checkbox"
      checked={Boolean(value)}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled || field.readonly}
      className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
    />
    <span className="text-sm text-stone-700">{field.label}</span>
  </label>
);

const RadioField: React.FC<FieldRendererProps> = ({ field, value, onChange, disabled }) => {
  const options = normalizeOptions(field.options);
  return (
    <fieldset>
      <div className="flex flex-wrap gap-4">
        {options.length === 0 ? (
          <span className="text-sm text-stone-400 italic">No options configured</span>
        ) : (
          options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                disabled={disabled || field.readonly}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-stone-700">{opt.label}</span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
};

const DateField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => (
  <input
    id={field.name}
    type="date"
    value={typeof value === 'string' ? value : ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled || field.readonly}
    className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors
      ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
      focus:outline-none focus:ring-2 disabled:opacity-50`}
  />
);

const EmailField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => (
  <input
    id={field.name}
    type="email"
    value={typeof value === 'string' ? value : ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder ?? 'user@example.com'}
    disabled={disabled || field.readonly}
    className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors
      ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
      focus:outline-none focus:ring-2 disabled:opacity-50`}
  />
);

const UrlField: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => (
  <input
    id={field.name}
    type="url"
    value={typeof value === 'string' ? value : ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder ?? 'https://'}
    disabled={disabled || field.readonly}
    className={`w-full px-3 py-2 rounded-md border bg-white text-sm transition-colors
      ${error ? 'border-red-400 focus:ring-red-300' : 'border-stone-300 focus:border-indigo-500 focus:ring-indigo-200'}
      focus:outline-none focus:ring-2 disabled:opacity-50`}
  />
);

/**
 * Fallback: renders for any unknown component type.
 * NEVER throws or crashes the page.
 */
const FallbackField: React.FC<FieldRendererProps> = ({ field }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-sm">
    <span className="text-amber-600">⚠</span>
    <span className="text-amber-700">
      Unknown component <code className="font-mono bg-amber-100 px-1 rounded">"{field.component}"</code> — field will not render.
    </span>
  </div>
);

// ─── Registry ─────────────────────────────────────────────────────────────────

type Registry = Record<string, React.FC<FieldRendererProps>>;

const COMPONENT_REGISTRY: Registry = {
  input: InputField,
  textarea: TextareaField,
  select: SelectField,
  checkbox: CheckboxField,
  radio: RadioField,
  date: DateField,
  number: NumberField,
  email: EmailField,
  url: UrlField,
};

/**
 * Resolves a component name to its React implementation.
 * Always returns a valid component — unknown names → FallbackField.
 */
export function resolveFieldComponent(componentName: string): React.FC<FieldRendererProps> {
  return COMPONENT_REGISTRY[componentName] ?? FallbackField;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeOptions(
  options: FieldRendererProps['field']['options']
): { label: string; value: string }[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (typeof o === 'string') return { label: o, value: o };
    return { label: o.label ?? o.value, value: o.value ?? o.label };
  });
}
