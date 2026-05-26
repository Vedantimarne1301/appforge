// app/api/configs/route.ts
import { withAuth, safeJsonBody } from '@/lib/auth/middleware';
import { validateConfig, safeParseConfig } from '@/lib/validators/config-validator';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// GET /api/configs — list user's configs
export const GET = withAuth(async (_req, { userId }) => {
  try {
    const configs = await prisma.appConfig.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        resource: true,
        isValid: true,
        validationErrors: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { appRecords: true } },
      },
    });
    return ok(configs);
  } catch (e) {
    return serverError(e);
  }
});

// POST /api/configs — create a new config
export const POST = withAuth(async (req, { userId }) => {
  const { body, error: parseError } = await safeJsonBody(req);
  if (!body) return badRequest(parseError!);

  const { configJson, name, description } = body as Record<string, unknown>;

  // Accept either a pre-parsed object or a raw JSON string
  let rawConfig: unknown;
  if (typeof configJson === 'string') {
    const { parsed, parseError: jsonError } = safeParseConfig(configJson);
    if (jsonError) return badRequest(`Invalid JSON: ${jsonError}`);
    rawConfig = parsed;
  } else if (configJson && typeof configJson === 'object') {
    rawConfig = configJson;
  } else {
    return badRequest('"configJson" must be a JSON object or JSON string');
  }

  const validation = validateConfig(rawConfig);

  try {
    const config = await prisma.appConfig.create({
      data: {
        userId,
        name: typeof name === 'string' ? name.slice(0, 255) : (validation.sanitized?.name ?? 'Untitled'),
        description: typeof description === 'string' ? description.slice(0, 1000) : validation.sanitized?.description,
        resource: validation.sanitized?.resource ?? 'unnamed',
        rawConfig: (validation.sanitized ?? rawConfig) as object,
        isValid: validation.valid,
        validationErrors: validation.errors.length > 0 ? (validation.errors as object[]) : null,
      },
    });

    return created({
      config,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  } catch (e) {
    return serverError(e);
  }
});
