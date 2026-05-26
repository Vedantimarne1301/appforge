// types/index.ts
// Central type definitions for the AppForge platform

// ─── Field Component Types ──────────────────────────────────────────────────
export type FieldComponent =
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'number'
  | 'email'
  | 'url'
  | 'file';

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'date'
  | 'boolean'
  | 'password';

// ─── Config Schema ───────────────────────────────────────────────────────────
export interface FieldConfig {
  name: string;
  label: string;
  component: FieldComponent | string; // allow unknown – renderer will fallback
  type?: FieldType | string;
  required?: boolean;
  placeholder?: string;
  options?: string[] | { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  defaultValue?: unknown;
  helpText?: string;
  hidden?: boolean;
  readonly?: boolean;
}

export interface AppConfigSchema {
  resource: string;
  layout?: 'form' | 'table' | 'both';
  name?: string;
  description?: string;
  fields: FieldConfig[];
  tableColumns?: string[]; // subset of field names to show in table
  settings?: {
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
    allowCsvImport?: boolean;
    pageSize?: number;
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized?: AppConfigSchema; // cleaned version of config
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

// ─── API Responses ───────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

// ─── App Record ──────────────────────────────────────────────────────────────
export interface AppRecord {
  id: string;
  configId: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── App Config (DB shape) ───────────────────────────────────────────────────
export interface AppConfigRow {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  resource: string;
  rawConfig: AppConfigSchema;
  isValid: boolean;
  validationErrors?: ValidationError[] | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Component Registry ──────────────────────────────────────────────────────
export interface ComponentRegistryEntry {
  component: React.ComponentType<FieldRendererProps>;
  supportedTypes?: string[];
}

export interface FieldRendererProps {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

// ─── CSV Import ──────────────────────────────────────────────────────────────
export interface CsvImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role: string;
}
