// app/api/records/[configId]/route.ts
// Generic CRUD engine — behavior is entirely driven by the config's field definitions.

import { withAuth, safeJsonBody } from '@/lib/auth/middleware';
import { validateRecord } from '@/lib/validators/config-validator';
import { ok, created, badRequest, notFound, forbidden, serverError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { AppConfigSchema } from '@/types';

async function getConfigForUser(configId: string, userId: string) {
  const config = await prisma.appConfig.findUnique({ where: { id: configId } });
  if (!config) return { config: null, error: 'Config not found', status: 404 };
  if (config.userId !== userId) return { config: null, error: 'Forbidden', status: 403 };
  return { config, error: null, status: 200 };
}

function sanitizeRecordData(
  data: Record<string, unknown>,
  schema: AppConfigSchema
): Record<string, unknown> {
  const allowed = new Set(schema.fields.map((f) => f.name));
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) {
      // Basic type coercion to prevent XSS-like injections
      if (typeof value === 'string') {
        sanitized[key] = value.slice(0, 10_000);
      } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 1000);
      } else {
        sanitized[key] = String(value).slice(0, 10_000);
      }
    }
  }
  return sanitized;
}

// GET /api/records/:configId — list records
export const GET = withAuth(async (req, { userId, params }) => {
  const configId = params?.configId!;
  const { config, error, status } = await getConfigForUser(configId, userId);
  if (!config) return notFound('Config');

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const schema = config.rawConfig as AppConfigSchema;
  const pageSize = schema.settings?.pageSize ?? 20;

  try {
    const [records, total] = await Promise.all([
      prisma.appRecord.findMany({
        where: { configId, userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appRecord.count({ where: { configId, userId } }),
    ]);

    return ok(records, {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    return serverError(e);
  }
});

// POST /api/records/:configId — create a record
export const POST = withAuth(async (req, { userId, params }) => {
  const configId = params?.configId!;
  const { body, error: parseError } = await safeJsonBody(req);
  if (!body) return badRequest(parseError!);

  const { config, error } = await getConfigForUser(configId, userId);
  if (!config) return notFound('Config');

  const schema = config.rawConfig as AppConfigSchema;

  if (schema.settings?.allowCreate === false) {
    return forbidden();
  }

  const rawData = (body.data ?? body) as Record<string, unknown>;
  const sanitized = sanitizeRecordData(rawData, schema);
  const fieldErrors = validateRecord(sanitized, schema.fields);

  if (Object.keys(fieldErrors).length > 0) {
    return badRequest('Validation failed', Object.entries(fieldErrors).map(([path, message]) => ({
      path,
      message,
      code: 'FIELD_VALIDATION',
    })));
  }

  try {
    const record = await prisma.appRecord.create({
      data: { configId, userId, data: sanitized },
    });
    return created(record);
  } catch (e) {
    return serverError(e);
  }
});
