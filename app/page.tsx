"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { obterDashboard, DashboardResponse, DashboardRecentItem, interpretarTransacao, TransactionDraft } from "@/lib/api";
import { ReviewModal } from "@/components/transaction/review-modal";

type RecentItemGroup = DashboardRecentItem & {
  installmentNumber?: number;
  installmentTotal?: number;
  cleanDescription: string;
};

function agruparAtividadesRecentes(items: DashboardRecentItem[]): RecentItemGroup[] {
  const groups = new Map<string, RecentItemGroup>();
  const list: RecentItemGroup[] = [];

  items.forEach((item) => {
    const hasInstallments = Boolean(item.installment_total && item.installment_total > 1);
    const category = item.categories?.name || "Geral";
    const cleanDescription = hasInstallments
      ? item.description.replace(/\s*\(?\d+\/\d+\)?\s*$/i, "").trim()
      : item.description;

    const key = hasInstallments
      ? `installment:${cleanDescription.toLowerCase()}:${category}:${item.payment_method}`
      : `single:${item.display_id}`;

    if (groups.has(key)) {
      return; // Compra parcelada exibida apenas uma vez
    }

    const groupedItem: RecentItemGroup = {
      ...item,
      cleanDescription,
      installmentNumber: item.installment_number || 1,
      installmentTotal: item.installment_total || undefined,
    };

    groups.set(key, groupedItem);
    list.push(groupedItem);
  });

  return list;
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValuesHidden, setIsValuesHidden] = useState(false);

  // Interactivity for Evolution Chart
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // Interactivity for Donut Chart
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);

  // Quick Prompt & Review Modal state
  const [quickInput, setQuickInput] = useState("");
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<TransactionDraft | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Timeframe filter for Evolution chart
  const [activeRange, setActiveRange] = useState<"7D" | "30D" | "6M">("30D");

  useEffect(() => {
    try {
      const storedVisibility = localStorage.getItem("guara:hide_values");
      if (storedVisibility !== null) {
        setIsValuesHidden(storedVisibility === "true");
      }
    } catch {
      // fallback
    }
  }, []);

  const toggleValuesVisibility = () => {
    setIsValuesHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("guara:hide_values", String(next));
      } catch {}
      return next;
    });
  };

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

  // Handle Quick Entry trigger (from input or suggestion chips)
  const handleTriggerQuickEntry = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingPrompt) return;

    setIsProcessingPrompt(true);
    try {
      const resp = await interpretarTransacao(trimmed);
      if (resp.sucesso && resp.dados) {
        setReviewDraft(resp.dados);
        setQuickInput("");
      } else {
        setFeedbackToast(resp.mensagem || "Não foi possível interpretar a transação.");
        setTimeout(() => setFeedbackToast(null), 4000);
      }
    } catch (err: any) {
      setFeedbackToast(err.message || "Erro de conexão com a IA.");
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsProcessingPrompt(false);
    }
  };

  // Safe-to-Spend metrics
  const safeMetrics = useMemo(() => {
    const safeToSpend = dashboardData?.saldo?.safeSummary?.safeToSpend ?? 0;
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, lastDayOfMonth - today.getDate());
    const dailyAllowance = safeToSpend > 0 ? safeToSpend / daysLeft : 0;
    return {
      safeToSpend,
      daysLeft,
      dailyAllowance,
      accountName: dashboardData?.saldo?.safeSummary?.accountName || "Conta Principal",
      openInvoices: dashboardData?.saldo?.safeSummary?.openCreditInvoices ?? 0,
    };
  }, [dashboardData]);

  // Dynamic coordinates for SVG Evolution Chart
  const chartPoints = useMemo(() => {
    const evolucao = dashboardData?.graficos?.evolucao;
    if (!evolucao) {
      return {
        points: [] as Array<{ x: number; y: number; label: string; total: number }>,
        svgPath: "",
        areaPath: "",
        totalPeriodo: 0,
        labels: [] as string[],
      };
    }

    let rawData: Array<{ label: string; total: number }> = [];
    if (activeRange === "7D") {
      rawData = evolucao.seteDias || [];
    } else if (activeRange === "30D") {
      rawData = evolucao.trintaDias || [];
    } else {
      rawData = evolucao.seisMeses || [];
    }

    if (!rawData || rawData.length === 0) {
      return {
        points: [],
        svgPath: "",
        areaPath: "",
        totalPeriodo: 0,
        labels: [],
      };
    }

    const width = 320;
    const height = 110;
    const paddingY = 16;
    const paddingX = 14;

    const values = rawData.map((d) => d.total);
    const maxVal = Math.max(...values, 100);
    const minVal = 0;
    const totalPeriodo = values.reduce((acc, v) => acc + v, 0);

    const stepX = rawData.length > 1 ? (width - paddingX * 2) / (rawData.length - 1) : 0;

    const points = rawData.map((d, index) => {
      const x = paddingX + index * stepX;
      // Normalização invertida no SVG Y (maior valor = y menor)
      const ratio = (d.total - minVal) / (maxVal - minVal || 1);
      const y = height - paddingY - ratio * (height - paddingY * 2);
      return {
        x,
        y,
        label: d.label,
        total: d.total,
      };
    });

    // Constrói SVG path com curvas suaves cúbicas
    let svgPath = "";
    if (points.length === 1) {
      svgPath = `M ${points[0].x} ${points[0].y} L ${width - paddingX} ${points[0].y}`;
    } else {
      svgPath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        svgPath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
    }

    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${svgPath} L ${last.x} ${height} L ${first.x} ${height} Z`;

    const labels = [
      points[0]?.label || "",
      points[Math.floor(points.length / 2)]?.label || "",
      points[points.length - 1]?.label || "",
    ];

    return {
      points,
      svgPath,
      areaPath,
      totalPeriodo,
      labels,
    };
  }, [dashboardData, activeRange]);

  // Donut SVG Segments
  const donutData = useMemo(() => {
    const cats = dashboardData?.graficos?.distribuicaoCategorias || [];
    const total = dashboardData?.graficos?.totalCategorias || 0;
    const r = 38;
    const circumference = 2 * Math.PI * r; // ~238.76

    let accumulatedLength = 0;
    const segments = cats.map((cat) => {
      const length = (cat.percentual / 100) * circumference;
      const offset = -accumulatedLength;
      accumulatedLength += length;
      return {
        ...cat,
        dashArray: `${length.toFixed(2)} ${circumference.toFixed(2)}`,
        dashOffset: offset.toFixed(2),
      };
    });

    return {
      segments,
      total,
      circumference,
      rotuloMes: dashboardData?.graficos?.rotuloMesAtual || "Mês Atual",
    };
  }, [dashboardData]);

  // Metas & Caixinhas (Combina metas de poupanca com contas de renda fixa como a Caixinha Nubank)
  const metasECaixinhas = useMemo(() => {
    const list: Array<{
      id: string;
      nome: string;
      saldo: number;
      alvo?: number;
      percentual: number;
    }> = [];

    // 1. Metas do módulo de poupança
    if (dashboardData?.poupanca && dashboardData.poupanca.length > 0) {
      dashboardData.poupanca.forEach((m) => {
        const pct = m.alvo > 0 ? Math.round((m.poupado / m.alvo) * 100) : 0;
        list.push({
          id: `goal-${m.id}`,
          nome: m.nome,
          saldo: m.poupado,
          alvo: m.alvo,
          percentual: pct,
        });
      });
    }

    // 2. Caixinhas e Renda Fixa vindas do patrimônio (ex: Caixinha Nubank)
    const fixedAccounts = dashboardData?.patrimonio?.fixedIncome?.accounts || [];
    fixedAccounts.forEach((acc, i) => {
      // Se já não tiver uma meta com o mesmo nome
      const jaExiste = list.some((item) => item.nome.toLowerCase() === acc.name.toLowerCase());
      if (!jaExiste) {
        list.push({
          id: `fixed-${i}-${acc.name}`,
          nome: acc.name,
          saldo: acc.balance,
          alvo: undefined,
          percentual: 100,
        });
      }
    });

    return list;
  }, [dashboardData]);

  const primeiraMeta = metasECaixinhas[0] || null;

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-44 px-4 max-w-md mx-auto">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0a] text-white px-4 py-2.5 rounded-full text-[13px] shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[16px] text-amber-400">info</span>
          <span>{feedbackToast}</span>
        </div>
      )}

      <div className="flex flex-col w-full gap-5">
        {/* 1. Safe-to-Spend Header Block */}
        <section className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
                Saldo Safe-to-Spend
              </span>
              <button
                type="button"
                onClick={toggleValuesVisibility}
                aria-label={isValuesHidden ? "Mostrar valores" : "Ocultar valores"}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                title={isValuesHidden ? "Mostrar valores" : "Ocultar valores"}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isValuesHidden ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#737373] text-[12px]">
              <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
              {isLoading ? "Sincronizando..." : "Sincronizado"}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2 h-10 text-[#737373]">
                <span className="material-symbols-outlined text-[24px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[14px] font-medium text-[#737373] animate-pulse">
                  Carregando saldo...
                </span>
              </div>
            ) : (
              <h1 className="text-[38px] text-[#0a0a0a] font-semibold tracking-[-0.03em] leading-none">
                {isValuesHidden
                  ? "R$ ••••••"
                  : `R$ ${safeMetrics.safeToSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </h1>
            )}
          </div>

          <div className="text-[12px] text-[#737373] min-h-[18px]">
            {isLoading ? (
              <span className="animate-pulse">Consultando dados no banco...</span>
            ) : (
              <span>
                Disponível para gastar nos próximos{" "}
                <span className="font-semibold text-[#0a0a0a]">{safeMetrics.daysLeft} dias</span> do mês (média de{" "}
                {isValuesHidden
                  ? "R$ ••••••/dia"
                  : `R$ ${safeMetrics.dailyAllowance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia`}
                )
              </span>
            )}
          </div>
        </section>

        {/* 2. Natural Language Quick Entry Card */}
        <div className="w-full bg-[#f5f5f5] rounded-[24px] p-2 border border-black/5 flex flex-col gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTriggerQuickEntry(quickInput);
            }}
            className="flex items-center bg-white rounded-[18px] px-3.5 py-1.5 border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:ring-1 focus-within:ring-black"
          >
            <span className="material-symbols-outlined text-[20px] text-[#737373] mr-2 shrink-0">
              {isProcessingPrompt ? "progress_activity" : "auto_awesome"}
            </span>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              disabled={isProcessingPrompt}
              placeholder='Ex: "Gastei 45 no almoço", "Uber 28"...'
              className="w-full bg-transparent border-none outline-none text-[13px] text-[#0a0a0a] placeholder:text-[#737373] font-normal"
            />
            <button
              type="submit"
              disabled={!quickInput.trim() || isProcessingPrompt}
              className="p-1 rounded-[12px] bg-[#0a0a0a] text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-[#0a0a0a] transition-all shrink-0 ml-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] block">
                {isProcessingPrompt ? "hourglass_top" : "arrow_forward"}
              </span>
            </button>
          </form>

          {/* Quick Suggestion Chips */}
          <div className="flex gap-1.5 overflow-x-auto px-1 pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => handleTriggerQuickEntry("Almoço 38")}
              className="px-2.5 py-1 rounded-[12px] bg-white border border-black/5 text-[11px] text-[#737373] hover:text-[#0a0a0a] hover:bg-white active:scale-95 transition-all font-medium shrink-0 cursor-pointer"
            >
              + Almoço R$ 38
            </button>
            <button
              type="button"
              onClick={() => handleTriggerQuickEntry("Uber 24")}
              className="px-2.5 py-1 rounded-[12px] bg-white border border-black/5 text-[11px] text-[#737373] hover:text-[#0a0a0a] hover:bg-white active:scale-95 transition-all font-medium shrink-0 cursor-pointer"
            >
              + Uber R$ 24
            </button>
            <button
              type="button"
              onClick={() => handleTriggerQuickEntry("Pix recebido 150")}
              className="px-2.5 py-1 rounded-[12px] bg-white border border-black/5 text-[11px] text-[#737373] hover:text-[#0a0a0a] hover:bg-white active:scale-95 transition-all font-medium shrink-0 cursor-pointer"
            >
              + Pix recebido
            </button>
          </div>
        </div>

        {/* 3. Consolidated Net Worth Card */}
        <Link
          href="/investimentos"
          className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-black/20 hover:shadow-md transition-all active:scale-[0.99] flex flex-col gap-4 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium group-hover:text-[#0a0a0a] transition-colors">
                Patrimônio Líquido
              </span>
              <span className="material-symbols-outlined text-[15px] text-[#737373] group-hover:text-[#0a0a0a] group-hover:translate-x-0.5 transition-all">
                chevron_right
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#737373] bg-[#f5f5f5] px-2 py-0.5 rounded-[12px]">
              {isLoading
                ? "..."
                : dashboardData?.patrimonio?.liquidAssets?.accounts
                ? `${dashboardData.patrimonio.liquidAssets.accounts.length} contas`
                : "Consolidado"}
            </span>
          </div>

          <div>
            {isLoading ? (
              <div className="flex items-center gap-2 h-9 text-[#737373]">
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[13px] font-medium text-[#737373] animate-pulse">
                  Calculando patrimônio...
                </span>
              </div>
            ) : (
              <div className="text-[28px] font-semibold tracking-tight text-[#0a0a0a] leading-tight">
                {isValuesHidden
                  ? "R$ ••••••"
                  : `R$ ${(dashboardData?.patrimonio?.totalNetWorth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </div>
            )}
            <span className="text-[12px] text-[#737373]">
              Ativos bancários menos faturas de crédito em aberto
            </span>
          </div>

          {/* Minimalist Liquidity Bar */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#0a0a0a] font-medium">Liquidez Imediata (D+0)</span>
              <span className="text-[#737373] font-mono">
                {isLoading
                  ? "..."
                  : isValuesHidden
                  ? "R$ ••••••"
                  : `R$ ${(dashboardData?.patrimonio?.liquidAssets?.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="w-full h-1 bg-[#f5f5f5] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#0a0a0a] rounded-full" style={{ width: "75%" }}></div>
              <div className="h-full bg-[#737373] rounded-full" style={{ width: "25%" }}></div>
            </div>
          </div>

          {/* Breakdown: Ativos vs Passivos */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-black/5 text-[12px]">
            <div className="flex flex-col gap-1">
              <span className="text-[#737373] text-[11px] uppercase tracking-wider">Total Ativos</span>
              <span className="font-medium text-[#0a0a0a]">
                {isLoading
                  ? "..."
                  : isValuesHidden
                  ? "R$ ••••••"
                  : `R$ ${(dashboardData?.patrimonio?.liquidAssets?.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </span>
              <div className="text-[10px] text-[#737373]">
                {dashboardData?.patrimonio?.liquidAssets?.accounts?.[0]?.name || "Conta Ativa"}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#737373] text-[11px] uppercase tracking-wider">Total Faturas</span>
              <span className="font-medium text-[#0a0a0a]">
                {isLoading
                  ? "..."
                  : isValuesHidden
                  ? "R$ ••••••"
                  : `R$ ${(dashboardData?.patrimonio?.openCreditInvoices?.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </span>
              <div className="text-[10px] text-[#737373]">
                {dashboardData?.patrimonio?.openCreditInvoices?.cards?.[0]?.name || "Cartões em aberto"}
              </div>
            </div>
          </div>
        </Link>

        {/* 4. Fluxo Mensal & Evolução (Interactive Area / Line Chart) */}
        <div className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Fluxo & Evolução
            </span>
            <div className="flex gap-1 bg-[#f5f5f5] p-0.5 rounded-[12px]">
              <button
                type="button"
                onClick={() => {
                  setActiveRange("7D");
                  setSelectedPointIndex(null);
                }}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  activeRange === "7D" ? "bg-white text-[#0a0a0a] shadow-sm font-semibold" : "text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRange("30D");
                  setSelectedPointIndex(null);
                }}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  activeRange === "30D" ? "bg-white text-[#0a0a0a] shadow-sm font-semibold" : "text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRange("6M");
                  setSelectedPointIndex(null);
                }}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  activeRange === "6M" ? "bg-white text-[#0a0a0a] shadow-sm font-semibold" : "text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                6M
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[24px] font-semibold tracking-tight text-[#0a0a0a]">
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : isValuesHidden ? (
                  "R$ ••••••"
                ) : selectedPointIndex !== null && chartPoints.points[selectedPointIndex] ? (
                  `R$ ${chartPoints.points[selectedPointIndex].total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                ) : (
                  `R$ ${chartPoints.totalPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                )}
              </span>
              <span className="text-[12px] text-[#737373] block">
                {selectedPointIndex !== null && chartPoints.points[selectedPointIndex]
                  ? `Gasto em ${chartPoints.points[selectedPointIndex].label} (toque novamente para resetar)`
                  : activeRange === "7D"
                  ? "Saídas nos últimos 7 dias"
                  : activeRange === "30D"
                  ? "Saídas nos últimos 30 dias"
                  : "Saídas nos últimos 6 meses"}
              </span>
            </div>
            {dashboardData?.graficos?.evolucao?.variacaoPercentual !== undefined && (
              <span className="text-[12px] font-mono text-[#0a0a0a] bg-[#f5f5f5] px-2 py-0.5 rounded-[12px] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">
                  {dashboardData.graficos.evolucao.variacaoPercentual <= 0 ? "trending_down" : "trending_up"}
                </span>
                {dashboardData.graficos.evolucao.variacaoPercentual > 0 ? "+" : ""}
                {dashboardData.graficos.evolucao.variacaoPercentual}%
              </span>
            )}
          </div>

          {/* Native High-Performance Interactive SVG Chart */}
          <div className="w-full h-[120px] relative flex items-end pt-2">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#737373]">
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span className="text-[11px]">Renderizando curva...</span>
              </div>
            ) : chartPoints.points.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-[12px] text-[#737373]">
                Sem dados suficientes para o período.
              </div>
            ) : (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 320 110" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="monochromeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference line */}
                <line x1="0" y1="100" x2="320" y2="100" stroke="#f5f5f5" strokeWidth="1" />

                {/* Shaded Area */}
                {chartPoints.areaPath && (
                  <path d={chartPoints.areaPath} fill="url(#monochromeArea)" />
                )}

                {/* Line Path */}
                {chartPoints.svgPath && (
                  <path
                    d={chartPoints.svgPath}
                    fill="none"
                    stroke="#0a0a0a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Active selection vertical line */}
                {selectedPointIndex !== null && chartPoints.points[selectedPointIndex] && (
                  <line
                    x1={chartPoints.points[selectedPointIndex].x}
                    y1="10"
                    x2={chartPoints.points[selectedPointIndex].x}
                    y2="100"
                    stroke="#0a0a0a"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                )}

                {/* Point markers */}
                {chartPoints.points.map((pt, i) => {
                  const isSelected = selectedPointIndex === i;
                  const isLast = i === chartPoints.points.length - 1;
                  return (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? "5" : isLast ? "3.5" : "2.5"}
                      fill={isSelected ? "#0a0a0a" : isLast ? "#0a0a0a" : "#737373"}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "2" : "1.5"}
                      className="transition-all duration-150"
                    />
                  );
                })}

                {/* Invisible large touch targets for interactivity */}
                {chartPoints.points.map((pt, i) => (
                  <rect
                    key={`hit-${i}`}
                    x={Math.max(0, pt.x - 14)}
                    y="0"
                    width="28"
                    height="110"
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => setSelectedPointIndex((prev) => (prev === i ? null : i))}
                    onMouseEnter={() => setSelectedPointIndex(i)}
                  />
                ))}
              </svg>
            )}
          </div>

          <div className="flex justify-between text-[11px] text-[#737373] font-mono pt-1 border-t border-black/5">
            {chartPoints.labels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>

        {/* 5. Gastos por Categoria (Interactive Monochrome Donut Chart) */}
        <div className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Categorias ({donutData.rotuloMes})
            </span>
            <span className="text-[11px] font-mono text-[#737373]">
              {isLoading
                ? "..."
                : isValuesHidden
                ? "R$ ••••••"
                : `R$ ${donutData.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            </span>
          </div>

          <div className="flex items-center gap-6 py-2">
            {/* Donut Container */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              {isLoading ? (
                <span className="material-symbols-outlined text-[24px] animate-spin text-[#737373]">
                  progress_activity
                </span>
              ) : (
                <>
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background track circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#f5f5f5"
                      strokeWidth="12"
                      className="cursor-pointer"
                      onClick={() => setSelectedCategoryIndex(null)}
                    />

                    {/* Dynamic colored segments */}
                    {donutData.segments.map((seg, i) => {
                      const isSelected = selectedCategoryIndex === i;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={seg.cor}
                          strokeWidth={isSelected ? "15" : "12"}
                          strokeDasharray={seg.dashArray}
                          strokeDashoffset={seg.dashOffset}
                          strokeLinecap="butt"
                          className="transition-all duration-300 cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedCategoryIndex((prev) => (prev === i ? null : i))}
                          onMouseEnter={() => setSelectedCategoryIndex(i)}
                        />
                      );
                    })}
                  </svg>

                  <div
                    className="absolute flex flex-col items-center justify-center text-center px-1 cursor-pointer select-none"
                    onClick={() => setSelectedCategoryIndex(null)}
                  >
                    {selectedCategoryIndex !== null && donutData.segments[selectedCategoryIndex] ? (
                      <>
                        <span className="text-[9px] uppercase text-[#737373] tracking-wider leading-none truncate max-w-[65px]">
                          {donutData.segments[selectedCategoryIndex].categoria}
                        </span>
                        <span className="text-[12px] font-semibold text-[#0a0a0a] leading-tight font-mono">
                          {isValuesHidden
                            ? "••••"
                            : `R$ ${donutData.segments[selectedCategoryIndex].total.toFixed(0)}`}
                        </span>
                        <span className="text-[9px] text-[#737373] font-mono">
                          {donutData.segments[selectedCategoryIndex].percentual}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase text-[#737373] tracking-wider leading-none">
                          Total
                        </span>
                        <span className="text-[13px] font-semibold text-[#0a0a0a] leading-tight font-mono">
                          {isValuesHidden
                            ? "••••"
                            : donutData.total >= 1000
                            ? `R$ ${(donutData.total / 1000).toFixed(1)}k`
                            : `R$ ${donutData.total.toFixed(0)}`}
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Category Legend */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {isLoading ? (
                <div className="flex items-center gap-2 text-[#737373] text-[12px]">
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Carregando divisões...</span>
                </div>
              ) : donutData.segments.length === 0 ? (
                <div className="text-[12px] text-[#737373]">Nenhum gasto categorizado no mês.</div>
              ) : (
                donutData.segments.map((cat, idx) => {
                  const isSelected = selectedCategoryIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCategoryIndex((prev) => (prev === idx ? null : idx))}
                      className={`flex items-center justify-between text-[12px] w-full text-left rounded-md p-1 -m-1 transition-all cursor-pointer ${
                        isSelected ? "bg-black/5 font-semibold" : "hover:bg-[#fafafa]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.cor }}
                        ></span>
                        <span className="text-[#0a0a0a] truncate">{cat.categoria}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {!isValuesHidden && (
                          <span className="font-mono text-[10px] text-[#737373]">
                            R$ {cat.total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        )}
                        <span className="font-mono text-[#737373] text-[11px]">
                          {cat.percentual}%
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 6. Caixinhas & Metas (Reserva de Emergência & Aporte) */}
        <div className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Caixinhas & Metas
            </span>
            <Link
              href="/investimentos"
              className="text-[11px] font-mono text-[#737373] bg-[#f5f5f5] hover:bg-black/5 px-2 py-0.5 rounded-[12px] transition-colors"
            >
              100% CDI
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-4 gap-2 text-[#737373]">
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
              <span className="text-[13px] text-[#737373]">Carregando metas e caixinhas...</span>
            </div>
          ) : metasECaixinhas.length > 0 ? (
            <div className="flex flex-col divide-y divide-black/5">
              {metasECaixinhas.map((item, idx) => (
                <div key={item.id || idx} className={`flex flex-col gap-2 ${idx > 0 ? "pt-3 mt-3" : ""}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[18px] font-semibold text-[#0a0a0a]">
                      {isValuesHidden
                        ? "R$ ••••••"
                        : `R$ ${item.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </span>
                    {item.alvo ? (
                      <span className="text-[12px] text-[#737373]">
                        Meta: {isValuesHidden ? "R$ ••••••" : `R$ ${item.alvo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} ({item.percentual}%)
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Rendimento Ativo
                      </span>
                    )}
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-1.5 bg-[#f5f5f5] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a0a0a] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.percentual || 100, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[12px] text-[#737373]">{item.nome}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerQuickEntry(`Aporte 500 na ${item.nome}`)}
                      className="text-[11px] text-[#0a0a0a] font-medium hover:underline cursor-pointer"
                    >
                      Adicionar aporte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-[#737373] text-[12px]">
              Nenhuma meta ou caixinha cadastrada ainda. Diga ex: &quot;Guardar 500 para reserva&quot;.
            </div>
          )}
        </div>

        {/* 7. Recent Expenses Feed */}
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

          <div className="rounded-[24px] border border-black/5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
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
                const isIncome = item.entry_type === "income";
                const valorTotalFinal = item.installmentTotal && item.installmentTotal > 1
                  ? Number(item.total_amount) * item.installmentTotal
                  : Number(item.total_amount);

                return (
                  <Link
                    key={item.display_id || idx}
                    href={`/extrato/${item.display_id}`}
                    className="block hover:bg-[#fafafa] transition-colors focus-visible:outline-none"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-[18px] flex items-center justify-center shrink-0 ${
                          isIncome ? "bg-emerald-50 text-emerald-600" : "bg-[#f5f5f5] text-[#0a0a0a]"
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {isIncome
                              ? "arrow_downward"
                              : item.payment_method === "pix"
                              ? "payments"
                              : item.payment_method === "credit_card"
                              ? "credit_card"
                              : "receipt_long"}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-medium text-[#0a0a0a] truncate">
                              {item.cleanDescription}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] tracking-tight uppercase bg-[#f5f5f5] text-[#737373] rounded-md font-normal">
                              {categoriaNome}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#737373]">
                            {dataFormatada} via {item.payment_method?.replace("_", " ") || "Transação"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right pl-2 shrink-0 flex flex-col items-end">
                        <span className={`text-[14px] font-semibold font-mono ${
                          isIncome ? "text-emerald-600" : "text-[#0a0a0a]"
                        }`}>
                          {isValuesHidden
                            ? (isIncome ? "+R$ ••••••" : "-R$ ••••••")
                            : `${isIncome ? "+" : "-"}R$ ${valorTotalFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </span>
                        {item.installmentTotal && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#737373] bg-[#f5f5f5] px-1.5 py-0.5 rounded-[6px] font-mono mt-0.5">
                            Parcela {item.installmentNumber || 1}/{item.installmentTotal}x
                          </span>
                        )}
                      </div>
                    </div>
                    {idx < visibleItems.length - 1 && (
                      <div className="h-[1px] bg-[#f5f5f5] w-full" />
                    )}
                  </Link>
                );
              })
            ) : (
              <div className="p-6 text-center text-[#737373] text-[13px]">
                Nenhuma transação recente encontrada no banco de dados.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Review Modal for Quick Entries */}
      {reviewDraft && (
        <ReviewModal
          draft={reviewDraft}
          isOpen={Boolean(reviewDraft)}
          onClose={() => setReviewDraft(null)}
          onSuccess={(msg) => {
            setFeedbackToast(msg);
            setTimeout(() => setFeedbackToast(null), 4000);
            carregarDashboard();
          }}
        />
      )}
    </main>
  );
}
