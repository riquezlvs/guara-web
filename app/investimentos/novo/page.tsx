"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cadastrarAtivo } from "@/lib/api";

export default function NovoAtivoPage() {
  const router = useRouter();

  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return "Hoje";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return "Hoje";
  };

  // Helper para máscara de moeda em tempo real
  const formatCurrency = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    const num = Number(digits) / 100;
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrencyNumber = (formatted: string) => {
    if (!formatted) return 0;
    const clean = formatted.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Classe selecionada
  const [selectedClass, setSelectedClass] = useState<
    "Renda Fixa" | "Ações / FIIs" | "Cripto" | "Fundos / Outros"
  >("Renda Fixa");

  // Campos do formulário com valores padrão sugeridos
  const [ticker, setTicker] = useState("Caixinha Nubank");
  const [broker, setBroker] = useState("Caixinha Nubank");
  const [valorAporteRF, setValorAporteRF] = useState("1.000,00");
  const [quantity, setQuantity] = useState("10");
  const [unitPrice, setUnitPrice] = useState("10,50");
  const [yieldRateDigits, setYieldRateDigits] = useState("115");
  const [operationDate, setOperationDate] = useState(getTodayISO());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cálculo de total da operação
  const isRendaFixa = selectedClass === "Renda Fixa";
  const totalOperacao = isRendaFixa
    ? parseCurrencyNumber(valorAporteRF)
    : (parseFloat(quantity) || 0) * parseCurrencyNumber(unitPrice);

  const formatBRL = (val: number) => {
    return (val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Ao trocar de classe, ajusta sugestões iniciais
  const handleSelectClass = (
    classe: "Renda Fixa" | "Ações / FIIs" | "Cripto" | "Fundos / Outros"
  ) => {
    setSelectedClass(classe);
    setErrorMessage("");
    if (classe === "Renda Fixa") {
      setTicker("Caixinha Nubank");
      setBroker("Caixinha Nubank");
      setYieldRateDigits("115");
      setValorAporteRF("1.000,00");
    } else if (classe === "Ações / FIIs") {
      setTicker("MXRF11");
      setBroker("XP Investimentos");
      setQuantity("100");
      setUnitPrice("10,35");
    } else if (classe === "Cripto") {
      setTicker("Bitcoin (BTC)");
      setBroker("Binance");
      setQuantity("0.0015");
      setUnitPrice("350.000,00");
    } else {
      setTicker("Fundo Multimercado");
      setBroker("BTG Pactual");
      setQuantity("1");
      setUnitPrice("5.000,00");
    }
  };

  const getAdviceText = () => {
    switch (selectedClass) {
      case "Renda Fixa":
        return (
          <>
            Com taxa de <strong className="text-ink font-semibold">{yieldRateDigits || "100"}% do CDI</strong>, este aporte fortalece sua reserva com liquidez diária e rendimento contínuo.
          </>
        );
      case "Ações / FIIs":
        return (
          <>
            Exposição calculada em renda variável: dividendos mensais isentos e potencial de valorização de longo prazo.
          </>
        );
      case "Cripto":
        return (
          <>
            Ativo de alta volatilidade. Recomenda-se manter o teto alocado em Criptoativos em até <strong className="text-ink font-semibold">5,0%</strong> do patrimônio total.
          </>
        );
      case "Fundos / Outros":
      default:
        return (
          <>
            Diversificação balanceada. Alocação sob medida para diluição de riscos da sua carteira.
          </>
        );
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticker.trim()) {
      setErrorMessage("Por favor, informe o nome ou código do ativo.");
      return;
    }
    if (totalOperacao <= 0) {
      setErrorMessage("O valor do aporte deve ser maior que zero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const q = isRendaFixa ? 1 : parseFloat(quantity) || 1;
      const p = isRendaFixa ? totalOperacao : parseCurrencyNumber(unitPrice);

      await cadastrarAtivo({
        ticker: ticker.trim(),
        institution: broker,
        assetClass: selectedClass,
        quantity: q,
        unitPrice: p,
        yieldRate: isRendaFixa ? `${yieldRateDigits || "100"}% CDI` : undefined,
        operationDate: operationDate ? new Date(operationDate).toISOString() : new Date().toISOString(),
      });

      setToastVisible(true);
      window.dispatchEvent(new CustomEvent("finances:refresh"));

      setTimeout(() => {
        setToastVisible(false);
        router.push("/investimentos");
        router.refresh();
      }, 1200);
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

  const presetsTaxa = ["100", "110", "115", "120"];

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 px-4 pb-44 max-w-md mx-auto bg-canvas min-h-screen">
      <div className="flex flex-col w-full pb-8">
        {/* Header de Navegação */}
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
              <span className="px-2.5 py-1 rounded-[18px] bg-surface-alt text-mid-gray font-caption text-caption uppercase tracking-wider font-medium">
                {selectedClass}
              </span>
            </div>
            <span className="font-caption text-caption text-mid-gray tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
              Novo Aporte
            </span>
          </div>

          <div className="space-y-1">
            <p className="font-caption text-caption text-mid-gray uppercase tracking-wider text-[11px]">Identificador</p>
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
              <p className="font-caption text-caption text-mid-gray uppercase tracking-wider text-[11px]">Total Estimado</p>
              <p className="font-headline-md text-[22px] font-semibold text-ink tracking-tight font-mono">
                {formatBRL(totalOperacao)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-caption text-caption text-mid-gray uppercase tracking-wider text-[11px]">Data Operação</p>
              <p className="font-label-sm text-label-sm text-ink font-medium">
                {formatDateDisplay(operationDate)}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Asset Class Selector */}
        <section className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-caption text-caption uppercase text-mid-gray tracking-wider text-[11px]">
              Classe do Ativo
            </span>
            <span className="font-caption text-caption text-mid-gray text-[11px]">4 categorias</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {classesConfig.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelectClass(item.name)}
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

        {/* 3. Form Adaptativo e Simplificado */}
        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Nome do Ativo */}
          <div className="flex flex-col gap-1.5">
            <label className="font-caption text-caption uppercase text-mid-gray tracking-wider text-[11px]" htmlFor="asset-ticker">
              {isRendaFixa ? "Nome do Ativo ou Caixinha" : "Código / Ticker do Ativo"}
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-mid-gray text-[18px]">search</span>
              <input
                id="asset-ticker"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder={isRendaFixa ? "Ex: Caixinha Nubank, Tesouro Selic..." : "Ex: PETR4, MXRF11, BTC..."}
                className="w-full h-11 pl-10 pr-4 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none placeholder:text-mid-gray/70 focus:bg-surface-alt transition-colors"
                required
              />
            </div>
          </div>

          {/* Instituição / Custódia */}
          <div className="flex flex-col gap-1.5">
            <label className="font-caption text-caption uppercase text-mid-gray tracking-wider text-[11px]" htmlFor="asset-broker">
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
                <option value="Caixinha Nubank">Caixinha Nubank</option>
                <option value="Nubank / NuInvest">Nubank / NuInvest</option>
                <option value="XP Investimentos">XP Investimentos</option>
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

          {/* Se for Renda Fixa: Valor do Aporte direto com máscara de moeda */}
          {isRendaFixa ? (
            <div className="flex flex-col gap-1.5">
              <label className="font-caption text-caption uppercase text-mid-gray tracking-wider text-[11px]" htmlFor="asset-valor-rf">
                Valor do Aporte
              </label>
              <div className="relative flex items-center">
                <span className="font-caption text-caption text-mid-gray absolute left-3.5 font-mono">R$</span>
                <input
                  id="asset-valor-rf"
                  type="text"
                  inputMode="numeric"
                  value={valorAporteRF}
                  onChange={(e) => setValorAporteRF(formatCurrency(e.target.value))}
                  placeholder="0,00"
                  className="w-full h-11 pl-10 pr-4 rounded-[18px] bg-paper text-ink font-mono text-[15px] shadow-sm outline-none focus:bg-surface-alt transition-colors font-medium"
                  required
                />
              </div>
            </div>
          ) : (
            /* Se for Ações / FIIs / Cripto: Quantidade e Preço com formatação */
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="font-caption text-caption uppercase text-mid-gray tracking-wider truncate text-[11px]" htmlFor="asset-qty">
                  Quantidade / Cotas
                </label>
                <div className="relative flex items-center">
                  <input
                    id="asset-qty"
                    type="number"
                    step="any"
                    min="0.000001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full h-11 px-3.5 rounded-[18px] bg-paper text-ink font-body-md text-body-md shadow-sm outline-none focus:bg-surface-alt transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="font-caption text-caption uppercase text-mid-gray tracking-wider truncate text-[11px]" htmlFor="asset-price">
                  Preço Unitário
                </label>
                <div className="relative flex items-center">
                  <span className="font-caption text-caption text-mid-gray absolute left-3.5 font-mono">R$</span>
                  <input
                    id="asset-price"
                    type="text"
                    inputMode="numeric"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(formatCurrency(e.target.value))}
                    placeholder="0,00"
                    className="w-full h-11 pl-9 pr-3.5 rounded-[18px] bg-paper text-ink font-mono text-[14px] shadow-sm outline-none focus:bg-surface-alt transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Se for Renda Fixa: Taxa / Rendimento com input exclusivo de dígitos e atalhos rápidos mockados */}
          {isRendaFixa && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-caption text-caption uppercase text-mid-gray tracking-wider text-[11px]" htmlFor="asset-rate">
                  Taxa / Rendimento (% do CDI)
                </label>
                <span className="text-[11px] text-mid-gray">Atalhos rápidos</span>
              </div>

              <div className="relative flex items-center">
                <input
                  id="asset-rate"
                  type="text"
                  inputMode="numeric"
                  value={yieldRateDigits}
                  onChange={(e) => setYieldRateDigits(e.target.value.replace(/\D/g, ""))}
                  placeholder="115"
                  className="w-full h-11 pl-4 pr-16 rounded-[18px] bg-paper text-ink font-mono text-[15px] shadow-sm outline-none focus:bg-surface-alt transition-colors font-medium"
                />
                <span className="absolute right-4 font-caption text-caption text-mid-gray font-mono pointer-events-none">
                  % CDI
                </span>
              </div>

              {/* Pílulas de preenchimento rápido mockadas */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                {presetsTaxa.map((taxa) => (
                  <button
                    key={taxa}
                    type="button"
                    onClick={() => setYieldRateDigits(taxa)}
                    className={`px-3 py-1 rounded-[14px] text-[12px] font-mono transition-all cursor-pointer ${
                      yieldRateDigits === taxa
                        ? "bg-ink text-paper font-semibold shadow-xs"
                        : "bg-surface-alt text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.06)]"
                    }`}
                  >
                    {taxa}% CDI
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data do Aporte com Calendário Nativo ao clicar */}
          <div className="flex flex-col gap-1.5">
            <label className="font-caption text-caption uppercase text-mid-gray tracking-wider text-[11px]" htmlFor="asset-date">
              Data do Aporte
            </label>
            <div className="relative flex items-center bg-paper rounded-[18px] shadow-sm focus-within:bg-surface-alt transition-colors">
              <span className="material-symbols-outlined absolute left-3.5 text-mid-gray text-[16px] pointer-events-none">
                calendar_today
              </span>
              <input
                id="asset-date"
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-transparent text-ink font-body-md text-body-md outline-none cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Resumo Calculado da Operação */}
          <div className="p-3.5 rounded-[18px] bg-surface-alt flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-mid-gray">calculate</span>
              <span className="font-label-sm text-label-sm text-mid-gray">Total da Operação</span>
            </div>
            <span className="font-label-md text-[16px] text-ink font-semibold font-mono">
              {formatBRL(totalOperacao)}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-[16px] bg-rose-50 text-rose-600 text-[13px] border border-rose-200">
              {errorMessage}
            </div>
          )}

          {/* 4. Diagnóstico Guará IA */}
          <section className="p-4 rounded-[18px] bg-surface-alt shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0 text-ink shadow-xs">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-caption text-caption uppercase font-semibold text-ink tracking-wider text-[11px]">
                  Diagnóstico Guará IA
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-mid-gray"></span>
                <span className="font-caption text-caption text-mid-gray text-[11px]">Em tempo real</span>
              </div>
              <p className="font-body-sm text-body-sm text-mid-gray leading-relaxed">
                {getAdviceText()}
              </p>
            </div>
          </section>

          {/* 5. Ações */}
          <div className="mt-1 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              id="submit-btn"
              className="w-full h-12 rounded-[18px] bg-ink text-paper font-label-md text-label-md font-medium flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all hover:bg-ink-soft disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Confirmando aporte...</span>
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

        {/* Toast */}
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
