"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listarRendasRecorrentes,
  excluirRendaRecorrente,
  RendaRecorrenteItem,
  obterContasDisponiveis,
} from "@/lib/api";

export default function RendaRecorrentePage() {
  const router = useRouter();
  const [rendas, setRendas] = useState<RendaRecorrenteItem[]>([]);
  const [contas, setContas] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const carregarRendas = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resRendas, resContas] = await Promise.all([
        listarRendasRecorrentes("income"),
        obterContasDisponiveis().catch(() => ({ sucesso: false, dados: [] })),
      ]);

      if (resContas.sucesso && resContas.dados) {
        const mapa: Record<string, string> = {};
        resContas.dados.forEach((c) => {
          mapa[c.id] = c.name;
        });
        setContas(mapa);
      }

      if (resRendas.sucesso && resRendas.dados) {
        setRendas(resRendas.dados);
      } else {
        setRendas([]);
      }
    } catch (err) {
      console.warn("Erro ao buscar rendas recorrentes:", err);
      setRendas([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarRendas();

    const handleRefresh = () => carregarRendas();
    window.addEventListener("finances:refresh", handleRefresh);
    return () => window.removeEventListener("finances:refresh", handleRefresh);
  }, [carregarRendas]);

  const handleExcluir = async (id: string, descricao: string) => {
    if (!confirm(`Deseja desativar a renda recorrente "${descricao}"?`)) return;

    setDeletandoId(id);
    try {
      await excluirRendaRecorrente(id);
      setFeedbackToast(`Renda "${descricao}" desativada com sucesso!`);
      setTimeout(() => setFeedbackToast(null), 3000);
      window.dispatchEvent(new CustomEvent("finances:refresh"));
      await carregarRendas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover renda recorrente.";
      setFeedbackToast(msg);
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setDeletandoId(null);
    }
  };

  const totalMensal = rendas.reduce((acc, r) => acc + Number(r.total_amount), 0);

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-44 px-4 max-w-md mx-auto bg-[#f5f5f5] min-h-screen">
      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0a] text-white px-4 py-2.5 rounded-full text-[13px] shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[16px] text-amber-400">info</span>
          <span>{feedbackToast}</span>
        </div>
      )}

      <div className="flex flex-col w-full gap-5">
        {/* Top Header */}
        <section className="flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[20px] text-[#0a0a0a] font-semibold tracking-tight">
              Rendas Recorrentes
            </h1>
            <p className="text-[12px] text-[#737373]">
              Salários, benefícios e contratos fixos
            </p>
          </div>
          <Link
            href="/renda-recorrente/novo"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[18px] bg-black text-white text-[13px] font-medium hover:bg-neutral-800 active:scale-95 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Nova Renda</span>
          </Link>
        </section>

        {/* Resumo Total Hero */}
        <section className="w-full rounded-[24px] bg-white p-5 border border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3">
          <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">
            Entrada Prevista Todo Mês
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] text-[#737373] font-light">R$</span>
            <span className="text-[32px] font-bold text-[#0a0a0a] tracking-tight">
              {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[12px] text-[#737373] ml-1">/mês</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[12px] text-emerald-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0 mt-0.5">
              verified
            </span>
            <span>
              Essas receitas são integradas ao cálculo de fechamento das suas faturas, garantindo que seu Safe-to-Spend nunca mostre saldo negativado indevidamente.
            </span>
          </div>
        </section>

        {/* Lista de Rendas Cadastradas */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">
              Rendas Ativas ({rendas.length})
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-[#737373] text-[13px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
              <span>Carregando rendas...</span>
            </div>
          ) : rendas.length === 0 ? (
            <div className="w-full rounded-[24px] bg-white p-8 text-center shadow-[0_0_0_1px_rgba(229,229,229,1)] flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373]">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <h3 className="text-[15px] font-semibold text-[#0a0a0a]">Nenhuma renda recorrente cadastrada</h3>
              <p className="text-[12px] text-[#737373] max-w-xs leading-relaxed">
                Cadastre seu salário ou benefícios para que o sistema saiba exatamente quando o dinheiro entra e não positive suas faturas como débito descoberto.
              </p>
              <Link
                href="/renda-recorrente/novo"
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0a0a0a] text-white text-[13px] font-medium hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Cadastrar Salário ou Renda</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rendas.map((item) => {
                const contaNome = item.account_id && contas[item.account_id] ? contas[item.account_id] : "Conta Padrão";
                const isDeletando = deletandoId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-[20px] bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a] shrink-0">
                        <span className="material-symbols-outlined text-[20px]">
                          {item.income_type === "benefit"
                            ? "restaurant"
                            : item.income_type === "freelance"
                            ? "computer"
                            : "work"}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] font-semibold text-[#0a0a0a] truncate">
                          {item.description}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-[#737373] truncate">
                          <span>Todo dia {String(item.day_of_month).padStart(2, "0")}</span>
                          <span>•</span>
                          <span>{contaNome}</span>
                          <span>•</span>
                          <span>{item.weekend_rule === "postpone" ? "Posterga fds" : "Antecipa fds"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-bold text-emerald-700">
                          +R$ {Number(item.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-[#737373]">mensal</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExcluir(item.id, item.description)}
                        disabled={isDeletando}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#737373] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Desativar esta renda recorrente"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isDeletando ? "progress_activity" : "delete"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
