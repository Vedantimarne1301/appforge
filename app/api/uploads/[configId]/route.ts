// app/api/uploads/[configId]/route.ts
// CSV import: validates each row against config schema, stores valid records.

import { withAuth } from '@/lib/auth/middleware';
import { ok, badRequest, notFound, forbidden, serverError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { AppConfigSchema, CsvImportResult } from '@/types';
import { validateRecord } from '@/lib/validators/config-validator';

export const POST = withAuth(async (req, { userId, params }) => {
  const configId = params?.configId!;

  try {
    const config = await prisma.appConfig.findUnique({ where: { id: configId } });
    if (!config) return notFound('Config');
    if (config.userId !== userId) return forbidden();

    const schema = config.rawConfig as AppConfigSchema;
    if (!schema.settings?.allowCsvImport) {
      return badRequest('CSV import is not enabled for this config');
    }

    // Parse multipart form
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return badRequest('Expected multipart/form-data with a CSV file');
    }

    const file = formData.get('file') as File | null;
    if (!file) return badRequest('No file uploaded. Send a "file" field.');

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return badRequest('File must be a CSV');
    }

    if (file.size > 5 * 1024 * 1024) {
      return badRequest('File must be smaller than 5MB');
    }

    const text = await file.text();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      return badRequest('CSV must have a header row and at least one data row');
    }

    // Parse header
    const headers = parseCSVRow(lines[0]);
    const fieldNames = new Set(schema.fields.map((f) => f.name));
    const matchedHeaders = headers.filter((h) => fieldNames.has(h));

    if (matchedHeaders.length === 0) {
      return badRequest(`CSV headers do not match any config fields. Found: ${headers.join(', ')}. Expected: ${[...fieldNames].join(', ')}`);
    }

    const result: CsvImportResult = { total: lines.length - 1, imported: 0, failed: 0, errors: [] };
    const toCreate: { configId: string; userId: string; data: object }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVRow(lines[i]);
      const row: Record<string, unknown> = {};

      headers.forEach((header, idx) => {
        if (fieldNames.has(header)) {
          row[header] = values[idx] ?? '';
        }
      });

      const fieldErrors = validateRecord(row, schema.fields);
      if (Object.keys(fieldErrors).length > 0) {
        result.failed++;
        result.errors.push({
          row: i,
          message: Object.values(fieldErrors).join('; '),
        });
        continue;
      }

      toCreate.push({ configId, userId, data: row });
    }

    // Batch insert valid records
    if (toCreate.length > 0) {
      await prisma.appRecord.createMany({ data: toCreate });
      result.imported = toCreate.length;
    }

    // Log upload
    await prisma.upload.create({
      data: {
        userId,
        configId,
        filename: file.name,
        originalName: file.name,
        mimeType: file.type || 'text/csv',
        size: file.size,
        status: 'done',
        rowsImported: result.imported,
        errorLog: result.errors.length > 0 ? (result.errors as object[]) : null,
      },
    });

    return ok(result);
  } catch (e) {
    return serverError(e);
  }
});

/**
 * Minimal CSV row parser — handles quoted fields with commas.
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
