"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TransactionDraft,
  obterCategoriasDisponiveis,
  obterContasDisponiveis,
  obterCartoes,
  CartaoItem,
} from "@/lib/api";

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: TransactionDraft) => void;
}

export function ManualTransactionModal({
  isOpen,
  onClose,
  onSubmit,
}: ManualTransactionModalProps) {
  // Tipo principal: Despesa ou Receita
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");

  // Tag de recebimento ativa
  const [selectedIncomeTag, setSelectedIncomeTag] = useState<string>("salary");

  // Valor e descrição
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number>(1);
  const [observation, setObservation] = useState("");
  const [occurredAt, setOccurredAt] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  // Pagamento / Cartão / Conta
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [installmentTotal, setInstallmentTotal] = useState<number>(1);

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOption, setDayOption] = useState<"5" | "20" | "last-day" | "5th-business" | "custom">("5");
  const [customDay, setCustomDay] = useState<string>("");
  const [applyWeekendRule, setApplyWeekendRule] = useState<boolean>(true);
  const [weekendRule, setWeekendRule] = useState<"anticipate" | "postpone">("anticipate");
  const [incomeType, setIncomeType] = useState<"salary" | "freelance" | "benefit" | "other">("salary");

  // Divisão com amigos (Quem Me Deve)
  const [isSplit, setIsSplit] = useState(false);
  const [splitFriendName, setSplitFriendName] = useState("");
  const [splitMode, setSplitMode] = useState<"half" | "full" | "custom">("half");
  const [customSplitType, setCustomSplitType] = useState<"percentage" | "amount">("percentage");
  const [customSplitValue, setCustomSplitValue] = useState<string>("50");

  // Dados carregados do sistema
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);
  const [cards, setCards] = useState<CartaoItem[]>([]);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (isOpen) {
      const carregarDados = async () => {
        try {
          const [catsRes, contasRes, cartoesRes] = await Promise.all([
            obterCategoriasDisponiveis().catch(() => ({ dados: [] })),
            obterContasDisponiveis().catch(() => ({ dados: [] })),
            obterCartoes().catch(() => ({ dados: [] })),
          ]);

          if (catsRes?.dados && catsRes.dados.length > 0) {
            setCategories(catsRes.dados);
            setCategoryId(catsRes.dados[0].id);
          }
          if (contasRes?.dados && contasRes.dados.length > 0) {
            setAccounts(contasRes.dados);
            setSelectedAccountId(contasRes.dados[0].id);
          }
          if (cartoesRes?.dados && cartoesRes.dados.length > 0) {
            setCards(cartoesRes.dados);
            const defaultCard = cartoesRes.dados.find((c) => c.is_default) || cartoesRes.dados[0];
            setSelectedCardId(defaultCard.id);
          }
        } catch (e) {
          console.warn("Erro ao carregar metadados:", e);
        }
      };

      carregarDados();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Formatação monetária em tempo real (máscara de moeda BRL)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setAmountStr("");
      return;
    }
    const num = parseFloat(digits) / 100;
    setAmountStr(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseValorNumerico = (str: string): number => {
    const clean = str.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  const handlePresetIncome = (tipo: "salary" | "freelance" | "benefit" | "advance" | "other") => {
    setSelectedIncomeTag(tipo);
    switch (tipo) {
      case "salary":
        setDescription("Salário Principal");
        setIncomeType("salary");
        setIsRecurring(true);
        setDayOption("5");
        setWeekendRule("anticipate");
        setPaymentMethod("pix");
        break;
      case "freelance":
        setDescription("Freelance / Serviço Prestado");
        setIncomeType("freelance");
        setIsRecurring(false);
        setPaymentMethod("pix");
        break;
      case "benefit":
        setDescription("Vale-Refeição (VR/VA)");
        setIncomeType("benefit");
        setIsRecurring(true);
        setDayOption("5");
        setWeekendRule("anticipate");
        setPaymentMethod("pix");
        break;
      case "advance":
        setDescription("Adiantamento Salarial");
        setIncomeType("salary");
        setIsRecurring(false);
        setPaymentMethod("pix");
        break;
      case "other":
        setDescription("");
        setIncomeType("other");
        setIsRecurring(false);
        break;
    }
  };

  const handleProceed = () => {
    const valorNumerico = parseValorNumerico(amountStr);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      alert("Por favor, informe um valor válido para o lançamento.");
      return;
    }

    const desc = description.trim();
    if (!desc) {
      alert("Por favor, informe a descrição do lançamento (ex: Almoço, Salário, Freela).");
      return;
    }

    // Resolução do dia do mês
    let diaNum = 5;
    if (isRecurring) {
      if (dayOption === "5") diaNum = 5;
      else if (dayOption === "20") diaNum = 20;
      else if (dayOption === "last-day") diaNum = 28;
      else if (dayOption === "5th-business") diaNum = 7;
      else if (dayOption === "custom") {
        if (!customDay.trim()) {
          alert("Por favor, digite o dia do mês desejado (entre 1 e 31).");
          return;
        }
        const parsed = parseInt(customDay, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 31) {
          alert("Por favor, informe um dia do mês válido (entre 1 e 31) para a recorrência.");
          return;
        }
        diaNum = parsed;
      }
    }

    const weekendRuleFinal = applyWeekendRule ? weekendRule : "exact";

    // Resolução de Categoria:
    // Para despesas: categoria selecionada pelo usuário
    // Para receitas: busca categoria padrão 'Receitas' ou usa a primeira disponível
    const selectedCategory = categories.find((c) => c.id === categoryId);
    const defaultIncomeCategory = categories.find((c) =>
      c.name.toLowerCase().includes("receita") || c.name.toLowerCase().includes("renda")
    ) || categories[0];

    const categoryIdFinal = entryType === "income" ? (defaultIncomeCategory?.id ?? 1) : categoryId;
    const categoryNameFinal = entryType === "income" ? (defaultIncomeCategory?.name || "Receitas") : (selectedCategory?.name || "Geral");

    const isCredit = entryType === "expense" && paymentMethod === "credit_card";
    const selectedCard = isCredit ? cards.find((c) => c.id === selectedCardId) : null;
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

    const accountName = selectedAccount?.name || "Conta Principal";
    const accountBalance = selectedAccount?.balance || 0;
    const cardName = selectedCard?.name || null;

    // Projeção instantânea do Safe-to-Spend
    const saldoAtual = accountBalance;
    const isIncome = entryType === "income";
    const novoProjetado = isIncome ? saldoAtual + valorNumerico : saldoAtual - valorNumerico;
    const impacto = saldoAtual > 0 ? Number(((valorNumerico / saldoAtual) * 100).toFixed(2)) : 0;
    const progressBar = Math.max(10, Math.min(100, Math.round((novoProjetado / (saldoAtual || 1)) * 100)));

    let methodLabel = "Pix";
    if (isCredit) {
      methodLabel = `Crédito • ${selectedCard?.name || "Cartão"}${installmentTotal > 1 ? ` (${installmentTotal}x)` : ""}`;
    } else if (paymentMethod === "debit_card") {
      methodLabel = "Débito em Conta";
    } else if (paymentMethod === "cash") {
      methodLabel = "Dinheiro";
    } else if (paymentMethod === "transfer") {
      methodLabel = "Transferência / TED";
    }

    // Resolução de Divisão (Split)
    let calculatedMyShare: number | undefined = undefined;
    let calculatedThirdPartyShare: number | undefined = undefined;

    if (isSplit && splitFriendName.trim()) {
      if (splitMode === "full") {
        calculatedMyShare = 0;
        calculatedThirdPartyShare = valorNumerico;
      } else if (splitMode === "half") {
        calculatedMyShare = Math.round((valorNumerico / 2) * 100) / 100;
        calculatedThirdPartyShare = Math.round((valorNumerico - calculatedMyShare) * 100) / 100;
      } else {
        // Modo personalizado
        if (customSplitType === "percentage") {
          const pct = parseFloat(customSplitValue.replace(",", ".")) || 0;
          if (pct <= 0 || pct > 100) {
            alert("Por favor, informe uma porcentagem válida entre 1% e 100% para o amigo.");
            return;
          }
          calculatedThirdPartyShare = Math.round((valorNumerico * (pct / 100)) * 100) / 100;
          calculatedMyShare = Math.round((valorNumerico - calculatedThirdPartyShare) * 100) / 100;
        } else {
          // Valor fixo em R$
          const friendVal = parseValorNumerico(customSplitValue);
          if (friendVal <= 0 || friendVal > valorNumerico) {
            alert(`Por favor, informe um valor para o amigo entre R$ 0,01 e R$ ${valorNumerico.toFixed(2)}.`);
            return;
          }
          calculatedThirdPartyShare = Math.round(friendVal * 100) / 100;
          calculatedMyShare = Math.round((valorNumerico - calculatedThirdPartyShare) * 100) / 100;
        }
      }
    }

    const draft: TransactionDraft = {
      originalInput: observation.trim()
        ? `${isIncome ? "Receita" : "Gasto"} manual: ${desc} (Obs: ${observation.trim()}) de R$ ${valorNumerico.toFixed(2)}`
        : `${isIncome ? "Receita" : "Gasto"} manual: ${desc} de R$ ${valorNumerico.toFixed(2)}`,
      isAudio: false,
      origin: "manual",
      precision: "100% conferido",
      entryType,
      description: desc,
      totalAmount: valorNumerico,
      categoryId: categoryIdFinal,
      categoryName: categoryNameFinal,
      paymentMethod: isCredit ? "credit_card" : paymentMethod,
      paymentMethodLabel: methodLabel,
      cardName,
      cardId: isCredit ? (selectedCard?.id || null) : null,
      installmentTotal: isCredit ? installmentTotal : null,
      accountName,
      accountId: selectedAccount?.id || null,
      accountBalance,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      location: desc,
      isRecurring,
      dayOfMonth: isRecurring ? diaNum : undefined,
      weekendRule: isRecurring ? weekendRuleFinal : undefined,
      incomeType: isIncome ? incomeType : undefined,
      thirdPartyName: isSplit && splitFriendName.trim() ? splitFriendName.trim() : undefined,
      thirdPartyNames: isSplit && splitFriendName.trim() ? [splitFriendName.trim()] : undefined,
      myShareAmount: calculatedMyShare,
      thirdPartyShareAmount: calculatedThirdPartyShare,
      safeToSpend: {
        current: saldoAtual,
        projected: novoProjetado,
        impactPercentage: impacto,
        impactLabel: `${isIncome ? "+" : "-"}${impacto}%`,
        progressBarPercent: progressBar,
      },
      availableCategories: categories,
      availableAccounts: accounts.map((a) => ({ id: a.id, name: a.name, balance: a.balance })),
    };

    onSubmit(draft);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[28px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-black text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">
                {entryType === "income" ? "savings" : "edit_note"}
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                Novo Lançamento
              </h3>
              <span className="text-[11px] text-[#737373]">
                {entryType === "income"
                  ? "Cadastre recebimentos, salários ou rendas avulsas"
                  : "Cadastre despesas avulsas, cartões ou contas fixas"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-[14px] bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tipo Principal: Despesa vs Receita */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f5f5f5] rounded-[18px] border border-black/[0.04]">
          <button
            type="button"
            onClick={() => {
              setEntryType("expense");
              setIsRecurring(false);
            }}
            className={`py-2 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              entryType === "expense"
                ? "bg-white text-rose-600 shadow-xs font-semibold"
                : "text-[#737373] hover:text-[#0a0a0a]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
            Despesa / Gasto
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType("income");
              setPaymentMethod("pix");
            }}
            className={`py-2 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              entryType === "income"
                ? "bg-white text-emerald-600 shadow-xs font-semibold"
                : "text-[#737373] hover:text-[#0a0a0a]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            Recebimento / Ganho
          </button>
        </div>

        {/* Chips de Atalho para Recebimento com Destaque Visual */}
        {entryType === "income" && (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
              Tipo de Entrada Rápida
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "salary", label: "💼 Salário Principal" },
                { id: "freelance", label: "⚡ Freelance / Extra" },
                { id: "benefit", label: "🍽️ Vale-Refeição (VR)" },
                { id: "advance", label: "💰 Adiantamento" },
                { id: "other", label: "✨ Outro Ganho" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePresetIncome(item.id as any)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer border ${
                    selectedIncomeTag === item.id
                      ? "bg-black text-white border-black shadow-xs font-semibold"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a] hover:bg-[#eaeaea] border-black/[0.04]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interruptor de Recorrência (Para Despesas Fixas ou Receitas Recorrentes) */}
        <div className="flex flex-col gap-3 p-3.5 bg-[#f7f7f8] rounded-[20px] border border-black/5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#0a0a0a]">
                {entryType === "income" ? "Recebimento Recorrente?" : "Despesa Fixa / Recorrente?"}
              </span>
              <span className="text-[11px] text-[#737373]">
                {isRecurring
                  ? entryType === "income"
                    ? "Salário ou benefício fixo todo mês (projeta saldo da fatura)"
                    : "Assinatura, aluguel ou conta repetida mensalmente"
                  : entryType === "income"
                  ? "Receita pontual avulsa (ex: freelance, bônus)"
                  : "Gasto avulso pontual"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isRecurring}
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                isRecurring ? "bg-[#0a0a0a]" : "bg-neutral-300"
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                  isRecurring ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Opções de Datas Recorrentes Mais Usadas + Personalizar */}
          {isRecurring && (
            <div className="flex flex-col gap-3 pt-2.5 border-t border-black/5 animate-in fade-in duration-150">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
                  Dia do Recebimento Programado
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDayOption("5")}
                    className={`py-2 px-2.5 rounded-[14px] text-[12px] font-medium transition-all text-center border cursor-pointer ${
                      dayOption === "5"
                        ? "bg-black text-white border-black shadow-xs font-semibold"
                        : "bg-white text-[#737373] hover:text-[#0a0a0a] border-black/[0.08]"
                    }`}
                  >
                    Todo dia 05
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayOption("20")}
                    className={`py-2 px-2.5 rounded-[14px] text-[12px] font-medium transition-all text-center border cursor-pointer ${
                      dayOption === "20"
                        ? "bg-black text-white border-black shadow-xs font-semibold"
                        : "bg-white text-[#737373] hover:text-[#0a0a0a] border-black/[0.08]"
                    }`}
                  >
                    Todo dia 20
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayOption("last-day")}
                    className={`py-2 px-2.5 rounded-[14px] text-[12px] font-medium transition-all text-center border cursor-pointer ${
                      dayOption === "last-day"
                        ? "bg-black text-white border-black shadow-xs font-semibold"
                        : "bg-white text-[#737373] hover:text-[#0a0a0a] border-black/[0.08]"
                    }`}
                  >
                    Final do mês
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDayOption("custom");
                      setCustomDay("");
                    }}
                    className={`py-2 px-2.5 rounded-[14px] text-[12px] font-medium transition-all text-center border cursor-pointer ${
                      dayOption === "custom"
                        ? "bg-black text-white border-black shadow-xs font-semibold"
                        : "bg-white text-[#737373] hover:text-[#0a0a0a] border-black/[0.08]"
                    }`}
                  >
                    + Personalizar
                  </button>
                </div>

                {dayOption === "custom" && (
                  <div className="flex items-center gap-2 pt-1.5 animate-in fade-in duration-150">
                    <span className="text-[12px] text-[#737373]">Dia do mês (1 a 31):</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      autoFocus
                      placeholder="DD"
                      value={customDay}
                      onChange={(e) => setCustomDay(e.target.value)}
                      className="w-16 h-9 rounded-[12px] bg-[#f5f5f5] border border-black/15 text-[14px] font-semibold text-center text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-black transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Interruptor se aplica ou não regra de fim de semana */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between p-3 bg-white rounded-[16px] border border-black/[0.06] shadow-2xs">
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
                      applyWeekendRule ? "bg-[#0a0a0a]" : "bg-neutral-300"
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
                  <div className="flex flex-col gap-1 pt-1 animate-in fade-in duration-150">
                    <label className="text-[11px] font-medium text-[#737373]">Como ajustar:</label>
                    <select
                      value={weekendRule}
                      onChange={(e) => setWeekendRule(e.target.value as "anticipate" | "postpone")}
                      className="h-10 rounded-[14px] bg-white border border-black/10 text-[13px] text-[#0a0a0a] px-2.5 focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="anticipate">Antecipar para o dia útil anterior (Padrão CLT)</option>
                      <option value="postpone">Postergar para o próximo dia útil</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Valor do Lançamento com Máscara Monetária */}
        <div className="flex flex-col gap-1.5 p-4 rounded-[22px] bg-[#fafafa] border border-black/[0.05]">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
            {entryType === "income" ? "Valor a Receber" : "Valor do Lançamento"}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-semibold text-[#737373]">R$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amountStr}
              onChange={handleAmountChange}
              className="w-full bg-transparent text-[32px] font-bold text-[#0a0a0a] placeholder-[#d4d4d4] focus:outline-none tracking-tight"
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#737373]">
            {entryType === "income" ? "Descrição / Fonte Pagadora" : "Descrição / Estabelecimento"}
          </label>
          <Input
            type="text"
            placeholder={
              entryType === "expense"
                ? "Ex: Supermercado, Aluguel, Almoço de negócios"
                : "Ex: Salário da Empresa X, Freelance Design, Venda"
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-[16px] bg-[#fafafa] border-black/[0.08] text-[14px] text-[#0a0a0a] px-3.5 focus-visible:ring-1 focus-visible:ring-black"
          />
        </div>

        {/* Categoria: Exibir SOMENTE quando for Despesa (em receitas é removido para não poluir com categorias irrelevantes) */}
        {entryType === "expense" && (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
            <label className="text-[12px] font-medium text-[#737373]">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Forma de Pagamento e Conta/Cartão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#737373]">
              {entryType === "income" ? "Forma de Recebimento" : "Forma de Pagamento"}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="pix">Pix</option>
              {entryType === "expense" && <option value="credit_card">Cartão de Crédito</option>}
              <option value="debit_card">Cartão de Débito</option>
              <option value="transfer">Transferência / TED</option>
              <option value="cash">Dinheiro em Espécie</option>
            </select>
          </div>

          {/* Se Cartão de Crédito (somente despesa) */}
          {entryType === "expense" && paymentMethod === "credit_card" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#737373]">
                Qual Cartão?
              </label>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Se for Conta (Débito, Pix, ou Recebimento) */
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#737373]">
                {entryType === "income" ? "Conta de Destino" : "Conta de Origem"}
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Parcelas se for Cartão de Crédito */}
        {entryType === "expense" && paymentMethod === "credit_card" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#737373]">
              Parcelamento
            </label>
            <select
              value={installmentTotal}
              onChange={(e) => setInstallmentTotal(Number(e.target.value))}
              className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value={1}>À vista (1x)</option>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <option key={num} value={num}>
                  {num}x de R${" "}
                  {(
                    (parseValorNumerico(amountStr) || 0) / num
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Data e Hora */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#737373]">
            {isRecurring ? "Data de Início / Referência" : "Data e Hora"}
          </label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {/* Divisão com Amigo (Quem Me Deve) */}
        {entryType === "expense" && (
          <div className="flex flex-col gap-2 p-3.5 rounded-[20px] bg-[#fafafa] border border-black/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#0a0a0a]">group</span>
                <span className="text-[13px] font-medium text-[#0a0a0a]">Dividir este gasto com alguém</span>
              </div>
              <input
                type="checkbox"
                checked={isSplit}
                onChange={(e) => setIsSplit(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
              />
            </div>
            {isSplit && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-black/[0.04] animate-in fade-in duration-150">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#737373]">Nome de quem deve:</label>
                  <Input
                    type="text"
                    placeholder="Ex: Maria Castro, João..."
                    value={splitFriendName}
                    onChange={(e) => setSplitFriendName(e.target.value)}
                    className="h-10 rounded-[14px] bg-white border-black/[0.08] text-[13px] text-[#0a0a0a] px-3"
                  />
                </div>
                {/* Opções de divisão */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSplitMode("half")}
                    className={`h-8 px-2 rounded-[12px] text-[12px] font-medium transition-all cursor-pointer ${
                      splitMode === "half" ? "bg-black text-white" : "bg-white text-[#737373] border border-black/5 hover:text-[#0a0a0a]"
                    }`}
                  >
                    50% (Meio a meio)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode("full")}
                    className={`h-8 px-2 rounded-[12px] text-[12px] font-medium transition-all cursor-pointer ${
                      splitMode === "full" ? "bg-black text-white" : "bg-white text-[#737373] border border-black/5 hover:text-[#0a0a0a]"
                    }`}
                  >
                    100% (Amigo paga)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode("custom");
                      if (!customSplitValue) setCustomSplitValue("50");
                    }}
                    className={`h-8 px-2 rounded-[12px] text-[12px] font-medium transition-all cursor-pointer ${
                      splitMode === "custom" ? "bg-black text-white" : "bg-white text-[#737373] border border-black/5 hover:text-[#0a0a0a]"
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {/* Bloco de personalização livre */}
                {splitMode === "custom" && (
                  <div className="flex flex-col gap-2 p-2.5 rounded-[16px] bg-white border border-black/[0.06] animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#737373]">
                        Parte do amigo por:
                      </span>
                      <div className="flex items-center bg-[#f5f5f5] p-0.5 rounded-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSplitType("percentage");
                            setCustomSplitValue("50");
                          }}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-[8px] transition-all cursor-pointer ${
                            customSplitType === "percentage" ? "bg-white text-black shadow-xs font-semibold" : "text-[#737373]"
                          }`}
                        >
                          % Porcentagem
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSplitType("amount");
                            const total = parseValorNumerico(amountStr);
                            const metade = total > 0 ? (total / 2).toFixed(2).replace(".", ",") : "";
                            setCustomSplitValue(metade);
                          }}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-[8px] transition-all cursor-pointer ${
                            customSplitType === "amount" ? "bg-white text-black shadow-xs font-semibold" : "text-[#737373]"
                          }`}
                        >
                          R$ Valor Fixo
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        {customSplitType === "amount" && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#737373]">
                            R$
                          </span>
                        )}
                        <Input
                          type={customSplitType === "percentage" ? "number" : "text"}
                          min={customSplitType === "percentage" ? 1 : undefined}
                          max={customSplitType === "percentage" ? 100 : undefined}
                          placeholder={customSplitType === "percentage" ? "Ex: 40" : "0,00"}
                          value={customSplitValue}
                          onChange={(e) => {
                            if (customSplitType === "amount") {
                              const digits = e.target.value.replace(/\D/g, "");
                              if (!digits) {
                                setCustomSplitValue("");
                                return;
                              }
                              const num = parseFloat(digits) / 100;
                              setCustomSplitValue(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            } else {
                              setCustomSplitValue(e.target.value);
                            }
                          }}
                          className={`h-9 rounded-[12px] bg-[#fafafa] border-black/[0.08] text-[13px] text-[#0a0a0a] ${
                            customSplitType === "amount" ? "pl-8 pr-3" : "px-3"
                          }`}
                        />
                      </div>
                      {customSplitType === "percentage" && (
                        <span className="text-[13px] font-medium text-[#737373]">% do total</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumo da Divisão em Tempo Real */}
                {(() => {
                  const total = parseValorNumerico(amountStr) || 0;
                  if (total <= 0) return null;

                  let friendAmt = 0;
                  if (splitMode === "full") {
                    friendAmt = total;
                  } else if (splitMode === "half") {
                    friendAmt = Math.round((total / 2) * 100) / 100;
                  } else {
                    if (customSplitType === "percentage") {
                      const pct = parseFloat(customSplitValue.replace(",", ".")) || 0;
                      friendAmt = Math.round((total * (pct / 100)) * 100) / 100;
                    } else {
                      friendAmt = parseValorNumerico(customSplitValue) || 0;
                    }
                  }
                  friendAmt = Math.max(0, Math.min(total, friendAmt));
                  const myAmt = Math.round((total - friendAmt) * 100) / 100;
                  const friendPct = total > 0 ? Math.round((friendAmt / total) * 100) : 0;
                  const myPct = 100 - friendPct;

                  const nomeAmigo = splitFriendName.trim() || "Amigo";

                  return (
                    <div className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#f0f9ff] border border-sky-100 text-[12px]">
                      <div className="flex flex-col">
                        <span className="text-sky-900 font-semibold">
                          Sua parte: R$ {myAmt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({myPct}%)
                        </span>
                        <span className="text-sky-700 text-[11px]">
                          {nomeAmigo} deve: R$ {friendAmt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({friendPct}%)
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-sky-600">
                        pie_chart
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Observação Opcional */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#737373]">
            Observação (opcional)
          </label>
          <Input
            type="text"
            placeholder={
              entryType === "income"
                ? "Ex: Referente a projeto mobile, bônus trimestral..."
                : "Ex: Almoço de negócios, dividido com equipe..."
            }
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            className="h-11 rounded-[16px] bg-[#fafafa] border-black/[0.08] text-[14px] text-[#0a0a0a] px-3.5 focus-visible:ring-1 focus-visible:ring-black"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 rounded-[18px] text-[13px] font-medium border-black/10 hover:bg-[#fafafa]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleProceed}
            className="flex-1 h-11 rounded-[18px] bg-black text-white text-[13px] font-medium hover:bg-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.12)] active:scale-[0.99] transition-all"
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">visibility</span>
            Avançar para Revisão
          </Button>
        </div>
      </div>
    </div>
  );
}
