"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { obterDashboard, DashboardResponse, DashboardRecentItem } from "@/lib/api";

type RecentItemGroup = DashboardRecentItem & {
  installmentNumbers: number[];
  installmentTotal?: number;
};

function agruparAtividadesRecentes(items: DashboardRecentItem[]): RecentItemGroup[] {
  const groups = new Map<string, RecentItemGroup>();

  items.forEach((item) => {
    const hasInstallments = Boolean(item.installment_total && item.installment_total > 1);
    const category = item.categories?.name || "Geral";
    const normalizedDescription = item.description.trim().toLocaleLowerCase();
    const key = hasInstallments
      ? `installment:${normalizedDescription}:${category}:${item.payment_method}`
      : `single:${item.display_id}`;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...item,
        installmentNumbers: item.installment_number ? [item.installment_number] : [],
        installmentTotal: item.installment_total || undefined,
      });
      return;
    }

    if (item.installment_number && !current.installmentNumbers.includes(item.installment_number)) {
      current.installmentNumbers.push(item.installment_number);
    }
  });

  return Array.from(groups.values()).map((item) => ({
    ...item,
    installmentNumbers: item.installmentNumbers.sort((a, b) => a - b),
  }));
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const carregarDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await obterDashboard();
      if (resp.sucesso && resp.data) {
        setDashboardData(resp.data);
      }
    } catch (err) {
      console.warn("Backend offline ou não conectado ao carregar dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();

    const handleRefresh = () => {
      carregarDashboard();
    };
    window.addEventListener("finances:refresh", handleRefresh);
    return () => {
      window.removeEventListener("finances:refresh", handleRefresh);
    };
  }, [carregarDashboard]);

  const handleFillPrompt = (text: string) => {
    window.dispatchEvent(new CustomEvent("guara:set-prompt", { detail: text }));
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
              <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
              {isLoading ? "Sincronizando..." : "Sincronizado"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2 h-9 text-[#737373]">
                <span className="material-symbols-outlined text-[24px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[14px] font-medium text-[#737373] animate-pulse">
                  Carregando saldo...
                </span>
              </div>
            ) : (
              <h1 className="text-[36px] text-[#0a0a0a] font-semibold tracking-[-0.03em] leading-none">
                {dashboardData?.saldo?.safeSummary?.safeToSpend !== undefined
                  ? `R$ ${dashboardData.saldo.safeSummary.safeToSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "—"}
              </h1>
            )}
          </div>
          <div className="text-[12px] text-[#737373] min-h-[18px]">
            {isLoading ? (
              <span className="animate-pulse">Consultando dados no banco...</span>
            ) : dashboardData?.saldo?.safeSummary ? (
              `Conta: ${dashboardData.saldo.safeSummary.accountName} • Faturas abertas: R$ ${dashboardData.saldo.safeSummary.openCreditInvoices.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            ) : (
              "Nenhuma conta conectada"
            )}
          </div>
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
              {isLoading
                ? "..."
                : dashboardData?.patrimonio?.liquidAssets?.accounts
                ? `${dashboardData.patrimonio.liquidAssets.accounts.length} contas`
                : "Consolidado"}
            </Badge>
          </div>

          <div>
            {isLoading ? (
              <div className="flex items-center gap-2 h-8 text-[#737373]">
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[13px] font-medium text-[#737373] animate-pulse">
                  Calculando patrimônio...
                </span>
              </div>
            ) : (
              <div className="text-[28px] font-semibold tracking-tight text-[#0a0a0a] leading-tight">
                {dashboardData?.patrimonio?.totalNetWorth !== undefined
                  ? `R$ ${dashboardData.patrimonio.totalNetWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "—"}
              </div>
            )}
            <span className="text-[12px] text-[#737373]">
              Ativos bancários menos faturas em aberto
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#737373] uppercase tracking-wider">
                Total Ativos
              </span>
              <span className="text-[14px] font-semibold text-emerald-700 flex items-center min-h-[22px]">
                {isLoading ? (
                  <span className="material-symbols-outlined text-[15px] animate-spin text-[#737373]">
                    progress_activity
                  </span>
                ) : dashboardData?.patrimonio?.liquidAssets?.total !== undefined ? (
                  `R$ ${dashboardData.patrimonio.liquidAssets.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#737373] uppercase tracking-wider">
                Total Faturas / Dívidas
              </span>
              <span className="text-[14px] font-semibold text-rose-600 flex items-center min-h-[22px]">
                {isLoading ? (
                  <span className="material-symbols-outlined text-[15px] animate-spin text-[#737373]">
                    progress_activity
                  </span>
                ) : dashboardData?.patrimonio?.openCreditInvoices?.total !== undefined ? (
                  `R$ ${dashboardData.patrimonio.openCreditInvoices.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                ) : (
                  "—"
                )}
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

          {isLoading ? (
            <div className="flex items-center justify-center p-4 gap-2 text-[#737373]">
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
              <span className="text-[13px] text-[#737373]">Carregando metas...</span>
            </div>
          ) : dashboardData?.poupanca && dashboardData.poupanca.length > 0 ? (
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
            <div className="p-3 text-center text-[#737373] text-[12px]">
              Nenhuma meta cadastrada ainda. Diga ex: &quot;Guardar 500 para viagem&quot;.
            </div>
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
            {isLoading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-[#737373]">
                <span className="material-symbols-outlined text-[24px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[13px] font-medium text-[#0a0a0a]">
                  Carregando lançamentos recentes...
                </span>
                <span className="text-[11px] text-[#737373]">
                  Consultando base de dados
                </span>
              </div>
            ) : dashboardData?.recentes && dashboardData.recentes.length > 0 ? (
              agruparAtividadesRecentes(dashboardData.recentes).slice(0, 5).map((item, idx, visibleItems) => {
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
                            {item.installmentTotal && item.installmentNumbers.length > 0
                              ? `Parcelas ${item.installmentNumbers.join(", ")} de ${item.installmentTotal} • `
                              : `${dataFormatada} via `}
                            {item.payment_method?.replace("_", " ") || "Transação"}
                          </span>
                        </div>
                      </div>
                      <span className="text-right text-[14px] font-semibold text-[#0a0a0a] whitespace-nowrap pl-2">
                        <span className="block">-R$ {Number(item.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        {item.installmentTotal && <span className="block text-[10px] font-normal text-[#737373]">por parcela</span>}
                      </span>
                    </div>
                    {idx < visibleItems.length - 1 && (
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
