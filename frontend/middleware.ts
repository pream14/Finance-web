import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth pages, API routes, static assets, and the root redirect
  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-icon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Read the role cookie AND auth token cookie
  const userRole = request.cookies.get('user_role')?.value;
  const authToken = request.cookies.get('auth_token')?.value;

  // SECURITY: Both cookies must be present.
  // user_role alone can be spoofed via DevTools.
  // auth_token proves the user actually logged in through the proper flow.
  if (!userRole || !authToken) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes: only allow admin/owner role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'owner') {
      const collectorUrl = new URL('/collector/dashboard', request.url);
      return NextResponse.redirect(collectorUrl);
    }
  }

  // Super Admin routes: only allow owner role
  if (pathname.startsWith('/superadmin')) {
    if (userRole !== 'owner') {
      const adminUrl = new URL('/admin/dashboard', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  // Collector routes: only allow employee/collector role
  if (pathname.startsWith('/collector')) {
    if (userRole !== 'employee' && userRole !== 'collector') {
      const adminUrl = new URL('/admin/dashboard', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon files, apple-icon
     */
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)',
  ],
};
