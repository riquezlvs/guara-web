"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { obterCartoes, cadastrarCartao, CartaoItem } from "@/lib/api";

export default function EditarCartaoPage() {
  const router = useRouter();
  const params = useParams();
  const cardId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [limit, setLimit] = useState("");
  const [closeDay, setCloseDay] = useState(3);
  const [dueDay, setDueDay] = useState(10);
  const [cardHolder, setCardHolder] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [colorTheme, setColorTheme] = useState("titanium");
  const [cardType, setCardType] = useState<"credit" | "meal_voucher" | "food_voucher">("credit");
  const [isVirtual, setIsVirtual] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function carregarDadosCartao() {
      setIsLoading(true);
      try {
        const resp = await obterCartoes();
        if (resp.sucesso && resp.dados) {
          const alvo = resp.dados.find((c) => c.id === cardId || c.name === decodeURIComponent(cardId));
          if (alvo) {
            preencherDados(alvo);
          } else if (resp.dados.length > 0) {
            preencherDados(resp.dados[0]);
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar dados do cartão para edição:", err);
      } finally {
        setIsLoading(false);
      }
    }

    function preencherDados(card: CartaoItem) {
      setNickname(card.name || "");
      const numLimit = card.credit_limit || 0;
      setLimit(numLimit ? numLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
      setCloseDay(card.closing_day || 3);
      setDueDay(card.due_day || 10);
      setCardHolder(card.card_holder || "LUCAS M. SILVEIRA");
      setLastFour(card.last_four_digits || "4091");
      setColorTheme(card.color_theme || "titanium");
      setCardType((card.card_type as any) || "credit");
      setIsVirtual(Boolean(card.is_virtual));
    }

    carregarDadosCartao();
  }, [cardId]);

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setLimit("");
      return;
    }
    const num = Number(val) / 100;
    setLimit(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const getThemeBackground = () => {
    switch (colorTheme) {
      case "slate":
        return "bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] text-white";
      case "warm":
        return "bg-gradient-to-br from-[#3c2a21] via-[#1a120b] to-[#121212] text-white";
      case "light":
        return "bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-[#0a0a0a] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]";
      case "titanium":
      default:
        return "bg-gradient-to-br from-[#0a0a0a] via-[#171717] to-[#1c1b1b] text-white";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setErrorMessage("Por favor, digite um nome ou apelido para o cartão.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("syncing");
    setErrorMessage("");

    try {
      const parsedLimit = limit
        ? parseFloat(limit.replace(/\./g, "").replace(",", "."))
        : 0;

      await cadastrarCartao({
        id: cardId,
        name: nickname.trim(),
        closing_day: Number(closeDay) || 3,
        due_day: Number(dueDay) || 10,
        credit_limit: parsedLimit,
        card_type: cardType,
        card_holder: cardHolder.trim(),
        last_four_digits: lastFour.trim() || undefined,
        color_theme: colorTheme,
        is_virtual: isVirtual,
      });

      setSubmitStatus("success");
      window.dispatchEvent(new CustomEvent("finances:refresh"));

      setTimeout(() => {
        router.push("/cartoes");
        router.refresh();
      }, 700);
    } catch (err: any) {
      setSubmitStatus("error");
      setErrorMessage(err.message || "Erro ao salvar alterações do cartão.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-[#737373]">
        <span className="material-symbols-outlined text-[32px] animate-spin mb-2">
          progress_activity
        </span>
        <span className="text-[14px]">Carregando cartão...</span>
      </main>
    );
  }

  return (
    <main className="flex flex-col relative w-full pt-16 pb-44 px-4 max-w-md mx-auto bg-[#f5f5f5] min-h-screen">
      <div className="flex flex-col w-full pb-6">
        {/* Top Header */}
        <div className="flex items-center justify-between py-2 mb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#737373] hover:text-[#0a0a0a] transition-colors text-[13px] font-medium"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Voltar</span>
          </button>
          <h1 className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight text-center flex-1 pr-14">
            Editar Cartão
          </h1>
        </div>

        {/* Live Card Preview Section */}
        <div className="pt-2">
          <div
            className={`relative w-full rounded-[24px] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.14)] overflow-hidden transition-all duration-300 ${getThemeBackground()}`}
          >
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/[0.04] pointer-events-none"></div>
            <div className="absolute right-6 -bottom-16 w-40 h-40 rounded-full bg-white/[0.03] pointer-events-none"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span className="text-[11px] uppercase tracking-wider font-medium opacity-90">
                  Fecha dia {closeDay || "--"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 opacity-70">
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                <span className="text-[11px] tracking-wider uppercase font-medium">
                  {isVirtual ? "Virtual" : "Cartão"}
                </span>
              </div>
            </div>

            <div className="mt-6 relative z-10">
              <span className="text-[10px] uppercase opacity-60 tracking-wider block mb-0.5">
                {cardType === "credit"
                  ? "Cartão de Crédito"
                  : cardType === "meal_voucher"
                  ? "Vale-Refeição"
                  : "Vale-Alimentação"}
              </span>
              <h2 className="text-[18px] font-semibold tracking-tight truncate">
                {nickname || "Apelido do Cartão"}
              </h2>
            </div>

            <div className="my-3 relative z-10 flex items-center gap-2">
              <span className="font-mono text-[13px] tracking-widest opacity-70">
                •••• •••• ••••
              </span>
              <span className="font-mono text-[13px] tracking-widest font-medium">
                {lastFour || "0000"}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-current/10 flex items-end justify-between relative z-10">
              <div>
                <span className="text-[9px] uppercase tracking-widest opacity-60 block mb-0.5">
                  Limite do Cartão
                </span>
                <span className="text-[18px] font-mono font-semibold tracking-tight">
                  R$ {limit || "0,00"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-widest opacity-60 block mb-0.5">
                  Vencimento
                </span>
                <span className="text-[14px] font-mono font-medium">
                  {dueDay ? `Dia ${dueDay}` : "--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <div className="bg-white rounded-[24px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-black/5 space-y-3.5">
            {/* Tipo e Formato */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium">
                  Modalidade
                </label>
                <div className="grid grid-cols-2 gap-1 bg-[#f5f5f5] p-1 rounded-[14px]">
                  <button
                    type="button"
                    onClick={() => setIsVirtual(false)}
                    className={`py-1.5 text-[12px] font-medium rounded-[10px] transition-all ${
                      !isVirtual ? "bg-white text-[#0a0a0a] shadow-xs" : "text-[#737373]"
                    }`}
                  >
                    Físico
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVirtual(true)}
                    className={`py-1.5 text-[12px] font-medium rounded-[10px] transition-all ${
                      isVirtual ? "bg-white text-[#0a0a0a] shadow-xs" : "text-[#737373]"
                    }`}
                  >
                    Virtual
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium">
                  Tipo
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value as any)}
                  className="w-full h-9 px-2.5 bg-[#f5f5f5] rounded-[14px] text-[12px] text-[#0a0a0a] outline-none font-medium"
                >
                  <option value="credit">Crédito</option>
                  <option value="meal_voucher">Vale Refeição</option>
                  <option value="food_voucher">Vale Alimentação</option>
                </select>
              </div>
            </div>

            {/* Apelido do Cartão */}
            <div>
              <label
                className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium"
                htmlFor="card-nickname"
              >
                Apelido do Cartão
              </label>
              <input
                id="card-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Nubank, Inter, Cartão Pessoal"
                className="w-full h-11 px-3 bg-[#fafafa] rounded-[18px] text-[14px] text-[#0a0a0a] placeholder:text-[#737373] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgba(10,10,10,0.15)] transition-all border border-black/5"
                required
              />
            </div>

            {/* Limite Total */}
            <div>
              <label
                className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium"
                htmlFor="card-limit"
              >
                Limite Total Disponível
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[14px] text-[#737373] font-mono">
                  R$
                </span>
                <input
                  id="card-limit"
                  type="text"
                  value={limit}
                  onChange={handleLimitChange}
                  placeholder="0,00"
                  className="w-full h-11 pl-10 pr-3 bg-[#fafafa] rounded-[18px] text-[14px] text-[#0a0a0a] font-mono placeholder:text-[#737373] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgba(10,10,10,0.15)] transition-all border border-black/5"
                />
              </div>
            </div>

            {/* Fechamento e Vencimento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium"
                  htmlFor="card-close-day"
                >
                  Dia do Fechamento
                </label>
                <div className="relative flex items-center">
                  <input
                    id="card-close-day"
                    type="number"
                    min="1"
                    max="31"
                    value={closeDay}
                    onChange={(e) => setCloseDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                    placeholder="Ex: 3"
                    className="w-full h-11 px-3 bg-[#fafafa] rounded-[18px] text-[14px] text-[#0a0a0a] font-mono placeholder:text-[#737373] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgba(10,10,10,0.15)] transition-all border border-black/5"
                    required
                  />
                  <span className="material-symbols-outlined text-[16px] text-[#737373] absolute right-3 pointer-events-none">
                    calendar_today
                  </span>
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">Melhor dia de compra</span>
              </div>

              <div>
                <label
                  className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium"
                  htmlFor="card-due-day"
                >
                  Dia do Vencimento
                </label>
                <div className="relative flex items-center">
                  <input
                    id="card-due-day"
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                    placeholder="Ex: 10"
                    className="w-full h-11 px-3 bg-[#fafafa] rounded-[18px] text-[14px] text-[#0a0a0a] font-mono placeholder:text-[#737373] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgba(10,10,10,0.15)] transition-all border border-black/5"
                    required
                  />
                  <span className="material-symbols-outlined text-[16px] text-[#737373] absolute right-3 pointer-events-none">
                    event_upcoming
                  </span>
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">Data limite para pagamento</span>
              </div>
            </div>

            {/* Titular e 4 últimos dígitos */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label
                  className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium"
                  htmlFor="card-holder"
                >
                  Nome do Titular
                </label>
                <input
                  id="card-holder"
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  placeholder="Ex: SEU NOME"
                  className="w-full h-11 px-3 bg-[#fafafa] rounded-[18px] text-[13px] text-[#0a0a0a] uppercase placeholder:text-[#737373] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgba(10,10,10,0.15)] transition-all border border-black/5"
                />
              </div>

              <div>
                <label
                  className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1 font-medium"
                  htmlFor="card-last-four"
                >
                  Finais
                </label>
                <input
                  id="card-last-four"
                  type="text"
                  maxLength={4}
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
                  placeholder="4091"
                  className="w-full h-11 px-3 bg-[#fafafa] rounded-[18px] text-[14px] text-[#0a0a0a] font-mono placeholder:text-[#737373] outline-none focus:bg-white focus:shadow-[0_0_0_1px_rgba(10,10,10,0.15)] transition-all border border-black/5 text-center"
                />
              </div>
            </div>

            {/* Tom do Cartão na Carteira */}
            <div className="pt-1">
              <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-2 font-medium">
                Tom do Cartão na Carteira
              </label>
              <div className="flex items-center gap-3">
                {[
                  { id: "titanium", name: "Preto Titanium", bg: "bg-[#0a0a0a]" },
                  { id: "slate", name: "Azul Slate", bg: "bg-[#334155]" },
                  { id: "warm", name: "Marrom Café", bg: "bg-[#3c2a21]" },
                  { id: "light", name: "Gelo Claro", bg: "bg-[#e2e8f0]" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColorTheme(item.id)}
                    className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center transition-all ${
                      colorTheme === item.id ? "ring-2 ring-offset-2 ring-black scale-105" : "opacity-80"
                    }`}
                  >
                    {colorTheme === item.id && (
                      <span className="material-symbols-outlined text-[16px] text-white">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-[16px] bg-rose-50 text-rose-600 text-[13px] border border-rose-200">
              {errorMessage}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-2 space-y-2">
            <button
              id="save-card-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-[20px] bg-[#0a0a0a] text-white text-[14px] font-medium flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-[#171717] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitStatus === "syncing" ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Atualizando no Guará IA...</span>
                </>
              ) : submitStatus === "success" ? (
                <>
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                  <span>Cartão Atualizado com Sucesso</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="w-full h-11 rounded-[20px] bg-[#f5f5f5] text-[#0a0a0a] text-[14px] font-medium flex items-center justify-center hover:bg-[#eeeeee] active:scale-[0.99] transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
