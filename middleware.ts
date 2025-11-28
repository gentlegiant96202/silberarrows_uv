import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
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

  // === AUTHENTICATION CHECK ===
  // Skip auth check for public routes
  const publicRoutes = [
    '/login',
    '/signup',
    '/reset-password',
    '/update-password',
    '/deprecated',
    '/auth/callback',
    '/dubizzle',        // Public dubizzle pages (e.g., /dubizzle/servicecare)
    '/business-card',   // Public business card pages
    '/leasing/showroom', // Public leasing showroom (includes /leasing/showroom/[vehicleId])
    '/uv/showroom'       // Public UV showroom (includes /uv/showroom/[carId])
  ];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Skip auth check for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|ttf|woff|woff2|css|js|json|xml|txt)$/) ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js') || // Service worker
    pathname.startsWith('/workbox') ||
    isPublicRoute
  ) {
    // Add no-cache headers for public routes to prevent caching issues
    const response = NextResponse.next();
    if (isPublicRoute && !pathname.startsWith('/api/')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    return response;
  }

  // Check for Supabase authentication from cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  try {
    // Look for Supabase auth cookie (matching storageKey in supabaseClient.ts)
    const authCookie = request.cookies.get('sb-auth-token');
    if (!authCookie || !authCookie.value) {
      // No auth cookie found - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Parse the session from the cookie
    let session;
    try {
      session = JSON.parse(decodeURIComponent(authCookie.value));
    } catch (parseError) {
      // If parsing fails, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if we have a valid access token
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Create Supabase client to verify the token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Verify the session is valid
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      // Invalid or expired session - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated - allow access
    return NextResponse.next();
  } catch (error) {
    // On error, redirect to login to be safe
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths - we handle exclusions in the middleware function
     */
    '/(.*)',
  ],
};
