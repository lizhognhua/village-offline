import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  const user = req.auth?.user;
  const isLoggedIn = !!(user?.id);
  const role = (user as any)?.role;
  const isOnDashboard = pathname.startsWith('/dashboard');
  const isOnAdmin = pathname.startsWith('/admin');
  const isOnLogin = pathname === '/login';

  // Redirect /records and /condolences to /visits
  if (pathname.startsWith('/records') || pathname.startsWith('/condolences')) {
    var newPath = pathname.replace(/^\/records/, '/visits').replace(/^\/condolences/, '/visits');
    return NextResponse.redirect(new URL(newPath, req.nextUrl));
  }

  // Admin area: only admin can access
  if (isOnAdmin && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  if (isOnAdmin && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // Dashboard: any logged-in user
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/', '/dashboard/:path*', '/admin/:path*',
    '/login',
    '/records', '/records/:path*',
    '/condolences', '/condolences/:path*',
  ],
};
