// lib/validators/config-validator.ts
// Validates, sanitizes, and normalizes AppConfig JSON.
// This is the safety boundary — bad configs never reach renderers or API handlers raw.

import {
  AppConfigSchema,
  FieldConfig,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '@/types';

const SUPPORTED_COMPONENTS = new Set([
  'input', 'textarea', 'select', 'checkbox', 'radio',
  'date', 'number', 'email', 'url', 'file',
]);

const SUPPORTED_TYPES = new Set([
  'text', 'number', 'email', 'url', 'date', 'boolean', 'password',
]);

const SUPPORTED_LAYOUTS = new Set(['form', 'table', 'both']);

const RESOURCE_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/;
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

export function validateConfig(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Guard: must be an object
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      valid: false,
      errors: [{ path: '$', message: 'Config must be a JSON object', code: 'INVALID_ROOT' }],
      warnings: [],
    };
  }

  const config = raw as Record<string, unknown>;

  // ── resource ──────────────────────────────────────────────────────────────
  let resource = config.resource;
  if (!resource || typeof resource !== 'string') {
    errors.push({ path: 'resource', message: '"resource" is required and must be a string', code: 'MISSING_RESOURCE' });
    resource = 'unnamed';
  } else if (!RESOURCE_PATTERN.test(resource as string)) {
    warnings.push({ path: 'resource', message: `"resource" should match ${RESOURCE_PATTERN}. Got: "${resource}". It has been sanitized.` });
    resource = (resource as string).toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64);
  }

  // ── layout ────────────────────────────────────────────────────────────────
  let layout: AppConfigSchema['layout'] = 'form';
  if (config.layout !== undefined) {
    if (SUPPORTED_LAYOUTS.has(config.layout as string)) {
      layout = config.layout as AppConfigSchema['layout'];
    } else {
      warnings.push({ path: 'layout', message: `Unknown layout "${config.layout}". Defaulting to "form".` });
    }
  }

  // ── name / description ────────────────────────────────────────────────────
  const name = typeof config.name === 'string' ? config.name.slice(0, 255) : String(resource);
  const description = typeof config.description === 'string' ? config.description.slice(0, 1000) : undefined;

  // ── fields ────────────────────────────────────────────────────────────────
  if (!Array.isArray(config.fields)) {
    errors.push({ path: 'fields', message: '"fields" must be an array', code: 'MISSING_FIELDS' });
  }

  const rawFields = Array.isArray(config.fields) ? config.fields : [];
  if (rawFields.length === 0) {
    errors.push({ path: 'fields', message: '"fields" must contain at least one entry', code: 'EMPTY_FIELDS' });
  }

  const seenNames = new Set<string>();
  const sanitizedFields: FieldConfig[] = [];

  for (let i = 0; i < rawFields.length; i++) {
    const fieldPath = `fields[${i}]`;
    const raw = rawFields[i];

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push({ path: fieldPath, message: 'Field entry must be an object — skipped.' });
      continue;
    }

    const f = raw as Record<string, unknown>;
    const fieldErrors: ValidationError[] = [];

    // name
    let fieldName = typeof f.name === 'string' ? f.name : '';
    if (!fieldName) {
      fieldErrors.push({ path: `${fieldPath}.name`, message: 'Field "name" is required', code: 'MISSING_FIELD_NAME' });
      fieldName = `field_${i}`;
    } else if (!FIELD_NAME_PATTERN.test(fieldName)) {
      warnings.push({ path: `${fieldPath}.name`, message: `Field name "${fieldName}" contains invalid characters. Sanitized.` });
      fieldName = fieldName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64);
    }
    if (seenNames.has(fieldName)) {
      warnings.push({ path: `${fieldPath}.name`, message: `Duplicate field name "${fieldName}". Renamed to "${fieldName}_${i}".` });
      fieldName = `${fieldName}_${i}`;
    }
    seenNames.add(fieldName);

    // label
    const label = typeof f.label === 'string' && f.label.trim()
      ? f.label.slice(0, 255)
      : fieldName.replace(/_/g, ' ');

    // component
    let component = typeof f.component === 'string' ? f.component : 'input';
    if (!SUPPORTED_COMPONENTS.has(component)) {
      warnings.push({ path: `${fieldPath}.component`, message: `Unknown component "${component}". Will render fallback UI.` });
      // Keep it as-is — renderer will handle fallback
    }

    // type
    let type = typeof f.type === 'string' ? f.type : 'text';
    if (!SUPPORTED_TYPES.has(type)) {
      warnings.push({ path: `${fieldPath}.type`, message: `Unknown type "${type}". Defaulting to "text".` });
      type = 'text';
    }

    // options — normalize to {label, value}[]
    let options: { label: string; value: string }[] | undefined;
    if (f.options !== undefined) {
      if (!Array.isArray(f.options)) {
        warnings.push({ path: `${fieldPath}.options`, message: '"options" must be an array. Ignored.' });
      } else {
        options = (f.options as unknown[])
          .filter((o) => o !== null && o !== undefined)
          .map((o) => {
            if (typeof o === 'string') return { label: o, value: o };
            if (typeof o === 'object' && !Array.isArray(o)) {
              const oo = o as Record<string, unknown>;
              return {
                label: typeof oo.label === 'string' ? oo.label : String(oo.value ?? ''),
                value: typeof oo.value === 'string' ? oo.value : String(oo.label ?? ''),
              };
            }
            return { label: String(o), value: String(o) };
          });
        if (options.length === 0) {
          warnings.push({ path: `${fieldPath}.options`, message: '"options" array is empty.' });
        }
      }
    }

    // validation constraints
    const rawVal = f.validation as Record<string, unknown> | undefined;
    const validation: FieldConfig['validation'] = rawVal && typeof rawVal === 'object'
      ? {
          min: typeof rawVal.min === 'number' ? rawVal.min : undefined,
          max: typeof rawVal.max === 'number' ? rawVal.max : undefined,
          minLength: typeof rawVal.minLength === 'number' ? rawVal.minLength : undefined,
          maxLength: typeof rawVal.maxLength === 'number' ? rawVal.maxLength : undefined,
          pattern: typeof rawVal.pattern === 'string' ? rawVal.pattern : undefined,
        }
      : undefined;

    errors.push(...fieldErrors);

    sanitizedFields.push({
      name: fieldName,
      label,
      component: component as FieldConfig['component'],
      type: type as FieldConfig['type'],
      required: f.required === true,
      placeholder: typeof f.placeholder === 'string' ? f.placeholder.slice(0, 255) : undefined,
      options,
      validation,
      defaultValue: f.defaultValue,
      helpText: typeof f.helpText === 'string' ? f.helpText.slice(0, 500) : undefined,
      hidden: f.hidden === true,
      readonly: f.readonly === true,
    });
  }

  // ── tableColumns ─────────────────────────────────────────────────────────
  let tableColumns: string[] | undefined;
  if (Array.isArray(config.tableColumns)) {
    const validNames = new Set(sanitizedFields.map((f) => f.name));
    tableColumns = (config.tableColumns as unknown[])
      .filter((c) => typeof c === 'string' && validNames.has(c)) as string[];
    if (tableColumns.length !== config.tableColumns.length) {
      warnings.push({ path: 'tableColumns', message: 'Some tableColumns reference unknown fields and were removed.' });
    }
  }

  // ── settings ──────────────────────────────────────────────────────────────
  const rawSettings = config.settings as Record<string, unknown> | undefined;
  const settings: AppConfigSchema['settings'] = rawSettings && typeof rawSettings === 'object'
    ? {
        allowCreate: rawSettings.allowCreate !== false,
        allowEdit: rawSettings.allowEdit !== false,
        allowDelete: rawSettings.allowDelete !== false,
        allowCsvImport: rawSettings.allowCsvImport === true,
        pageSize: typeof rawSettings.pageSize === 'number'
          ? Math.min(Math.max(rawSettings.pageSize, 5), 200)
          : 20,
      }
    : { allowCreate: true, allowEdit: true, allowDelete: true, allowCsvImport: false, pageSize: 20 };

  const sanitized: AppConfigSchema = {
    resource: resource as string,
    layout,
    name,
    description,
    fields: sanitizedFields,
    tableColumns,
    settings,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized,
  };
}

/**
 * Safe parse: never throws. Returns null on non-JSON input.
 */
export function safeParseConfig(input: string): { parsed: unknown; parseError?: string } {
  try {
    return { parsed: JSON.parse(input) };
  } catch (e) {
    return { parsed: null, parseError: (e as Error).message };
  }
}

/**
 * Validate a record's data against a config's fields.
 * Returns field-level errors.
 */
export function validateRecord(
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

    if (field.type === 'number' || field.component === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        errors[field.name] = `${field.label} must be a number`;
      } else if (v.min !== undefined && num < v.min) {
        errors[field.name] = `${field.label} must be at least ${v.min}`;
      } else if (v.max !== undefined && num > v.max) {
        errors[field.name] = `${field.label} must be at most ${v.max}`;
      }
    }

    if (typeof value === 'string') {
      if (v.minLength !== undefined && value.length < v.minLength) {
        errors[field.name] = `${field.label} must be at least ${v.minLength} characters`;
      } else if (v.maxLength !== undefined && value.length > v.maxLength) {
        errors[field.name] = `${field.label} must be at most ${v.maxLength} characters`;
      } else if (v.pattern) {
        try {
          const re = new RegExp(v.pattern);
          if (!re.test(value)) {
            errors[field.name] = `${field.label} format is invalid`;
          }
        } catch {
          // Invalid regex in config — skip silently
        }
      }
    }
  }

  return errors;
}
