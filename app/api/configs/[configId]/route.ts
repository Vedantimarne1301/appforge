// app/api/configs/[configId]/route.ts
import { withAuth, safeJsonBody } from '@/lib/auth/middleware';
import { validateConfig, safeParseConfig } from '@/lib/validators/config-validator';
import { ok, badRequest, notFound, forbidden, serverError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// GET /api/configs/:configId
export const GET = withAuth(async (_req, { userId, params }) => {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: params?.configId },
      include: { _count: { select: { appRecords: true } } },
    });
    if (!config) return notFound('Config');
    if (config.userId !== userId) return forbidden();
    return ok(config);
  } catch (e) {
    return serverError(e);
  }
});

// PUT /api/configs/:configId
export const PUT = withAuth(async (req, { userId, params }) => {
  const { body, error: parseError } = await safeJsonBody(req);
  if (!body) return badRequest(parseError!);

  try {
    const existing = await prisma.appConfig.findUnique({ where: { id: params?.configId } });
    if (!existing) return notFound('Config');
    if (existing.userId !== userId) return forbidden();

    const { configJson, name, description } = body as Record<string, unknown>;

    let rawConfig: unknown = existing.rawConfig;
    if (configJson !== undefined) {
      if (typeof configJson === 'string') {
        const { parsed, parseError: jsonError } = safeParseConfig(configJson);
        if (jsonError) return badRequest(`Invalid JSON: ${jsonError}`);
        rawConfig = parsed;
      } else if (configJson && typeof configJson === 'object') {
        rawConfig = configJson;
      }
    }

    const validation = validateConfig(rawConfig);

    const updated = await prisma.appConfig.update({
      where: { id: params?.configId },
      data: {
        name: typeof name === 'string' ? name.slice(0, 255) : existing.name,
        description: typeof description === 'string' ? description.slice(0, 1000) : existing.description,
        resource: validation.sanitized?.resource ?? existing.resource,
        rawConfig: (validation.sanitized ?? rawConfig) as object,
        isValid: validation.valid,
        validationErrors: validation.errors.length > 0 ? (validation.errors as object[]) : null,
      },
    });

    return ok({ config: updated, validation: { valid: validation.valid, errors: validation.errors, warnings: validation.warnings } });
  } catch (e) {
    return serverError(e);
  }
});

// DELETE /api/configs/:configId
export const DELETE = withAuth(async (_req, { userId, params }) => {
  try {
    const existing = await prisma.appConfig.findUnique({ where: { id: params?.configId } });
    if (!existing) return notFound('Config');
    if (existing.userId !== userId) return forbidden();

    await prisma.appConfig.delete({ where: { id: params?.configId } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
});
