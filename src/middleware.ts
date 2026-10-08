import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // If the user visits using a domain that contains 'sentscent' 
  // (e.g., sentscent.vercel.app, or sentscent.com)
  if (hostname.toLowerCase().includes('sentscent')) {
    // And they are visiting the root path '/'
    if (url.pathname === '/') {
      // Rewrite the URL to serve the /presentation page seamlessly
      // (The URL in the browser remains the same, but serves the presentation content)
      return NextResponse.rewrite(new URL('/presentation', request.url));
    }
  }

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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
