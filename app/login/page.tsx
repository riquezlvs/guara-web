'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginComPinAction, loginComTelegramTokenAction } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [pin, setPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [validandoToken, setValidandoToken] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Se a URL tiver um token mágico gerado pelo Telegram, valida automaticamente
  useEffect(() => {
    if (!tokenParam) return;

    let ativo = true;
    setValidandoToken(true);
    setErro(null);

    loginComTelegramTokenAction(tokenParam, true)
      .then((res) => {
        if (!ativo) return;
        if (res.sucesso) {
          router.replace('/');
          router.refresh();
        } else {
          setErro(res.erro || 'Link de login inválido ou expirado.');
          setValidandoToken(false);
        }
      })
      .catch((err: unknown) => {
        if (!ativo) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErro(`Erro ao validar link: ${msg}`);
        setValidandoToken(false);
      });

    return () => {
      ativo = false;
    };
  }, [tokenParam, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErro('Digite seu PIN ou senha mestra.');
      return;
    }

    setErro(null);
    startTransition(async () => {
      const res = await loginComPinAction(pin, lembrar);
      if (res.sucesso) {
        router.replace('/');
        router.refresh();
      } else {
        setErro(res.erro || 'PIN incorreto. Tente novamente.');
      }
    });
  };

  if (validandoToken) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-black/5 shadow-sm max-w-sm w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[28px] animate-spin text-[#e7000b]">
            progress_activity
          </span>
        </div>
        <h2 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
          Entrando pelo Telegram...
        </h2>
        <p className="text-[13px] text-[#737373] mt-1.5 leading-relaxed">
          Validando seu link de acesso rápido. Seu celular será conectado automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      {/* Card Principal */}
      <div className="bg-white rounded-[28px] border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-7">
        {/* Cabeçalho do App */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e7000b] animate-pulse"></span>
            <span className="text-[16px] text-[#0a0a0a] font-semibold tracking-tight">
              Guará IA
            </span>
          </div>
          <Badge
            variant="outline"
            className="px-2 py-0.5 rounded-[6px] bg-neutral-50 text-[#737373] border-black/10 font-mono text-[10px] uppercase font-medium"
          >
            Acesso Seguro
          </Badge>
        </div>

        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[#0a0a0a] tracking-tight">
            Entrar no App
          </h1>
          <p className="text-[13px] text-[#737373] mt-1 leading-relaxed">
            Seus dados financeiros protegidos contra acessos não autorizados.
          </p>
        </div>

        {erro && (
          <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2.5 text-[12px] text-red-700 animate-in fade-in duration-150">
            <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0">
              error
            </span>
            <span className="leading-tight pt-0.5">{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pin-input"
              className="block text-[12px] font-medium text-[#737373] uppercase tracking-wider mb-2"
            >
              PIN ou Senha Mestra
            </label>
            <div className="relative">
              <Input
                id="pin-input"
                type={mostrarPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="Digite seu PIN ou senha"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isPending}
                className="h-12 px-4 pr-11 text-[15px] rounded-2xl border-black/10 focus-visible:ring-black/20"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostrarPin(!mostrarPin)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {mostrarPin ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Opção Lembrar deste aparelho */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
              className="w-4 h-4 rounded text-black border-black/20 focus:ring-black accent-black cursor-pointer"
            />
            <span className="text-[13px] text-[#525252]">
              Lembrar deste celular (não pedir senha)
            </span>
          </label>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-2xl bg-black text-white hover:bg-neutral-800 text-[14px] font-medium shadow-sm transition-all active:scale-[0.98] mt-2"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                Acessando...
              </span>
            ) : (
              'Entrar no Painel'
            )}
          </Button>
        </form>
      </div>

      {/* Cartão de Ajuda: Login via Telegram */}
      <div className="mt-4 p-4 rounded-2xl bg-neutral-100/70 border border-black/[0.03] text-center">
        <p className="text-[12px] text-[#737373]">
          Prefere entrar sem digitar senha?
        </p>
        <p className="text-[12px] text-[#0a0a0a] font-medium mt-0.5">
          Envie <code className="px-1.5 py-0.5 rounded bg-white border border-black/5 font-mono text-[11px]">/login_web</code> para o seu bot do Telegram.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-12 bg-[#f5f5f5]">
      <Suspense
        fallback={
          <div className="p-8 text-center text-neutral-400 text-[13px]">
            Carregando...
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
