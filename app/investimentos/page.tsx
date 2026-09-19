"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { obterDashboard, DashboardResponse } from "@/lib/api";

export default function InvestimentosPage() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await obterDashboard();
      if (resp.sucesso && resp.data) {
        setDashboardData(resp.data);
      }
    } catch (err) {
      console.warn("Backend offline ao carregar investimentos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const handleRefresh = () => {
      carregarDados();
    };
    window.addEventListener("finances:refresh", handleRefresh);
    return () => {
      window.removeEventListener("finances:refresh", handleRefresh);
    };
  }, [carregarDados]);

  const patrimonio = dashboardData?.patrimonio?.totalNetWorth || 0;
  const poupanca = dashboardData?.poupanca && dashboardData.poupanca.length > 0 ? dashboardData.poupanca[0] : null;

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-48 px-4 max-w-md mx-auto">
      <div className="flex flex-col w-full gap-5">
        {/* Top Header */}
        <section className="flex flex-col gap-1 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Patrimônio & Investimentos
            </span>
            <span className="inline-flex items-center gap-1 text-[#737373] text-[12px]">
              <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
              {isLoading ? "Sincronizando..." : "Sincronizado"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2 h-8 text-[#737373]">
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[14px] font-medium text-[#737373] animate-pulse">
                  Carregando patrimônio...
                </span>
              </div>
            ) : (
              <h1 className="text-[32px] text-[#0a0a0a] font-semibold tracking-[-0.03em] leading-none">
                R$ {patrimonio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h1>
            )}
          </div>
          <p className="text-[12px] text-[#737373]">
            Soma de contas correntes, poupanças e investimentos
          </p>
        </section>

        {/* Reserva & Metas Card */}
        <Card className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Meta de Reserva Financeira
            </span>
            <span className="text-[11px] font-mono text-[#737373] bg-[#fafafa] px-2 py-0.5 rounded-[12px] border border-black/5">
              Automático
            </span>
          </div>

          {poupanca ? (
            (() => {
              const pct = poupanca.alvo > 0 ? Math.round((poupanca.poupado / poupanca.alvo) * 100) : 0;
              return (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[20px] font-semibold text-[#0a0a0a]">
                      R$ {poupanca.poupado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[12px] text-[#737373]">
                      Meta: R$ {poupanca.alvo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({pct}%)
                    </span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    className="h-1.5 bg-[#f5f5f5] mt-1 [&>div]:bg-black"
                  />
                  <span className="text-[12px] text-[#737373] pt-1">
                    {poupanca.nome}
                  </span>
                </div>
              );
            })()
          ) : (
            <div className="p-4 text-center text-[#737373] text-[13px]">
              Nenhuma meta cadastrada. Peça à IA no chat: &quot;guardar 500 reais para reserva de emergência&quot;.
            </div>
          )}
        </Card>

        {/* Breakdown de Contas */}
        <Card className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Contas Bancárias
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              {dashboardData?.patrimonio?.liquidAssets?.accounts?.length || 0} ativas
            </Badge>
          </div>

          <div className="flex flex-col divide-y divide-black/[0.04]">
            {dashboardData?.patrimonio?.liquidAssets?.accounts && dashboardData.patrimonio.liquidAssets.accounts.length > 0 ? (
              dashboardData.patrimonio.liquidAssets.accounts.map((c, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px] text-[#0a0a0a]">
                        account_balance
                      </span>
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-[#0a0a0a]">{c.name}</div>
                      <div className="text-[11px] text-[#737373] capitalize">{c.type}</div>
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-[#0a0a0a]">
                    R$ {Number(c.balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-[#737373] text-[12px]">
                Nenhuma conta bancária listada no banco de dados.
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
