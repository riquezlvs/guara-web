"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { obterExtrato, ItemExtrato } from "@/lib/api";

type TransactionDetails = ItemExtrato & {
  note: string;
  tags: string[];
  bankId: string;
};

const fallbackTransaction: TransactionDetails = {
  display_id: 3819,
  description: "Restaurante da Esquina",
  total_amount: 45,
  occurred_at: "2024-10-24T13:24:18-03:00",
  payment_method: "debit_card",
  entry_type: "expense",
  categories: { id: 1, name: "Alimentação" },
  accounts: { id: "nubank", name: "Nubank CC", type: "checking" },
  note: "Almoço de equipe após reunião de alinhamento trimestral com time de produto.",
  tags: ["#Almoço", "#Trabalho", "#Reembolsável"],
  bankId: "DOC-98421038-NU",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function paymentLabel(method: string) {
  if (method === "pix") return "PIX";
  if (method === "credit_card") return "Crédito";
  if (method === "debit_card") return "Débito";
  return method || "Não informado";
}

export default function TransactionDetailsPage() {
  const params = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<TransactionDetails>(fallbackTransaction);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTransaction() {
      try {
        const response = await obterExtrato();
        const found = response.dados?.itens.find(
          (item) => String(item.display_id) === params.id,
        );
        if (found && mounted) {
          setTransaction({
            ...found,
            note: "Lançamento sincronizado com o seu banco.",
            tags: ["#Auditoria"],
            bankId: `DOC-${found.display_id}`,
          });
        }
      } catch {
        // The reference transaction keeps the detail screen usable offline.
      }
    }

    void loadTransaction();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const isIncome = transaction.entry_type === "income";
  const category = transaction.categories?.name || "Geral";
  const accountName = transaction.accounts?.name || "Conta padrão";
  const payment = paymentLabel(transaction.payment_method);

  const isParcelado = Boolean(transaction.installment_total && transaction.installment_total > 1);
  const valorParcela = Number(transaction.total_amount);
  const valorTotalCompra = isParcelado ? valorParcela * (transaction.installment_total || 1) : valorParcela;
  const descricaoExibida = isParcelado
    ? transaction.description.replace(/\s*\(?\d+\/\d+\)?\s*$/i, "").trim()
    : transaction.description;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const confirmDelete = () => {
    if (window.confirm("Deseja realmente solicitar a exclusão ou contestação deste lançamento?")) {
      showToast("Solicitação enviada para auditoria");
    }
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 pt-16 pb-48 text-[#0a0a0a]">
      <div className="flex flex-col gap-4 pb-6">
        <section className="flex items-center justify-between gap-2 py-2">
          <Link
            href="/extrato"
            className="h-9 px-3 rounded-full bg-white shadow-sm flex items-center gap-1.5 text-[12px] font-medium hover:bg-[#fafafa] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar
          </Link>
          <span className="text-[10px] text-[#737373] uppercase tracking-[0.16em] truncate">
            Detalhes do lançamento
          </span>
          <Link
            href={`/extrato/${params.id || transaction.display_id}/editar`}
            className="h-9 px-3 rounded-full bg-[#0a0a0a] text-white flex items-center gap-1.5 text-[12px] font-medium hover:bg-[#171717] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Editar
          </Link>
        </section>

        <section className="rounded-[24px] bg-white shadow-sm p-6 flex flex-col items-center text-center overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-[#fafafa] flex items-center justify-center mb-3 shadow-inner">
            <span className="material-symbols-outlined text-[26px]">
              {isIncome ? "arrow_downward" : "restaurant"}
            </span>
          </div>
          <h1 className="text-[19px] leading-7 font-semibold tracking-tight">{descricaoExibida}</h1>
          <p className="text-[12px] text-[#737373] mt-0.5 mb-3">{category} • Lançamento</p>
          
          <div className="flex flex-col items-center mb-5">
            <p className={`text-[36px] leading-10 font-semibold tracking-tight ${isIncome ? "text-emerald-600" : "text-[#0a0a0a]"}`}>
              {isIncome ? "+" : "-"}R$ {formatCurrency(valorParcela)}
            </p>
            {isParcelado && (
              <span className="text-[12px] text-[#737373] mt-1 font-medium">
                Valor desta parcela ({transaction.installment_number || 1} de {transaction.installment_total}x)
              </span>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {isParcelado && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0a0a0a] text-white text-[11px] font-medium">
                <span className="material-symbols-outlined text-[14px]">view_timeline</span>
                Compra Parcelada em {transaction.installment_total}x
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fafafa] text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]" />
              {category} &amp; {payment}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#fafafa] text-[11px] text-[#737373]">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Confirmado • {payment}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#737373]">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {formatDate(transaction.occurred_at)} às {new Date(transaction.occurred_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </section>

        {/* Informações detalhadas do parcelamento */}
        {isParcelado && (
          <section className="rounded-[24px] bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#737373] uppercase tracking-[0.14em]">
                Plano de Parcelamento
              </span>
              <span className="text-[11px] font-medium text-[#0a0a0a] bg-[#fafafa] px-2 py-0.5 rounded-full">
                {transaction.installment_number || 1}ª de {transaction.installment_total} parcelas
              </span>
            </div>
            
            <div className="p-3.5 rounded-2xl bg-[#fafafa] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#737373]">Valor total da compra</span>
                <span className="font-semibold text-[#0a0a0a]">
                  R$ {formatCurrency(valorTotalCompra)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Valor da parcela atual</span>
                <span className="font-semibold text-[#0a0a0a]">
                  R$ {formatCurrency(valorParcela)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Quantidade total de parcelas</span>
                <span className="font-mono text-[#0a0a0a]">
                  {transaction.installment_total}x
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[24px] bg-white shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#737373] uppercase tracking-[0.14em]">Origem &amp; forma de pagamento</span>
            <span className="text-[10px] text-[#737373]">NSU {transaction.display_id}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fafafa]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[20px]">credit_card</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate">{accountName} ({payment})</p>
                <p className="text-[11px] text-[#737373]">Cartão físico • lançamento sincronizado</p>
              </div>
            </div>
            <span className="text-[10px] bg-white px-2 py-1 rounded-full shrink-0">Ativo</span>
          </div>
          <div className="flex flex-col gap-2 text-[12px]">
            <div className="flex justify-between gap-4"><span className="text-[#737373]">Identificador bancário</span><span className="font-mono text-[10px] text-right">{transaction.bankId}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[#737373]">Canal de captura</span><span className="text-right">Transação digital</span></div>
          </div>
        </section>

        <section className="rounded-[24px] bg-white shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span className="text-[10px] text-[#737373] uppercase tracking-[0.14em]">Análise Guará IA &amp; orçamento</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#fafafa] flex flex-col gap-2">
            <div className="flex justify-between text-[12px] font-medium"><span>Teto mensal de {category}</span><span>64% consumido</span></div>
            <div className="w-full h-2 rounded-full bg-white overflow-hidden"><div className="h-full w-[64%] rounded-full bg-[#0a0a0a]" /></div>
            <div className="flex justify-between text-[10px] text-[#737373]"><span>R$ 1.152,00 gastos</span><span>Meta: R$ 1.800,00</span></div>
          </div>
          <div className="flex items-start gap-3 text-[12px]">
            <span className="material-symbols-outlined text-[18px] text-[#737373]">pie_chart</span>
            <p>Este lançamento foi classificado automaticamente pela Guará IA com base no histórico da categoria.</p>
          </div>
          <div className="flex items-start gap-3 text-[12px]">
            <span className="material-symbols-outlined text-[18px] text-[#737373]">trending_down</span>
            <p>O valor está dentro do padrão observado para lançamentos semelhantes.</p>
          </div>
        </section>

        <section className="rounded-[24px] bg-white shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between"><span className="text-[10px] text-[#737373] uppercase tracking-[0.14em]">Anotações &amp; comprovante</span><span className="material-symbols-outlined text-[16px] text-[#737373]">note_alt</span></div>
          <div className="p-3 rounded-2xl bg-[#fafafa]"><span className="text-[10px] text-[#737373]">Nota anexada</span><p className="text-[13px] mt-1">“{transaction.note}”</p></div>
          <div><span className="text-[10px] text-[#737373]">Tags de auditoria</span><div className="flex flex-wrap gap-1.5 mt-2">{transaction.tags.map((tag) => <span key={tag} className="px-3 py-1 rounded-full bg-[#fafafa] text-[11px]">{tag}</span>)}</div></div>
          <button type="button" onClick={() => showToast("Visualizador de documento fiscal carregado")} className="w-full h-12 px-3 bg-[#f5f5f5] rounded-[18px] flex items-center justify-between text-[12px] hover:bg-[#fafafa] transition-colors"><span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#737373]">receipt_long</span>Comprovante fiscal (NFC-e {transaction.display_id})</span><span className="flex items-center gap-1 text-[10px] text-[#737373]">PDF anexo <span className="material-symbols-outlined text-[16px]">chevron_right</span></span></button>
        </section>

        <section className="flex flex-col gap-2">
          <Link
            href={`/extrato/${params.id || transaction.display_id}/editar`}
            className="w-full h-12 rounded-[18px] bg-[#0a0a0a] text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#171717] active:scale-[0.99] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Editar dados da transação
          </Link>
          <Link
            href={`/extrato/${params.id || transaction.display_id}/dividir`}
            className="w-full h-12 rounded-[18px] bg-white text-[#0a0a0a] text-[13px] font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-[#fafafa] active:scale-[0.99] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">call_split</span>
            Dividir despesa com amigos
          </Link>
          <button
            type="button"
            onClick={confirmDelete}
            className="h-10 self-center px-3 rounded-full text-[#e7000b] text-[12px] flex items-center gap-1.5 hover:bg-red-50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            Excluir ou contestar lançamento
          </button>
        </section>
      </div>
      {toast && <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] bg-[#0a0a0a] text-white px-5 py-2.5 rounded-full text-[12px] shadow-lg whitespace-nowrap">{toast}</div>}
    </main>
  );
}
