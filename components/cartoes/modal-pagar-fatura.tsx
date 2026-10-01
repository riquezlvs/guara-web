"use client";

import { useState, useEffect } from "react";
import { pagarFaturaCartao, CartaoItem, CicloFaturaItem, obterDashboard } from "@/lib/api";

interface ModalPagarFaturaProps {
  aberto: boolean;
  aoFechar: () => void;
  cartao: CartaoItem;
  faturaAlvo?: CicloFaturaItem | null;
  aoSucesso?: (mensagem: string) => void;
}

interface ContaOpcao {
  id: string;
  name: string;
  balance: number;
}

export function ModalPagarFatura({
  aberto,
  aoFechar,
  cartao,
  faturaAlvo,
  aoSucesso,
}: ModalPagarFaturaProps) {
  const [contas, setContas] = useState<ContaOpcao[]>([]);
  const [contaSelecionadaId, setContaSelecionadaId] = useState<string>("");
  const [modoValor, setModoValor] = useState<"total" | "outro">("total");
  const [valorCustomizadoInput, setValorCustomizadoInput] = useState<string>("");
  const [isProcessando, setIsProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valorFaturaTotal = faturaAlvo ? faturaAlvo.valorFatura : cartao.faturaAtual;

  // Carrega contas disponíveis com saldo real
  useEffect(() => {
    if (!aberto) return;

    setErro(null);
    setModoValor("total");
    setValorCustomizadoInput("");

    async function buscarContas() {
      try {
        const dash = await obterDashboard();
        if (dash.sucesso && dash.data) {
          const listaContas = dash.data.saldo?.contas || dash.data.consolidado?.accounts || [];
          const contasLiquidas: ContaOpcao[] = listaContas
            .filter((c: any) => c.type === "checking" || !c.type)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              balance: Number(c.balance || 0),
            }));

          setContas(contasLiquidas);
          if (contasLiquidas.length > 0) {
            // Seleciona a primeira conta ou a que tem saldo suficiente
            const comSaldo = contasLiquidas.find((c) => c.balance >= valorFaturaTotal);
            setContaSelecionadaId(comSaldo?.id || contasLiquidas[0].id);
          }
        }
      } catch (e) {
        console.warn("Erro ao buscar contas no modal de pagamento:", e);
      }
    }

    buscarContas();
  }, [aberto, valorFaturaTotal]);

  if (!aberto) return null;

  const contaAtual = contas.find((c) => c.id === contaSelecionadaId) || contas[0];
  const saldoDisponivel = contaAtual ? Number(contaAtual.balance || 0) : 0;

  const formatarMoeda = (val?: number) => {
    return (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseValorInput = (str: string) => {
    const limpo = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
  };

  const valorEfetivo =
    modoValor === "total"
      ? valorFaturaTotal
      : parseValorInput(valorCustomizadoInput);

  const saldoInsuficiente = saldoDisponivel < valorEfetivo;
  const saldoRestanteConta = Math.max(0, saldoDisponivel - valorEfetivo);
  const faturaRestante = Math.max(0, valorFaturaTotal - valorEfetivo);
  const limiteLiberado = valorEfetivo;

  const handleDigitarValor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setValorCustomizadoInput("");
      return;
    }
    const num = Number(raw) / 100;
    setValorCustomizadoInput(
      num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const handleUsarSaldoMaximo = () => {
    setModoValor("outro");
    setValorCustomizadoInput(
      saldoDisponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const handleConfirmarPagamento = async () => {
    if (!contaAtual) {
      setErro("Selecione um bolso / conta de origem.");
      return;
    }

    if (valorEfetivo <= 0) {
      setErro("Informe um valor válido maior que zero.");
      return;
    }

    if (saldoInsuficiente) {
      setErro(`Saldo insuficiente no bolso "${contaAtual.name}".`);
      return;
    }

    setIsProcessando(true);
    setErro(null);

    try {
      const resp = await pagarFaturaCartao({
        cardId: cartao.id,
        accountId: contaAtual.id,
        amount: valorEfetivo,
      });

      // Dispara atualização em todo o aplicativo
      window.dispatchEvent(new CustomEvent("finances:refresh"));

      if (aoSucesso) {
        aoSucesso(resp.mensagem || `Fatura de R$ ${formatarMoeda(valorEfetivo)} paga com sucesso via ${contaAtual.name}!`);
      }

      aoFechar();
    } catch (err: any) {
      setErro(err.message || "Erro ao processar pagamento.");
    } finally {
      setIsProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-black/5 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[18px] bg-black text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                Pagar Fatura
              </h3>
              <span className="text-[12px] text-[#737373]">
                {cartao.name} {cartao.last_four_digits ? `(•••• ${cartao.last_four_digits})` : ""}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 text-[#737373] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Fatura Alvo Card */}
        <div className="p-3.5 rounded-[20px] bg-[#fafafa] border border-black/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">
              {faturaAlvo ? faturaAlvo.rotulo : "Fatura Aberta"}
            </span>
            <span className="text-[20px] font-bold text-[#0a0a0a] tracking-tight">
              R$ {formatarMoeda(valorFaturaTotal)}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {faturaAlvo?.status === "fechada" ? "Fechada • Pagar" : "Em aberto"}
          </span>
        </div>

        {/* Seletor de Bolso / Conta de Origem */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-[#0a0a0a] flex items-center justify-between">
            <span>Debitar do bolso (Conta de Origem):</span>
            <span className="text-[11px] text-[#737373] font-normal">
              Saldo: R$ {formatarMoeda(saldoDisponivel)}
            </span>
          </label>
          <div className="flex flex-col gap-2">
            {contas.length > 0 ? (
              contas.map((c) => {
                const isSelected = c.id === contaSelecionadaId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setContaSelecionadaId(c.id);
                      setErro(null);
                    }}
                    className={`p-3 rounded-[16px] border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-black bg-neutral-900 text-white shadow-xs"
                        : "border-black/5 bg-[#fafafa] text-[#0a0a0a] hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined text-[18px] ${isSelected ? "text-white" : "text-[#737373]"}`}>
                        account_balance
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium leading-tight">{c.name}</span>
                        <span className={`text-[11px] ${isSelected ? "text-neutral-300" : "text-[#737373]"}`}>
                          Disponível: R$ {formatarMoeda(c.balance)}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 rounded-[16px] bg-[#fafafa] border border-black/5 text-[12px] text-[#737373]">
                Carregando contas disponíveis...
              </div>
            )}
          </div>
        </div>

        {/* Seleção do Valor */}
        <div className="flex flex-col gap-2 pt-1">
          <label className="text-[12px] font-semibold text-[#0a0a0a]">
            Quanto deseja pagar?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setModoValor("total");
                setErro(null);
              }}
              className={`p-2.5 rounded-[16px] border text-center text-[12px] font-medium transition-all cursor-pointer ${
                modoValor === "total"
                  ? "border-black bg-black text-white"
                  : "border-black/5 bg-[#fafafa] text-[#0a0a0a] hover:bg-neutral-100"
              }`}
            >
              Valor Total (R$ {formatarMoeda(valorFaturaTotal)})
            </button>
            <button
              type="button"
              onClick={() => {
                setModoValor("outro");
                setErro(null);
              }}
              className={`p-2.5 rounded-[16px] border text-center text-[12px] font-medium transition-all cursor-pointer ${
                modoValor === "outro"
                  ? "border-black bg-black text-white"
                  : "border-black/5 bg-[#fafafa] text-[#0a0a0a] hover:bg-neutral-100"
              }`}
            >
              Outro Valor
            </button>
          </div>

          {modoValor === "outro" && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#737373] font-medium">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorCustomizadoInput}
                  onChange={handleDigitarValor}
                  placeholder="0,00"
                  className="w-full h-11 pl-11 pr-3.5 rounded-[16px] bg-[#fafafa] border border-black/10 text-[16px] font-bold text-[#0a0a0a] focus:bg-white focus:border-black outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        {/* Alerta de Saldo Insuficiente com Atalho */}
        {saldoInsuficiente && valorEfetivo > 0 && (
          <div className="p-3 rounded-[16px] bg-rose-50 border border-rose-200/80 flex flex-col gap-1.5 text-rose-950">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-800">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Saldo insuficiente no bolso selecionado</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-tight">
              Você tem R$ {formatarMoeda(saldoDisponivel)} disponível. Você pode pagar parcialmente até esse valor.
            </p>
            {saldoDisponivel > 0 && (
              <button
                type="button"
                onClick={handleUsarSaldoMaximo}
                className="mt-1 self-start px-2.5 py-1 rounded-full bg-rose-700 text-white text-[11px] font-medium hover:bg-rose-800 active:scale-95 transition-all"
              >
                Pagar com saldo disponível (R$ {formatarMoeda(saldoDisponivel)})
              </button>
            )}
          </div>
        )}

        {/* Simulação em Tempo Real */}
        {valorEfetivo > 0 && !saldoInsuficiente && (
          <div className="p-3.5 rounded-[18px] bg-emerald-50/70 border border-emerald-200/70 flex flex-col gap-1.5 text-[12px]">
            <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-700">bolt</span>
              Efeito imediato no seu bolso:
            </span>
            <div className="flex flex-col gap-0.5 text-emerald-800 text-[11.5px]">
              <div>
                • <strong>-R$ {formatarMoeda(valorEfetivo)}</strong> do bolso {contaAtual?.name} (Restam R$ {formatarMoeda(saldoRestanteConta)}).
              </div>
              <div>
                • <strong>+R$ {formatarMoeda(limiteLiberado)}</strong> de limite de crédito liberado no cartão.
              </div>
              <div>
                • Fatura restante:{" "}
                <strong>
                  {faturaRestante === 0 ? "Quitada (R$ 0,00)" : `R$ ${formatarMoeda(faturaRestante)}`}
                </strong>.
              </div>
            </div>
          </div>
        )}

        {/* Mensagem de Erro Geral */}
        {erro && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{erro}</span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={aoFechar}
            disabled={isProcessando}
            className="flex-1 h-11 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] text-[13px] font-medium hover:bg-[#e8e8e8] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmarPagamento}
            disabled={isProcessando || saldoInsuficiente || valorEfetivo <= 0}
            className="flex-1 h-11 rounded-[18px] bg-[#0a0a0a] text-white text-[13px] font-medium hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isProcessando ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Debitando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Pagar R$ {formatarMoeda(valorEfetivo)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
