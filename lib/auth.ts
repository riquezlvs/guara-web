/**
 * Gerenciamento seguro de sessão do Guará Web.
 *
 * Utiliza tokens assinados com HMAC-SHA256 via Web Crypto API nativa.
 * Permite persistência prolongada de 90 dias (lembrar deste aparelho no celular)
 * em cookie HttpOnly com SameSite=Lax.
 */
import { cookies } from 'next/headers';

export const NOME_COOKIE_SESSAO = 'guara_session';

/** Duração da sessão: 90 dias quando 'lembrar', ou 1 dia se desmarcado. */
const DURACAO_LEMBRAR_SEGUNDOS = 90 * 24 * 60 * 60;
const DURACAO_PADRAO_SEGUNDOS = 24 * 60 * 60;

interface PayloadSessao {
  sub: string;
  metodo: 'pin' | 'telegram';
  iat: number;
  exp: number;
}

function obterChaveSecreta(): string {
  const segredo = process.env.AUTH_SECRET || process.env.API_SECRET_KEY || 'guara-ia-chave-secreta-padrao-dev-32chars!';
  return segredo;
}

async function obterCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const segredoBytes = enc.encode(obterChaveSecreta());
  return crypto.subtle.importKey(
    'raw',
    segredoBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cria um token assinado com HMAC-SHA256 contendo a expiração e o método de login.
 */
export async function assinarTokenSessao(
  metodo: 'pin' | 'telegram',
  lembrar = true
): Promise<string> {
  const agoraSegundos = Math.floor(Date.now() / 1000);
  const ttl = lembrar ? DURACAO_LEMBRAR_SEGUNDOS : DURACAO_PADRAO_SEGUNDOS;

  const payload: PayloadSessao = {
    sub: 'owner',
    metodo,
    iat: agoraSegundos,
    exp: agoraSegundos + ttl,
  };

  const enc = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(enc.encode(payloadJson));

  const key = await obterCryptoKey();
  const assinaturaBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const assinaturaB64 = base64UrlEncode(new Uint8Array(assinaturaBuffer));

  return `${payloadB64}.${assinaturaB64}`;
}

/**
 * Verifica a assinatura e a validade temporal do token de sessão.
 */
export async function verificarTokenSessao(
  token: string | undefined | null
): Promise<PayloadSessao | null> {
  if (!token || typeof token !== 'string') return null;

  const partes = token.split('.');
  if (partes.length !== 2) return null;

  const [payloadB64, assinaturaB64] = partes;
  if (!payloadB64 || !assinaturaB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await obterCryptoKey();
    const assinaturaBytes = base64UrlDecode(assinaturaB64);

    const valido = await crypto.subtle.verify(
      'HMAC',
      key,
      assinaturaBytes as unknown as BufferSource,
      enc.encode(payloadB64)
    );

    if (!valido) return null;

    const dec = new TextDecoder();
    const payloadJson = dec.decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as PayloadSessao;

    const agoraSegundos = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= agoraSegundos) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Grava o cookie HttpOnly seguro com a sessão persistente.
 */
export async function salvarSessaoCookie(
  token: string,
  lembrar = true
): Promise<void> {
  const cookieStore = await cookies();
  const maxAge = lembrar ? DURACAO_LEMBRAR_SEGUNDOS : DURACAO_PADRAO_SEGUNDOS;

  cookieStore.set(NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

/**
 * Retorna a sessão ativa a partir dos cookies da requisição.
 */
export async function obterSessaoAtual(): Promise<PayloadSessao | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE_SESSAO)?.value;
  return verificarTokenSessao(token);
}

/**
 * Invalida a sessão removendo o cookie.
 */
export async function encerrarSessao(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(NOME_COOKIE_SESSAO);
}
