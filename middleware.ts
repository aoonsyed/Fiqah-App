import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

// Protected routes that require authentication
const protectedRoutes = ['/chat-protected', '/admin'];

/**
 * Ceiling on API calls per IP across every endpoint. Individual routes set
 * tighter limits where a call is expensive (chat, search, geocoding).
 */
const API_LIMIT_PER_MINUTE = 120;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    if (!rateLimit(`api:${getClientIp(request)}`, API_LIMIT_PER_MINUTE, 60)) {
      return tooManyRequests();
    }
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Auth is enforced where it matters: admin/user API routes verify the bearer
  // token server-side (lib/admin-auth-server.ts, lib/auth-server.ts). Sessions
  // live in browser storage, not cookies, so they can't be checked here.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
