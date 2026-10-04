'use server';

import { redirect } from 'next/navigation';
import { assinarTokenSessao, salvarSessaoCookie, encerrarSessao } from '@/lib/auth';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';
const API_SECRET_KEY =
  process.env.API_SECRET_KEY ||
  (process.env.NODE_ENV !== 'production'
    ? 'guara-ia-chave-secreta-padrao-dev-32chars!'
    : '');

interface RespostaLogin {
  sucesso: boolean;
  erro?: string;
}

/**
 * Autentica o usuário pelo PIN / Senha mestra.
 */
export async function loginComPinAction(
  pin: string,
  lembrar: boolean = true
): Promise<RespostaLogin> {
  const pinInformado = (pin || '').trim();
  const pinConfigurado = (process.env.APP_PIN || process.env.APP_PASSWORD || '123456').trim();

  if (!pinInformado) {
    return { sucesso: false, erro: 'Por favor, informe seu PIN ou senha.' };
  }

  if (pinInformado !== pinConfigurado) {
    return { sucesso: false, erro: 'PIN ou senha incorreta.' };
  }

  const token = await assinarTokenSessao('pin', Boolean(lembrar));
  await salvarSessaoCookie(token, Boolean(lembrar));

  return { sucesso: true };
}

/**
 * Autentica o usuário trocando o token do link mágico do Telegram por uma sessão.
 */
export async function loginComTelegramTokenAction(
  tokenTelegram: string,
  lembrar: boolean = true
): Promise<RespostaLogin> {
  const tokenLimpo = (tokenTelegram || '').trim();
  if (!tokenLimpo) {
    return { sucesso: false, erro: 'Token de login ausente.' };
  }

  try {
    const res = await fetch(`${CORE_API_URL}/api/auth/telegram-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_SECRET_KEY}`,
      },
      body: JSON.stringify({ token: tokenLimpo }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const dados = await res.json().catch(() => ({}));
      return {
        sucesso: false,
        erro: dados.mensagem || 'Link de login inválido, expirado ou já utilizado.',
      };
    }

    const token = await assinarTokenSessao('telegram', Boolean(lembrar));
    await salvarSessaoCookie(token, Boolean(lembrar));

    return { sucesso: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sucesso: false,
      erro: `Falha de conexão com o backend: ${msg}`,
    };
  }
}

/**
 * Encerra a sessão atual e redireciona para a tela de login.
 */
export async function logoutAction(): Promise<void> {
  await encerrarSessao();
  redirect('/login');
}
