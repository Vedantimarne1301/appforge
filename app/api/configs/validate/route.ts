// app/api/configs/validate/route.ts
// Stateless validation endpoint — does NOT persist anything.
import { NextRequest, NextResponse } from 'next/server';
import { validateConfig, safeParseConfig } from '@/lib/validators/config-validator';

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { configJson } = body;

    let rawConfig: unknown;
    if (typeof configJson === 'string') {
      const { parsed, parseError } = safeParseConfig(configJson);
      if (parseError) {
        return NextResponse.json({
          success: true,
          data: {
            validation: {
              valid: false,
              errors: [{ path: '$', message: `JSON parse error: ${parseError}`, code: 'PARSE_ERROR' }],
              warnings: [],
            },
          },
        });
      }
      rawConfig = parsed;
    } else if (configJson && typeof configJson === 'object') {
      rawConfig = configJson;
    } else {
      return NextResponse.json(
        { success: false, error: '"configJson" must be a JSON object or string' },
        { status: 400 }
      );
    }

    const validation = validateConfig(rawConfig);
    return NextResponse.json({
      success: true,
      data: {
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      },
    });
  } catch (e) {
    console.error('[validate]', e);
    return NextResponse.json({ success: false, error: 'Validation service error' }, { status: 500 });
  }
}
