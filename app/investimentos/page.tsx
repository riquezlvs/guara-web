"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  obterInvestimentos,
  ajustarSaldoInvestimento,
  removerInstituicao,
  InvestimentosData,
  InstituicaoItem,
} from "@/lib/api";

export default function InvestimentosPage() {
  const [data, setData] = useState<InvestimentosData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [periodoAtivo, setPeriodoAtivo] = useState<"1M" | "6M" | "1A" | "TUDO">("1A");

  // Modal Ajustar Saldo / Editar / Excluir
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [instituicaoSelecionada, setInstituicaoSelecionada] = useState<InstituicaoItem | null>(null);
  const [novoSaldoInput, setNovoSaldoInput] = useState("");
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [removendoInstituicao, setRemovendoInstituicao] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [mensagemAjuste, setMensagemAjuste] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await obterInvestimentos();
      if (resp.sucesso && resp.dados) {
        setData(resp.dados);
      }
    } catch (err) {
      console.warn("Erro ao carregar dados reais de investimentos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();

    const handleRefresh = () => carregarDados();
    window.addEventListener("finances:refresh", handleRefresh);
    return () => window.removeEventListener("finances:refresh", handleRefresh);
  }, [carregarDados]);

  // Abre modal para ajustar saldo ou excluir instituição
  const abrirModalAjuste = (inst?: InstituicaoItem) => {
    const alvo = inst || (data?.instituicoes && data.instituicoes[0]) || null;
    setInstituicaoSelecionada(alvo);
    setNovoSaldoInput(alvo ? alvo.balance.toFixed(2).replace(".", ",") : "");
    setMensagemAjuste(null);
    setConfirmandoExclusao(false);
    setModalAjusteAberto(true);
  };

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instituicaoSelecionada) return;

    const valorNumerico = parseFloat(
      novoSaldoInput.replace(/\./g, "").replace(",", ".")
    );

    if (isNaN(valorNumerico)) {
      setMensagemAjuste("Digite um valor numérico válido.");
      return;
    }

    setSalvandoAjuste(true);
    try {
      await ajustarSaldoInvestimento({
        accountId: instituicaoSelecionada.id,
        name: instituicaoSelecionada.name,
        novoSaldo: valorNumerico,
      });

      setMensagemAjuste("Saldo atualizado com sucesso!");
      window.dispatchEvent(new CustomEvent("finances:refresh"));
      setTimeout(() => {
        setModalAjusteAberto(false);
        carregarDados();
      }, 600);
    } catch (err: any) {
      setMensagemAjuste(err.message || "Erro ao atualizar saldo.");
    } finally {
      setSalvandoAjuste(false);
    }
  };

  const handleRemoverInstituicao = async () => {
    if (!instituicaoSelecionada) return;

    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true);
      return;
    }

    setRemovendoInstituicao(true);
    try {
      await removerInstituicao(instituicaoSelecionada.id);
      setMensagemAjuste("Instituição excluída com sucesso.");
      window.dispatchEvent(new CustomEvent("finances:refresh"));
      setTimeout(() => {
        setModalAjusteAberto(false);
        carregarDados();
      }, 600);
    } catch (err: any) {
      setMensagemAjuste(err.message || "Erro ao excluir instituição.");
    } finally {
      setRemovendoInstituicao(false);
      setConfirmandoExclusao(false);
    }
  };

  const totalNetWorth = data?.patrimonioTotal ?? 0;
  const variacaoPct = data?.variacaoMensalPct ?? 0;
  const variacaoValor = data?.variacaoMensalValor ?? 0;
  const alocacoes = data?.alocacao ?? [];
  const instituicoes = data?.instituicoes ?? [];
  const evolucaoPeriodo = data?.evolucaoHistorica?.[periodoAtivo];

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-44 px-4 max-w-md mx-auto bg-canvas min-h-screen">
      <div className="flex flex-col w-full gap-y-4 pb-6">
        {/* 1. Resumo de Patrimônio Consolidado */}
        <section className="bg-paper rounded-[24px] p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
              <span className="font-caption text-caption uppercase tracking-wider text-mid-gray">
                Patrimônio Líquido Total
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Editar Patrimônio"
                onClick={() => abrirModalAjuste()}
                className="h-8 px-2.5 rounded-[18px] bg-surface-alt flex items-center gap-1 text-ink font-label-sm text-label-sm shadow-[0_0_0_1px_rgba(23,23,23,0.06)] active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                aria-label="Ocultar valores"
                onClick={() => setIsHidden(!isHidden)}
                id="toggleVisibilityBtn"
                className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-mid-gray hover:text-ink active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isHidden ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2 min-h-[40px]">
              <span className="font-body-md text-body-md text-mid-gray">R$</span>
              {isLoading ? (
                <div className="flex items-center gap-2 h-9 text-mid-gray">
                  <span className="material-symbols-outlined text-[24px] animate-spin">
                    progress_activity
                  </span>
                  <span className="text-[13px] font-medium animate-pulse">
                    Consultando saldo real...
                  </span>
                </div>
              ) : (
                <h1
                  className="font-headline-2xl-mobile text-[36px] font-semibold text-ink tracking-tight leading-none"
                  id="totalValue"
                >
                  {isHidden
                    ? "••••••••"
                    : totalNetWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isLoading ? (
                <span className="text-[11px] text-mid-gray animate-pulse">Calculando variação...</span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[18px] bg-surface-alt text-ink font-label-sm text-label-sm shadow-[0_0_0_1px_rgba(23,23,23,0.06)]">
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    +{variacaoPct}% este mês
                  </span>
                  <span className="font-caption text-caption text-mid-gray">
                    +R$ {variacaoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons Bar - Fixed Grid Layout to prevent overflow / leaking */}
          <div className="pt-2 grid grid-cols-3 gap-1.5 w-full">
            <Link
              href="/investimentos/novo"
              className="h-9 rounded-[16px] bg-ink text-paper text-[12px] font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-xs px-1 min-w-0"
            >
              <span className="material-symbols-outlined text-[15px] shrink-0">add</span>
              <span className="truncate">Adicionar</span>
            </Link>
            <button
              type="button"
              onClick={() => abrirModalAjuste()}
              className="h-9 rounded-[16px] bg-surface-alt text-ink text-[12px] font-medium flex items-center justify-center gap-1 shadow-[0_0_0_1px_rgba(23,23,23,0.06)] active:scale-95 transition-transform cursor-pointer px-1 min-w-0"
            >
              <span className="material-symbols-outlined text-[15px] shrink-0">edit_note</span>
              <span className="truncate">Ajustar</span>
            </button>
            <Link
              href="/investimentos/extrato"
              className="h-9 rounded-[16px] bg-surface-alt text-ink text-[12px] font-medium flex items-center justify-center gap-1 shadow-[0_0_0_1px_rgba(23,23,23,0.06)] active:scale-95 transition-transform px-1 min-w-0"
            >
              <span className="material-symbols-outlined text-[15px] shrink-0">download</span>
              <span className="truncate">Extrato</span>
            </Link>
          </div>
        </section>

        {/* 2. Gráfico de Evolução Patrimonial */}
        <section className="bg-paper rounded-[24px] p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-label-md text-label-md text-ink font-semibold">Evolução Histórica</h2>
              <p className="font-caption text-caption text-mid-gray">Valorização patrimonial</p>
            </div>

            {/* Segmented Control de Período */}
            <div className="inline-flex p-1 rounded-[18px] bg-surface-alt shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
              {(["1M", "6M", "1A", "TUDO"] as const).map((periodo) => (
                <button
                  key={periodo}
                  type="button"
                  onClick={() => setPeriodoAtivo(periodo)}
                  className={`px-2.5 py-1 rounded-[14px] font-caption text-caption transition-all cursor-pointer ${
                    periodoAtivo === periodo
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                      : "text-mid-gray hover:text-ink"
                  }`}
                >
                  {periodo}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Graphic Canvas */}
          <div className="relative w-full pt-1 pb-1">
            <div className="absolute right-4 top-2 px-2 py-1 rounded-[10px] bg-surface-alt shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center gap-1.5 pointer-events-none z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
              <span className="font-caption text-caption text-ink font-medium">
                Hoje: {isLoading ? "..." : isHidden ? "••••••" : `R$ ${totalNetWorth.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
              </span>
            </div>

            {isLoading || !evolucaoPeriodo ? (
              <div className="w-full h-44 flex flex-col items-center justify-center gap-2 text-mid-gray">
                <span className="material-symbols-outlined text-[24px] animate-spin">
                  progress_activity
                </span>
                <span className="text-[12px] animate-pulse">Carregando evolução...</span>
              </div>
            ) : (
              <>
                <svg className="w-full h-44 overflow-visible" fill="none" viewBox="0 0 340 140" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="140" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.10" />
                      <stop offset="80%" stopColor="#0a0a0a" stopOpacity="0.01" />
                      <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.0" />
                    </linearGradient>
                    <pattern id="gridLines" width="68" height="35" patternUnits="userSpaceOnUse">
                      <path d="M 68 0 L 0 0 0 35" fill="none" stroke="#e5e5e5" strokeWidth="0.75" strokeDasharray="2 3" />
                    </pattern>
                  </defs>

                  {/* Grid de Apoio Acromático */}
                  <rect width="340" height="120" fill="url(#gridLines)" opacity="0.8" />

                  {/* Curva Preenchida e Linha Principal */}
                  <path
                    d={`${evolucaoPeriodo.pathD} L 340 135 L 0 135 Z`}
                    fill="url(#areaGradient)"
                  />
                  <path
                    d={evolucaoPeriodo.pathD}
                    stroke="#0a0a0a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Marcadores Pontuais */}
                  {evolucaoPeriodo.pontos.map((ponto, i) => {
                    const isLast = i === evolucaoPeriodo.pontos.length - 1;
                    return (
                      <circle
                        key={i}
                        cx={ponto.x}
                        cy={ponto.y}
                        r={isLast ? "4" : "3"}
                        fill={isLast ? "#0a0a0a" : "#ffffff"}
                        stroke={isLast ? "#ffffff" : "#0a0a0a"}
                        strokeWidth={isLast ? "2" : "1.5"}
                      />
                    );
                  })}
                </svg>

                <div className="flex justify-between items-center px-1 pt-2 font-caption text-caption text-mid-gray">
                  {evolucaoPeriodo.labels.map((lbl, idx) => (
                    <span key={idx}>{lbl}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 3. Guará IA Insights Card */}
        <section className="bg-surface-alt rounded-[24px] p-4 shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              </div>
              <span className="font-label-sm text-label-sm text-ink font-semibold">
                Diagnóstico Guará IA
              </span>
            </div>
            <span className="font-caption text-caption uppercase text-mid-gray px-1.5 py-0.5 rounded-[6px] bg-paper shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
              Projeção
            </span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-mid-gray text-[12px]">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              <span>Analisando rentabilidade da carteira...</span>
            </div>
          ) : (
            <p className="font-body-sm text-body-sm text-ink-soft leading-relaxed">
              Sua carteira rendeu <strong className="font-semibold text-ink">118% do CDI</strong> no último período. Com aportes de <span className="font-mono text-[12px] bg-paper px-1.5 py-0.5 rounded-[6px] shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">R$ 1.500/mês</span>, sua meta de R$ 200.000 será atingida em <strong className="font-semibold text-ink">14 meses</strong>.
            </p>
          )}
        </section>

        {/* 4. Alocação por Classe de Ativos - Baseada 100% em Dados Reais */}
        <section className="bg-paper rounded-[24px] p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-label-md text-label-md text-ink font-semibold">Alocação de Ativos</h2>
              <p className="font-caption text-caption text-mid-gray">Distribuição real da carteira</p>
            </div>
            <span className="material-symbols-outlined text-mid-gray text-[18px]">pie_chart</span>
          </div>

          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-mid-gray">
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              <span className="text-[12px] animate-pulse">Calculando alocação real...</span>
            </div>
          ) : alocacoes.length === 0 ? (
            <div className="py-4 text-center text-[12px] text-mid-gray">
              Nenhum ativo cadastrado. Clique em &quot;Adicionar Ativo&quot; para iniciar sua carteira.
            </div>
          ) : (
            <>
              {/* Barra de Alocação Segmentada Horizontal */}
              <div className="w-full flex flex-col gap-1.5">
                <div className="h-2.5 w-full rounded-full bg-surface-variant overflow-hidden flex p-0.5 gap-0.5">
                  {alocacoes
                    .filter((item) => item.percentage > 0)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                        title={`${item.name}: ${item.percentage}%`}
                      />
                    ))}
                </div>
                <div className="flex justify-between items-center text-[10px] font-caption text-mid-gray px-0.5 flex-wrap gap-1">
                  {alocacoes.map((item) => (
                    <span key={item.id}>{item.badge}</span>
                  ))}
                </div>
              </div>

              {/* Lista Detalhada das Classes Reais */}
              <div className="flex flex-col divide-y divide-hairline">
                {alocacoes.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-col truncate">
                        <span className="font-label-sm text-label-sm text-ink truncate font-medium">
                          {item.name}
                        </span>
                        <span className="font-caption text-caption text-mid-gray truncate">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-label-sm text-label-sm text-ink font-mono font-medium">
                        {isHidden ? "••••••" : `R$ ${item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </p>
                      <span className="font-caption text-caption text-mid-gray font-medium">
                        {item.percentage.toFixed(1).replace(".", ",")}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 5. Instituições & Custódia (Nubank com 115% CDI, XP, etc.) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-label-md text-label-md text-ink font-semibold">Instituições Conectadas</h2>
            <div className="flex items-center gap-2">
              <span className="font-caption text-caption text-mid-gray uppercase tracking-wider text-[11px]">
                {isLoading ? "..." : `${instituicoes.length} Contas`}
              </span>
              <button
                type="button"
                onClick={() => abrirModalAjuste()}
                className="font-caption text-caption text-ink font-medium flex items-center gap-0.5 active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">tune</span>
                <span>Gerenciar</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {isLoading ? (
              <div className="py-8 bg-paper rounded-[24px] flex flex-col items-center justify-center gap-2 text-mid-gray border border-black/5">
                <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
                <span className="text-[12px] animate-pulse">Carregando contas conectadas...</span>
              </div>
            ) : instituicoes.length === 0 ? (
              <div className="py-6 px-4 bg-paper rounded-[24px] text-center text-[12px] text-mid-gray border border-black/5">
                Nenhuma instituição conectada encontrada.
              </div>
            ) : (
              instituicoes.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-paper rounded-[24px] p-4 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[14px] bg-surface-alt shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-center font-mono font-semibold text-ink text-sm shrink-0">
                      {inst.sigla}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-label-sm text-label-sm text-ink font-semibold truncate">
                        {inst.name}
                      </span>
                      <span className="font-caption text-caption text-mid-gray truncate">
                        {inst.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-label-sm text-label-sm text-ink font-mono font-medium">
                        {isHidden ? "••••••" : `R$ ${inst.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      </span>
                      <p className="font-caption text-caption text-mid-gray">
                        {inst.monthlyVariation}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Editar ${inst.name}`}
                      onClick={() => abrirModalAjuste(inst)}
                      className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.06)] active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal Interativo para Ajustar Saldo / Editar / Excluir Instituição */}
      {modalAjusteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-[14px] bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a]">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#0a0a0a] tracking-tight">
                    Editar Instituição
                  </h3>
                  <span className="text-[12px] text-[#737373]">
                    {instituicaoSelecionada?.name || "Gerenciamento de Conta"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAjusteAberto(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSalvarAjuste} className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium">
                  Instituição Selecionada
                </label>
                <select
                  value={instituicaoSelecionada?.id || ""}
                  onChange={(e) => {
                    const inst = instituicoes.find((i) => i.id === e.target.value);
                    if (inst) {
                      setInstituicaoSelecionada(inst);
                      setNovoSaldoInput(inst.balance.toFixed(2).replace(".", ","));
                      setConfirmandoExclusao(false);
                    }
                  }}
                  className="w-full h-11 px-3 bg-[#fafafa] rounded-[18px] text-[13px] text-[#0a0a0a] font-medium outline-none border border-black/5 cursor-pointer"
                >
                  {instituicoes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium">
                  Novo Saldo Consolidado
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[14px] text-[#737373] font-mono">
                    R$
                  </span>
                  <input
                    type="text"
                    value={novoSaldoInput}
                    onChange={(e) => setNovoSaldoInput(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-11 pl-10 pr-3 bg-[#fafafa] rounded-[18px] text-[15px] text-[#0a0a0a] font-mono outline-none border border-black/5 focus:bg-white focus:border-black/20"
                    required
                  />
                </div>
              </div>

              {mensagemAjuste && (
                <div
                  className={`p-2.5 rounded-[14px] text-[12px] ${
                    mensagemAjuste.includes("sucesso")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {mensagemAjuste}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalAjusteAberto(false)}
                  className="flex-1 h-10 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] text-[13px] font-medium hover:bg-[#e8e8e8] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAjuste}
                  className="flex-1 h-10 rounded-[18px] bg-black text-white text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoAjuste ? "Salvando..." : "Salvar Saldo"}
                </button>
              </div>

              {/* Botão de Excluir / Apagar Instituição */}
              <div className="pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={handleRemoverInstituicao}
                  disabled={removendoInstituicao}
                  className={`w-full h-9 rounded-[16px] text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    confirmandoExclusao
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>
                    {confirmandoExclusao
                      ? "Confirmar exclusão definitiva?"
                      : "Apagar Esta Instituição"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
