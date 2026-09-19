"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enviarMensagemChat } from "@/lib/api";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [quickInput, setQuickInput] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState("Ex: Gastei 45 no almoço...");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const texto = quickInput.trim();
    if (!texto || isSubmitting) return;

    setIsSubmitting(true);
    setQuickInput("");
    setInputPlaceholder("Processando com IA no Guará...");

    try {
      const resp = await enviarMensagemChat(texto);
      setInputPlaceholder(resp.mensagem || "Registrado com sucesso!");
      // Atualiza a página atual para refletir os novos dados
      router.refresh();
    } catch (err: any) {
      setInputPlaceholder("⚠️ " + (err.message || "Erro ao conectar com o backend."));
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setInputPlaceholder("Ex: Gastei 45 no almoço...");
      }, 4000);
    }
  };

  const navItems = [
    { label: "Início", href: "/", icon: "account_balance_wallet" },
    { label: "Extrato", href: "/extrato", icon: "receipt_long" },
    { label: "Cartões", href: "/cartoes", icon: "credit_card" },
    { label: "Investimentos", href: "/investimentos", icon: "trending_up" },
  ];

  return (
    <div className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none">
      <div className="px-4 pb-5 flex flex-col gap-2 w-full max-w-md mx-auto">
        {/* Campo de comando rápido com IA */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl p-1.5 pl-4 rounded-[18px] border border-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#737373] text-[18px]">
            mic
          </span>
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
          <Button
            size="icon"
            onClick={() => handleQuickSubmit()}
            disabled={isSubmitting}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-[18px] bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isSubmitting ? "hourglass_top" : "arrow_upward"}
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
  );
}
