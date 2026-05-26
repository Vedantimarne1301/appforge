// components/dynamic/CsvImporter.tsx
'use client';
import React, { useRef, useState } from 'react';
import { CsvImportResult } from '@/types';

interface CsvImporterProps {
  configId: string;
  onImportComplete: () => void;
}

export const CsvImporter: React.FC<CsvImporterProps> = ({ configId, onImportComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5MB.');
      return;
    }

    setIsUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/uploads/${configId}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }

      setResult(data.data);
      onImportComplete();
    } catch {
      setError('Network error during upload.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-stone-300 hover:border-stone-400 bg-stone-50'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileInput}
          disabled={isUploading}
          className="hidden"
        />
        <div className="space-y-1">
          <div className="text-2xl">📄</div>
          <div className="text-sm font-medium text-stone-700">
            {isUploading ? 'Importing…' : 'Drop CSV here or click to upload'}
          </div>
          <div className="text-xs text-stone-400">Max 5MB. Headers must match field names.</div>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className="px-4 py-3 rounded-md bg-green-50 border border-green-200 text-sm space-y-1">
          <div className="font-medium text-green-700">
            Import complete: {result.imported} of {result.total} rows imported
          </div>
          {result.failed > 0 && (
            <div className="text-amber-600">
              {result.failed} rows failed validation
            </div>
          )}
          {result.errors.slice(0, 5).map((e) => (
            <div key={e.row} className="text-xs text-stone-500 font-mono">
              Row {e.row}: {e.message}
            </div>
          ))}
          {result.errors.length > 5 && (
            <div className="text-xs text-stone-400">…and {result.errors.length - 5} more errors</div>
          )}
        </div>
      )}
    </div>
  );
};
