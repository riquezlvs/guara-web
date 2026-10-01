"use client";

import { useState, useEffect } from "react";
import {
  cadastrarReceitaAvulsa,
  cadastrarRendaRecorrente,
  obterContasDisponiveis,
} from "@/lib/api";

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (mensagem: string) => void;
}

export function IncomeModal({ isOpen, onClose, onSuccess }: IncomeModalProps) {
  const [tab, setTab] = useState<"avulso" | "recorrente">("avulso");

  // Campos compartilhados / avulso
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [incomeType, setIncomeType] = useState<"freelance" | "third_party" | "salary" | "other">("freelance");
  const [accountId, setAccountId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [occurredDate, setOccurredDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Campos específicos de renda recorrente
  const [recurringIncomeType, setRecurringIncomeType] = useState<"salary" | "freelance" | "benefit" | "other">("salary");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [weekendRule, setWeekendRule] = useState<"anticipate" | "postpone">("anticipate");

  // Estado de carregamento
  const [contas, setContas] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    obterContasDisponiveis()
      .then((res) => {
        if (res.sucesso && res.dados && res.dados.length > 0) {
          setContas(res.dados);
          if (!accountId) {
            const checking = res.dados.find((c) => c.type === "checking");
            setAccountId(checking ? checking.id : res.dados[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn("Erro ao buscar contas no modal de receita:", err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setAmountStr("");
      return;
    }
    const num = Number(digits) / 100;
    setAmountStr(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseValorNumerico = (str: string): number => {
    const raw = str.replace(/\./g, "").replace(",", ".");
    return parseFloat(raw) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const valor = parseValorNumerico(amountStr);
    if (valor <= 0) {
      setErrorMessage("Informe um valor maior que zero.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Informe uma descrição para o recebimento.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (tab === "avulso") {
        const payload = {
          description: description.trim(),
          amount: valor,
          accountId: accountId || undefined,
          occurredAt: occurredDate ? new Date(`${occurredDate}T12:00:00Z`).toISOString() : undefined,
          incomeType: incomeType === "third_party" ? "other" : incomeType,
          paymentMethod,
        };

        const resp = await cadastrarReceitaAvulsa(payload);
        if (resp.sucesso) {
          onSuccess(resp.mensagem || `Recebimento de R$ ${amountStr} cadastrado com sucesso!`);
          window.dispatchEvent(new CustomEvent("finances:refresh"));
          onClose();
        } else {
          setErrorMessage(resp.mensagem || "Erro ao salvar recebimento.");
        }
      } else {
        const diaNum = parseInt(dayOfMonth, 10);
        if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
          setErrorMessage("O dia do mês deve ser entre 1 e 31.");
          setIsSubmitting(false);
          return;
        }

        const payload = {
          description: description.trim(),
          total_amount: valor,
          day_of_month: diaNum,
          entry_type: "income" as const,
          income_type: recurringIncomeType,
          weekend_rule: weekendRule,
          account_id: accountId || undefined,
          payment_method: "pix",
        };

        const resp = await cadastrarRendaRecorrente(payload);
        if (resp.sucesso) {
          onSuccess(`Renda recorrente "${description.trim()}" cadastrada!`);
          window.dispatchEvent(new CustomEvent("finances:refresh"));
          onClose();
        } else {
          setErrorMessage(resp.mensagem || "Erro ao salvar renda recorrente.");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro de conexão ao salvar.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">payments</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                Novo Recebimento / Ganho
              </h3>
              <span className="text-[12px] text-[#737373]">
                {tab === "avulso" ? "Freelance, terceiro ou extra" : "Salário ou renda periódica"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Toggle: Avulso vs Recorrente */}
        <div className="grid grid-cols-2 gap-1 bg-[#f5f5f5] p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab("avulso")}
            className={`py-2 text-[13px] font-medium rounded-xl transition-all cursor-pointer ${
              tab === "avulso"
                ? "bg-white text-[#0a0a0a] shadow-xs font-semibold"
                : "text-[#737373] hover:text-[#0a0a0a]"
            }`}
          >
            Ganho Avulso / Freela
          </button>
          <button
            type="button"
            onClick={() => setTab("recorrente")}
            className={`py-2 text-[13px] font-medium rounded-xl transition-all cursor-pointer ${
              tab === "recorrente"
                ? "bg-white text-[#0a0a0a] shadow-xs font-semibold"
                : "text-[#737373] hover:text-[#0a0a0a]"
            }`}
          >
            Renda Recorrente
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Valor Hero Input */}
          <div className="p-4 bg-[#fafafa] rounded-2xl border border-black/5 flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">
              Valor do Recebimento
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[24px] text-[#737373] font-light">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0,00"
                autoFocus
                className="w-full bg-transparent text-[32px] font-bold text-[#0a0a0a] tracking-tight focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-[#737373]">
              {tab === "avulso"
                ? "Valor líquido a ser creditado na sua conta."
                : "Valor que constará no fechamento de fatura para não ficar negativado."}
            </span>
          </div>

          {/* Tipo / Chips */}
          {tab === "avulso" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373] font-medium">Tipo de Ganho</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setIncomeType("freelance");
                    if (!description) setDescription("Freelance");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${
                    incomeType === "freelance"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  💼 Freelance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncomeType("third_party");
                    if (!description) setDescription("Pagamento de Terceiro");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${
                    incomeType === "third_party"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  🤝 Pagamento de Terceiro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncomeType("other");
                    if (!description) setDescription("Reembolso");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${
                    incomeType === "other"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  🔄 Reembolso / Extra
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373] font-medium">Categoria da Renda</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setRecurringIncomeType("salary");
                    if (!description) setDescription("Salário Principal");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${
                    recurringIncomeType === "salary"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  🏢 Salário
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecurringIncomeType("benefit");
                    if (!description) setDescription("Vale-Refeição / Alimentação");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${
                    recurringIncomeType === "benefit"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  🍽️ Benefício (VR/VA)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecurringIncomeType("freelance");
                    if (!description) setDescription("Contrato Recorrente");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 cursor-pointer ${
                    recurringIncomeType === "freelance"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a]"
                  }`}
                >
                  💻 Freela Recorrente
                </button>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-[#737373] font-medium">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Ex: "Landing page cliente X", "Carlos pagou jantar"...'
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-[13px] text-[#0a0a0a] focus:outline-none focus:ring-1 focus:ring-black placeholder:text-[#737373]"
            />
          </div>

          {/* Conta de Destino */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-[#737373] font-medium">Conta Destino</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-[13px] text-[#0a0a0a] bg-white focus:outline-none focus:ring-1 focus:ring-black"
            >
              {contas.length === 0 && <option value="">Carregando contas...</option>}
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "checking" ? "Conta Corrente" : c.type}) • Saldo: R${" "}
                  {Number(c.balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>

          {/* Campos específicos por aba */}
          {tab === "avulso" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-[#737373] font-medium">Data do Recebimento</label>
                <input
                  type="date"
                  value={occurredDate}
                  onChange={(e) => setOccurredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/10 text-[13px] text-[#0a0a0a] focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-[#737373] font-medium">Forma</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/10 text-[13px] text-[#0a0a0a] bg-white focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="pix">PIX</option>
                  <option value="debit_card">Transferência / TED</option>
                  <option value="cash">Dinheiro em Espécie</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[#737373] font-medium">Dia do Mês (1 a 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 text-[13px] text-[#0a0a0a] focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] text-[#737373] font-medium">Se cair em Fim de Semana</label>
                  <select
                    value={weekendRule}
                    onChange={(e) => setWeekendRule(e.target.value as "anticipate" | "postpone")}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 text-[13px] text-[#0a0a0a] bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="anticipate">Antecipar para sexta (CLT)</option>
                    <option value="postpone">Postergar para segunda</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[12px] text-emerald-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0 mt-0.5">
                  info
                </span>
                <span>
                  O Guará IA considerará este valor no cálculo do seu fechamento de fatura: se você receber dia{" "}
                  <strong>{dayOfMonth}</strong> e o cartão fechar depois, seu saldo livre constará como positivo!
                </span>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl border border-black/10 text-[13px] font-medium text-[#737373] hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amountStr || !description.trim()}
              className="flex-1 h-11 rounded-2xl bg-[#0a0a0a] text-white text-[13px] font-medium hover:bg-neutral-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>Gravando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>Salvar Recebimento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
