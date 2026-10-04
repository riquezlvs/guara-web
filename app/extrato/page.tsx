"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  obterExtrato,
  ExtratoResponse,
  ItemExtrato,
  RecorrenciaMesItem,
  listarTodasRecorrencias,
} from "@/lib/api";

export default function ExtratoPage() {
  const [extratoData, setExtratoData] = useState<ExtratoResponse["dados"] | null>(null);
  const [isLoadingExtrato, setIsLoadingExtrato] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced" | "error">("syncing");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [filterPill, setFilterPill] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecorrenciasOpen, setIsRecorrenciasOpen] = useState(true);
  const [recorrenciasTab, setRecorrenciasTab] = useState<"todas" | "entradas" | "saidas">("todas");

  const carregarExtrato = useCallback(async (mesAno?: string) => {
    setIsLoadingExtrato(true);
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const resp = await obterExtrato(mesAno);
      if (resp.sucesso && resp.dados) {
        // Fallback: se o backend não enviou a lista calculada de recorrências, busca diretamente
        if (!resp.dados.recorrencias || resp.dados.recorrencias.length === 0) {
          try {
            const recResp = await listarTodasRecorrencias();
            if (recResp.sucesso && recResp.dados && recResp.dados.length > 0) {
              const mesAlvo = resp.dados.mesAno || new Date().toISOString().slice(0, 7);
              const [anoStr, mesStr] = mesAlvo.split("-");
              const ano = parseInt(anoStr, 10);
              const mesIdx = parseInt(mesStr, 10) - 1;

              const formatadas: RecorrenciaMesItem[] = recResp.dados.map((r) => {
                const dia = Math.min(31, Math.max(1, r.day_of_month || 5));
                const dataEfetivaFormatada = `${ano}-${String(mesIdx + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const descLower = (r.description || "").toLowerCase().trim();
                const jaRealizada = (resp.dados.itens || []).some((t) => {
                  const tDesc = (t.description || "").toLowerCase().trim();
                  return (
                    t.entry_type === r.entry_type &&
                    (Boolean(t.is_recurring) || tDesc.includes(descLower) || descLower.includes(tDesc))
                  );
                });

                return {
                  id: r.id,
                  description: r.description,
                  total_amount: Number(r.total_amount),
                  day_of_month: dia,
                  dataEfetivaFormatada,
                  entry_type: r.entry_type,
                  income_type: r.income_type,
                  weekend_rule: r.weekend_rule,
                  payment_method: r.payment_method,
                  status: jaRealizada ? "realizada" : "prevista",
                };
              });

              resp.dados.recorrencias = formatadas;
            }
          } catch (eFallback) {
            console.warn("Fallback de recorrências:", eFallback);
          }
        }
        setExtratoData(resp.dados);
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
        setSyncError(resp.mensagem || "Falha ao obter dados do extrato");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backend offline ou não conectado";
      console.warn("Backend offline ou não conectado ao carregar extrato:", err);
      setSyncStatus("error");
      setSyncError(msg);
    } finally {
      setIsLoadingExtrato(false);
    }
  }, []);

  useEffect(() => {
    carregarExtrato();

    const handleRefresh = () => {
      carregarExtrato();
    };
    window.addEventListener("finances:refresh", handleRefresh);
    return () => {
      window.removeEventListener("finances:refresh", handleRefresh);
    };
  }, [carregarExtrato]);

  const handleMudarMes = (delta: number) => {
    const atual = extratoData?.mesAno || new Date().toISOString().slice(0, 7);
    const [anoStr, mesStr] = atual.split("-");
    const d = new Date(parseInt(anoStr), parseInt(mesStr) - 1 + delta, 1);
    const novoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    carregarExtrato(novoMes);
  };

  const transacoes = extratoData?.itens || [];
  const recorrencias = extratoData?.recorrencias || [];

  // Função utilitária para obter a chave única da compra completa caso seja parcelada
  const getInstallmentBaseKey = (t: ItemExtrato) => {
    if (t.installment_group_id) {
      return `group-${t.installment_group_id}`;
    }
    if (t.installment_total && t.installment_total > 1) {
      // Normaliza removendo sufixos como (1/10), 1/10 etc.
      const descBase = t.description.replace(/\s*\(?\d+\/\d+\)?\s*$/i, "").trim().toLowerCase();
      return `desc-${descBase}-${t.installment_total}-${t.payment_method}`;
    }
    return null;
  };

  // Filtragem inicial (tipo, método de pagamento, recorrência e busca)
  const filtradas = transacoes.filter((item: ItemExtrato) => {
    if (filterPill === "Entradas" && item.entry_type !== "income") return false;
    if (filterPill === "Saídas" && item.entry_type !== "expense") return false;
    if (filterPill === "Recorrentes") {
      const ehRecorrente = Boolean(item.is_recurring);
      const descItemLower = (item.description || "").toLowerCase().trim();
      const bateRegra = recorrencias.some((r) => {
        const rDescLower = (r.description || "").toLowerCase().trim();
        return (
          r.entry_type === item.entry_type &&
          (descItemLower === rDescLower || descItemLower.includes(rDescLower) || rDescLower.includes(descItemLower))
        );
      });
      if (!ehRecorrente && !bateRegra) return false;
    }
    if (filterPill === "pix" && item.payment_method !== "pix") return false;
    if (filterPill === "credit_card" && item.payment_method !== "credit_card") return false;
    if (filterPill === "debit_card" && item.payment_method !== "debit_card") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCat = item.categories?.name?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat) return false;
    }
    return true;
  });

  // Mostra a compra completa apenas uma vez no extrato (mantendo a parcela deste mês e o valor da parcela)
  const dedupedMap = new Map<string, ItemExtrato>();
  const itensUnicos: ItemExtrato[] = [];

  filtradas.forEach((item: ItemExtrato) => {
    const installmentKey = getInstallmentBaseKey(item);
    if (installmentKey) {
      if (!dedupedMap.has(installmentKey)) {
        dedupedMap.set(installmentKey, item);
        itensUnicos.push(item);
      }
    } else {
      itensUnicos.push(item);
    }
  });

  const grupos: { [data: string]: ItemExtrato[] } = {};
  itensUnicos.forEach((t: ItemExtrato) => {
    const dataIso = t.occurred_at ? t.occurred_at.slice(0, 10) : "outros";
    if (!grupos[dataIso]) grupos[dataIso] = [];
    grupos[dataIso].push(t);
  });

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-48 px-4 max-w-md mx-auto">
      <div className="flex flex-col w-full gap-4 text-[#0a0a0a]">
        {/* Top Bar & Meta Navigation */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="w-9 h-9 rounded-[18px] bg-white border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#0a0a0a] hover:bg-[#fafafa] active:scale-95 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">
                arrow_back
              </span>
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[20px] font-semibold text-[#0a0a0a] tracking-tight">
                  Extrato
                </h1>
                <button
                  type="button"
                  onClick={() => carregarExtrato(extratoData?.mesAno)}
                  title={
                    syncStatus === "error"
                      ? `Erro de conexão com o backend: ${syncError || "Offline"}. Clique para tentar novamente.`
                      : syncStatus === "syncing"
                      ? "Sincronizando com o backend..."
                      : "Sincronizado com sucesso. Clique para atualizar."
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[18px] font-mono text-[11px] transition-all cursor-pointer active:scale-95 ${
                    syncStatus === "error"
                      ? "bg-rose-50 text-rose-700 shadow-[0_0_0_1px_rgba(244,63,94,0.3)] hover:bg-rose-100"
                      : syncStatus === "syncing"
                      ? "bg-amber-50 text-amber-700 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]"
                      : "bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.06)] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === "error"
                        ? "bg-rose-500 animate-pulse"
                        : syncStatus === "syncing"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-emerald-500"
                    }`}
                  />
                  {syncStatus === "error"
                    ? "Erro de conexão"
                    : syncStatus === "syncing"
                    ? "Sincronizando..."
                    : "Sincronizado"}
                  {syncStatus === "error" && (
                    <span className="material-symbols-outlined text-[12px] leading-none">refresh</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => carregarExtrato(extratoData?.mesAno)}
              className="h-9 px-3 rounded-[18px] bg-white text-[#0a0a0a] border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-[12px] flex items-center gap-1.5 hover:bg-[#fafafa] active:scale-95 transition-all font-medium"
            >
              <span className="material-symbols-outlined text-[17px] text-[#737373]">
                refresh
              </span>
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Alerta de erro de conexão */}
        {syncStatus === "error" && (
          <div className="p-3 bg-rose-50/90 rounded-[16px] border border-rose-200 flex items-center justify-between gap-3 text-[12px] text-rose-900 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">
                cloud_off
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-rose-950 truncate">Sem conexão com o backend</p>
                <p className="text-[11px] text-rose-700 truncate" title={syncError || undefined}>
                  {syncError || "Verifique se o backend está em execução na porta 3001."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => carregarExtrato(extratoData?.mesAno)}
              className="px-2.5 py-1 bg-white hover:bg-rose-100/60 text-rose-800 text-[11px] font-medium border border-rose-200 rounded-full shrink-0 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              Reconectar
            </button>
          </div>
        )}

        {/* Smart Search */}
        <div className="relative w-full">
          <div className="relative flex items-center bg-white rounded-[18px] px-3.5 py-1.5 border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:ring-1 focus-within:ring-black transition-all">
            <span className="material-symbols-outlined text-[#737373] text-[19px] mr-2">
              search
            </span>
            <Input
              className="w-full bg-transparent border-0 shadow-none text-[13px] text-[#0a0a0a] placeholder:text-[#737373] h-8 p-0 focus-visible:ring-0"
              placeholder="Buscar gastos, entradas ou categorias..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#737373] hover:text-[#0a0a0a] text-[12px] px-1"
              >
                limpar
              </button>
            )}
          </div>
        </div>

        {/* Period & Stat Summary Card */}
        <Card className="w-full rounded-[24px] bg-white p-4 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          {/* Header Month Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMudarMes(-1)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-100 text-[#737373] transition-colors"
                title="Mês anterior"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight capitalize">
                {extratoData?.rotuloMes || "Mês Atual"}
              </span>
              <button
                type="button"
                onClick={() => handleMudarMes(1)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-100 text-[#737373] transition-colors"
                title="Próximo mês"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
            <div className="text-right">
              <span className="text-[#737373] uppercase tracking-wider block text-[10px] font-medium">
                Líquido no Mês
              </span>
              {isLoadingExtrato ? (
                <div className="flex justify-end pt-1">
                  <span className="material-symbols-outlined text-[16px] animate-spin text-[#737373]">
                    progress_activity
                  </span>
                </div>
              ) : (
                <span className={`text-[14px] font-semibold tracking-tight ${
                  (extratoData?.liquidoNoMes || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}>
                  {(extratoData?.liquidoNoMes || 0) >= 0 ? "+" : ""}
                  R$ {(extratoData?.liquidoNoMes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          {/* Balance Split */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 rounded-[18px] bg-[#fafafa] border border-black/[0.04] flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[#737373]">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">
                  north_east
                </span>
                <span className="text-[11px] uppercase font-medium tracking-wider">
                  Entradas
                </span>
              </div>
              <div className="min-h-[24px] flex items-center">
                {isLoadingExtrato ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin text-[#737373]">
                    progress_activity
                  </span>
                ) : (
                  <span className="text-[16px] font-semibold text-[#0a0a0a]">
                    R$ {(extratoData?.totalEntradas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-[18px] bg-[#fafafa] border border-black/[0.04] flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[#737373]">
                <span className="material-symbols-outlined text-[15px] text-rose-500">
                  south_west
                </span>
                <span className="text-[11px] uppercase font-medium tracking-wider">
                  Saídas
                </span>
              </div>
              <div className="min-h-[24px] flex items-center">
                {isLoadingExtrato ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin text-[#737373]">
                    progress_activity
                  </span>
                ) : (
                  <span className="text-[16px] font-semibold text-[#0a0a0a]">
                    R$ {(extratoData?.totalSaidas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Recorrências do Mês Card */}
        {(() => {
          const recorrenciasDoMes = extratoData?.recorrencias || [];
          const totais = extratoData?.totaisRecorrentes || {
            totalEntradasPrevistas: recorrenciasDoMes
              .filter((r) => r.entry_type === "income")
              .reduce((acc, r) => acc + Number(r.total_amount), 0),
            totalSaidasPrevistas: recorrenciasDoMes
              .filter((r) => r.entry_type === "expense")
              .reduce((acc, r) => acc + Number(r.total_amount), 0),
            totalEntradasRealizadas: 0,
            totalSaidasRealizadas: 0,
            saldoLiquidoRecorrente: 0,
          };

          const totalEntradasRecorrentes = totais.totalEntradasPrevistas;
          const totalSaidasRecorrentes = totais.totalSaidasPrevistas;
          const saldoRecorrente =
            totais.saldoLiquidoRecorrente !== undefined
              ? totais.saldoLiquidoRecorrente
              : totalEntradasRecorrentes - totalSaidasRecorrentes;

          const recorrenciasFiltradas = recorrenciasDoMes.filter((r) => {
            if (recorrenciasTab === "entradas") return r.entry_type === "income";
            if (recorrenciasTab === "saidas") return r.entry_type === "expense";
            return true;
          });

          if (recorrenciasDoMes.length === 0) {
            return null;
          }

          return (
            <Card className="w-full rounded-[24px] bg-white p-4 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
              {/* Header with expand/collapse */}
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsRecorrenciasOpen(!isRecorrenciasOpen)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[12px] bg-black text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[17px]">event_repeat</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-[14px] font-semibold text-[#0a0a0a] tracking-tight">
                        Recorrências do Mês
                      </h2>
                      <span className="px-1.5 py-0 rounded-[6px] text-[10px] bg-[#f5f5f5] text-[#737373] font-mono">
                        {recorrenciasDoMes.length}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#737373]">
                      Salários, freelas e contas fixas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#737373] block font-medium">
                      Previsto
                    </span>
                    <span
                      className={`text-[13px] font-semibold tracking-tight ${
                        saldoRecorrente >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {saldoRecorrente >= 0 ? "+" : ""}
                      R$ {saldoRecorrente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-100 text-[#737373] transition-colors cursor-pointer"
                    aria-label={isRecorrenciasOpen ? "Recolher" : "Expandir"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isRecorrenciasOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>
              </div>

              {isRecorrenciasOpen && (
                <div className="flex flex-col gap-3 pt-1 animate-in fade-in duration-200">
                  {/* Subtabs: Todas / Entradas / Saídas */}
                  <div className="flex items-center justify-between gap-1 bg-[#f5f5f5] p-1 rounded-[16px]">
                    <button
                      type="button"
                      onClick={() => setRecorrenciasTab("todas")}
                      className={`flex-1 py-1 px-2 rounded-[12px] text-[11px] font-medium transition-all text-center cursor-pointer ${
                        recorrenciasTab === "todas"
                          ? "bg-white text-[#0a0a0a] shadow-xs font-semibold"
                          : "text-[#737373] hover:text-[#0a0a0a]"
                      }`}
                    >
                      Todas ({recorrenciasDoMes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecorrenciasTab("entradas")}
                      className={`flex-1 py-1 px-2 rounded-[12px] text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        recorrenciasTab === "entradas"
                          ? "bg-white text-emerald-700 shadow-xs font-semibold"
                          : "text-[#737373] hover:text-emerald-700"
                      }`}
                    >
                      <span>Entradas</span>
                      <span className="text-[10px] opacity-75">
                        (+R${" "}
                        {totalEntradasRecorrentes.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                        )
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecorrenciasTab("saidas")}
                      className={`flex-1 py-1 px-2 rounded-[12px] text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                        recorrenciasTab === "saidas"
                          ? "bg-white text-rose-600 shadow-xs font-semibold"
                          : "text-[#737373] hover:text-rose-600"
                      }`}
                    >
                      <span>Saídas</span>
                      <span className="text-[10px] opacity-75">
                        (-R${" "}
                        {totalSaidasRecorrentes.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                        )
                      </span>
                    </button>
                  </div>

                  {/* List of Recurring Items */}
                  <div className="flex flex-col gap-1.5">
                    {recorrenciasFiltradas.length === 0 ? (
                      <div className="py-4 text-center text-[#737373] text-[12px]">
                        Nenhuma recorrência nesta categoria.
                      </div>
                    ) : (
                      recorrenciasFiltradas.map((r) => {
                        const isIncome = r.entry_type === "income";
                        const iconName = isIncome
                          ? r.income_type === "salary"
                            ? "work"
                            : r.income_type === "freelance"
                            ? "computer"
                            : r.income_type === "benefit"
                            ? "restaurant"
                            : "payments"
                          : r.payment_method === "credit_card"
                          ? "credit_card"
                          : "repeat";

                        const tagLabel = isIncome
                          ? r.income_type === "salary"
                            ? "Salário"
                            : r.income_type === "freelance"
                            ? "Freelance"
                            : r.income_type === "benefit"
                            ? "Benefício"
                            : "Receita Fixa"
                          : "Despesa Fixa";

                        const isRealizada = r.status === "realizada";

                        let dataFormatada = `Todo dia ${String(r.day_of_month).padStart(2, "0")}`;
                        if (r.dataEfetivaFormatada) {
                          try {
                            const [, m, d] = r.dataEfetivaFormatada.split("-");
                            dataFormatada = `Dia ${d}/${m}`;
                          } catch {}
                        }

                        return (
                          <div
                            key={r.id}
                            className="p-3 rounded-[16px] bg-[#fafafa] border border-black/[0.04] flex items-center justify-between gap-2.5 transition-all hover:bg-neutral-100/70"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 ${
                                  isIncome
                                    ? r.income_type === "salary"
                                      ? "bg-emerald-100/80 text-emerald-700"
                                      : r.income_type === "freelance"
                                      ? "bg-sky-100/80 text-sky-700"
                                      : "bg-amber-100/80 text-amber-700"
                                    : "bg-[#ececec] text-[#0a0a0a]"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  {iconName}
                                </span>
                              </div>

                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[13px] font-semibold text-[#0a0a0a] truncate">
                                    {r.description}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0 rounded-[6px] text-[9px] font-medium uppercase tracking-wider ${
                                      isIncome
                                        ? "bg-emerald-50 text-emerald-800"
                                        : "bg-neutral-200/60 text-[#737373]"
                                    }`}
                                  >
                                    {tagLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-[#737373] truncate">
                                  <span>{dataFormatada}</span>
                                  {r.account_name && (
                                    <>
                                      <span>•</span>
                                      <span>{r.account_name}</span>
                                    </>
                                  )}
                                  {r.payment_method && (
                                    <>
                                      <span>•</span>
                                      <span className="capitalize">{r.payment_method}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                              <span
                                className={`text-[13px] font-semibold ${
                                  isIncome ? "text-emerald-700" : "text-[#0a0a0a]"
                                }`}
                              >
                                {isIncome ? "+" : "-"}R${" "}
                                {Number(r.total_amount).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium ${
                                  isRealizada
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[11px]">
                                  {isRealizada ? "check_circle" : "schedule"}
                                </span>
                                <span>{isRealizada ? "No extrato" : "Previsto"}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Link to /renda-recorrente */}
                  <div className="pt-1 flex items-center justify-between border-t border-black/[0.04]">
                    <span className="text-[11px] text-[#737373]">
                      {totais.totalEntradasRealizadas > 0
                        ? `R$ ${totais.totalEntradasRealizadas.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })} em entradas já confirmadas`
                        : "Acompanhe suas entradas e saídas planejadas"}
                    </span>
                    <Link
                      href="/renda-recorrente"
                      className="text-[11px] font-medium text-[#0a0a0a] hover:underline flex items-center gap-0.5"
                    >
                      <span>Gerenciar</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          );
        })()}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["Todos", "Entradas", "Saídas", "Recorrentes", "pix", "credit_card", "debit_card"].map((pill) => {
            const rotulo =
              pill === "pix"
                ? "PIX"
                : pill === "credit_card"
                ? "Cartão Crédito"
                : pill === "debit_card"
                ? "Débito"
                : pill;
            const isSelected = filterPill === pill;
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setFilterPill(pill)}
                className={`px-3 py-1 rounded-[14px] text-[11px] font-medium tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-black text-white shadow-xs"
                    : "bg-white text-[#737373] border border-black/5 hover:text-[#0a0a0a]"
                }`}
              >
                {rotulo}
              </button>
            );
          })}
        </div>

        {/* Transaction Items Grouped by Date */}
        {isLoadingExtrato ? (
          <Card className="rounded-[24px] border border-black/5 bg-white p-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-[#737373] animate-spin">
              progress_activity
            </span>
            <span className="text-[14px] font-medium text-[#0a0a0a]">
              Carregando lançamentos do extrato...
            </span>
            <span className="text-[12px] text-[#737373] max-w-xs">
              Buscando e agrupando transações reais do banco de dados
            </span>
          </Card>
        ) : filtradas.length === 0 ? (
          <Card className="rounded-[24px] border border-black/5 bg-white p-8 text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-[#737373]">
              receipt_long
            </span>
            <span className="text-[14px] font-medium text-[#0a0a0a]">
              Nenhum lançamento encontrado
            </span>
            <span className="text-[12px] text-[#737373] max-w-xs">
              Não há transações cadastradas para o período ou filtro selecionado.
            </span>
          </Card>
        ) : (
          Object.entries(grupos).map(([dataStr, itens]) => {
            let labelData = dataStr;
            try {
              const [ano, mes, dia] = dataStr.split("-").map(Number);
              const d = new Date(ano, mes - 1, dia);
              labelData = d.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
              });
            } catch {}

            const saldoDia = itens.reduce((acc, cur) => {
              const val = Number(cur.total_amount);
              return cur.entry_type === "income" ? acc + val : acc - val;
            }, 0);

            return (
              <div key={dataStr} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                    {labelData}
                  </span>
                  <span className={`text-[11px] font-medium ${saldoDia >= 0 ? "text-emerald-700" : "text-[#737373]"}`}>
                    {saldoDia >= 0 ? "+" : ""}R$ {saldoDia.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Card className="rounded-[20px] bg-white border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-black/[0.04] p-0">
                  {itens.map((t) => {
                    const isIncome = t.entry_type === "income";
                    const horaFormatada = t.occurred_at
                      ? new Date(t.occurred_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                      : "";
                    const categoria = t.categories?.name || "Geral";
                    const isParcelado = Boolean(t.installment_total && t.installment_total > 1);
                    const descricaoLimpa = isParcelado
                      ? t.description.replace(/\s*\(?\d+\/\d+\)?\s*$/i, "").trim()
                      : t.description;

                    return (
                      <Link
                        key={t.display_id}
                        href={`/extrato/${t.display_id}`}
                        className="p-3.5 flex items-center justify-between hover:bg-[#fafafa] transition-colors focus-visible:bg-[#fafafa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-[18px] flex items-center justify-center shrink-0 ${
                            isIncome ? "bg-emerald-50 text-emerald-600" : "bg-[#f5f5f5] text-[#0a0a0a]"
                          }`}>
                            <span className="material-symbols-outlined text-[18px]">
                              {isIncome
                                ? "arrow_downward"
                                : t.payment_method === "pix"
                                ? "payments"
                                : t.payment_method === "credit_card"
                                ? "credit_card"
                                : "receipt_long"}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-medium text-[#0a0a0a] truncate">
                                {descricaoLimpa}
                              </span>
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[9px] uppercase bg-[#f5f5f5] text-[#737373] border-0 font-normal shrink-0"
                              >
                                {categoria}
                              </Badge>
                              {Boolean(t.is_recurring) && (
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 text-[9px] uppercase bg-amber-50 text-amber-700 border border-amber-200/60 font-medium shrink-0 flex items-center gap-0.5"
                                >
                                  <span className="material-symbols-outlined text-[10px]">repeat</span>
                                  <span>Recorrente</span>
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-[#737373]">
                              {horaFormatada} • {t.accounts?.name || "Conta Padrão"} {t.payment_method ? `(${t.payment_method})` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right pl-2 shrink-0 flex flex-col items-end">
                          <span className={`text-[13px] font-semibold ${
                            isIncome ? "text-emerald-600" : "text-[#0a0a0a]"
                          }`}>
                            {isIncome ? "+" : "-"}R$ {Number(t.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          {isParcelado && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#737373] bg-[#f5f5f5] px-1.5 py-0.5 rounded-[6px] font-mono mt-0.5">
                              Parcela {t.installment_number || 1}/{t.installment_total}x
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </Card>
              </div>
            );
          })
        )}

        {/* End of List Indicator */}
        <div className="py-3 text-center flex flex-col items-center justify-center gap-1.5">
          <span className="text-[11px] text-[#737373]">
            {isLoadingExtrato ? (
              <span className="inline-flex items-center gap-1.5 animate-pulse">
                <span className="material-symbols-outlined text-[13px] animate-spin">
                  progress_activity
                </span>
                Sincronizando com o banco...
              </span>
            ) : (
              `Total de ${extratoData?.totalLancamentos || 0} movimentações sincronizadas com o banco`
            )}
          </span>
        </div>
      </div>
    </main>
  );
}
