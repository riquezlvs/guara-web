import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { NOME_COOKIE_SESSAO, verificarTokenSessao } from './lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora arquivos internos do Next.js e assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|json)$/)
  ) {
    return NextResponse.next();
  }

  const cookieSessao = request.cookies.get(NOME_COOKIE_SESSAO)?.value;
  const sessaoValida = await verificarTokenSessao(cookieSessao);

  const estaNaTelaLogin = pathname === '/login';

  // Se já está logado e tentou abrir /login, manda para a tela inicial
  if (estaNaTelaLogin) {
    if (sessaoValida) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Se não está logado e tentou acessar qualquer rota protegida, redireciona para /login
  if (!sessaoValida) {
    const urlLogin = new URL('/login', request.url);
    return NextResponse.redirect(urlLogin);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
