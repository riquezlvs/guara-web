"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cadastrarAtivo } from "@/lib/api";

export default function NovoAtivoPage() {
  const router = useRouter();

  // Estados do formulário
  const [ticker, setTicker] = useState("Tesouro Selic 2029");
  const [broker, setBroker] = useState("XP Investimentos");
  const [quantity, setQuantity] = useState("5");
  const [unitPrice, setUnitPrice] = useState("1000.00");
  const [operationDate, setOperationDate] = useState("24/10/2024");
  const [yieldRate, setYieldRate] = useState("100% CDI");
  const [selectedClass, setSelectedClass] = useState<
    "Renda Fixa" | "Ações / FIIs" | "Cripto" | "Fundos / Outros"
  >("Renda Fixa");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const q = parseFloat(quantity) || 0;
  const p = parseFloat(unitPrice) || 0;
  const totalOperacao = q * p;

  const formatBRL = (val: number) => {
    return (val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getAdviceText = () => {
    switch (selectedClass) {
      case "Renda Fixa":
        return (
          <>
            Este aporte aumentará sua exposição em{" "}
            <strong className="text-ink font-medium">Renda Fixa</strong> para{" "}
            <strong className="text-ink font-medium">53,2%</strong>, mantendo sua carteira alinhada à meta de R$ 200.000.
          </>
        );
      case "Ações / FIIs":
        return (
          <>
            Exposição calculada em renda variável:{" "}
            <strong className="text-ink font-medium">28,4%</strong>. O balanceamento sugerido pela sua estratégia é de até 30%.
          </>
        );
      case "Cripto":
        return (
          <>
            Ativo de alta volatilidade. Recomenda-se manter o teto alocado em Criptoativos em até{" "}
            <strong className="text-ink font-medium">5,0%</strong> do patrimônio total.
          </>
        );
      case "Fundos / Outros":
      default:
        return (
          <>
            Diversificação balanceada. Alocação sob medida para reduzir correlação geral de riscos da sua carteira.
          </>
        );
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticker.trim()) {
      setErrorMessage("Por favor, digite o nome ou código do ativo.");
      return;
    }
    if (q <= 0 || p <= 0) {
      setErrorMessage("A quantidade e o preço unitário devem ser maiores que zero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await cadastrarAtivo({
        ticker: ticker.trim(),
        institution: broker,
        assetClass: selectedClass,
        quantity: q,
        unitPrice: p,
        yieldRate: yieldRate.trim() || undefined,
        operationDate: new Date().toISOString(),
      });

      setToastVisible(true);
      window.dispatchEvent(new CustomEvent("finances:refresh"));

      setTimeout(() => {
        setToastVisible(false);
        router.push("/investimentos");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao salvar ativo no backend.");
      setIsSubmitting(false);
    }
  };

  const classesConfig = [
    { name: "Renda Fixa" as const, icon: "lock" },
    { name: "Ações / FIIs" as const, icon: "domain" },
    { name: "Cripto" as const, icon: "currency_bitcoin" },
    { name: "Fundos / Outros" as const, icon: "pie_chart" },
  ];

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 px-4 pb-44 max-w-md mx-auto bg-canvas min-h-screen">
      <div className="flex flex-col w-full pb-8">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between py-2 mb-2">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-mid-gray hover:text-ink transition-colors text-[13px] font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Voltar</span>
          </button>
          <h1 className="text-[18px] font-semibold text-ink tracking-tight text-center flex-1 pr-14 truncate">
            Adicionar Ativo
          </h1>
        </div>

        {/* 1. Live Preview Voucher Card */}
        <section className="w-full bg-paper rounded-[24px] p-5 shadow-sm relative overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-canvas text-ink">
                <span className="material-symbols-outlined text-[16px]">show_chart</span>
              </span>
              <span className="px-2.5 py-1 rounded-[18px] bg-surface-alt text-mid-gray font-caption text-caption uppercase tracking-wider">
                {selectedClass}
              </span>
            </div>
            <span className="font-caption text-caption text-mid-gray tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
              Novo Aporte
            </span>
          </div>

          <div className="space-y-1">
            <p className="font-caption text-caption text-mid-gray uppercase tracking-wider">Identificador</p>
            <h2 className="font-headline-sm text-[18px] font-semibold text-ink truncate">
              {ticker.trim() || "Novo Ativo"}
            </h2>
            <p className="font-body-sm text-body-sm text-mid-gray flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">account_balance</span>
              <span>{broker}</span>
            </p>
          </div>

          <div className="mt-5 pt-4 bg-canvas/60 -mx-5 -mb-5 px-5 py-3.5 flex items-end justify-between">
            <div>
              <p className="font-caption text-caption text-mid-gray uppercase tracking-wider">Total Estimado</p>
              <p className="font-headline-md text-[22px] font-semibold text-ink tracking-tight">
                {formatBRL(totalOperacao)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-caption text-caption text-mid-gray uppercase tracking-wider">Data Operação</p>
              <p className="font-label-sm text-label-sm text-ink font-medium">
                {operationDate.trim() ? operationDate : "Hoje"}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Asset Class Selector */}
        <section className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-caption text-caption uppercase text-mid-gray tracking-wider">Classe do Ativo</span>
            <span className="font-caption text-caption text-mid-gray">4 categorias</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {classesConfig.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setSelectedClass(item.name)}
                className={`px-3.5 py-2 rounded-[18px] font-label-sm text-label-sm shrink-0 transition-transform active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  selectedClass === item.name
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Data Entry Form */}
        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Asset Name / Code */}
          <div className="flex flex-col gap-1.5">
            <label className="font-caption text-caption uppercase text-mid-gray tracking-wider" htmlFor="asset-ticker">
              Código / Nome do Ativo
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-mid-gray text-[18px]">search</span>
              <input
                id="asset-ticker"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Ex: Tesouro Selic 2029, MXRF11, BTC..."
                className="w-full h-11 pl-10 pr-4 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none placeholder:text-mid-gray/70 focus:bg-surface-alt transition-colors"
                required
              />
            </div>
          </div>

          {/* Broker / Institution */}
          <div className="flex flex-col gap-1.5">
            <label className="font-caption text-caption uppercase text-mid-gray tracking-wider" htmlFor="asset-broker">
              Instituição / Custódia
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-mid-gray text-[18px]">account_balance</span>
              <select
                id="asset-broker"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full h-11 pl-10 pr-9 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none appearance-none focus:bg-surface-alt transition-colors cursor-pointer"
              >
                <option value="XP Investimentos">XP Investimentos</option>
                <option value="Nubank / NuInvest">Nubank / NuInvest</option>
                <option value="BTG Pactual">BTG Pactual</option>
                <option value="Binance">Binance</option>
                <option value="Banco Inter">Banco Inter</option>
                <option value="Itaú Íon">Itaú Íon</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 text-mid-gray text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Quantity and Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="font-caption text-caption uppercase text-mid-gray tracking-wider truncate" htmlFor="asset-qty">
                Quantidade / Cotas
              </label>
              <div className="relative flex items-center">
                <input
                  id="asset-qty"
                  type="number"
                  step="any"
                  min="0.0001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1,00"
                  className="w-full h-11 px-3.5 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none placeholder:text-mid-gray/70 focus:bg-surface-alt transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="font-caption text-caption uppercase text-mid-gray tracking-wider truncate" htmlFor="asset-price">
                Preço Unitário
              </label>
              <div className="relative flex items-center">
                <span className="font-caption text-caption text-mid-gray absolute left-3.5">R$</span>
                <input
                  id="asset-price"
                  type="number"
                  step="any"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-11 pl-9 pr-3.5 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none placeholder:text-mid-gray/70 focus:bg-surface-alt transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {/* Operation Value (Calculated Display) */}
          <div className="p-3 rounded-[18px] bg-surface-alt flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-mid-gray">calculate</span>
              <span className="font-label-sm text-label-sm text-mid-gray">Valor Total da Operação</span>
            </div>
            <span className="font-label-md text-label-md text-ink font-semibold">
              {formatBRL(totalOperacao)}
            </span>
          </div>

          {/* Date and Yield Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="font-caption text-caption uppercase text-mid-gray tracking-wider truncate" htmlFor="asset-date">
                Data do Aporte
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-mid-gray text-[16px]">calendar_today</span>
                <input
                  id="asset-date"
                  type="text"
                  value={operationDate}
                  onChange={(e) => setOperationDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full h-11 pl-9 pr-3 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none placeholder:text-mid-gray/70 focus:bg-surface-alt transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="font-caption text-caption uppercase text-mid-gray tracking-wider truncate" htmlFor="asset-rate">
                Taxa / Rendimento
              </label>
              <div className="relative flex items-center">
                <input
                  id="asset-rate"
                  type="text"
                  value={yieldRate}
                  onChange={(e) => setYieldRate(e.target.value)}
                  placeholder="Ex: IPCA + 6%"
                  className="w-full h-11 px-3.5 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none placeholder:text-mid-gray/70 focus:bg-surface-alt transition-colors"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-[16px] bg-rose-50 text-rose-600 text-[13px] border border-rose-200">
              {errorMessage}
            </div>
          )}

          {/* 4. Guará IA Diagnostic Card */}
          <section className="mt-1 p-4 rounded-[18px] bg-surface-alt shadow-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0 text-ink shadow-sm">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-caption text-caption uppercase font-semibold text-ink tracking-wider">
                  Diagnóstico Guará IA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-mid-gray"></span>
                <span className="font-caption text-caption text-mid-gray">Em tempo real</span>
              </div>
              <p className="font-body-sm text-body-sm text-mid-gray leading-relaxed">
                {getAdviceText()}
              </p>
            </div>
          </section>

          {/* 5. Action Controls */}
          <div className="mt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              id="submit-btn"
              className="w-full h-12 rounded-[18px] bg-ink text-paper font-label-md text-label-md font-medium flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all hover:bg-ink-soft disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Sincronizando com backend...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Confirmar e Adicionar Ativo</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full h-10 rounded-[18px] bg-transparent text-mid-gray hover:text-ink font-label-sm text-label-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Success Toast */}
        <div
          id="toast"
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[18px] bg-ink text-paper font-label-sm text-label-sm flex items-center gap-2 shadow-xl transition-all duration-300 ${
            toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>Ativo cadastrado com sucesso!</span>
        </div>
      </div>
    </main>
  );
}
