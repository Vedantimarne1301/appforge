import { auth } from './auth';
import { NextRequest, NextResponse } from 'next/server';

export type AuthContext = {
  userId: string;
  params: Record<string, string>;
};

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type Handler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<Response>;

type RouteHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<Response>;

export function withAuth(handler: Handler): RouteHandler {
  return async (
    req: NextRequest,
    context: RouteContext
  ): Promise<Response> => {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
          },
          {
            status: 401,
          }
        );
      }

      const params = await context.params;

      return handler(req, {
        userId: session.user.id,
        params,
      });
    } catch (error) {
      console.error('[withAuth]', error);

      return NextResponse.json(
        {
          success: false,
          error: 'Authentication error',
        },
        {
          status: 500,
        }
      );
    }
  };
}

export async function safeJsonBody(
  req: Request
): Promise<{
  body: Record<string, unknown> | null;
  error?: string;
}> {
  try {
    const body = await req.json();

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return {
        body: null,
        error: 'Request body must be a JSON object',
      };
    }

    return {
      body: body as Record<string, unknown>,
    };
  } catch {
    return {
      body: null,
      error: 'Invalid JSON in request body',
    };
  }
}