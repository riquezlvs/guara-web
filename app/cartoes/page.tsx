"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { obterDashboard, DashboardResponse } from "@/lib/api";

export default function CartoesPage() {
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
      console.warn("Backend offline ou não conectado ao carregar cartões:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const faturas = dashboardData?.saldo?.safeSummary?.openCreditInvoices || 0;
  const passivos = dashboardData?.patrimonio?.openCreditInvoices?.total || faturas;

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-48 px-4 max-w-md mx-auto">
      <div className="flex flex-col w-full gap-5">
        {/* Top Header */}
        <section className="flex flex-col gap-1 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Faturas & Cartões
            </span>
            <span className="inline-flex items-center gap-1 text-[#737373] text-[12px]">
              <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
              {isLoading ? "Sincronizando..." : "Sincronizado"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[32px] text-[#0a0a0a] font-semibold tracking-[-0.03em] leading-none">
              R$ {passivos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h1>
          </div>
          <p className="text-[12px] text-[#737373]">
            Total de faturas e compromissos abertos no ciclo
          </p>
        </section>

        {/* Card do Cartão Principal */}
        <div className="w-full rounded-[24px] bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between h-48 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none blur-2xl"></div>
          
          <div className="flex items-center justify-between z-10">
            <span className="text-[14px] font-medium tracking-wide text-neutral-300">
              {dashboardData?.saldo?.safeSummary?.accountName || "Cartão de Crédito"}
            </span>
            <span className="material-symbols-outlined text-[24px] text-neutral-400">
              contactless
            </span>
          </div>

          <div className="z-10 flex flex-col gap-1">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
              Fatura Atual
            </span>
            <div className="text-[24px] font-semibold tracking-tight">
              R$ {faturas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center justify-between z-10 text-[11px] text-neutral-400 font-mono">
            <span>•••• 8842</span>
            <span>FECHAMENTO EM BREVE</span>
          </div>
        </div>

        {/* Resumo e Dicas */}
        <Card className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Controle de Fatura
            </span>
            <Badge
              variant="outline"
              className="rounded-[14px] bg-[#f5f5f5] text-[#0a0a0a] border-0 text-[11px] font-medium px-2 py-0.5"
            >
              Safe-to-Spend
            </Badge>
          </div>
          <p className="text-[13px] text-[#737373] leading-relaxed">
            Seu saldo Safe-to-Spend já desconta automaticamente o valor das suas faturas abertas, garantindo que você nunca gaste o dinheiro reservado para pagar o cartão.
          </p>
        </Card>
      </div>
    </main>
  );
}
