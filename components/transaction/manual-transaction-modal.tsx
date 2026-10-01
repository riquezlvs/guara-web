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
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<string>("");
  const [installmentTotal, setInstallmentTotal] = useState<number>(1);
  const [observation, setObservation] = useState("");

  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);
  const [cards, setCards] = useState<CartaoItem[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Inicializa a data atual no formato YYYY-MM-DDTHH:mm
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Formata local para o input datetime-local
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setOccurredAt(`${year}-${month}-${day}T${hours}:${minutes}`);

      // Carrega categorias, contas e cartões
      const carregarDados = async () => {
        setIsLoadingMetadata(true);
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
        } finally {
          setIsLoadingMetadata(false);
        }
      };

      carregarDados();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite digitação com vírgula ou ponto
    const val = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setAmountStr(val);
  };

  const handleProceed = () => {
    const valorNumerico = parseFloat(amountStr);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      alert("Por favor, informe um valor válido para o lançamento.");
      return;
    }

    const desc = description.trim();
    if (!desc) {
      alert("Por favor, informe a descrição do lançamento (ex: Almoço, Mercado).");
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategory?.name || (entryType === "income" ? "Renda" : "Geral");

    const isCredit = paymentMethod === "credit_card";
    const selectedCard = isCredit ? cards.find((c) => c.id === selectedCardId) : null;
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

    const accountName = selectedAccount?.name || "Conta Principal";
    const accountBalance = selectedAccount?.balance || 0;
    const cardName = selectedCard?.name || null;

    // Cálculo dinâmico do Safe-to-Spend
    const saldoAtual = accountBalance;
    const isIncome = entryType === "income";
    const novoProjetado = isIncome ? saldoAtual + valorNumerico : saldoAtual - valorNumerico;
    const impacto = saldoAtual > 0 ? Number(((valorNumerico / saldoAtual) * 100).toFixed(2)) : 0;
    const progressBar = Math.max(10, Math.min(100, Math.round((novoProjetado / (saldoAtual || 1)) * 100)));

    const draft: TransactionDraft = {
      originalInput: observation.trim()
        ? `${entryType === "expense" ? "Gasto" : "Receita"} manual: ${desc} (Obs: ${observation.trim()}) de R$ ${valorNumerico.toFixed(2)}`
        : `${entryType === "expense" ? "Gasto" : "Receita"} manual: ${desc} de R$ ${valorNumerico.toFixed(2)}`,
      isAudio: false,
      origin: "manual",
      precision: "100% conferido",
      entryType,
      description: desc,
      totalAmount: valorNumerico,
      categoryId,
      categoryName,
      paymentMethod,
      paymentMethodLabel: isCredit
        ? `Crédito • ${selectedCard?.name || "Cartão"}`
        : paymentMethod === "pix"
        ? "Pix"
        : paymentMethod === "debit_card"
        ? "Débito"
        : paymentMethod === "cash"
        ? "Dinheiro"
        : "Transferência",
      cardName,
      accountName,
      accountId: selectedAccount?.id || null,
      accountBalance,
      occurredAt: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      location: desc,
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
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[28px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[14px] bg-black text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                Novo Lançamento
              </h3>
              <span className="text-[11px] text-[#737373]">
                Preencha os dados para revisar antes de salvar
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-[14px] bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tipo: Despesa vs Receita */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#f5f5f5] rounded-[18px] border border-black/[0.04]">
          <button
            type="button"
            onClick={() => setEntryType("expense")}
            className={`py-2 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              entryType === "expense"
                ? "bg-white text-rose-600 shadow-xs font-semibold"
                : "text-[#737373] hover:text-[#0a0a0a]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setEntryType("income")}
            className={`py-2 px-3 rounded-[14px] text-[13px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              entryType === "income"
                ? "bg-white text-emerald-600 shadow-xs font-semibold"
                : "text-[#737373] hover:text-[#0a0a0a]"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            Receita
          </button>
        </div>

        {/* Valor em destaque */}
        <div className="flex flex-col gap-1.5 p-4 rounded-[22px] bg-[#fafafa] border border-black/[0.05]">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-[#737373]">
            Valor do Lançamento
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
            Descrição / Estabelecimento
          </label>
          <Input
            type="text"
            placeholder={entryType === "expense" ? "Ex: Almoço Restaurante, Supermercado" : "Ex: Salário, Freelance, Pix"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-[16px] bg-[#fafafa] border-black/[0.08] text-[14px] text-[#0a0a0a] px-3.5 focus-visible:ring-1 focus-visible:ring-black"
          />
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1.5">
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

        {/* Forma de Pagamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#737373]">
              Forma de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="pix">Pix</option>
              <option value="debit_card">Cartão de Débito</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="cash">Dinheiro em Espécie</option>
              <option value="transfer">Transferência / TED</option>
            </select>
          </div>

          {/* Se Cartão de Crédito: Seleção de Cartão */}
          {paymentMethod === "credit_card" ? (
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
            /* Se Débito/Pix: Seleção de Conta */
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#737373]">
                Conta de Origem
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
        {paymentMethod === "credit_card" && (
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
                    (parseFloat(amountStr) || 0) / num
                  ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Data e Hora */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#737373]">
            Data e Hora
          </label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-11 rounded-[16px] bg-[#fafafa] border border-black/[0.08] text-[14px] text-[#0a0a0a] px-3 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {/* Observação Opcional */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#737373]">
            Observação (opcional)
          </label>
          <Input
            type="text"
            placeholder="Ex: Almoço de negócios, dividido com equipe..."
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
