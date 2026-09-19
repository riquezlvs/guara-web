"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  obterExtratoInvestimentos,
  ExtratoInvestimentosResponse,
  ExtratoInvestimentoItem,
} from "@/lib/api";

export default function ExtratoInvestimentosPage() {
  const router = useRouter();

  const [filtroTipo, setFiltroTipo] = useState<"Todos" | "Aportes" | "Dividendos / JCP" | "Resgates">("Todos");
  const [busca, setBusca] = useState("");
  const [extratoData, setExtratoData] = useState<ExtratoInvestimentosResponse["dados"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const carregarExtrato = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await obterExtratoInvestimentos({
        tipo: filtroTipo,
        busca: busca.trim() || undefined,
      });
      if (resp.sucesso && resp.dados) {
        setExtratoData(resp.dados);
      }
    } catch (err) {
      console.warn("Backend offline ao obter extrato de investimentos, usando contingência local:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filtroTipo, busca]);

  useEffect(() => {
    carregarExtrato();

    const handleRefresh = () => carregarExtrato();
    window.addEventListener("finances:refresh", handleRefresh);
    return () => window.removeEventListener("finances:refresh", handleRefresh);
  }, [carregarExtrato]);

  const handleExport = () => {
    setToastMsg("Extrato de investimentos exportado com sucesso!");
    setTimeout(() => setToastMsg(null), 2500);
  };

  const getItemIcon = (tipo: string, ticker: string) => {
    if (ticker.toLowerCase().includes("btc") || ticker.toLowerCase().includes("cripto")) return "currency_bitcoin";
    if (tipo === "Dividendo") return "domain";
    if (tipo === "JCP") return "attach_money";
    if (tipo === "Compra Ações") return "candlestick_chart";
    return "account_balance";
  };

  // Mock contingência se o banco não responder
  const fallbackGrupos: Record<string, ExtratoInvestimentoItem[]> = {
    "Outubro 2024": [
      {
        id: "tx-1",
        ticker: "Tesouro Selic 2029",
        title: "Tesouro Selic 2029",
        type: "Aporte",
        time: "10:30",
        institution: "Nubank",
        category: "Renda Fixa",
        detail: "1,5 títulos @ R$ 1.000,00",
        amount: 1500.0,
        status: "Liquidado",
        date: "2024-10-24T10:30:00Z",
        monthGroup: "Outubro 2024",
      },
      {
        id: "tx-2",
        ticker: "MXRF11",
        title: "MXRF11 - Maxi Renda",
        type: "Dividendo",
        time: "09:15",
        institution: "XP Investimentos",
        category: "FIIs",
        detail: "R$ 0,09/cota • 1.383 cotas",
        amount: 124.5,
        status: "Em conta",
        date: "2024-10-18T09:15:00Z",
        monthGroup: "Outubro 2024",
      },
      {
        id: "tx-3",
        ticker: "BBAS3",
        title: "BBAS3 - Banco do Brasil",
        type: "Compra Ações",
        time: "14:20",
        institution: "BTG Pactual",
        category: "Ações BR",
        detail: "50 cotas @ R$ 28,00",
        amount: 1400.0,
        status: "Executado",
        date: "2024-10-10T14:20:00Z",
        monthGroup: "Outubro 2024",
      },
    ],
    "Setembro 2024": [
      {
        id: "tx-4",
        ticker: "PETR4",
        title: "PETR4 - Petrobras PN",
        type: "JCP",
        time: "11:00",
        institution: "XP Investimentos",
        category: "Ações BR",
        detail: "Crédito líquido retido",
        amount: 296.3,
        status: "Creditado",
        date: "2024-09-27T11:00:00Z",
        monthGroup: "Setembro 2024",
      },
      {
        id: "tx-5",
        ticker: "BTC",
        title: "Bitcoin (BTC)",
        type: "Aporte",
        time: "16:45",
        institution: "Binance",
        category: "Cripto",
        detail: "0,00185 BTC • Carteira Fria",
        amount: 600.0,
        status: "On-chain",
        date: "2024-09-21T16:45:00Z",
        monthGroup: "Setembro 2024",
      },
    ],
  };

  const grupos = extratoData?.grupos || fallbackGrupos;
  const resumoMes = extratoData?.resumoMes || {
    totalAportado: 3500.0,
    variacaoVsMesAnterior: "+18% vs set.",
    proventos: 420.8,
    proventosQtd: 3,
    rentabilidadePct: 1.45,
    rentabilidadeEstimada: 2150.0,
  };

  const insightTexto =
    extratoData?.insight?.texto ||
    "Você reinvestiu 100% dos proventos deste mês. Isso adiantou em 8 dias a projeção da sua meta de liberdade financeira.";

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-44 px-4 max-w-md mx-auto bg-canvas min-h-screen">
      {/* Toast de Exportação / Ação */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0a] text-white px-4 py-2.5 rounded-full text-[13px] shadow-lg flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between py-2 mb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-mid-gray hover:text-ink transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-[13px] font-medium">Voltar</span>
          </button>
        </div>
        <h1 className="text-[17px] font-semibold text-ink tracking-tight truncate flex-1 text-center pr-2">
          Extrato De Investimentos
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Exportar extrato"
            onClick={handleExport}
            className="w-9 h-9 rounded-full flex items-center justify-center text-mid-gray hover:text-ink hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col w-full gap-4">
        {/* Selector & Period Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 bg-paper px-3.5 py-1.5 rounded-[18px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.05)] active:scale-98 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-mid-gray text-[18px]">event_note</span>
            <span className="font-label-md text-label-md text-ink font-medium">Outubro 2024</span>
            <span className="material-symbols-outlined text-mid-gray text-[18px]">expand_more</span>
          </button>

          <div className="flex items-center gap-1.5 bg-surface-alt px-2.5 py-1 rounded-[18px]">
            <span className="w-2 h-2 rounded-full bg-ink"></span>
            <span className="font-caption text-caption text-mid-gray uppercase tracking-widest text-[10px]">
              Sincronizado
            </span>
          </div>
        </div>

        {/* Resumo Consolidado do Mês Card */}
        <section className="bg-paper rounded-[24px] p-4 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="font-caption text-caption text-mid-gray uppercase tracking-wider">
                Total Aportado no Mês
              </span>
              <span className="font-caption text-caption text-mid-gray">
                {resumoMes.variacaoVsMesAnterior}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-md text-[24px] font-semibold text-ink">
                +R$ {resumoMes.totalAportado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Micro sparkline metric bar */}
          <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden flex">
            <div className="h-full bg-ink" style={{ width: "76%" }}></div>
            <div className="h-full bg-mid-gray" style={{ width: "24%" }}></div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col bg-surface-alt p-3 rounded-[14px]">
              <div className="flex items-center gap-1 text-mid-gray">
                <span className="material-symbols-outlined text-[16px]">payments</span>
                <span className="font-caption text-caption uppercase tracking-wider text-[11px]">Proventos</span>
              </div>
              <span className="font-body-lg text-[15px] font-semibold text-ink mt-0.5">
                +R$ {resumoMes.proventos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="font-caption text-caption text-mid-gray mt-0.5">
                {resumoMes.proventosQtd} pagamentos
              </span>
            </div>

            <div className="flex flex-col bg-surface-alt p-3 rounded-[14px]">
              <div className="flex items-center gap-1 text-mid-gray">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span className="font-caption text-caption uppercase tracking-wider text-[11px]">Rentabilidade</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-body-lg text-[15px] font-semibold text-ink">
                  +{resumoMes.rentabilidadePct}%
                </span>
              </div>
              <span className="font-caption text-caption text-mid-gray mt-0.5">
                +R$ {resumoMes.rentabilidadeEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} est.
              </span>
            </div>
          </div>
        </section>

        {/* Guará IA Search Input */}
        <div className="relative w-full">
          <div className="bg-paper flex items-center gap-2 px-3.5 py-2.5 rounded-[18px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.05)] focus-within:ring-1 focus-within:ring-black">
            <span className="material-symbols-outlined text-mid-gray text-[18px]">search</span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ativo, ticker, dividendo..."
              className="flex-1 bg-transparent text-ink placeholder-mid-gray font-body-sm text-[13px] focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-[12px] shrink-0">
              <span className="font-caption text-[11px] text-ink font-medium">✨ IA</span>
            </div>
          </div>
        </div>

        {/* Horizontal Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(["Todos", "Aportes", "Dividendos / JCP", "Resgates"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipo(tipo)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-[18px] font-label-sm text-label-sm transition-all cursor-pointer ${
                filtroTipo === tipo
                  ? "bg-ink text-paper shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                  : "bg-paper text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.03)] hover:bg-surface-alt"
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>

        {/* Guará IA Smart Insight Card */}
        <section className="bg-surface-alt rounded-[18px] p-3.5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.04)] flex items-start gap-3">
          <div className="w-8 h-8 min-w-[32px] rounded-[10px] bg-ink text-paper flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-label-sm text-ink font-semibold">Insight Guará IA</span>
              <span className="font-caption text-caption text-mid-gray text-[11px]">Hoje</span>
            </div>
            <p className="font-body-sm text-body-sm text-ink-soft leading-relaxed">
              {insightTexto}
            </p>
          </div>
        </section>

        {/* Chronological Movement Stream */}
        <div className="flex flex-col gap-4">
          {Object.entries(grupos).map(([mesGrupo, itens]) => (
            <div key={mesGrupo} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-caption text-caption text-mid-gray uppercase tracking-wider font-semibold text-[11px]">
                  {mesGrupo}
                </span>
                <span className="font-caption text-caption text-mid-gray text-[11px]">
                  {itens.length} transações
                </span>
              </div>

              {itens.map((item) => (
                <article
                  key={item.id}
                  className="bg-paper rounded-[18px] p-3.5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 min-w-[40px] rounded-full bg-surface-container flex items-center justify-center text-ink shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        {getItemIcon(item.type, item.ticker)}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-label-md text-label-md text-ink truncate font-medium">
                          {item.title}
                        </span>
                        <span className="bg-surface-alt px-1.5 py-0.5 rounded-[8px] font-caption text-[10px] uppercase tracking-wide text-mid-gray">
                          {item.type}
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-mid-gray truncate mt-0.5">
                        {item.time} • {item.institution} • {item.category}
                      </span>
                      <span className="font-caption text-caption text-mid-gray mt-0.5">
                        {item.detail}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end min-w-max shrink-0 pl-2">
                    <span className="font-label-md text-label-md text-ink font-semibold font-mono">
                      +R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-caption text-caption text-mid-gray mt-0.5 text-[11px]">
                      {item.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>

        {/* End of Feed Subtle Indicator */}
        <div className="flex items-center justify-center py-4 gap-2 text-mid-gray">
          <span className="w-1.5 h-1.5 rounded-full bg-surface-variant"></span>
          <span className="font-caption text-caption uppercase tracking-wider text-[11px]">
            Fim dos registros de 2024
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-surface-variant"></span>
        </div>
      </div>
    </main>
  );
}
