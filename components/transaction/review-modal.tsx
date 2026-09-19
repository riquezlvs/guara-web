"use client";

import { useState } from "react";
import { TransactionDraft, confirmarTransacao, interpretarTransacao } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReviewModalProps {
  draft: TransactionDraft;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (mensagem: string) => void;
}

export function ReviewModal({ draft: initialDraft, isOpen, onClose, onSuccess }: ReviewModalProps) {
  const [draft, setDraft] = useState<TransactionDraft>(initialDraft);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [refinementText, setRefinementText] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  if (!isOpen) return null;

  // Recálculo dinâmico do impacto se o usuário ajustar o valor
  const handleAmountChange = (novoValor: number) => {
    const valor = Math.max(0, novoValor);
    const saldoAtual = draft.safeToSpend.current;
    const isIncome = draft.entryType === "income";
    const novoProjetado = isIncome ? saldoAtual + valor : saldoAtual - valor;
    const impacto = saldoAtual > 0 ? Number(((valor / saldoAtual) * 100).toFixed(2)) : 0;
    const progress = Math.max(10, Math.min(100, Math.round((novoProjetado / (saldoAtual || 1)) * 100)));

    setDraft((prev) => ({
      ...prev,
      totalAmount: valor,
      safeToSpend: {
        ...prev.safeToSpend,
        projected: novoProjetado,
        impactPercentage: impacto,
        impactLabel: `${isIncome ? "+" : "-"}${impacto}%`,
        progressBarPercent: progress,
      },
    }));
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const resp = await confirmarTransacao(draft);
      if (resp.sucesso) {
        onSuccess(resp.mensagem || "Lançamento cadastrado com sucesso!");
        onClose();
      } else {
        alert(resp.mensagem || "Erro ao salvar transação no banco.");
      }
    } catch (err: any) {
      alert(err.message || "Erro de conexão ao salvar transação.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!refinementText.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const comandoCompleto = `${draft.originalInput}. Ajuste: ${refinementText.trim()}`;
      const resp = await interpretarTransacao(comandoCompleto, false);
      if (resp.sucesso && resp.dados) {
        setDraft(resp.dados);
        setRefinementText("");
        setIsAdjustMode(false);
      } else {
        alert(resp.mensagem || "Não foi possível refinar a interpretação.");
      }
    } catch (err: any) {
      alert(err.message || "Erro ao consultar a IA para ajuste.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleDiscardClick = () => {
    setShowDiscardConfirm(true);
  };

  const confirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Formatação de data e hora
  let dataHoraFormatada = "Hoje";
  try {
    const d = new Date(draft.occurredAt);
    const diaMes = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    dataHoraFormatada = `Hoje, ${diaMes} • ${hora}`;
  } catch {}

  const isIncome = draft.entryType === "income";

  return (
    <div className="fixed inset-0 z-50 bg-[#f5f5f5] overflow-y-auto antialiased animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Diálogo de Confirmação de Descarte */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white rounded-[24px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col gap-3">
            <h4 className="text-[16px] font-semibold text-[#0a0a0a]">Descartar lançamento?</h4>
            <p className="text-[13px] text-[#737373] leading-relaxed">
              Os dados interpretados não serão gravados no banco de dados e serão perdidos.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 h-9 rounded-[14px] text-[12px] border-black/10"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={confirmDiscard}
                className="flex-1 h-9 rounded-[14px] bg-rose-600 text-white text-[12px] hover:bg-rose-700"
              >
                Sim, descartar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Superior Fixo */}
      <header className="fixed top-0 w-full z-40 bg-[#f5f5f5]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-14 px-4 max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e7000b] animate-pulse"></span>
            <span className="text-[14px] text-[#0a0a0a] font-semibold tracking-tight">Guará IA</span>
            <span className="uppercase text-[#737373] px-1.5 py-0.5 rounded-[6px] bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.06)] font-mono text-[10px]">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-[#737373] uppercase tracking-wider mr-1">Revisão</span>
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-36 px-4 max-w-md mx-auto">
        <div className="flex flex-col w-full pb-8">
          {/* Status Bar / Header Indicator */}
          <div className="flex items-center justify-between w-full py-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.06)] text-[12px] text-[#0a0a0a] font-medium tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a] animate-pulse"></span>
                Interpretação Concluída
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-[18px] bg-[#f5f5f5] shadow-[0_0_0_1px_rgba(23,23,23,0.06)] text-[11px] text-[#737373] font-mono">
                {draft.precision || "99.4%"} precisão
              </span>
            </div>
            <button
              aria-label="Descartar e fechar"
              onClick={handleDiscardClick}
              className="w-8 h-8 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-center text-[#737373] hover:text-[#0a0a0a] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Audio / Natural Language Transcription Block */}
          <div className="w-full bg-white rounded-[24px] p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.04)] mb-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] uppercase text-[#737373] tracking-wider font-medium">
                {draft.isAudio ? "Comando Interpretado (Áudio)" : "Comando Interpretado (Texto)"}
              </span>
              <div className="flex items-center gap-1 text-[#737373]">
                <span className="material-symbols-outlined text-[14px]">
                  {draft.isAudio ? "graphic_eq" : "chat"}
                </span>
                <span className="text-[11px] font-mono">
                  {draft.isAudio ? draft.audioDuration || "0:04s" : "Texto"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-[#fafafa] rounded-[16px] p-3 shadow-[0_0_0_1px_rgba(23,23,23,0.04)]">
              <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#0a0a0a] text-[14px]">
                  {draft.isAudio ? "mic" : "notes"}
                </span>
              </div>
              <p className="text-[13px] text-[#171717] italic leading-relaxed">
                &ldquo;{draft.originalInput}&rdquo;
              </p>
            </div>

            {/* Extracted AI Entities */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] text-[#171717] text-[12px] shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
                <span className="material-symbols-outlined text-[13px] text-[#737373]">restaurant</span>
                {draft.categoryName || "Geral"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] text-[#171717] text-[12px] shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
                <span className="material-symbols-outlined text-[13px] text-[#737373]">credit_card</span>
                {draft.cardName || draft.paymentMethodLabel || "Débito"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[18px] bg-[#f5f5f5] text-[#171717] text-[12px] shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
                <span className="material-symbols-outlined text-[13px] text-[#737373]">schedule</span>
                {dataHoraFormatada}
              </span>
            </div>
          </div>

          {/* Structured Transaction Detail Card */}
          <div className="w-full bg-white rounded-[24px] p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col gap-4 mb-3">
            {/* Main Numerical Anchor */}
            <div className="flex items-center justify-between pb-3 shadow-[0_1px_0_rgba(23,23,23,0.05)]">
              <div className="flex flex-col">
                <span className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">
                  Valor Processado
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[18px] text-[#737373] font-normal">R$</span>
                  <span className="text-[36px] text-[#0a0a0a] tracking-tight font-semibold leading-none">
                    {Number(draft.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-[18px] bg-[#fafafa] shadow-[0_0_0_1px_rgba(23,23,23,0.06)] text-[11px] uppercase text-[#0a0a0a] font-medium tracking-wider">
                {isIncome ? "Entrada • Recebimento" : `Saída • ${draft.paymentMethodLabel || "Débito"}`}
              </span>
            </div>

            {/* Field Breakdown */}
            <div className="flex flex-col divide-y divide-[#e5e5e5]">
              {/* Categoria */}
              <div
                onClick={() => setIsAdjustMode(true)}
                className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-[#fafafa] -mx-2 px-2 rounded-[12px] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#737373] text-[16px]">category</span>
                  <span className="text-[13px] text-[#737373]">Categoria</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] text-[13px] font-medium shadow-[0_0_0_1px_rgba(23,23,23,0.05)]">
                    <span className="material-symbols-outlined text-[13px]">label</span>
                    {draft.categoryName || "Geral"}
                  </span>
                  <span className="material-symbols-outlined text-[#737373] text-[16px]">chevron_right</span>
                </div>
              </div>

              {/* Estabelecimento / Local */}
              <div
                onClick={() => setIsAdjustMode(true)}
                className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-[#fafafa] -mx-2 px-2 rounded-[12px] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#737373] text-[16px]">storefront</span>
                  <span className="text-[13px] text-[#737373]">Local</span>
                </div>
                <div className="flex items-center gap-1.5 max-w-[200px]">
                  <span className="text-[13px] text-[#0a0a0a] font-medium truncate">
                    {draft.location || draft.description}
                  </span>
                  <span className="material-symbols-outlined text-[#737373] text-[16px]">chevron_right</span>
                </div>
              </div>

              {/* Conta de Origem */}
              <div
                onClick={() => setIsAdjustMode(true)}
                className="py-2.5 flex items-center justify-between group cursor-pointer hover:bg-[#fafafa] -mx-2 px-2 rounded-[12px] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#737373] text-[16px]">account_balance</span>
                  <span className="text-[13px] text-[#737373]">Origem</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] text-[#0a0a0a] font-medium">
                      {draft.accountName}
                    </span>
                    <span className="material-symbols-outlined text-[#737373] text-[16px]">chevron_right</span>
                  </div>
                  <span className="text-[11px] text-[#737373] font-mono">
                    Saldo: R$ {Number(draft.accountBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Data e Hora */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#737373] text-[16px]">calendar_today</span>
                  <span className="text-[13px] text-[#737373]">Data / Hora</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[13px] text-[#0a0a0a] font-medium">{dataHoraFormatada}</span>
                </div>
              </div>
            </div>

            {/* Impact Computation Banner (Clinical blueprint look) */}
            <div className="bg-[#fafafa] rounded-[16px] p-3.5 shadow-[0_0_0_1px_rgba(23,23,23,0.04)] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase text-[#737373] tracking-wider font-medium">
                  Impacto em Safe-to-Spend
                </span>
                <span className="text-[11px] font-mono text-[#737373]">
                  {draft.safeToSpend.impactLabel || "-1.05%"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] text-[#171717]">Novo saldo projetado:</span>
                <span className="text-[14px] text-[#0a0a0a] font-semibold font-mono">
                  R$ {Number(draft.safeToSpend.projected).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Progress Bar Indicator */}
              <div className="w-full bg-[#e5e5e5] rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-[#0a0a0a] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, draft.safeToSpend.progressBarPercent))}%` }}
                ></div>
              </div>
            </div>

            {/* Painel de Ajuste Rápido / Manual / IA (Expandível) */}
            {isAdjustMode && (
              <div className="p-4 rounded-[18px] bg-[#f5f5f5] border border-black/5 flex flex-col gap-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#0a0a0a]">Ajustar Informações</span>
                  <button
                    type="button"
                    onClick={() => setIsAdjustMode(false)}
                    className="text-[11px] text-[#737373] hover:text-[#0a0a0a]"
                  >
                    fechar
                  </button>
                </div>

                {/* Edição Rápida de Valor e Descrição */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-medium text-[#737373]">Valor (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.totalAmount}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      className="bg-white h-8 text-[13px] rounded-[10px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-medium text-[#737373]">Descrição / Local</label>
                    <Input
                      type="text"
                      value={draft.description}
                      onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value, location: e.target.value }))}
                      className="bg-white h-8 text-[13px] rounded-[10px]"
                    />
                  </div>
                </div>

                {/* Seletor de Categoria */}
                {draft.availableCategories && draft.availableCategories.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-medium text-[#737373]">Trocar Categoria</label>
                    <select
                      value={draft.categoryId || 1}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const cat = draft.availableCategories?.find((c) => c.id === id);
                        setDraft((prev) => ({ ...prev, categoryId: id, categoryName: cat?.name || prev.categoryName }));
                      }}
                      className="bg-white h-8 text-[13px] rounded-[10px] px-2 border border-black/10 focus:outline-none"
                    >
                      {draft.availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Refinamento com IA */}
                <div className="flex flex-col gap-1 pt-1 border-t border-black/5">
                  <label className="text-[10px] uppercase font-medium text-[#737373]">
                    Ou ditar / digitar correção para a IA
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="text"
                      placeholder="Ex: divide em 2x no cartão de crédito..."
                      value={refinementText}
                      onChange={(e) => setRefinementText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRefineWithAI();
                      }}
                      className="bg-white h-8 text-[12px] rounded-[10px] flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRefineWithAI}
                      disabled={isRefining || !refinementText.trim()}
                      className="h-8 rounded-[10px] text-[11px] bg-black text-white px-2.5"
                    >
                      {isRefining ? "Refinando..." : "Refinar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Decisions */}
          <div className="flex flex-col gap-2.5 w-full">
            {/* Primary CTA */}
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full h-11 px-5 rounded-[18px] bg-[#0a0a0a] text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#171717] active:scale-[0.99] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)] disabled:opacity-50"
              type="button"
            >
              <span className={`material-symbols-outlined text-[18px] ${isConfirming ? "animate-spin" : ""}`}>
                {isConfirming ? "progress_activity" : "check"}
              </span>
              <span>{isConfirming ? "Cadastrando no banco..." : "Confirmar Lançamento"}</span>
            </button>

            {/* Secondary Outline */}
            <button
              onClick={() => setIsAdjustMode(!isAdjustMode)}
              className="w-full h-11 px-5 rounded-[18px] bg-white text-[#0a0a0a] text-[14px] font-medium shadow-[0_0_0_1px_rgba(23,23,23,0.06)] flex items-center justify-center gap-2 hover:bg-[#fafafa] active:scale-[0.99] transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[#737373] text-[18px]">edit_note</span>
              <span>{isAdjustMode ? "Ocultar Ajustes" : "Ajustar com IA ou Manual"}</span>
            </button>

            {/* Discard Action */}
            <div className="flex justify-center pt-1">
              <button
                onClick={handleDiscardClick}
                className="px-4 py-1.5 rounded-[18px] text-[#737373] hover:text-[#e7000b] text-[12px] tracking-wide flex items-center gap-1 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                <span>Descartar transação</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
