// lib/validators/__tests__/config-validator.test.ts
// Run with: npx tsx lib/validators/__tests__/config-validator.test.ts
//
// No test framework dependency — uses Node's built-in assert.
// Covers the critical safety surface of the validator.

import assert from 'node:assert/strict';
import { validateConfig, validateRecord, safeParseConfig } from '../config-validator';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

// ─── safeParseConfig ─────────────────────────────────────────────────────────

console.log('\nsafeParseConfig');

test('returns parsed object for valid JSON', () => {
  const { parsed, parseError } = safeParseConfig('{"resource":"tasks","fields":[]}');
  assert.equal(parseError, undefined);
  assert.deepEqual((parsed as any).resource, 'tasks');
});

test('returns parseError for invalid JSON without throwing', () => {
  const { parsed, parseError } = safeParseConfig('{not valid json}');
  assert.equal(parsed, null);
  assert.ok(typeof parseError === 'string' && parseError.length > 0);
});

test('handles empty string', () => {
  const { parsed, parseError } = safeParseConfig('');
  assert.equal(parsed, null);
  assert.ok(parseError);
});

// ─── validateConfig ───────────────────────────────────────────────────────────

console.log('\nvalidateConfig');

test('valid minimal config passes', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'title', label: 'Title', component: 'input' }],
  });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.sanitized);
  assert.equal(result.sanitized!.resource, 'tasks');
});

test('null input returns invalid with INVALID_ROOT error', () => {
  const result = validateConfig(null);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, 'INVALID_ROOT');
});

test('array input returns invalid with INVALID_ROOT error', () => {
  const result = validateConfig([1, 2, 3]);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, 'INVALID_ROOT');
});

test('missing resource produces error + fallback name', () => {
  const result = validateConfig({ fields: [{ name: 'x', label: 'X', component: 'input' }] });
  assert.equal(result.valid, false);
  const codes = result.errors.map((e) => e.code);
  assert.ok(codes.includes('MISSING_RESOURCE'));
  assert.equal(result.sanitized!.resource, 'unnamed');
});

test('missing fields array produces error', () => {
  const result = validateConfig({ resource: 'tasks' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === 'MISSING_FIELDS'));
});

test('empty fields array produces error', () => {
  const result = validateConfig({ resource: 'tasks', fields: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === 'EMPTY_FIELDS'));
});

test('unknown component generates warning but not error', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'x', label: 'X', component: 'unknownWidget' }],
  });
  assert.equal(result.valid, true); // field still valid
  assert.ok(result.warnings.some((w) => w.message.includes('unknownWidget')));
  // Component is kept as-is for renderer to handle
  assert.equal(result.sanitized!.fields[0].component, 'unknownWidget');
});

test('unknown layout generates warning and defaults to form', () => {
  const result = validateConfig({
    resource: 'tasks',
    layout: 'kanban', // not supported yet
    fields: [{ name: 'x', label: 'X', component: 'input' }],
  });
  assert.equal(result.valid, true);
  assert.equal(result.sanitized!.layout, 'form');
  assert.ok(result.warnings.some((w) => w.message.includes('kanban')));
});

test('duplicate field names are renamed with suffix', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [
      { name: 'title', label: 'Title', component: 'input' },
      { name: 'title', label: 'Title 2', component: 'input' },
    ],
  });
  const names = result.sanitized!.fields.map((f) => f.name);
  assert.ok(new Set(names).size === names.length, 'Field names should be unique');
});

test('string options are normalized to {label, value} objects', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'priority', label: 'Priority', component: 'select', options: ['Low', 'High'] }],
  });
  const opts = result.sanitized!.fields[0].options as { label: string; value: string }[];
  assert.deepEqual(opts[0], { label: 'Low', value: 'Low' });
  assert.deepEqual(opts[1], { label: 'High', value: 'High' });
});

test('non-array options generates warning and is excluded', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'x', label: 'X', component: 'select', options: 'bad' as any }],
  });
  assert.ok(result.warnings.some((w) => w.path.includes('options')));
  assert.equal(result.sanitized!.fields[0].options, undefined);
});

test('invalid field name characters are sanitized', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'my field!', label: 'My Field', component: 'input' }],
  });
  assert.ok(result.sanitized!.fields[0].name.match(/^[a-zA-Z][a-zA-Z0-9_]*$/));
});

test('unknown type defaults to text with warning', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'x', label: 'X', component: 'input', type: 'currency' as any }],
  });
  assert.equal(result.sanitized!.fields[0].type, 'text');
  assert.ok(result.warnings.some((w) => w.message.includes('currency')));
});

test('non-object field entries are skipped with warning', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: ['not an object', null, { name: 'valid', label: 'Valid', component: 'input' }] as any,
  });
  assert.equal(result.sanitized!.fields.length, 1);
  assert.equal(result.sanitized!.fields[0].name, 'valid');
  assert.ok(result.warnings.length >= 2);
});

test('settings are applied with defaults for missing keys', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'x', label: 'X', component: 'input' }],
    settings: { pageSize: 500, allowDelete: false }, // pageSize clamped to 200
  });
  assert.equal(result.sanitized!.settings!.pageSize, 200);
  assert.equal(result.sanitized!.settings!.allowDelete, false);
  assert.equal(result.sanitized!.settings!.allowCreate, true); // default
});

test('tableColumns referencing unknown fields are removed', () => {
  const result = validateConfig({
    resource: 'tasks',
    fields: [{ name: 'title', label: 'Title', component: 'input' }],
    tableColumns: ['title', 'nonexistent_field'],
  });
  assert.deepEqual(result.sanitized!.tableColumns, ['title']);
  assert.ok(result.warnings.some((w) => w.path === 'tableColumns'));
});

test('resource name with special chars is sanitized', () => {
  const result = validateConfig({
    resource: 'My Tasks!!',
    fields: [{ name: 'x', label: 'X', component: 'input' }],
  });
  // Sanitized to lowercase with underscores
  assert.ok(/^[a-z][a-z0-9_-]*$/.test(result.sanitized!.resource));
});

// ─── validateRecord ───────────────────────────────────────────────────────────

console.log('\nvalidateRecord');

const testFields = [
  { name: 'title', label: 'Title', component: 'input' as const, required: true },
  { name: 'priority', label: 'Priority', component: 'select' as const },
  { name: 'score', label: 'Score', component: 'number' as const, type: 'number' as const,
    validation: { min: 0, max: 100 } },
  { name: 'email', label: 'Email', component: 'email' as const,
    validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' } },
  { name: 'bio', label: 'Bio', component: 'textarea' as const,
    validation: { maxLength: 20 } },
  { name: 'hidden_field', label: 'Hidden', component: 'input' as const, hidden: true },
  { name: 'readonly_field', label: 'RO', component: 'input' as const, readonly: true },
];

test('valid data produces no errors', () => {
  const errors = validateRecord({ title: 'Hello', score: 50 }, testFields);
  assert.deepEqual(errors, {});
});

test('missing required field produces error', () => {
  const errors = validateRecord({ priority: 'High' }, testFields);
  assert.ok('title' in errors);
});

test('empty string counts as missing for required', () => {
  const errors = validateRecord({ title: '' }, testFields);
  assert.ok('title' in errors);
});

test('score below min produces error', () => {
  const errors = validateRecord({ title: 'x', score: -5 }, testFields);
  assert.ok('score' in errors);
});

test('score above max produces error', () => {
  const errors = validateRecord({ title: 'x', score: 999 }, testFields);
  assert.ok('score' in errors);
});

test('score within range produces no error', () => {
  const errors = validateRecord({ title: 'x', score: 75 }, testFields);
  assert.equal('score' in errors, false);
});

test('bio exceeding maxLength produces error', () => {
  const errors = validateRecord({ title: 'x', bio: 'a'.repeat(21) }, testFields);
  assert.ok('bio' in errors);
});

test('bio within maxLength produces no error', () => {
  const errors = validateRecord({ title: 'x', bio: 'short bio' }, testFields);
  assert.equal('bio' in errors, false);
});

test('invalid regex pattern in validation is silently skipped', () => {
  const fields = [
    { name: 'x', label: 'X', component: 'input' as const,
      validation: { pattern: '[invalid(regex' } },
  ];
  // Should not throw
  const errors = validateRecord({ x: 'test' }, fields);
  assert.deepEqual(errors, {}); // skip invalid regex
});

test('hidden fields are not validated even if empty + required', () => {
  const errors = validateRecord({}, testFields);
  assert.equal('hidden_field' in errors, false);
});

test('readonly fields are not validated', () => {
  const errors = validateRecord({}, testFields);
  assert.equal('readonly_field' in errors, false);
});

test('empty optional field produces no error', () => {
  const errors = validateRecord({ title: 'Test', priority: '' }, testFields);
  assert.equal('priority' in errors, false);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
