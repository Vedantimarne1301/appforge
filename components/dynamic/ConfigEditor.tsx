// components/dynamic/ConfigEditor.tsx
'use client';
import React, { useState, useCallback } from 'react';
import { AppConfigSchema, ValidationResult } from '@/types';

const EXAMPLE_CONFIG: AppConfigSchema = {
  resource: 'tasks',
  layout: 'both',
  name: 'Task Manager',
  description: 'Track and manage project tasks',
  fields: [
    { name: 'title', label: 'Task Title', component: 'input', type: 'text', required: true, placeholder: 'Enter task title' },
    { name: 'description', label: 'Description', component: 'textarea', type: 'text' },
    { name: 'priority', label: 'Priority', component: 'select', options: ['Low', 'Medium', 'High'], required: true },
    { name: 'due_date', label: 'Due Date', component: 'date' },
    { name: 'completed', label: 'Completed', component: 'checkbox' },
  ],
  settings: {
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowCsvImport: true,
    pageSize: 20,
  },
};

interface ConfigEditorProps {
  initialValue?: string;
  onSave: (json: string, name: string, description: string) => Promise<void>;
  isSaving?: boolean;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  initialValue = JSON.stringify(EXAMPLE_CONFIG, null, 2),
  onSave,
  isSaving = false,
}) => {
  const [json, setJson] = useState(initialValue);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleJsonChange = (value: string) => {
    setJson(value);
    setParseError(null);
    setValidation(null);

    try {
      JSON.parse(value);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const handleValidate = useCallback(async () => {
    if (parseError) return;
    setIsValidating(true);
    try {
      const res = await fetch('/api/configs/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configJson: json }),
      });
      const data = await res.json();
      setValidation(data.data?.validation ?? null);
    } catch {
      setParseError('Failed to reach validation endpoint');
    } finally {
      setIsValidating(false);
    }
  }, [json, parseError]);

  const handleSave = async () => {
    if (parseError) return;
    await onSave(json, name, description);
  };

  const loadExample = () => {
    setJson(JSON.stringify(EXAMPLE_CONFIG, null, 2));
    setParseError(null);
    setValidation(null);
  };

  return (
    <div className="space-y-4">
      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-700">Config Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Task Manager"
            className="w-full px-3 py-2 rounded-md border border-stone-300 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-700">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-2 rounded-md border border-stone-300 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* JSON Editor */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-stone-700">
            Configuration JSON
          </label>
          <button
            type="button"
            onClick={loadExample}
            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Load example
          </button>
        </div>
        <div className="relative">
          <textarea
            value={json}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
            rows={18}
            className={`w-full px-4 py-3 rounded-md border font-mono text-sm leading-relaxed
              bg-stone-950 text-stone-100 resize-y
              ${parseError ? 'border-red-500' : 'border-stone-700'}
              focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {parseError && (
            <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-red-950 border border-red-700
              rounded text-xs text-red-300 font-mono">
              JSON Parse Error: {parseError}
            </div>
          )}
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className={`rounded-md border p-4 space-y-2 text-sm
          ${validation.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className={`font-medium ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
            {validation.valid ? '✓ Config is valid' : `✗ ${validation.errors.length} error(s) found`}
          </div>
          {validation.errors.map((err, i) => (
            <div key={i} className="text-red-600 text-xs font-mono">
              [{err.path}] {err.message}
            </div>
          ))}
          {validation.warnings.length > 0 && (
            <div className="space-y-1 border-t border-amber-200 pt-2">
              {validation.warnings.map((w, i) => (
                <div key={i} className="text-amber-600 text-xs">⚠ {w.message}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleValidate}
          disabled={!!parseError || isValidating}
          className="px-4 py-2 rounded-md border border-stone-300 text-stone-700 text-sm
            hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? 'Validating…' : 'Validate Config'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!!parseError || isSaving}
          className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium
            hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving…' : 'Save Config'}
        </button>
      </div>
    </div>
  );
};
