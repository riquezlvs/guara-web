"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { obterDashboard, DashboardResponse, DashboardRecentItem, interpretarTransacao, TransactionDraft } from "@/lib/api";
import { ReviewModal } from "@/components/transaction/review-modal";

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

  // Quick Prompt & Review Modal state
  const [quickInput, setQuickInput] = useState("");
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<TransactionDraft | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Timeframe filter for Evolution chart
  const [activeRange, setActiveRange] = useState<"7D" | "30D" | "6M">("30D");

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

  // Metas / Caixinhas
  const primeiraMeta = useMemo(() => {
    if (!dashboardData?.poupanca || dashboardData.poupanca.length === 0) return null;
    const meta = dashboardData.poupanca[0];
    const pct = meta.alvo > 0 ? Math.round((meta.poupado / meta.alvo) * 100) : 0;
    return { ...meta, percentual: pct };
  }, [dashboardData]);

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
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Saldo Safe-to-Spend
            </span>
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
                R$ {safeMetrics.safeToSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h1>
            )}
          </div>

          <div className="text-[12px] text-[#737373] min-h-[18px]">
            {isLoading ? (
              <span className="animate-pulse">Consultando dados no banco...</span>
            ) : (
              <span>
                Disponível para gastar nos próximos{" "}
                <span className="font-semibold text-[#0a0a0a]">{safeMetrics.daysLeft} dias</span> do mês (média de R${" "}
                {safeMetrics.dailyAllowance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia)
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
                R$ {(dashboardData?.patrimonio?.totalNetWorth ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                  : `R$ ${(dashboardData?.patrimonio?.openCreditInvoices?.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </span>
              <div className="text-[10px] text-[#737373]">
                {dashboardData?.patrimonio?.openCreditInvoices?.cards?.[0]?.name || "Cartões em aberto"}
              </div>
            </div>
          </div>
        </Link>

        {/* 4. Fluxo Mensal & Evolução (Area / Line Chart) */}
        <div className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Fluxo & Evolução
            </span>
            <div className="flex gap-1 bg-[#f5f5f5] p-0.5 rounded-[12px]">
              <button
                type="button"
                onClick={() => setActiveRange("7D")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  activeRange === "7D" ? "bg-white text-[#0a0a0a] shadow-sm font-semibold" : "text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setActiveRange("30D")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-[10px] transition-colors cursor-pointer ${
                  activeRange === "30D" ? "bg-white text-[#0a0a0a] shadow-sm font-semibold" : "text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => setActiveRange("6M")}
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
                ) : (
                  `R$ ${chartPoints.totalPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                )}
              </span>
              <span className="text-[12px] text-[#737373] block">
                {activeRange === "7D"
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

          {/* Native High-Performance SVG Chart */}
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

                {/* Point markers */}
                {chartPoints.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === chartPoints.points.length - 1 ? "3.5" : "2"}
                    fill={i === chartPoints.points.length - 1 ? "#0a0a0a" : "#737373"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
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

        {/* 5. Gastos por Categoria (Monochrome Donut Chart) */}
        <div className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.05em] text-[#737373] font-medium">
              Categorias ({donutData.rotuloMes})
            </span>
            <span className="text-[11px] font-mono text-[#737373]">
              {isLoading ? "..." : `R$ ${donutData.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
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
                    />

                    {/* Dynamic colored segments */}
                    {donutData.segments.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={seg.cor}
                        strokeWidth="12"
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                    ))}
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase text-[#737373] tracking-wider leading-none">
                      Total
                    </span>
                    <span className="text-[13px] font-semibold text-[#0a0a0a] leading-tight font-mono">
                      R$ {donutData.total >= 1000 ? `${(donutData.total / 1000).toFixed(1)}k` : donutData.total.toFixed(0)}
                    </span>
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
                donutData.segments.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      ></span>
                      <span className="text-[#0a0a0a] truncate">{cat.categoria}</span>
                    </div>
                    <span className="font-mono text-[#737373] text-[11px] shrink-0 ml-2">
                      {cat.percentual}%
                    </span>
                  </div>
                ))
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
            <span className="text-[11px] font-mono text-[#737373] bg-[#f5f5f5] px-2 py-0.5 rounded-[12px]">
              100% CDI
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-4 gap-2 text-[#737373]">
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
              <span className="text-[13px] text-[#737373]">Carregando metas...</span>
            </div>
          ) : primeiraMeta ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[18px] font-semibold text-[#0a0a0a]">
                  R$ {primeiraMeta.poupado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[12px] text-[#737373]">
                  Meta: R$ {primeiraMeta.alvo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({primeiraMeta.percentual}%)
                </span>
              </div>

              {/* Minimalist Progress Track */}
              <div className="w-full h-1.5 bg-[#f5f5f5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0a0a0a] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(primeiraMeta.percentual, 100)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[12px] text-[#737373]">{primeiraMeta.nome}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerQuickEntry(`Aporte 500 na ${primeiraMeta.nome}`)}
                  className="text-[11px] text-[#0a0a0a] font-medium hover:underline cursor-pointer"
                >
                  Adicionar aporte
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-[#737373] text-[12px]">
              Nenhuma meta cadastrada ainda. Diga ex: &quot;Guardar 500 para reserva&quot;.
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
                            <span className="px-1.5 py-0.5 text-[10px] tracking-tight uppercase bg-[#f5f5f5] text-[#737373] rounded-md font-normal">
                              {categoriaNome}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#737373]">
                            {item.installmentTotal && item.installmentNumbers.length > 0
                              ? `Parcelas ${item.installmentNumbers.join(", ")} de ${item.installmentTotal} • `
                              : `${dataFormatada} via `}
                            {item.payment_method?.replace("_", " ") || "Transação"}
                          </span>
                        </div>
                      </div>
                      <span className="text-right text-[14px] font-semibold text-[#0a0a0a] whitespace-nowrap pl-2 font-mono">
                        <span className="block">
                          -R$ {Number(item.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        {item.installmentTotal && (
                          <span className="block text-[10px] font-normal text-[#737373]">por parcela</span>
                        )}
                      </span>
                    </div>
                    {idx < visibleItems.length - 1 && (
                      <div className="h-[1px] bg-[#f5f5f5] w-full" />
                    )}
                  </div>
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
