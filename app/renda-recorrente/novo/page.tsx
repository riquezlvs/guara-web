"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cadastrarRendaRecorrente, obterContasDisponiveis } from "@/lib/api";

export default function NovaRendaRecorrentePage() {
  const router = useRouter();

  // Chips de Tipo / Categoria
  const [selectedType, setSelectedType] = useState<string>("salary");

  // Valor Líquido
  const [netValue, setNetValue] = useState("6.500,00");

  // Frequência
  const [frequency, setFrequency] = useState<"monthly" | "biweekly" | "weekly">("monthly");

  // Dia Agendado (pode ser preset ou dia numérico 1-31)
  const [scheduledDay, setScheduledDay] = useState<string>("5");
  const [customDay, setCustomDay] = useState<string>("");
  const [isCustomDay, setIsCustomDay] = useState<boolean>(false);

  // Regra de Fim de Semana (CLT)
  const [applyWeekendRule, setApplyWeekendRule] = useState<boolean>(true);
  const [weekendRule, setWeekendRule] = useState<"anticipate" | "postpone">("anticipate");

  // Considerar no Guará IA
  const [guaraSync, setGuaraSync] = useState(true);

  // Contas disponíveis
  const [contas, setContas] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Estado de submissão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    obterContasDisponiveis()
      .then((res) => {
        if (res.sucesso && res.dados && res.dados.length > 0) {
          setContas(res.dados);
          const checking = res.dados.find((c) => c.type === "checking");
          setSelectedAccountId(checking ? checking.id : res.dados[0].id);
        }
      })
      .catch((err) => {
        console.warn("Erro ao buscar contas:", err);
      });
  }, []);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setNetValue("");
      return;
    }
    const num = Number(digits) / 100;
    setNetValue(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleDaySelect = (day: string) => {
    setIsCustomDay(false);
    setScheduledDay(day);
  };

  const handleSave = async () => {
    const rawVal = parseFloat(netValue.replace(/\./g, "").replace(",", ".")) || 0;
    if (rawVal <= 0) {
      setErroMsg("Informe um valor maior que zero.");
      return;
    }

    let dia = 5;
    if (isCustomDay) {
      if (!customDay.trim()) {
        setErroMsg("Informe o dia do mês desejado (entre 1 e 31).");
        return;
      }
      const parsed = parseInt(customDay, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 31) {
        setErroMsg("O dia customizado deve ser entre 1 e 31.");
        return;
      }
      dia = parsed;
    } else if (scheduledDay === "20") {
      dia = 20;
    } else if (scheduledDay === "5th-business") {
      dia = 7;
    } else if (scheduledDay === "last-business") {
      dia = 28;
    } else {
      const parsed = parseInt(scheduledDay, 10);
      if (!isNaN(parsed)) dia = parsed;
    }

    const typeDescMap: Record<string, string> = {
      salary: "Salário Principal",
      vr: "Vale-Refeição (VR)",
      va: "Vale-Alimentação (VA)",
      advance: "Adiantamento Salarial",
      other: "Outro Benefício",
    };

    const incomeType =
      selectedType === "vr" || selectedType === "va"
        ? "benefit"
        : selectedType === "salary"
        ? "salary"
        : "other";

    const finalWeekendRule = applyWeekendRule ? weekendRule : "exact";

    setIsSubmitting(true);
    setErroMsg(null);

    try {
      await cadastrarRendaRecorrente({
        description: typeDescMap[selectedType] || "Renda Recorrente",
        total_amount: rawVal,
        day_of_month: dia,
        entry_type: "income",
        income_type: incomeType as "salary" | "freelance" | "benefit" | "other",
        weekend_rule: finalWeekendRule,
        account_id: selectedAccountId || undefined,
        payment_method: selectedType === "vr" || selectedType === "va" ? "meal_voucher" : "pix",
      });

      setIsSuccess(true);
      window.dispatchEvent(new CustomEvent("finances:refresh"));
      setTimeout(() => {
        router.back();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar renda recorrente.";
      setErroMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen text-[#0a0a0a] antialiased flex flex-col">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-40 bg-[#f5f5f5]/90 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="h-16 px-4 flex items-center justify-between max-w-xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              aria-label="Voltar"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#0a0a0a] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                Nova Renda Recorrente
              </h1>
              <span className="text-[11px] text-[#737373]">
                Salário, pró-labore ou benefício mensal
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">payments</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full pt-20 pb-16 px-4 max-w-xl mx-auto">
        <div className="flex flex-col gap-5 w-full">
          {/* Mensagem de Erro se houver */}
          {erroMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-[18px] text-[13px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{erroMsg}</span>
            </div>
          )}

          {/* Chips de Categoria */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
              Tipo de Recebimento
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "salary", label: "💼 Salário Principal" },
                { id: "vr", label: "🍽️ Vale-Refeição (VR)" },
                { id: "va", label: "🛒 Vale-Alimentação (VA)" },
                { id: "advance", label: "💰 Adiantamento (13º/Quinzenal)" },
                { id: "other", label: "✨ Outro Benefício" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedType(item.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    selectedType === item.id
                      ? "bg-black text-white shadow-xs"
                      : "bg-white text-[#737373] hover:text-[#0a0a0a] border border-black/[0.06]"
                  }`}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card de Valor Líquido */}
          <div className="p-5 bg-white rounded-[24px] border border-black/[0.06] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
                Valor Líquido Recorrente
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#737373] bg-[#f5f5f5] px-2 py-0.5 rounded-full font-medium">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Automático
              </span>
            </div>
            <div className="flex items-baseline gap-2 py-1">
              <span className="text-[28px] text-[#737373] font-light">R$</span>
              <input
                className="w-full bg-transparent text-[36px] text-[#0a0a0a] tracking-tight font-bold focus:outline-none"
                inputMode="decimal"
                type="text"
                value={netValue}
                onChange={handleValueChange}
                placeholder="0,00"
              />
            </div>
            <p className="text-[12px] text-[#737373] flex items-center gap-1.5 pt-1 border-t border-black/[0.04]">
              <span className="material-symbols-outlined text-[15px]">info</span>
              Valor líquido creditado na conta após descontos em folha.
            </p>
          </div>

          {/* Frequência & Agendamento */}
          <div className="p-5 bg-white rounded-[24px] border border-black/[0.06] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0a0a0a] text-[20px]">event_repeat</span>
                <h3 className="text-[16px] font-semibold text-[#0a0a0a]">Frequência & Agendamento</h3>
              </div>
              <span className="text-[11px] text-[#737373] bg-[#f5f5f5] px-2.5 py-1 rounded-full font-medium">
                Recorrente
              </span>
            </div>

            {/* Frequência */}
            <div className="grid grid-cols-3 gap-1 bg-[#f5f5f5] p-1 rounded-full">
              {[
                { id: "monthly", label: "Mensal" },
                { id: "biweekly", label: "Quinzenal" },
                { id: "weekly", label: "Semanal" },
              ].map((freq) => (
                <button
                  key={freq.id}
                  onClick={() => setFrequency(freq.id as "monthly" | "biweekly" | "weekly")}
                  className={`py-1.5 text-center rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    frequency === freq.id
                      ? "bg-white text-[#0a0a0a] shadow-xs font-semibold"
                      : "text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                  type="button"
                >
                  {freq.label}
                </button>
              ))}
            </div>

            {/* Dia do Crédito Programado */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
                Dia do Crédito Programado
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDaySelect("5")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-[16px] transition-all cursor-pointer border ${
                    !isCustomDay && scheduledDay === "5"
                      ? "bg-black text-white border-black"
                      : "bg-[#f9f9f9] text-[#0a0a0a] border-black/[0.06] hover:bg-[#f0f0f0]"
                  }`}
                  type="button"
                >
                  <span className="text-[13px] font-medium">Todo dia 05</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {!isCustomDay && scheduledDay === "5" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>

                <button
                  onClick={() => handleDaySelect("20")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-[16px] transition-all cursor-pointer border ${
                    !isCustomDay && scheduledDay === "20"
                      ? "bg-black text-white border-black"
                      : "bg-[#f9f9f9] text-[#0a0a0a] border-black/[0.06] hover:bg-[#f0f0f0]"
                  }`}
                  type="button"
                >
                  <span className="text-[13px] font-medium">Todo dia 20</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {!isCustomDay && scheduledDay === "20" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>

                <button
                  onClick={() => handleDaySelect("last-business")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-[16px] transition-all cursor-pointer border ${
                    !isCustomDay && scheduledDay === "last-business"
                      ? "bg-black text-white border-black"
                      : "bg-[#f9f9f9] text-[#0a0a0a] border-black/[0.06] hover:bg-[#f0f0f0]"
                  }`}
                  type="button"
                >
                  <span className="text-[13px] font-medium">Final do mês</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {!isCustomDay && scheduledDay === "last-business" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>

                <button
                  onClick={() => handleDaySelect("5th-business")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-[16px] transition-all cursor-pointer border ${
                    !isCustomDay && scheduledDay === "5th-business"
                      ? "bg-black text-white border-black"
                      : "bg-[#f9f9f9] text-[#0a0a0a] border-black/[0.06] hover:bg-[#f0f0f0]"
                  }`}
                  type="button"
                >
                  <span className="text-[13px] font-medium">5º dia útil</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {!isCustomDay && scheduledDay === "5th-business" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsCustomDay(true);
                    setCustomDay("");
                  }}
                  className={`col-span-2 flex items-center justify-between px-3.5 py-2.5 rounded-[16px] transition-all cursor-pointer border ${
                    isCustomDay
                      ? "bg-black text-white border-black"
                      : "bg-[#f9f9f9] text-[#0a0a0a] border-black/[0.06] hover:bg-[#f0f0f0]"
                  }`}
                  type="button"
                >
                  <span className="text-[13px] font-medium">+ Outro dia (Personalizar 1-31)</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {isCustomDay ? "check_circle" : "edit_calendar"}
                  </span>
                </button>
              </div>

              {isCustomDay && (
                <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-150">
                  <span className="text-[13px] text-[#737373]">Dia do mês (1 a 31):</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    autoFocus
                    placeholder="DD"
                    value={customDay}
                    onChange={(e) => setCustomDay(e.target.value)}
                    className="w-16 h-10 rounded-[12px] bg-[#f0f0f0] border border-black/15 text-[14px] font-semibold text-center text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
              )}
            </div>

            {/* Interruptor se aplica ou não regra de fim de semana */}
            <div className="flex flex-col gap-2 pt-1 border-t border-black/[0.06]">
              <div className="flex items-center justify-between p-3.5 bg-[#f9f9f9] rounded-[18px] border border-black/[0.06]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-[#0a0a0a]">
                    Ajustar em fim de semana / feriado?
                  </span>
                  <span className="text-[11px] text-[#737373]">
                    {applyWeekendRule
                      ? "Desloca o crédito para um dia útil bancário"
                      : "Manter exatamente no dia fixado (sem ajuste)"}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={applyWeekendRule}
                  onClick={() => setApplyWeekendRule(!applyWeekendRule)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                    applyWeekendRule ? "bg-black" : "bg-neutral-300"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                      applyWeekendRule ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {applyWeekendRule && (
                <div className="flex flex-col gap-2 pt-1 animate-in fade-in duration-150">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
                    Como ajustar se cair em sábado, domingo ou feriado:
                  </span>
                  <div className="flex flex-col gap-2">
                    <label
                      onClick={() => setWeekendRule("anticipate")}
                      className={`flex items-center gap-3 p-3 rounded-[16px] cursor-pointer transition-colors border ${
                        weekendRule === "anticipate"
                          ? "bg-[#fafafa] border-black/20"
                          : "bg-[#f9f9f9] border-black/[0.04] hover:bg-[#f0f0f0]"
                      }`}
                    >
                      <input
                        checked={weekendRule === "anticipate"}
                        onChange={() => setWeekendRule("anticipate")}
                        className="w-4 h-4 accent-black cursor-pointer"
                        name="weekend-rule"
                        type="radio"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] text-[#0a0a0a] font-medium">
                          Antecipar para o dia útil anterior
                        </span>
                        <span className="text-[11px] text-[#737373]">
                          Padrão contábil CLT / Folha de pagamento bancária
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setWeekendRule("postpone")}
                      className={`flex items-center gap-3 p-3 rounded-[16px] cursor-pointer transition-colors border ${
                        weekendRule === "postpone"
                          ? "bg-[#fafafa] border-black/20"
                          : "bg-[#f9f9f9] border-black/[0.04] hover:bg-[#f0f0f0]"
                      }`}
                    >
                      <input
                        checked={weekendRule === "postpone"}
                        onChange={() => setWeekendRule("postpone")}
                        className="w-4 h-4 accent-black cursor-pointer"
                        name="weekend-rule"
                        type="radio"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] text-[#0a0a0a] font-medium">
                          Postergar para o próximo dia útil
                        </span>
                        <span className="text-[11px] text-[#737373]">
                          Para contratos específicos ou repasses com carência
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conta de Destino */}
          <div className="p-5 bg-white rounded-[24px] border border-black/[0.06] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0a0a0a] text-[20px]">account_balance</span>
                <h3 className="text-[16px] font-semibold text-[#0a0a0a]">Destino do Recebimento</h3>
              </div>
              <span className="text-[11px] uppercase text-[#737373] bg-[#f5f5f5] px-2.5 py-0.5 rounded-full font-medium">
                Conta Bancária
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#737373]">
                Em qual conta o valor será depositado?
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="h-11 rounded-[16px] bg-[#f9f9f9] border border-black/10 text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
              >
                {contas.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type === "checking" ? "Conta Corrente" : "Investimento"} • Saldo R${" "}
                    {Number(acc.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Checkbox Guará IA */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                checked={guaraSync}
                onChange={(e) => setGuaraSync(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-black rounded cursor-pointer"
                id="guara-sync"
                type="checkbox"
              />
              <label className="flex flex-col cursor-pointer" htmlFor="guara-sync">
                <span className="text-[13px] text-[#0a0a0a] font-medium">
                  Considerar no Saldo Previsto da Guará IA
                </span>
                <span className="text-[11px] text-[#737373]">
                  Garante que o recebimento antes do vencimento do cartão evite faturas com saldo negativado.
                </span>
              </label>
            </div>
          </div>

          {/* Smart Card Callout */}
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/40 rounded-[24px] border border-emerald-500/15 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span className="text-[12px] font-semibold tracking-wide uppercase">
                  Impacto no Fechamento da Fatura
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-mono font-medium">Guará Proteção</span>
            </div>
            <p className="text-[13px] text-emerald-950 leading-relaxed">
              Com o salário de <span className="font-semibold">R$ {netValue || "0,00"}</span> agendado para o dia{" "}
              <span className="font-semibold">
                {isCustomDay ? customDay : scheduledDay === "5th-business" ? "5º dia útil" : scheduledDay}
              </span>
              , a fatura do seu cartão que fecha posteriormente será coberta automaticamente na projeção, mantendo seu Safe-to-Spend positivo.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              className="w-full h-12 rounded-full bg-black text-white text-[14px] font-medium tracking-tight shadow-md hover:bg-neutral-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Salvar Renda Recorrente</span>
                </>
              )}
            </button>
            <button
              className="w-full h-11 rounded-full bg-transparent text-[#737373] hover:text-[#0a0a0a] text-[13px] font-medium transition-colors flex items-center justify-center cursor-pointer"
              onClick={() => router.back()}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
