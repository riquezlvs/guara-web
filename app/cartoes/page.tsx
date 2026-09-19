"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { obterCartoes, CartaoItem } from "@/lib/api";

export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<CartaoItem[]>([]);
  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const carregarCartoes = useCallback(async () => {
    setIsLoading(true);

    const getStoredOverrides = (): Record<string, Partial<CartaoItem>> => {
      try {
        const raw = localStorage.getItem("guara:cartoes_overrides");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };

    const applyOverrides = (list: CartaoItem[]) => {
      const overrides = getStoredOverrides();
      return list.map((item) => {
        const foundOverride = overrides[item.id] || overrides[item.name];
        if (foundOverride) {
          const merged = { ...item, ...foundOverride };
          if (foundOverride.credit_limit !== undefined) {
            const lim = Number(foundOverride.credit_limit);
            const fatura = Number(merged.faturaAtual || 0);
            merged.credit_limit = lim;
            merged.limiteDisponivel = Math.max(0, lim - fatura);
            merged.percentualUtilizado = lim > 0 ? Number(((fatura / lim) * 100).toFixed(1)) : 0;
          }
          return merged;
        }
        return item;
      });
    };

    try {
      const resp = await obterCartoes();
      if (resp.sucesso && resp.dados && resp.dados.length > 0) {
        const listaAtualizada = applyOverrides(resp.dados);
        setCartoes(listaAtualizada);
        setCartaoSelecionadoId((prev) => prev || listaAtualizada[0].id);
      } else {
        // Mock inicial enriquecido caso ainda não haja cartões no banco
        const fallbackBase: CartaoItem[] = [
          {
            id: "nubank-default",
            name: "Nubank Ultravioleta",
            closing_day: 3,
            due_day: 10,
            card_type: "credit",
            is_default: true,
            credit_limit: 15000,
            card_holder: "LUCAS M. SILVEIRA",
            last_four_digits: "4091",
            color_theme: "titanium",
            is_virtual: false,
            faturaAtual: 3842.5,
            limiteDisponivel: 11157.5,
            percentualUtilizado: 25.6,
            periodo: {
              inicio: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 4).toISOString(),
              fim: new Date(new Date().getFullYear(), new Date().getMonth(), 4).toISOString(),
              fechamento: new Date(new Date().getFullYear(), new Date().getMonth(), 3).toISOString(),
            },
            itensFatura: [
              {
                display_id: 1,
                description: "Restaurante da Esquina",
                total_amount: 45.0,
                occurred_at: "Hoje, 13:24",
              },
              {
                display_id: 2,
                description: "Supermercado Pão de Açúcar",
                total_amount: 214.3,
                occurred_at: "Hoje, 09:12",
              },
              {
                display_id: 3,
                description: "Droga Raia",
                total_amount: 68.9,
                occurred_at: "Ontem, 10:30",
              },
            ],
          },
          {
            id: "itau-virtual",
            name: "Itaú Click",
            closing_day: 15,
            due_day: 22,
            card_type: "credit",
            is_default: false,
            credit_limit: 5000,
            card_holder: "LUCAS M. SILVEIRA",
            last_four_digits: "8820",
            color_theme: "light",
            is_virtual: true,
            faturaAtual: 750.0,
            limiteDisponivel: 4250.0,
            percentualUtilizado: 15.0,
            periodo: {
              inicio: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 16).toISOString(),
              fim: new Date(new Date().getFullYear(), new Date().getMonth(), 16).toISOString(),
              fechamento: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString(),
            },
            itensFatura: [
              {
                display_id: 4,
                description: "Assinatura Netflix",
                total_amount: 55.9,
                occurred_at: "Ontem, 08:00",
              },
            ],
          },
        ];
        const listaFinal = applyOverrides(fallbackBase);
        setCartoes(listaFinal);
        setCartaoSelecionadoId((prev) => prev || listaFinal[0].id);
      }
    } catch (err) {
      console.warn("Backend offline ao carregar cartões, usando dados locais:", err);
      // Fallback gracioso
      const fallbackBase: CartaoItem[] = [
        {
          id: "nubank-default",
          name: "Nubank Ultravioleta",
          closing_day: 3,
          due_day: 10,
          card_type: "credit",
          is_default: true,
          credit_limit: 15000,
          card_holder: "LUCAS M. SILVEIRA",
          last_four_digits: "4091",
          color_theme: "titanium",
          is_virtual: false,
          faturaAtual: 3842.5,
          limiteDisponivel: 11157.5,
          percentualUtilizado: 25.6,
          periodo: {
            inicio: new Date().toISOString(),
            fim: new Date().toISOString(),
            fechamento: new Date().toISOString(),
          },
          itensFatura: [
            {
              display_id: 1,
              description: "Restaurante da Esquina",
              total_amount: 45.0,
              occurred_at: "Hoje, 13:24",
            },
            {
              display_id: 2,
              description: "Supermercado Pão de Açúcar",
              total_amount: 214.3,
              occurred_at: "Hoje, 09:12",
            },
            {
              display_id: 3,
              description: "Droga Raia",
              total_amount: 68.9,
              occurred_at: "Ontem, 10:30",
            },
          ],
        },
      ];
      const listaFinal = applyOverrides(fallbackBase);
      setCartoes(listaFinal);
      setCartaoSelecionadoId((prev) => prev || listaFinal[0].id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarCartoes();

    const handleRefresh = () => {
      carregarCartoes();
    };
    window.addEventListener("finances:refresh", handleRefresh);
    return () => {
      window.removeEventListener("finances:refresh", handleRefresh);
    };
  }, [carregarCartoes]);

  const cartaoAtual = cartoes.find((c) => c.id === cartaoSelecionadoId) || cartoes[0];
  const indiceAtual = cartoes.findIndex((c) => c.id === cartaoSelecionadoId);

  const formatarMoeda = (val?: number) => {
    return (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const contagemAtivos = cartoes.filter((c) => !c.is_virtual).length;
  const contagemVirtuais = cartoes.filter((c) => c.is_virtual).length;

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-44 px-4 max-w-md mx-auto bg-[#f5f5f5]">
      <div className="flex flex-col w-full gap-4 select-none">
        {/* Top Bar / Header Action */}
        <section className="flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] text-[#0a0a0a] font-semibold tracking-tight">
              Cartões & Faturas
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(229,229,229,1)] text-[11px] text-[#737373]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]"></span>
                {contagemAtivos} Ativo{contagemAtivos !== 1 ? "s" : ""} • {contagemVirtuais} Virtual{contagemVirtuais !== 1 ? "is" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/quem-me-deve"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[18px] bg-black text-white text-[13px] font-medium hover:bg-neutral-800 active:scale-95 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              <span>Quem Me Deve</span>
            </Link>
            <Link
              href="/cartoes/novo"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(229,229,229,1)] text-[#0a0a0a] text-[13px] font-medium hover:bg-[#fafafa] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Novo Cartão</span>
            </Link>
          </div>
        </section>

        {/* Card Showcase Horizontal Carousel */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">
              Cartão Selecionado
            </span>
            <span className="text-[12px] text-[#737373]">
              {cartoes.length > 0 ? `${(indiceAtual >= 0 ? indiceAtual : 0) + 1} de ${cartoes.length}` : "0 de 0"}
            </span>
          </div>

          {/* Scroll Container */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
            {cartoes.map((card) => {
              const isSelected = card.id === cartaoAtual?.id;
              const isDark = card.color_theme !== "light";

              return (
                <div
                  key={card.id}
                  onClick={() => setCartaoSelecionadoId(card.id)}
                  className={`snap-center shrink-0 w-[84vw] max-w-[340px] rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between aspect-[1.58/1] cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? isDark
                        ? "bg-[#0a0a0a] text-white shadow-[0_8px_30px_rgba(0,0,0,0.14),0_0_0_2px_rgba(10,10,10,0.8)] scale-[1.01]"
                        : "bg-white text-[#0a0a0a] shadow-[0_8px_30px_rgba(0,0,0,0.1),0_0_0_2px_rgba(10,10,10,0.8)] scale-[1.01]"
                      : isDark
                      ? "bg-[#171717] text-white/80 opacity-75 hover:opacity-100 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "bg-white text-[#0a0a0a] opacity-75 hover:opacity-100 shadow-[0_0_0_1px_rgba(229,229,229,1)]"
                  }`}
                >
                  {/* Subtle Card Texture */}
                  <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                  <div className="absolute right-4 bottom-2 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[120px]">credit_card</span>
                  </div>

                  {/* Card Top Details */}
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold tracking-tight truncate max-w-[170px]">
                        {card.name}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-[18px] ${
                          isDark ? "bg-white/10 text-white/90" : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {card.is_virtual ? "Virtual" : card.is_default ? "Principal" : "Físico"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[18px] ${isDark ? "text-white/80" : "text-neutral-600"} rotate-90`}>
                        contactless
                      </span>
                      {/* Chip Graphic */}
                      <div className="w-8 h-6 rounded-md bg-gradient-to-br from-[#c7c6c6] via-[#dadada] to-[#858383] relative overflow-hidden shadow-inner p-1">
                        <div className="w-full h-full border border-black/20 rounded-[2px] flex items-center justify-center">
                          <span className="w-full h-[1px] bg-black/30"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: Masked Number */}
                  <div className="my-auto relative z-10 flex items-center gap-2">
                    <span className={`font-mono text-[14px] tracking-widest ${isDark ? "text-white/90" : "text-neutral-600"}`}>
                      •••• •••• ••••
                    </span>
                    <span className={`font-mono text-[14px] tracking-widest font-medium ${isDark ? "text-white" : "text-[#0a0a0a]"}`}>
                      {card.last_four_digits || "4091"}
                    </span>
                  </div>

                  {/* Card Bottom Info */}
                  <div className="flex items-end justify-between relative z-10">
                    <div className="flex flex-col">
                      <span className={`text-[10px] tracking-wider uppercase ${isDark ? "text-white/50" : "text-neutral-400"}`}>
                        Titular
                      </span>
                      <span className={`text-[12px] font-medium tracking-wide uppercase truncate max-w-[180px] ${isDark ? "text-white" : "text-[#0a0a0a]"}`}>
                        {card.card_holder || "TITULAR DO CARTÃO"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className={`text-[10px] tracking-wider uppercase ${isDark ? "text-white/50" : "text-neutral-400"}`}>
                          Val
                        </span>
                        <span className={`text-[12px] font-mono ${isDark ? "text-white" : "text-[#0a0a0a]"}`}>
                          {card.due_day ? `Dia ${card.due_day}` : "09/29"}
                        </span>
                      </div>
                      {/* Discreet Mastercard Circles */}
                      <div className="flex -space-x-2">
                        <div className={`w-5 h-5 rounded-full backdrop-blur-sm ${isDark ? "bg-white/20" : "bg-neutral-300"}`}></div>
                        <div className={`w-5 h-5 rounded-full backdrop-blur-sm ${isDark ? "bg-white/40" : "bg-neutral-400"}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Card Status Micro-Bar */}
          <div className="flex items-center justify-between px-1 text-[12px]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0a0a0a]"></span>
                <span className="text-[#0a0a0a] font-medium">
                  {cartaoAtual?.is_virtual ? "Virtual • Uso Único" : "Físico • Ativo"}
                </span>
              </div>
              <span className="text-[#737373]">•</span>
              <span className="text-[#737373]">
                Limite: R$ {formatarMoeda(cartaoAtual?.credit_limit)}
              </span>
            </div>
            {cartaoAtual && (
              <Link
                href={`/cartoes/editar/${encodeURIComponent(cartaoAtual.id)}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(229,229,229,1)] text-[#0a0a0a] text-[12px] font-medium hover:bg-[#fafafa] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Editar Cartão</span>
              </Link>
            )}
          </div>
        </section>

        {/* Invoice Breakdown Card */}
        {cartaoAtual && (
          <section className="w-full rounded-[24px] bg-white p-5 shadow-[0_0_0_1px_rgba(229,229,229,1),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-3">
            {/* Invoice Status Pill & Header */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[18px] bg-[#fafafa] shadow-[0_0_0_1px_rgba(229,229,229,1)] text-[11px] text-[#0a0a0a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e7000b] animate-pulse"></span>
                Fatura Aberta • Fecha dia {cartaoAtual.closing_day}
              </span>
              <span className="text-[12px] text-[#737373]">
                {cartaoAtual.due_day ? `Vence dia ${cartaoAtual.due_day}` : "Vence em breve"}
              </span>
            </div>

            {/* Invoice Amount */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] uppercase tracking-wider text-[#737373]">
                Valor Atual
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-bold tracking-tight text-[#0a0a0a]">
                  R$ {formatarMoeda(cartaoAtual.faturaAtual)}
                </span>
              </div>
            </div>

            {/* Limit Usage Bar */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="w-full h-2 rounded-full bg-[#eeeeee] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#0a0a0a] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(2, cartaoAtual.percentualUtilizado || 0))}%`,
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#0a0a0a] font-medium">
                  R$ {formatarMoeda(cartaoAtual.faturaAtual)} utilizados{" "}
                  <span className="text-[#737373] font-normal">
                    ({cartaoAtual.percentualUtilizado || 0}%)
                  </span>
                </span>
                <span className="text-[#737373]">
                  R$ {formatarMoeda(cartaoAtual.limiteDisponivel)} livre
                </span>
              </div>
            </div>
          </section>
        )}

        {/* AI Predictive Insight (Guará IA) */}
        <section className="rounded-[24px] bg-white p-4 shadow-[0_0_0_1px_rgba(229,229,229,1),0_1px_4px_rgba(0,0,0,0.02)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#0a0a0a]">Projeção Guará IA</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] bg-[#f5f5f5] text-[#737373] font-mono">
                ESTIMATIVA
              </span>
            </div>
            <p className="text-[13px] text-[#737373] leading-relaxed">
              Com base nos seus gastos recorrentes e histórico recente, estimamos o fechamento desta fatura em{" "}
              <strong className="text-[#0a0a0a] font-medium">
                R$ {formatarMoeda((cartaoAtual?.faturaAtual || 0) * 1.15 || 4410)}
              </strong>{" "}
              — seguro dentro do seu limite Safe-to-Spend.
            </p>
          </div>
        </section>

        {/* Recent Transactions for Current Card */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] uppercase tracking-wider text-[#737373]">
              Últimos no {cartaoAtual?.name || "Cartão"} {cartaoAtual?.last_four_digits ? `(${cartaoAtual.last_four_digits})` : ""}
            </span>
            <span className="text-[12px] text-[#737373]">Ciclo Atual</span>
          </div>
          <div className="w-full rounded-[24px] bg-white shadow-[0_0_0_1px_rgba(229,229,229,1)] overflow-hidden">
            {cartaoAtual?.itensFatura && cartaoAtual.itensFatura.length > 0 ? (
              cartaoAtual.itensFatura.map((item, idx) => (
                <div
                  key={item.display_id || idx}
                  className={`p-3.5 flex items-center justify-between hover:bg-[#fafafa] transition-colors ${
                    idx < cartaoAtual.itensFatura.length - 1 ? "shadow-[0_1px_0_rgba(229,229,229,1)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#0a0a0a]">
                      <span className="material-symbols-outlined text-[18px]">
                        {item.description.toLowerCase().includes("mercado")
                          ? "shopping_cart"
                          : item.description.toLowerCase().includes("droga") || item.description.toLowerCase().includes("farma")
                          ? "local_pharmacy"
                          : item.description.toLowerCase().includes("restaurante") || item.description.toLowerCase().includes("almoço")
                          ? "restaurant"
                          : "credit_card"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#0a0a0a] font-medium truncate max-w-[200px]">
                        {item.description}
                      </span>
                      <span className="text-[12px] text-[#737373]">
                        {item.occurred_at ? new Date(item.occurred_at).toLocaleDateString("pt-BR") : "Recente"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[14px] text-[#0a0a0a] font-semibold">
                    -R$ {formatarMoeda(item.total_amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-[#737373] text-[13px]">
                Nenhum lançamento registrado nesta fatura ainda.
              </div>
            )}

            {/* Footer Action */}
            <Link
              className="w-full py-3 px-4 bg-[#fafafa] flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#737373] hover:text-[#0a0a0a] transition-colors shadow-[0_-1px_0_rgba(229,229,229,1)]"
              href="/extrato"
            >
              <span>Ver todos os lançamentos no Extrato</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
