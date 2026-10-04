/**
 * Proxy seguro para o Core Service do Guará IA.
 *
 * Intercepta todas as chamadas /api/* feitas pelo frontend:
 * 1. Valida se o usuário possui sessão ativa (cookie guara_session).
 * 2. Em caso positivo, injeta o cabeçalho Authorization: Bearer <API_SECRET_KEY>
 *    no servidor e repassa a chamada para o backend (CORE_API_URL).
 * 3. O navegador NUNCA tem acesso à API_SECRET_KEY.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { NOME_COOKIE_SESSAO, verificarTokenSessao } from '@/lib/auth';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';
const API_SECRET_KEY = process.env.API_SECRET_KEY || '';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function handleProxyRequest(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { path } = await context.params;
  const caminhoApi = (path || []).join('/');

  // Rotas públicas de autenticação repassam direto
  const ehRotaPublicaAuth = caminhoApi === 'auth/telegram-verify';

  if (!ehRotaPublicaAuth) {
    const cookieStore = await cookies();
    const tokenSessao = cookieStore.get(NOME_COOKIE_SESSAO)?.value;
    const sessaoValida = await verificarTokenSessao(tokenSessao);

    if (!sessaoValida) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Não autorizado. Faça login primeiro.' },
        { status: 401 }
      );
    }
  }

  const urlDestino = new URL(`/api/${caminhoApi}`, CORE_API_URL);
  // Preserva query parameters
  request.nextUrl.searchParams.forEach((valor, chave) => {
    urlDestino.searchParams.set(chave, valor);
  });

  const headersEnvio = new Headers();
  request.headers.forEach((valor, chave) => {
    // Não encaminha headers de host ou cookie direto ao backend
    if (!['host', 'connection', 'content-length'].includes(chave.toLowerCase())) {
      headersEnvio.set(chave, valor);
    }
  });

  // Injeta o segredo no servidor
  if (API_SECRET_KEY) {
    headersEnvio.set('Authorization', `Bearer ${API_SECRET_KEY}`);
  }

  try {
    const corpoRequisicao = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.arrayBuffer();

    const respostaBackend = await fetch(urlDestino.toString(), {
      method: request.method,
      headers: headersEnvio,
      body: corpoRequisicao,
      cache: 'no-store',
    });

    const headersResposta = new Headers();
    respostaBackend.headers.forEach((valor, chave) => {
      if (!['transfer-encoding', 'connection'].includes(chave.toLowerCase())) {
        headersResposta.set(chave, valor);
      }
    });

    const dadosResposta = await respostaBackend.arrayBuffer();

    return new NextResponse(dadosResposta, {
      status: respostaBackend.status,
      headers: headersResposta,
    });
  } catch (err: unknown) {
    const erroMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { sucesso: false, mensagem: `Falha ao conectar ao backend: ${erroMsg}` },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handleProxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return handleProxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleProxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handleProxyRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handleProxyRequest(req, ctx);
}
