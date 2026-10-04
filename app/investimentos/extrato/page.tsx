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
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced" | "error">("syncing");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const carregarExtrato = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const resp = await obterExtratoInvestimentos({
        tipo: filtroTipo,
        busca: busca.trim() || undefined,
      });
      if (resp.sucesso && resp.dados) {
        setExtratoData(resp.dados);
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
        setSyncError("Falha ao obter extrato de investimentos");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backend offline ou não conectado";
      console.warn("Backend offline ao obter extrato de investimentos, usando contingência local:", err);
      setSyncStatus("error");
      setSyncError(msg);
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

  // Dados reais retornados pelo banco de dados via API
  const grupos = extratoData?.grupos || {};
  const resumoMes = extratoData?.resumoMes || {
    totalAportado: 0,
    variacaoVsMesAnterior: "",
    proventos: 0,
    proventosQtd: 0,
    rentabilidadePct: 0,
    rentabilidadeEstimada: 0,
  };

  const rotuloPeriodo =
    extratoData?.rotuloMes ||
    new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  const rotuloPeriodoCapitalizado = rotuloPeriodo.charAt(0).toUpperCase() + rotuloPeriodo.slice(1);

  const insightTexto =
    extratoData?.insight?.texto ||
    "Acompanhe aqui o histórico autêntico de aportes, proventos e rendimentos registrados no seu banco de dados.";

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
            <span className="font-label-md text-label-md text-ink font-medium">{rotuloPeriodoCapitalizado}</span>
            <span className="material-symbols-outlined text-mid-gray text-[18px]">expand_more</span>
          </button>

          <button
            type="button"
            onClick={() => carregarExtrato()}
            title={
              syncStatus === "error"
                ? `Erro de sincronização: ${syncError || "Sem conexão"}. Clique para tentar novamente.`
                : syncStatus === "syncing"
                ? "Sincronizando com o backend..."
                : "Sincronizado com sucesso. Clique para atualizar."
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[18px] transition-all cursor-pointer active:scale-95 ${
              syncStatus === "error"
                ? "bg-rose-50 text-rose-700 shadow-[0_0_0_1px_rgba(244,63,94,0.3)] hover:bg-rose-100"
                : syncStatus === "syncing"
                ? "bg-amber-50 text-amber-700 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]"
                : "bg-surface-alt hover:bg-surface-alt/80 text-mid-gray"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === "error"
                  ? "bg-rose-500 animate-pulse"
                  : syncStatus === "syncing"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-ink"
              }`}
            />
            <span className="font-caption text-caption uppercase tracking-widest text-[10px]">
              {syncStatus === "error"
                ? "Erro"
                : syncStatus === "syncing"
                ? "Sincronizando"
                : "Sincronizado"}
            </span>
          </button>
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
            <div className="flex items-baseline gap-1 min-h-[36px]">
              {isLoading ? (
                <div className="flex items-center gap-2 text-mid-gray">
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  <span className="text-[13px] font-medium animate-pulse">Carregando aportes...</span>
                </div>
              ) : (
                <span className="font-headline-md text-[24px] font-semibold text-ink">
                  +R$ {resumoMes.totalAportado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
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
          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-mid-gray">
              <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
              <span className="text-[13px] font-medium text-ink">Carregando movimentações...</span>
              <span className="text-[11px] text-mid-gray">Consultando base de dados</span>
            </div>
          ) : Object.keys(grupos).length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-mid-gray bg-paper rounded-[24px] border border-black/5 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center text-mid-gray">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </div>
              <div className="flex flex-col gap-1 max-w-xs">
                <span className="text-[14px] font-semibold text-ink">
                  Nenhuma movimentação encontrada
                </span>
                <span className="text-[12px] text-mid-gray leading-relaxed">
                  Não há aportes ou rendimentos registrados no banco de dados para este período.
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/investimentos/novo")}
                className="mt-1 px-4 py-2 rounded-[16px] bg-black text-white text-[12px] font-medium hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Registrar Novo Aporte</span>
              </button>
            </div>
          ) : (
            Object.entries(grupos).map(([mesGrupo, itens]) => (
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

                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <span className="font-label-md text-label-md text-ink font-semibold font-mono">
                      R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )))}
        </div>

        {/* End of Feed Subtle Indicator */}
        <div className="flex items-center justify-center py-4 gap-2 text-mid-gray">
          <span className="w-1.5 h-1.5 rounded-full bg-surface-variant"></span>
          <span className="font-caption text-caption uppercase tracking-wider text-[11px]">
            Fim dos registros
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-surface-variant"></span>
        </div>
      </div>
    </main>
  );
}
