// lib/auth/middleware.ts
// Auth wrapper for API route handlers.
// Extracts the authenticated userId and passes it to the handler.
// All handlers return proper ApiResponse shapes via lib/api-response.ts.

import { auth } from './auth';
import { NextResponse } from 'next/server';

export type AuthContext = {
  userId: string;
  params?: Record<string, string>;
};

type Handler = (req: Request, ctx: AuthContext) => Promise<Response>;

/**
 * Wraps a Next.js API route handler with authentication.
 * The wrapped function is compatible with Next.js App Router route export signatures.
 */
export function withAuth(handler: Handler) {
  return async function routeHandler(
    req: Request,
    // Next.js passes { params } as the second arg to dynamic route handlers
    routeContext: { params: Promise<Record<string, string>> }
  ): Promise<Response> {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Await params if they are a promise (Next.js 15 async params)
      const params = await routeContext.params;

      return handler(req, { userId: session.user.id, params });
    } catch (error) {
      console.error('[withAuth]', error);
      return NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Safe JSON body parser — never throws.
 * Returns null body + error string on any failure.
 */
export async function safeJsonBody(
  req: Request
): Promise<{ body: Record<string, unknown> | null; error?: string }> {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { body: null, error: 'Request body must be a JSON object' };
    }
    return { body: body as Record<string, unknown> };
  } catch {
    return { body: null, error: 'Invalid JSON in request body' };
  }
}
