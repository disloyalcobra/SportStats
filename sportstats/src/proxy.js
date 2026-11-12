import { NextResponse } from 'next/server';

// Chequeo optimista: solo verifica que exista la cookie de sesión.
// La validación real (token en BD) la hace cada Route Handler con requireUser().
const SESSION_COOKIE = 'ss_session';
const PUBLIC_PAGES = ['/login', '/registro'];

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PAGES.includes(pathname);

  if (!hasSession && !isPublic) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Solo páginas: se excluyen API, estáticos y archivos con extensión.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
