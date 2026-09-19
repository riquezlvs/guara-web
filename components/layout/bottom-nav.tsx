"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enviarMensagemChat, interpretarTransacao, TransactionDraft, ChatResponse } from "@/lib/api";
import { ReviewModal } from "@/components/transaction/review-modal";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [quickInput, setQuickInput] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState("Ex: Gastei 45 no almoço...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [audioDurationSecs, setAudioDurationSecs] = useState(4);
  const [reviewDraft, setReviewDraft] = useState<TransactionDraft | null>(null);
  const [popupData, setPopupData] = useState<{
    visible: boolean;
    sucesso: boolean;
    mensagem: string;
    dados?: Record<string, any>;
    tipo?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioStartTimeRef = useRef<number | null>(null);

  // Escuta evento personalizado para preencher prompt (vindo de botões de sugestão)
  useEffect(() => {
    const handleSetPrompt = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setQuickInput(custom.detail);
        setUsedVoice(false);
      }
    };
    window.addEventListener("guara:set-prompt", handleSetPrompt);
    return () => {
      window.removeEventListener("guara:set-prompt", handleSetPrompt);
    };
  }, []);

  // Inicializa suporte ao reconhecimento de áudio/fala (Web Speech API)
  const toggleListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPopupData({
        visible: true,
        sucesso: false,
        mensagem: "Reconhecimento de áudio não é suportado pelo seu navegador atual. Você pode digitar sua despesa normalmente no campo de texto.",
      });
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      if (audioStartTimeRef.current) {
        const sec = Math.max(1, Math.round((Date.now() - audioStartTimeRef.current) / 1000));
        setAudioDurationSecs(sec);
      }
      setInputPlaceholder("Ex: Gastei 45 no almoço...");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setUsedVoice(true);
        audioStartTimeRef.current = Date.now();
        setInputPlaceholder("Ouvindo... Pode falar agora!");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setQuickInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Erro no reconhecimento de voz:", event.error);
        setIsListening(false);
        setInputPlaceholder("Ex: Gastei 45 no almoço...");
      };

      recognition.onend = () => {
        setIsListening(false);
        if (audioStartTimeRef.current) {
          const sec = Math.max(1, Math.round((Date.now() - audioStartTimeRef.current) / 1000));
          setAudioDurationSecs(sec);
        }
        setInputPlaceholder("Ex: Gastei 45 no almoço...");
      };

      recognition.start();
    } catch (err) {
      console.warn("Falha ao iniciar reconhecimento de voz:", err);
      setIsListening(false);
      setInputPlaceholder("Ex: Gastei 45 no almoço...");
    }
  };

  const handleQuickSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (audioStartTimeRef.current) {
        const sec = Math.max(1, Math.round((Date.now() - audioStartTimeRef.current) / 1000));
        setAudioDurationSecs(sec);
      }
    }

    const texto = quickInput.trim();
    if (!texto || isSubmitting) return;

    const isAudio = usedVoice;
    const durSecs = audioDurationSecs;

    setIsSubmitting(true);
    setQuickInput("");
    setUsedVoice(false);
    setInputPlaceholder("Analisando com IA...");

    try {
      // 1. Tenta interpretar como preview de transação para a tela intermediária
      const previewResp = await interpretarTransacao(texto, isAudio, durSecs);
      if (previewResp.sucesso && previewResp.dados) {
        setReviewDraft(previewResp.dados);
        return;
      }

      // 2. Se for uma consulta informativa, resumo ou outro tipo de comando
      const resp: ChatResponse = await enviarMensagemChat(texto);
      setPopupData({
        visible: true,
        sucesso: resp.sucesso,
        mensagem: resp.mensagem || "Processado com sucesso!",
        dados: resp.dados,
        tipo: resp.tipo,
      });

      window.dispatchEvent(new CustomEvent("finances:refresh", { detail: resp }));
      router.refresh();
    } catch (err: any) {
      setPopupData({
        visible: true,
        sucesso: false,
        mensagem: err.message || "Erro ao conectar com o serviço do Guará IA.",
      });
    } finally {
      setIsSubmitting(false);
      setInputPlaceholder("Ex: Gastei 45 no almoço...");
    }
  };

  const navItems = [
    { label: "Início", href: "/", icon: "account_balance_wallet" },
    { label: "Extrato", href: "/extrato", icon: "receipt_long" },
    { label: "Cartões", href: "/cartoes", icon: "credit_card" },
    { label: "Investimentos", href: "/investimentos", icon: "trending_up" },
  ];

  return (
    <>
      {/* Tela Intermediária de Revisão e Confirmação de Lançamento */}
      {reviewDraft && (
        <ReviewModal
          draft={reviewDraft}
          isOpen={Boolean(reviewDraft)}
          onClose={() => setReviewDraft(null)}
          onSuccess={(mensagem) => {
            setPopupData({
              visible: true,
              sucesso: true,
              mensagem,
            });
            window.dispatchEvent(new CustomEvent("finances:refresh"));
            router.refresh();
          }}
        />
      )}

      {/* Modal / Popup de Confirmação de Cadastro */}
      {popupData?.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-[22px] flex items-center justify-center shrink-0 ${
                  popupData.sucesso ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {popupData.sucesso ? "check_circle" : "error"}
                </span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                  {popupData.sucesso ? "Lançamento Cadastrado!" : "Não foi possível cadastrar"}
                </h3>
                <span className="text-[12px] text-[#737373]">
                  {popupData.sucesso ? "Processado e salvo com Inteligência Artificial" : "Aviso do sistema"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-[18px] bg-[#fafafa] border border-black/[0.04] text-[13px] text-[#0a0a0a] leading-relaxed">
              {popupData.mensagem}
            </div>

            {popupData.dados && (popupData.dados.valor || popupData.dados.descricao) && (
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {popupData.dados.descricao && (
                  <div className="p-2.5 rounded-[14px] bg-[#f5f5f5]/60 flex flex-col">
                    <span className="text-[#737373] text-[10px] uppercase font-medium">Descrição</span>
                    <span className="font-semibold text-[#0a0a0a] truncate">{popupData.dados.descricao}</span>
                  </div>
                )}
                {popupData.dados.valor !== undefined && (
                  <div className="p-2.5 rounded-[14px] bg-[#f5f5f5]/60 flex flex-col">
                    <span className="text-[#737373] text-[10px] uppercase font-medium">Valor</span>
                    <span className="font-semibold text-emerald-700">
                      R$ {Number(popupData.dados.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {popupData.dados.categoria && (
                  <div className="p-2.5 rounded-[14px] bg-[#f5f5f5]/60 flex flex-col">
                    <span className="text-[#737373] text-[10px] uppercase font-medium">Categoria</span>
                    <span className="font-semibold text-[#0a0a0a] truncate">{popupData.dados.categoria}</span>
                  </div>
                )}
                {(popupData.dados.cartao || popupData.dados.metodo) && (
                  <div className="p-2.5 rounded-[14px] bg-[#f5f5f5]/60 flex flex-col">
                    <span className="text-[#737373] text-[10px] uppercase font-medium">Forma</span>
                    <span className="font-semibold text-[#0a0a0a] truncate">
                      {popupData.dados.cartao || popupData.dados.metodo}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {popupData.sucesso && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPopupData(null);
                    router.push("/extrato");
                  }}
                  className="flex-1 h-10 rounded-[18px] text-[13px] font-medium border-black/10 hover:bg-[#fafafa]"
                >
                  Ver no Extrato
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setPopupData(null)}
                className="flex-1 h-10 rounded-[18px] bg-black text-white text-[13px] font-medium hover:bg-neutral-800"
              >
                {popupData.sucesso ? "Entendido" : "Fechar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barra Inferior com Entrada Rápida de Texto e Áudio */}
      {!pathname.includes("/editar") && !pathname.includes("/dividir") && !pathname.includes("/novo") && (
        <div className="fixed bottom-0 w-full z-40 pb-safe pointer-events-none">
          <div className="px-4 pb-5 flex flex-col gap-2 w-full max-w-md mx-auto">
            {/* Campo de comando rápido com IA */}
            <div className="pointer-events-auto bg-white/95 backdrop-blur-xl p-1.5 pl-3 rounded-[20px] border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex items-center gap-2">
              {/* Botão de Áudio / Microfone */}
              <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Parar de ouvir" : "Falar despesa por áudio"}
              className={`w-8 h-8 rounded-[16px] flex items-center justify-center transition-all ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                  : "text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isListening ? "mic" : "mic"}
              </span>
            </button>

            {/* Input de Texto */}
            <Input
              className="flex-1 bg-transparent border-0 shadow-none text-[#0a0a0a] placeholder-[#737373] text-[13px] h-8 p-0 focus-visible:ring-0"
              placeholder={inputPlaceholder}
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickSubmit();
              }}
            />

            {/* Botão de Envio para IA */}
            <Button
              size="icon"
              onClick={() => handleQuickSubmit()}
              disabled={isSubmitting || (!quickInput.trim() && !isListening)}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-[18px] bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-40"
            >
              <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? "animate-spin" : ""}`}>
                {isSubmitting ? "progress_activity" : "arrow_upward"}
              </span>
            </Button>
          </div>

          {/* Menu de Abas */}
          <nav className="pointer-events-auto bg-white/95 backdrop-blur-xl px-2 py-1.5 rounded-[24px] border border-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.07)] flex items-center justify-between">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[18px] transition-colors min-h-[44px] ${
                    isActive
                      ? "bg-[#fafafa] text-[#0a0a0a] font-medium border border-black/5 shadow-xs"
                      : "text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span className="text-[11px] mt-0.5">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      )}
    </>
  );
}
