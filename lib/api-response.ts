// lib/api-response.ts
import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

export function ok<T>(data: T, meta?: ApiResponse['meta'], status = 200): NextResponse {
  return NextResponse.json({ success: true, data, meta } satisfies ApiResponse<T>, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, undefined, 201);
}

export function badRequest(error: string, errors?: ApiResponse['errors']): NextResponse {
  return NextResponse.json(
    { success: false, error, errors } satisfies ApiResponse,
    { status: 400 }
  );
}

export function notFound(resource = 'Resource'): NextResponse {
  return NextResponse.json(
    { success: false, error: `${resource} not found` } satisfies ApiResponse,
    { status: 404 }
  );
}

export function forbidden(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Forbidden' } satisfies ApiResponse,
    { status: 403 }
  );
}

export function serverError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : 'Internal server error';
  console.error('[API Error]', e);
  return NextResponse.json(
    { success: false, error: 'An unexpected error occurred' } satisfies ApiResponse,
    { status: 500 }
  );
}
