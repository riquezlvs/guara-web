"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { obterExtrato, ExtratoResponse, ItemExtrato } from "@/lib/api";

export default function ExtratoPage() {
  const [extratoData, setExtratoData] = useState<ExtratoResponse["dados"] | null>(null);
  const [isLoadingExtrato, setIsLoadingExtrato] = useState(true);
  const [filterPill, setFilterPill] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const carregarExtrato = useCallback(async (mesAno?: string) => {
    setIsLoadingExtrato(true);
    try {
      const resp = await obterExtrato(mesAno);
      if (resp.sucesso && resp.dados) {
        setExtratoData(resp.dados);
      }
    } catch (err) {
      console.warn("Backend offline ou não conectado ao carregar extrato:", err);
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

  const filtradas = transacoes.filter((item: ItemExtrato) => {
    if (filterPill === "Entradas" && item.entry_type !== "income") return false;
    if (filterPill === "Saídas" && item.entry_type !== "expense") return false;
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

  const grupos: { [data: string]: ItemExtrato[] } = {};
  filtradas.forEach((t: ItemExtrato) => {
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.06)] font-mono text-[11px] text-[#737373]">
                  <span className={`w-1.5 h-1.5 rounded-full ${isLoadingExtrato ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                  {isLoadingExtrato ? "Sincronizando..." : "Sincronizado"}
                </span>
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

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["Todos", "Entradas", "Saídas", "pix", "credit_card", "debit_card"].map((pill) => {
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
                className={`px-3 py-1 rounded-[14px] text-[11px] font-medium tracking-tight whitespace-nowrap transition-all ${
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-[#0a0a0a] truncate">
                                {t.description}
                              </span>
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[9px] uppercase bg-[#f5f5f5] text-[#737373] border-0 font-normal shrink-0"
                              >
                                {categoria}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-[#737373]">
                              {horaFormatada} • {t.accounts?.name || "Conta Padrão"} {t.payment_method ? `(${t.payment_method})` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right pl-2 shrink-0">
                          <span className={`text-[13px] font-semibold ${
                            isIncome ? "text-emerald-600" : "text-[#0a0a0a]"
                          }`}>
                            {isIncome ? "+" : "-"}R$ {Number(t.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          {t.installment_total && t.installment_number && (
                            <span className="block text-[10px] text-[#737373]">
                              {t.installment_number}/{t.installment_total}x
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
