// app/api/records/[configId]/[recordId]/route.ts
import { withAuth, safeJsonBody } from '@/lib/auth/middleware';
import { validateRecord } from '@/lib/validators/config-validator';
import { ok, badRequest, notFound, forbidden, serverError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { AppConfigSchema } from '@/types';

function sanitizeRecordData(data: Record<string, unknown>, schema: AppConfigSchema) {
  const allowed = new Set(schema.fields.map((f) => f.name));
  return Object.fromEntries(
    Object.entries(data)
      .filter(([k]) => allowed.has(k))
      .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 10_000) : v])
  );
}

async function getRecord(configId: string, recordId: string, userId: string) {
  const config = await prisma.appConfig.findUnique({ where: { id: configId } });
  if (!config || config.userId !== userId) return null;
  const record = await prisma.appRecord.findFirst({
    where: { id: recordId, configId, userId },
  });
  return record ? { record, schema: config.rawConfig as AppConfigSchema } : null;
}

// GET /api/records/:configId/:recordId
export const GET = withAuth(async (_req, { userId, params }) => {
  try {
    const result = await getRecord(params?.configId!, params?.recordId!, userId);
    if (!result) return notFound('Record');
    return ok(result.record);
  } catch (e) {
    return serverError(e);
  }
});

// PUT /api/records/:configId/:recordId
export const PUT = withAuth(async (req, { userId, params }) => {
  const { body, error: parseError } = await safeJsonBody(req);
  if (!body) return badRequest(parseError!);

  try {
    const result = await getRecord(params?.configId!, params?.recordId!, userId);
    if (!result) return notFound('Record');

    const { schema } = result;

    if (schema.settings?.allowEdit === false) return forbidden();

    const rawData = (body.data ?? body) as Record<string, unknown>;
    const sanitized = sanitizeRecordData(rawData, schema);
    const fieldErrors = validateRecord(sanitized, schema.fields);

    if (Object.keys(fieldErrors).length > 0) {
      return badRequest('Validation failed', Object.entries(fieldErrors).map(([path, message]) => ({
        path, message, code: 'FIELD_VALIDATION',
      })));
    }

    const updated = await prisma.appRecord.update({
      where: { id: params?.recordId! },
      data: { data: sanitized },
    });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
});

// DELETE /api/records/:configId/:recordId
export const DELETE = withAuth(async (_req, { userId, params }) => {
  try {
    const result = await getRecord(params?.configId!, params?.recordId!, userId);
    if (!result) return notFound('Record');

    if (result.schema.settings?.allowDelete === false) return forbidden();

    await prisma.appRecord.delete({ where: { id: params?.recordId! } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
});
