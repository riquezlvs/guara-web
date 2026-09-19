"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { obterDashboard, DashboardResponse } from "@/lib/api";

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse["data"] | null>(null);

  const carregarDashboard = useCallback(async () => {
    try {
      const resp = await obterDashboard();
      if (resp.sucesso && resp.data) {
        setDashboardData(resp.data);
      }
    } catch (err) {
      console.warn("Backend offline ou não conectado ao carregar dashboard:", err);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const handleFillPrompt = (text: string) => {
    // Pode emitir evento ou focar no input do bottom bar se desejado
    const input = document.querySelector('input[placeholder*="Gastei"]') as HTMLInputElement;
    if (input) {
      input.value = text;
      input.focus();
    }
  };

  return (
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

        {/* Quick Suggestion Chips */}
        <section className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => handleFillPrompt("Gastei 45 no almoço")}
            className="px-3.5 py-1.5 rounded-[18px] bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-[12px] text-[#0a0a0a] whitespace-nowrap hover:bg-[#fafafa] active:scale-95 transition-all font-medium"
          >
            🍔 Almoço R$ 45
          </button>
          <button
            type="button"
            onClick={() => handleFillPrompt("Uber 28 pro trabalho")}
            className="px-3.5 py-1.5 rounded-[18px] bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-[12px] text-[#0a0a0a] whitespace-nowrap hover:bg-[#fafafa] active:scale-95 transition-all font-medium"
          >
            🚗 Uber R$ 28
          </button>
          <button
            type="button"
            onClick={() => handleFillPrompt("Recebi 1200 de freela")}
            className="px-3.5 py-1.5 rounded-[18px] bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-[12px] text-[#0a0a0a] whitespace-nowrap hover:bg-[#fafafa] active:scale-95 transition-all font-medium"
          >
            💰 Freela R$ 1.200
          </button>
        </section>

        {/* Patrimônio Líquido & Dívidas Card */}
        <Card className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Patrimônio Líquido
            </span>
            <Badge
              variant="outline"
              className="rounded-[14px] bg-[#f5f5f5] text-[#0a0a0a] border-0 text-[11px] font-mono font-medium px-2 py-0.5"
            >
              {dashboardData?.patrimonio?.liquidAssets?.accounts
                ? `${dashboardData.patrimonio.liquidAssets.accounts.length} contas`
                : "Consolidado"}
            </Badge>
          </div>

          <div>
            <div className="text-[28px] font-semibold tracking-tight text-[#0a0a0a] leading-tight">
              {dashboardData?.patrimonio?.totalNetWorth !== undefined
                ? `R$ ${dashboardData.patrimonio.totalNetWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "R$ 68.450,00"}
            </div>
            <span className="text-[12px] text-[#737373]">
              Ativos bancários menos faturas em aberto
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#737373] uppercase tracking-wider">
                Total Ativos
              </span>
              <span className="text-[14px] font-semibold text-emerald-700">
                {dashboardData?.patrimonio?.liquidAssets?.total !== undefined
                  ? `R$ ${dashboardData.patrimonio.liquidAssets.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "R$ 71.900,00"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#737373] uppercase tracking-wider">
                Total Faturas / Dívidas
              </span>
              <span className="text-[14px] font-semibold text-rose-600">
                {dashboardData?.patrimonio?.openCreditInvoices?.total !== undefined
                  ? `R$ ${dashboardData.patrimonio.openCreditInvoices.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "R$ 3.450,00"}
              </span>
            </div>
          </div>
        </Card>

        {/* Reserva & Meta de Economia */}
        <Card className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Reserva & Metas
            </span>
            <span className="text-[11px] font-mono text-[#737373] bg-[#fafafa] px-2 py-0.5 rounded-[12px] border border-black/5">
              Automático
            </span>
          </div>

          {dashboardData?.poupanca && dashboardData.poupanca.length > 0 ? (
            (() => {
              const primeiraMeta = dashboardData.poupanca[0];
              const pct = primeiraMeta.alvo > 0 ? Math.round((primeiraMeta.poupado / primeiraMeta.alvo) * 100) : 0;
              return (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[18px] font-semibold text-[#0a0a0a]">
                        R$ {primeiraMeta.poupado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[12px] text-[#737373]">
                        Meta: R$ {primeiraMeta.alvo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({pct}%)
                      </span>
                    </div>
                    <Progress
                      value={Math.min(pct, 100)}
                      className="h-1.5 bg-[#f5f5f5] mt-1 [&>div]:bg-black"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[12px] text-[#737373]">
                        {primeiraMeta.nome}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[18px] font-semibold text-[#0a0a0a]">
                    R$ 42.000,00
                  </span>
                  <span className="text-[12px] text-[#737373]">
                    Meta: R$ 50.000 (84%)
                  </span>
                </div>
                <Progress
                  value={84}
                  className="h-1 bg-[#f5f5f5] mt-1 [&>div]:bg-black"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]"></span>
                  <span className="text-[12px] text-[#737373]">
                    Defina metas com &quot;guardar 500 para viagem&quot;
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Recent Expenses Feed */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Atividades Recentes
            </span>
            <Link
              href="/extrato"
              className="text-[12px] text-[#0a0a0a] font-medium tracking-wide hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver extrato</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <Card className="rounded-[24px] border border-black/5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden p-0 gap-0">
            {dashboardData?.recentes && dashboardData.recentes.length > 0 ? (
              dashboardData.recentes.slice(0, 5).map((item, idx) => {
                const dataFormatada = new Date(item.occurred_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const categoriaNome = item.categories?.name || "Geral";
                return (
                  <div key={item.display_id || idx}>
                    <div className="p-4 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-[18px] bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] shrink-0">
                          <span className="material-symbols-outlined text-[18px]">
                            {item.payment_method === "pix"
                              ? "payments"
                              : item.payment_method === "credit_card"
                              ? "credit_card"
                              : "receipt_long"}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-medium text-[#0a0a0a] truncate">
                              {item.description}
                            </span>
                            <Badge
                              variant="secondary"
                              className="px-1.5 py-0 text-[10px] tracking-tight uppercase bg-[#f5f5f5] text-[#737373] border-0 font-normal"
                            >
                              {categoriaNome}
                            </Badge>
                          </div>
                          <span className="text-[12px] text-[#737373]">
                            {dataFormatada} via {item.payment_method?.replace("_", " ") || "Transação"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[14px] font-semibold text-[#0a0a0a] whitespace-nowrap pl-2">
                        -R$ {Number(item.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {idx < Math.min(dashboardData.recentes!.length, 5) - 1 && (
                      <Separator className="bg-[#e5e5e5]" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-[#737373] text-[13px]">
                Nenhuma transação recente encontrada no banco de dados.
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
