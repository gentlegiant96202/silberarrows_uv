import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Check if the request is coming from the deprecated UV domain
  if (hostname === 'uv.silberarrows.com') {
    // Don't redirect if already on the deprecated page to avoid infinite loops
    if (pathname === '/deprecated') {
      return NextResponse.next();
    }
    
    // Redirect all UV domain traffic to the deprecated page
    return NextResponse.rewrite(new URL('/deprecated', request.url));
  }

  // For all other domains (including portal.silberarrows.com and localhost), continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - deprecated (avoid infinite loops)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|deprecated).*)',
  ],
};
