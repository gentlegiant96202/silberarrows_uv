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
    
    // Allow static assets to load normally (images, fonts, etc.)
    if (pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|ttf|woff|woff2|css|js)$/)) {
      return NextResponse.next();
    }
    
    // Allow Next.js internal routes
    if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    
    // Redirect all other UV domain traffic to the deprecated page
    return NextResponse.rewrite(new URL('/deprecated', request.url));
  }

  // For all other domains (including portal.silberarrows.com and localhost), continue normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths - we handle exclusions in the middleware function
     */
    '/(.*)',
  ],
};
