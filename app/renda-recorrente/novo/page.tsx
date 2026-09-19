"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NovaRendaRecorrentePage() {
  const router = useRouter();

  // Category / Type Selector Chips
  const [selectedType, setSelectedType] = useState<string>("salary");

  // Net Value Input
  const [netValue, setNetValue] = useState("6.500,00");

  // Frequency
  const [frequency, setFrequency] = useState<"monthly" | "biweekly" | "weekly">("monthly");

  // Scheduled Day
  const [scheduledDay, setScheduledDay] = useState<string>("5");

  // Weekend / Holiday Rule
  const [weekendRule, setWeekendRule] = useState<"anticipate" | "postpone">("anticipate");

  // Sync with Guará IA
  const [guaraSync, setGuaraSync] = useState(true);

  // Submission / State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setNetValue("");
      return;
    }
    const num = Number(digits) / 100;
    setNetValue(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.back();
      }, 700);
    }, 800);
  };

  const isBenefitCardVisible = selectedType === "vr" || selectedType === "va";

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased flex flex-col min-h-screen selection:bg-surface-variant">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter flex items-center justify-between gap-space-sm max-w-xl mx-auto w-full">
          <div className="flex items-center gap-space-sm min-w-0">
            <button
              aria-label="Voltar ou fechar"
              className="w-11 h-11 -ml-space-xs rounded-full flex items-center justify-center text-ink hover:bg-surface-variant/50 active:bg-surface-variant transition-colors cursor-pointer"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <h1 className="font-headline-sm text-headline-sm text-ink truncate tracking-tight font-semibold">
              Adicionar Renda Recorrente
            </h1>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface">
        <div className="flex flex-col w-full pb-10">
          <div className="px-gutter flex flex-col gap-space-lg max-w-xl mx-auto w-full">
            {/* Screen Intro / Meta Header */}
            <header className="pt-space-md flex flex-col gap-space-xs">
              <div className="inline-flex items-center gap-space-xs w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
                <span className="font-caption text-[12px] text-mid-gray tracking-widest uppercase font-medium">
                  MyFinances • Fluxo Recorrente
                </span>
              </div>
              <h2 className="font-headline-md text-2xl font-semibold text-ink tracking-tight">
                Configuração de Entrada Fixa
              </h2>
              <p className="font-body-md text-mid-gray">
                Cadastre seus recebimentos automáticos para prever seu fluxo de caixa mensal.
              </p>
            </header>

            {/* Category / Type Selector Chips */}
            <section className="flex flex-col gap-space-xs">
              <span className="font-caption text-[12px] text-mid-gray tracking-widest uppercase font-medium">
                Categoria de Entrada
              </span>
              <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs scrollbar-none" id="income-type-chips">
                <button
                  onClick={() => setSelectedType("salary")}
                  className={`income-chip shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    selectedType === "salary"
                      ? "bg-ink text-paper shadow-sm"
                      : "bg-surface-alt text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                  }`}
                  data-type="salary"
                  type="button"
                >
                  Salário Principal
                </button>
                <button
                  onClick={() => setSelectedType("vr")}
                  className={`income-chip shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    selectedType === "vr"
                      ? "bg-ink text-paper shadow-sm"
                      : "bg-surface-alt text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                  }`}
                  data-type="vr"
                  type="button"
                >
                  Vale-Refeição (VR)
                </button>
                <button
                  onClick={() => setSelectedType("va")}
                  className={`income-chip shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    selectedType === "va"
                      ? "bg-ink text-paper shadow-sm"
                      : "bg-surface-alt text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                  }`}
                  data-type="va"
                  type="button"
                >
                  Vale-Alimentação (VA)
                </button>
                <button
                  onClick={() => setSelectedType("advance")}
                  className={`income-chip shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    selectedType === "advance"
                      ? "bg-ink text-paper shadow-sm"
                      : "bg-surface-alt text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                  }`}
                  data-type="advance"
                  type="button"
                >
                  Adiantamento (13º/Quinzenal)
                </button>
                <button
                  onClick={() => setSelectedType("other")}
                  className={`income-chip shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    selectedType === "other"
                      ? "bg-ink text-paper shadow-sm"
                      : "bg-surface-alt text-mid-gray hover:text-ink shadow-[0_0_0_1px_rgba(23,23,23,0.08)]"
                  }`}
                  data-type="other"
                  type="button"
                >
                  Outro Benefício
                </button>
              </div>
            </section>

            {/* Hero Stat / Net Value Input Display */}
            <section className="p-space-lg bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.06),0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-caption text-[12px] text-mid-gray tracking-wider uppercase font-medium">
                  Valor Líquido Recorrente
                </span>
                <span className="inline-flex items-center gap-1 font-caption text-[12px] text-mid-gray bg-canvas px-2 py-0.5 rounded-full font-medium">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Automático
                </span>
              </div>
              <div className="flex items-baseline gap-space-xs py-space-xs">
                <label className="sr-only" htmlFor="income-val">Valor líquido</label>
                <div className="flex items-baseline gap-1 w-full">
                  <span className="text-[30px] leading-[38px] text-mid-gray font-light">R$</span>
                  <input
                    className="w-full bg-transparent text-[36px] leading-[40px] text-ink tracking-tight font-semibold focus:outline-none focus:text-ink selection:bg-surface-container-high"
                    id="income-val"
                    inputMode="decimal"
                    type="text"
                    value={netValue}
                    onChange={handleValueChange}
                  />
                  <span className="material-symbols-outlined text-mid-gray text-[20px] self-center animate-pulse">edit</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs pt-space-xs bg-canvas/60 rounded-xl px-space-sm py-1.5">
                <span className="material-symbols-outlined text-mid-gray text-[16px]">info</span>
                <p className="font-body-sm text-[13px] text-mid-gray truncate">
                  Valor líquido creditado na conta após descontos em folha.
                </p>
              </div>
            </section>

            {/* Recurrence Settings Card */}
            <section className="p-space-lg bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.06),0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-ink text-[20px]">event_repeat</span>
                  <h3 className="font-headline-sm text-lg font-semibold text-ink">Frequência &amp; Agendamento</h3>
                </div>
                <span className="font-caption text-[12px] text-mid-gray bg-canvas px-2.5 py-1 rounded-full font-medium">Recorrente</span>
              </div>

              {/* Frequency Segmented Pill Control */}
              <div className="grid grid-cols-3 gap-1 bg-canvas p-1 rounded-full">
                <button
                  onClick={() => setFrequency("monthly")}
                  className={`freq-btn py-1.5 text-center rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    frequency === "monthly"
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-mid-gray hover:text-ink"
                  }`}
                  data-freq="monthly"
                  type="button"
                >
                  Mensal
                </button>
                <button
                  onClick={() => setFrequency("biweekly")}
                  className={`freq-btn py-1.5 text-center rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    frequency === "biweekly"
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-mid-gray hover:text-ink"
                  }`}
                  data-freq="biweekly"
                  type="button"
                >
                  Quinzenal
                </button>
                <button
                  onClick={() => setFrequency("weekly")}
                  className={`freq-btn py-1.5 text-center rounded-full font-label-sm text-[13px] font-medium transition-all cursor-pointer ${
                    frequency === "weekly"
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-mid-gray hover:text-ink"
                  }`}
                  data-freq="weekly"
                  type="button"
                >
                  Semanal
                </button>
              </div>

              {/* Scheduled Day of Recurrence Selector */}
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <label className="font-caption text-[12px] text-mid-gray tracking-wider uppercase font-medium">
                  Dia do Crédito Programado
                </label>
                <div className="grid grid-cols-2 gap-space-xs">
                  <button
                    onClick={() => setScheduledDay("5")}
                    className={`day-opt flex items-center justify-between px-space-md py-2.5 rounded-xl transition-all cursor-pointer ${
                      scheduledDay === "5"
                        ? "bg-surface-alt text-ink shadow-[0_0_0_1.5px_#0a0a0a]"
                        : "bg-canvas text-mid-gray shadow-[0_0_0_1px_rgba(23,23,23,0.06)] hover:text-ink"
                    }`}
                    data-day="5"
                    type="button"
                  >
                    <span className="font-label-md text-[14px] font-medium">Todo dia 05</span>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        scheduledDay === "5" ? "text-ink font-fill" : "text-outline-variant"
                      }`}
                      style={{ fontVariationSettings: scheduledDay === "5" ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {scheduledDay === "5" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>

                  <button
                    onClick={() => setScheduledDay("20")}
                    className={`day-opt flex items-center justify-between px-space-md py-2.5 rounded-xl transition-all cursor-pointer ${
                      scheduledDay === "20"
                        ? "bg-surface-alt text-ink shadow-[0_0_0_1.5px_#0a0a0a]"
                        : "bg-canvas text-mid-gray shadow-[0_0_0_1px_rgba(23,23,23,0.06)] hover:text-ink"
                    }`}
                    data-day="20"
                    type="button"
                  >
                    <span className="font-label-md text-[14px] font-medium">Todo dia 20</span>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        scheduledDay === "20" ? "text-ink" : "text-outline-variant"
                      }`}
                      style={{ fontVariationSettings: scheduledDay === "20" ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {scheduledDay === "20" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>

                  <button
                    onClick={() => setScheduledDay("last-business")}
                    className={`day-opt flex items-center justify-between px-space-md py-2.5 rounded-xl transition-all cursor-pointer ${
                      scheduledDay === "last-business"
                        ? "bg-surface-alt text-ink shadow-[0_0_0_1.5px_#0a0a0a]"
                        : "bg-canvas text-mid-gray shadow-[0_0_0_1px_rgba(23,23,23,0.06)] hover:text-ink"
                    }`}
                    data-day="last-business"
                    type="button"
                  >
                    <span className="font-label-md text-[14px] font-medium">Último dia útil</span>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        scheduledDay === "last-business" ? "text-ink" : "text-outline-variant"
                      }`}
                      style={{ fontVariationSettings: scheduledDay === "last-business" ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {scheduledDay === "last-business" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>

                  <button
                    onClick={() => setScheduledDay("5th-business")}
                    className={`day-opt flex items-center justify-between px-space-md py-2.5 rounded-xl transition-all cursor-pointer ${
                      scheduledDay === "5th-business"
                        ? "bg-surface-alt text-ink shadow-[0_0_0_1.5px_#0a0a0a]"
                        : "bg-canvas text-mid-gray shadow-[0_0_0_1px_rgba(23,23,23,0.06)] hover:text-ink"
                    }`}
                    data-day="5th-business"
                    type="button"
                  >
                    <span className="font-label-md text-[14px] font-medium truncate">5º dia útil</span>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        scheduledDay === "5th-business" ? "text-ink" : "text-outline-variant"
                      }`}
                    >
                      tune
                    </span>
                  </button>
                </div>
              </div>

              {/* Weekend / Holiday Rule Segment */}
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-caption text-[12px] text-mid-gray tracking-wider uppercase font-medium">
                  Se cair em sábado, domingo ou feriado:
                </span>
                <div className="flex flex-col gap-1.5">
                  <label
                    onClick={() => setWeekendRule("anticipate")}
                    className={`flex items-center gap-space-sm p-space-sm rounded-xl cursor-pointer transition-colors ${
                      weekendRule === "anticipate"
                        ? "bg-surface-alt shadow-[0_0_0_1px_rgba(23,23,23,0.06)]"
                        : "bg-canvas hover:bg-surface-alt"
                    }`}
                  >
                    <input
                      checked={weekendRule === "anticipate"}
                      onChange={() => setWeekendRule("anticipate")}
                      className="w-4 h-4 accent-ink"
                      name="weekend-rule"
                      type="radio"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-md text-[14px] text-ink font-medium">Antecipar para o dia útil anterior</span>
                      <span className="font-caption text-[12px] text-mid-gray">Padrão contábil CLT / Folha bancária</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setWeekendRule("postpone")}
                    className={`flex items-center gap-space-sm p-space-sm rounded-xl cursor-pointer transition-colors ${
                      weekendRule === "postpone"
                        ? "bg-surface-alt shadow-[0_0_0_1px_rgba(23,23,23,0.06)]"
                        : "bg-canvas hover:bg-surface-alt"
                    }`}
                  >
                    <input
                      checked={weekendRule === "postpone"}
                      onChange={() => setWeekendRule("postpone")}
                      className="w-4 h-4 accent-ink"
                      name="weekend-rule"
                      type="radio"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className={`font-body-md text-[14px] ${weekendRule === "postpone" ? "text-ink font-medium" : "text-mid-gray"}`}>
                        Postergado para o próximo dia útil
                      </span>
                      <span className="font-caption text-[12px] text-mid-gray">Para repasses contratuais específicos</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Next Expected Date Pill Tag */}
              <div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-xl">
                <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-ink shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-caption text-[12px] text-mid-gray uppercase font-medium">Próximo Recebimento Previsto</span>
                  <span className="font-label-md text-[14px] text-ink font-semibold truncate">05 de Dezembro (Quinta-feira)</span>
                </div>
              </div>
            </section>

            {/* Destination Account & Benefit Handling Card */}
            <section className="p-space-lg bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.06),0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-ink text-[20px]">account_balance</span>
                  <h3 className="font-headline-sm text-lg font-semibold text-ink">Destino do Recebimento</h3>
                </div>
                <span className="font-caption text-[12px] uppercase text-mid-gray bg-canvas px-2.5 py-0.5 rounded-full font-medium">
                  Conta Ativa
                </span>
              </div>

              {/* Main Bank Item / Selectable Panel */}
              <div className="flex items-center justify-between p-space-md bg-canvas rounded-2xl shadow-[0_0_0_1px_rgba(23,23,23,0.04)] cursor-pointer hover:bg-surface-alt transition-colors">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-white">account_balance_wallet</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-md text-[14px] text-ink font-semibold truncate">Nubank Conta Principal</span>
                      <span className="font-caption text-[12px] text-ink bg-paper px-2 py-0.5 rounded-full shadow-sm shrink-0 font-medium">
                        Corrente
                      </span>
                    </div>
                    <span className="font-caption text-[12px] text-mid-gray">Saldo disponível: R$ 1.635,40</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mid-gray text-[20px]">unfold_more</span>
              </div>

              {/* Conditional Benefit Card Target (VR/VA) */}
              {isBenefitCardVisible && (
                <div className="flex flex-col gap-space-xs p-space-md bg-surface-alt rounded-2xl shadow-[0_0_0_1px_rgba(23,23,23,0.06)] animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-caption text-[12px] text-mid-gray uppercase tracking-wider font-medium">
                      Cartão de Benefício Associado
                    </span>
                    <span className="font-caption text-[12px] text-ink bg-canvas px-2 py-0.5 rounded-full font-medium">
                      Multi-benefício
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-ink">
                        <span className="material-symbols-outlined text-[18px]">credit_card</span>
                      </div>
                      <span className="font-label-md text-[14px] text-ink font-medium">Flash Mastercard • Benefícios</span>
                    </div>
                    <span className="material-symbols-outlined text-mid-gray text-[18px]">arrow_forward_ios</span>
                  </div>
                </div>
              )}

              {/* Checkbox Guará IA Predictive Balance */}
              <div className="flex items-start gap-space-sm pt-space-xs">
                <input
                  checked={guaraSync}
                  onChange={(e) => setGuaraSync(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-ink rounded cursor-pointer"
                  id="guara-sync"
                  type="checkbox"
                />
                <label className="flex flex-col cursor-pointer" htmlFor="guara-sync">
                  <span className="font-label-md text-[14px] text-ink font-medium">Considerar no Saldo Previsto da Guará IA</span>
                  <span className="font-caption text-[12px] text-mid-gray">
                    Integra essa projeção automaticamente ao calendário de faturas e reservas.
                  </span>
                </label>
              </div>
            </section>

            {/* Guará IA Smart Projection Callout (Clinical Blueprint Aesthetic) */}
            <section className="p-space-lg bg-surface-alt rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.08),0_2px_4px_rgba(0,0,0,0.03)] flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-ink text-[18px]">auto_awesome</span>
                  <span className="font-caption text-[12px] text-ink font-semibold tracking-wider uppercase bg-paper px-2.5 py-0.5 rounded-full shadow-sm">
                    Projeção Guará IA
                  </span>
                </div>
                <span className="font-caption text-[12px] text-mid-gray font-medium">Precisão 99.4%</span>
              </div>
              <p className="font-body-md text-ink leading-relaxed">
                Com a entrada de <span className="font-semibold text-ink">R$ {netValue || "0,00"}</span> todo dia{" "}
                <span className="font-semibold text-ink">
                  {scheduledDay === "5"
                    ? "05"
                    : scheduledDay === "20"
                    ? "20"
                    : scheduledDay === "last-business"
                    ? "último dia útil"
                    : "5º dia útil"}
                </span>
                , sua fatura Nubank (vencimento dia 10) terá{" "}
                <span className="font-semibold text-ink">cobertura total de 100%</span> com sobra estimada de{" "}
                <span className="font-semibold text-ink">R$ 3.117,40</span> para aportes automáticos na Caixinha de Emergência.
              </p>

              {/* Mini visual timeline sparkline */}
              <div className="pt-space-xs flex items-center justify-between gap-space-xs text-center">
                <div className="flex-1 bg-paper p-2 rounded-xl shadow-sm flex flex-col items-center">
                  <span className="font-caption text-[12px] text-mid-gray font-medium">05 Dez</span>
                  <span className="font-label-sm text-[13px] text-ink font-semibold">+ R$ {netValue || "0,00"}</span>
                </div>
                <span className="material-symbols-outlined text-mid-gray text-[16px]">arrow_forward</span>
                <div className="flex-1 bg-paper p-2 rounded-xl shadow-sm flex flex-col items-center">
                  <span className="font-caption text-[12px] text-mid-gray font-medium">10 Dez (Fatura)</span>
                  <span className="font-label-sm text-[13px] text-mid-gray font-medium">- R$ 3.382</span>
                </div>
                <span className="material-symbols-outlined text-mid-gray text-[16px]">arrow_forward</span>
                <div className="flex-1 bg-ink text-paper p-2 rounded-xl shadow-sm flex flex-col items-center">
                  <span className="font-caption text-[12px] text-surface-container-highest font-medium">Reserva Livre</span>
                  <span className="font-label-sm text-[13px] text-paper font-semibold">R$ 3.117</span>
                </div>
              </div>
            </section>

            {/* History / Active Recurrent Incomes Overview */}
            <section className="flex flex-col gap-space-xs pt-space-xs">
              <div className="flex items-center justify-between px-space-xs">
                <span className="font-caption text-[12px] text-mid-gray tracking-wider uppercase font-medium">
                  Rendas Recorrentes Ativas (2)
                </span>
                <span className="font-caption text-[12px] text-ink font-medium">Total: R$ 7.350,00/mês</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {/* Item 1: VR Flash */}
                <div className="p-space-md bg-paper rounded-2xl shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-between">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded-full bg-canvas flex items-center justify-center text-ink shrink-0">
                      <span className="material-symbols-outlined text-[16px]">restaurant</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-md text-[14px] text-ink truncate font-medium">Vale-Refeição (Flash)</span>
                      <span className="font-caption text-[12px] text-mid-gray">Todo dia 01 • Cartão de Alimentação</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-label-md text-[14px] text-ink font-semibold">R$ 850,00</span>
                    <span className="font-caption text-[12px] text-mid-gray">por mês</span>
                  </div>
                </div>

                {/* Item 2: Salario Principal (Current / Staged) */}
                <div className="p-space-md bg-paper rounded-2xl shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-between">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-white">work</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-md text-[14px] text-ink truncate font-semibold">Salário Principal</span>
                        <span className="font-caption text-[12px] text-mid-gray bg-canvas px-1.5 rounded font-medium">Em edição</span>
                      </div>
                      <span className="font-caption text-[12px] text-mid-gray">Todo dia 05 • Nubank Conta</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-label-md text-[14px] text-ink font-semibold">R$ {netValue || "0,00"}</span>
                    <span className="font-caption text-[12px] text-mid-gray">por mês</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Action Buttons (Bottom container) */}
            <footer className="pt-space-md flex flex-col gap-space-xs">
              <button
                className="w-full h-11 px-space-lg rounded-full bg-ink text-paper font-label-md text-[14px] font-medium tracking-tight shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                id="btn-save-income"
                onClick={handleSave}
                disabled={isSubmitting}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Sincronizando com Guará IA...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Entrada Salva com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    <span>Salvar Renda Recorrente</span>
                  </>
                )}
              </button>
              <button
                className="w-full h-10 px-space-lg rounded-full bg-transparent text-ink font-label-md text-[14px] font-medium hover:bg-surface-variant/40 active:bg-surface-variant transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => router.back()}
                type="button"
              >
                Cancelar
              </button>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
