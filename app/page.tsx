"use client";

import { useState, useEffect, useCallback } from "react";
import { enviarMensagemChat, obterDashboard, DashboardResponse } from "@/lib/api";

export default function Home() {
  const [quickInput, setQuickInput] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState(
    "Ex: Gastei 45 no almoço..."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse['data'] | null>(null);
  const [activeTab, setActiveTab] = useState<
    "inicio" | "investimentos" | "cartoes" | "perfil"
  >("inicio");

  const carregarDashboard = useCallback(async () => {
    try {
      const resp = await obterDashboard();
      if (resp.sucesso && resp.data) {
        setDashboardData(resp.data);
      }
    } catch (err) {
      console.warn("Backend não conectado ou offline no momento:", err);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const handleFillPrompt = (text: string) => {
    setQuickInput(text);
  };

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
      await carregarDashboard();
    } catch (err: any) {
      setInputPlaceholder("⚠️ " + (err.message || "Erro ao conectar com o backend."));
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setInputPlaceholder("Ex: Gastei 45 no almoço...");
      }, 4000);
    }
  };

  return (
    <div className="bg-[#f5f5f5] text-[#0a0a0a] min-h-screen flex flex-col font-sans antialiased selection:bg-[#e2e2e2]">
      {/* Header Fixo com suporte a Safe Area */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-[#f5f5f5]/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-14 px-4 max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e7000b] animate-pulse"></span>
            <span className="text-[14px] text-[#0a0a0a] font-semibold tracking-tight">
              Guará IA
            </span>
            <span className="uppercase text-[#737373] px-1.5 py-0.5 rounded-[6px] bg-[#ffffff] shadow-[0_0_0_1px_rgba(23,23,23,0.06)] font-mono text-[10px]">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-[#737373] hidden sm:inline-block tracking-wider uppercase mr-1">
              Início
            </span>
            <div className="w-8 h-8 rounded-full bg-[#000000] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ffffff] text-[18px]">
                person
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com scroll e padding otimizado para navegação móvel */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-48 px-4 max-w-md mx-auto">
        <div className="flex flex-col w-full gap-5">
          {/* Safe-to-Spend Header Block */}
          <section className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
                Saldo Safe-to-Spend
              </span>
              <span className="inline-flex items-center gap-1 text-[#737373] text-[12px]">
                <span className="material-symbols-outlined text-[14px]">
                  lock_clock
                </span>
                {dashboardData?.saldo?.safeSummary ? "Sincronizado" : "Protegido"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-[36px] text-[#0a0a0a] font-semibold tracking-[-0.03em] leading-none">
                {dashboardData?.saldo?.safeSummary?.safeToSpend !== undefined
                  ? `R$ ${dashboardData.saldo.safeSummary.safeToSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "R$ 4.250,00"}
              </h1>
            </div>
            <p className="text-[12px] text-[#737373]">
              {dashboardData?.saldo?.safeSummary
                ? `Conta: ${dashboardData.saldo.safeSummary.accountName} • Faturas abertas: R$ ${dashboardData.saldo.safeSummary.openCreditInvoices.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "Disponível no ciclo atual • Integrado via Guará IA"}
            </p>
          </section>

          {/* Natural Language Quick Entry Card */}
          <section className="bg-[#ffffff] p-3 rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-2.5">
            <form
              onSubmit={handleQuickSubmit}
              className="flex items-center gap-2 bg-[#f5f5f5] px-3 py-1.5 rounded-[18px]"
            >
              <span className="material-symbols-outlined text-[#737373] text-[18px]">
                spark
              </span>
              <input
                className="flex-1 bg-transparent text-[#0a0a0a] placeholder-[#737373] text-[13px] focus:outline-none"
                id="quick-expense-input"
                placeholder={inputPlaceholder}
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
              />
              <button
                type="submit"
                aria-label="Registrar gasto via IA"
                className="w-8 h-8 rounded-[18px] bg-[#0a0a0a] text-[#ffffff] flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform shrink-0"
                id="quick-expense-btn"
              >
                <span className="material-symbols-outlined text-[16px]">
                  arrow_upward
                </span>
              </button>
            </form>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                className="whitespace-nowrap px-3 py-1 bg-[#fafafa] text-[#0a0a0a] rounded-[18px] text-[12px] uppercase tracking-[0.05em] shadow-[0_0_0_1px_rgba(23,23,23,0.05)] active:scale-95 transition-all font-medium"
                onClick={() => handleFillPrompt("Almoço R$ 38")}
              >
                + Almoço R$ 38
              </button>
              <button
                type="button"
                className="whitespace-nowrap px-3 py-1 bg-[#fafafa] text-[#0a0a0a] rounded-[18px] text-[12px] uppercase tracking-[0.05em] shadow-[0_0_0_1px_rgba(23,23,23,0.05)] active:scale-95 transition-all font-medium"
                onClick={() => handleFillPrompt("Uber R$ 24")}
              >
                + Uber R$ 24
              </button>
              <button
                type="button"
                className="whitespace-nowrap px-3 py-1 bg-[#fafafa] text-[#0a0a0a] rounded-[18px] text-[12px] uppercase tracking-[0.05em] shadow-[0_0_0_1px_rgba(23,23,23,0.05)] active:scale-95 transition-all font-medium"
                onClick={() => handleFillPrompt("Pix recebido")}
              >
                + Pix recebido
              </button>
            </div>
          </section>

          {/* Consolidated Net Worth Card */}
          <section className="bg-[#ffffff] p-5 rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
                  Patrimônio Líquido
                </span>
                <span className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight">
                  R$ 68.450,00
                </span>
              </div>
              <div className="w-8 h-8 rounded-[18px] bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a]">
                <span className="material-symbols-outlined text-[18px]">
                  account_balance
                </span>
              </div>
            </div>

            {/* Assets vs Liabilities Split */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col p-3 rounded-[18px] bg-[#fafafa] shadow-[0_0_0_1px_rgba(23,23,23,0.04)]">
                <span className="text-[12px] text-[#737373] uppercase tracking-wide font-medium">
                  Ativos
                </span>
                <span className="text-[14px] text-[#0a0a0a] font-medium mt-0.5">
                  R$ 74.200,00
                </span>
                <div className="flex flex-col gap-1 mt-2 text-[#737373] text-[12px]">
                  <span className="truncate">Nubank: R$ 4.250</span>
                  <span className="truncate">Caixinhas: R$ 42.000</span>
                  <span className="truncate">R. Fixa: R$ 27.950</span>
                </div>
              </div>
              <div className="flex flex-col p-3 rounded-[18px] bg-[#fafafa] shadow-[0_0_0_1px_rgba(23,23,23,0.04)]">
                <span className="text-[12px] text-[#737373] uppercase tracking-wide font-medium">
                  Passivos
                </span>
                <span className="text-[14px] text-[#0a0a0a] font-medium mt-0.5">
                  -R$ 5.750,00
                </span>
                <div className="flex flex-col gap-1 mt-2 text-[#737373] text-[12px]">
                  <span className="truncate">Fatura: R$ 3.850</span>
                  <span className="truncate">Parcelado: R$ 1.900</span>
                </div>
              </div>
            </div>

            {/* Minimalist Liquidity Bar */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between items-center text-[#737373] text-[12px]">
                <span className="uppercase tracking-wider font-medium">
                  Índice de Liquidez
                </span>
                <span className="font-medium text-[#0a0a0a]">78% Alta</span>
              </div>
              <div className="w-full h-1.5 bg-[#f5f5f5] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#0a0a0a] rounded-full"
                  style={{ width: "78%" }}
                ></div>
              </div>
              <div className="flex justify-between text-[#737373] font-mono text-[10px] tracking-tight">
                <span>R$ 46.250 D+0</span>
                <span>R$ 27.950 D+30</span>
              </div>
            </div>
          </section>

          {/* Caixinhas & Metas Card */}
          <section className="bg-[#ffffff] p-5 rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-[#0a0a0a]">
                  Reserva de Emergência
                </span>
                <span className="px-2 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#171717] text-[12px] uppercase tracking-[0.05em] shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
                  100% CDI
                </span>
              </div>
              <span className="material-symbols-outlined text-[#737373] text-[18px]">
                savings
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[18px] font-semibold text-[#0a0a0a]">
                  R$ 42.000,00
                </span>
                <span className="text-[12px] text-[#737373]">
                  Meta: R$ 50.000 (84%)
                </span>
              </div>
              {/* Linear Track */}
              <div className="w-full h-1 bg-[#f5f5f5] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#0a0a0a] rounded-full"
                  style={{ width: "84%" }}
                ></div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]"></span>
                <span className="text-[12px] text-[#737373]">
                  +R$ 384,12 acumulado este mês
                </span>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] hover:bg-[#e2e2e2] active:scale-95 text-[13px] font-medium transition-all shadow-[0_0_0_1px_rgba(23,23,23,0.05)]"
              >
                Adicionar aporte
              </button>
            </div>
          </section>

          {/* Recent Expenses Feed */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
                Atividades Recentes
              </span>
              <a
                className="text-[12px] text-[#0a0a0a] font-medium tracking-wide"
                href="#extrato"
              >
                Ver extrato
              </a>
            </div>
            <div className="bg-[#ffffff] rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
              {/* Item 1 */}
              <div className="p-4 flex items-center justify-between hover:bg-[#fafafa]/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[18px] bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      restaurant
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-[#0a0a0a] truncate">
                        Restaurante Da Silva
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[18px] bg-[#f5f5f5] text-[#737373] text-[10px] tracking-tight uppercase">
                        Alimentação
                      </span>
                    </div>
                    <span className="text-[12px] text-[#737373]">
                      Hoje, 13:24 via Débito
                    </span>
                  </div>
                </div>
                <span className="text-[14px] font-semibold text-[#0a0a0a] whitespace-nowrap pl-2">
                  -R$ 45,00
                </span>
              </div>
              <div className="h-px w-full bg-[#e5e5e5]"></div>

              {/* Item 2 */}
              <div className="p-4 flex items-center justify-between hover:bg-[#fafafa]/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[18px] bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      local_gas_station
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-[#0a0a0a] truncate">
                        Posto Ipiranga
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[18px] bg-[#f5f5f5] text-[#737373] text-[10px] tracking-tight uppercase">
                        Transporte
                      </span>
                    </div>
                    <span className="text-[12px] text-[#737373]">
                      Ontem, 19:10 via Crédito
                    </span>
                  </div>
                </div>
                <span className="text-[14px] font-semibold text-[#0a0a0a] whitespace-nowrap pl-2">
                  -R$ 180,00
                </span>
              </div>
              <div className="h-px w-full bg-[#e5e5e5]"></div>

              {/* Item 3 */}
              <div className="p-4 flex items-center justify-between hover:bg-[#fafafa]/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-[18px] bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">
                      payments
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-[#0a0a0a] truncate">
                        Transferência Recebida
                      </span>
                      <span className="px-1.5 py-0.2 rounded-[18px] bg-[#f5f5f5] text-[#737373] text-[10px] tracking-tight uppercase">
                        Receita
                      </span>
                    </div>
                    <span className="text-[12px] text-[#737373]">
                      24 Out via Pix
                    </span>
                  </div>
                </div>
                <span className="text-[14px] font-semibold text-[#0a0a0a] whitespace-nowrap pl-2">
                  +R$ 1.200,00
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Floating Bottom Bar (Entrada Rápida + Navigation Bar Mobile First) */}
      <div className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none">
        <div className="px-4 pb-5 flex flex-col gap-2 w-full max-w-md mx-auto">
          {/* Campo de voz/comando rápido fixo inferior */}
          <div className="pointer-events-auto bg-[#ffffff]/95 backdrop-blur-xl p-1.5 pl-4 rounded-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(23,23,23,0.06)] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#737373] text-[18px]">
              mic
            </span>
            <input
              className="flex-1 bg-transparent text-[#0a0a0a] placeholder-[#737373] text-[13px] focus:outline-none"
              placeholder="Ex: Gastei 45 no almoço"
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickSubmit();
              }}
            />
            <button
              onClick={() => handleQuickSubmit()}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-[18px] bg-[#0a0a0a] text-[#ffffff] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_upward
              </span>
            </button>
          </div>

          {/* Tab Navigation Menu */}
          <nav className="pointer-events-auto bg-[#ffffff]/95 backdrop-blur-xl px-2 py-1.5 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.07),0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-between">
            <button
              onClick={() => setActiveTab("inicio")}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[18px] transition-colors min-h-[44px] ${
                activeTab === "inicio"
                  ? "bg-[#fafafa] text-[#0a0a0a] font-medium shadow-[0_0_0_1px_rgba(23,23,23,0.05)]"
                  : "text-[#737373]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                account_balance_wallet
              </span>
              <span className="text-[11px] mt-0.5">Início</span>
            </button>

            <button
              onClick={() => setActiveTab("investimentos")}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[18px] transition-colors min-h-[44px] ${
                activeTab === "investimentos"
                  ? "bg-[#fafafa] text-[#0a0a0a] font-medium shadow-[0_0_0_1px_rgba(23,23,23,0.05)]"
                  : "text-[#737373]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                trending_up
              </span>
              <span className="text-[11px] mt-0.5">Investimentos</span>
            </button>

            <button
              onClick={() => setActiveTab("cartoes")}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[18px] transition-colors min-h-[44px] ${
                activeTab === "cartoes"
                  ? "bg-[#fafafa] text-[#0a0a0a] font-medium shadow-[0_0_0_1px_rgba(23,23,23,0.05)]"
                  : "text-[#737373]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                credit_card
              </span>
              <span className="text-[11px] mt-0.5">Cartões</span>
            </button>

            <button
              onClick={() => setActiveTab("perfil")}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[18px] transition-colors min-h-[44px] ${
                activeTab === "perfil"
                  ? "bg-[#fafafa] text-[#0a0a0a] font-medium shadow-[0_0_0_1px_rgba(23,23,23,0.05)]"
                  : "text-[#737373]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                tune
              </span>
              <span className="text-[11px] mt-0.5">Perfil</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
