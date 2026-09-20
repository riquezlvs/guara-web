"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { obterExtrato, ItemExtrato, obterPessoas, cadastrarPessoa, dividirTransacao } from "@/lib/api";

interface FriendMember {
  id: string;
  name: string;
  detail: string;
  active: boolean;
  isUser: boolean;
  initial: string;
}

export default function DividirComAmigosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<ItemExtrato | null>(null);
  const [mode, setMode] = useState<"equal" | "exact" | "percent" | "receipt">("equal");
  const [whatsappShare, setWhatsappShare] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<FriendMember[]>([
    { id: "user", name: "Você (Titular)", detail: "Responsável pelo pagamento", active: true, isUser: true, initial: "VC" },
  ]);

  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [extratoRes, pessoasRes] = await Promise.all([
          obterExtrato(undefined, params.id).catch(() => obterExtrato()),
          obterPessoas().catch(() => ({ sucesso: false, dados: [] })),
        ]);

        const found = extratoRes.dados?.itens?.find(
          (item) => String(item.display_id) === params.id
        );
        if (found && mounted) {
          setTransaction(found);
        }

        if (pessoasRes.sucesso && Array.isArray(pessoasRes.dados) && mounted) {
          const loadedMembers: FriendMember[] = [
            { id: "user", name: "Você (Titular)", detail: "Responsável pelo pagamento", active: true, isUser: true, initial: "VC" },
            ...pessoasRes.dados.map((p) => ({
              id: String(p.id),
              name: p.name,
              detail: p.saldoDevedor ? `Saldo atual: R$ ${Math.abs(p.saldoDevedor).toFixed(2)}` : "Contato cadastrado",
              active: false,
              isUser: false,
              initial: p.initials || p.name.slice(0, 2).toUpperCase(),
            })),
          ];
          setMembers(loadedMembers);
        }
      } catch (err) {
        console.warn("Erro ao carregar dados para divisão:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const baseAmount = transaction ? Number(transaction.total_amount) : 0;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  };

  const toggleMember = (id: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === id && !m.isUser) {
          return { ...m, active: !m.active };
        }
        return m;
      })
    );
  };

  const activeMembers = members.filter((m) => m.active);
  const count = Math.max(1, activeMembers.length);
  const share = baseAmount / count;
  const othersShare = share * (count - 1);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredMembers = members.filter((m) => {
    if (m.isUser) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.detail.toLowerCase().includes(q);
  });

  const activeNonUsers = filteredMembers.filter((m) => m.active);
  const inactiveNonUsers = filteredMembers.filter((m) => !m.active);

  const handleAddNewFriend = async () => {
    const nome = prompt("Nome do novo amigo ou contato:");
    if (!nome || !nome.trim()) return;

    try {
      const resp = await cadastrarPessoa(nome.trim());
      const novoId = resp.dados?.id ? String(resp.dados.id) : `friend-${Date.now()}`;
      const newMember: FriendMember = {
        id: novoId,
        name: resp.dados?.name || nome.trim(),
        detail: "Adicionado agora",
        active: true,
        isUser: false,
        initial: (resp.dados?.name || nome.trim()).slice(0, 2).toUpperCase(),
      };
      setMembers((prev) => [...prev, newMember]);
      showToast(`${newMember.name} adicionado com sucesso!`);
    } catch (err: any) {
      showToast(err.message || "Erro ao adicionar contato");
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    const friendsSelected = members.filter((m) => !m.isUser && m.active);
    if (friendsSelected.length === 0) {
      showToast("Selecione pelo menos um amigo para dividir!");
      return;
    }

    try {
      setIsSubmitting(true);
      await dividirTransacao({
        display_id: transaction ? Number(transaction.display_id) : undefined,
        description: transaction?.description,
        total_amount: baseAmount,
        category_id: transaction?.categories?.id,
        occurred_at: transaction?.occurred_at,
        pessoas: friendsSelected.map((f) => ({
          name: f.name,
          valor: share,
        })),
      });

      showToast("Divisão salva no banco com sucesso!");
      setTimeout(() => {
        router.back();
      }, 700);
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar divisão.");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="bg-surface font-sans text-body-md text-on-surface antialiased min-h-screen flex flex-col">
        <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-14 px-4 max-w-xl mx-auto flex items-center justify-between gap-2">
            <button
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center gap-1 text-on-surface hover:text-ink transition-colors"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="text-[14px] font-medium tracking-tight">Voltar</span>
            </button>
            <h1 className="text-[18px] leading-[26px] font-semibold text-ink truncate text-center flex-1">
              Dividir Com Amigos
            </h1>
            <div className="w-11" />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-[#737373] pt-14">
          <span className="material-symbols-outlined text-[32px] animate-spin mb-2">
            progress_activity
          </span>
          <span className="text-[14px]">Carregando lançamento...</span>
        </main>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="bg-surface font-sans text-body-md text-on-surface antialiased min-h-screen flex flex-col">
        <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-14 px-4 max-w-xl mx-auto flex items-center justify-between gap-2">
            <button
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center gap-1 text-on-surface hover:text-ink transition-colors"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="text-[14px] font-medium tracking-tight">Voltar</span>
            </button>
            <h1 className="text-[18px] leading-[26px] font-semibold text-ink truncate text-center flex-1">
              Dividir Com Amigos
            </h1>
            <div className="w-11" />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20 text-center">
          <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center text-[#737373] mb-3">
            <span className="material-symbols-outlined text-[28px]">search_off</span>
          </div>
          <h3 className="text-[16px] font-semibold text-ink">Lançamento não encontrado</h3>
          <p className="text-[13px] text-mid-gray mt-1 mb-4">
            Não foi possível carregar os detalhes deste lançamento para divisão.
          </p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-full bg-ink text-paper text-[13px] font-medium"
            type="button"
          >
            Voltar ao Extrato
          </button>
        </main>
      </div>
    );
  }

  const transactionDate = transaction.occurred_at
    ? new Date(transaction.occurred_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Data recente";

  return (
    <div className="bg-surface font-sans text-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-14 px-4 max-w-xl mx-auto flex items-center justify-between gap-2">
          <button
            className="min-w-[44px] min-h-[44px] -ml-2 flex items-center gap-1 text-on-surface hover:text-ink transition-colors active:opacity-70"
            onClick={() => router.back()}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-[14px] font-medium tracking-tight">Voltar</span>
          </button>

          <h1 className="text-[18px] leading-[26px] font-semibold text-ink truncate text-center flex-1">
            Dividir Com Amigos
          </h1>

          <div className="flex items-center justify-end min-w-[44px] gap-2">
            <button
              aria-label="Fechar"
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-ink transition-colors active:opacity-70"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col relative w-full pt-14 bg-surface pb-safe min-h-screen">
        <div className="flex flex-col w-full pb-safe text-ink">
          {/* Content Container with strict mobile grid density */}
          <div className="w-full max-w-[640px] mx-auto px-4 py-3 flex flex-col gap-4">
            {/* 1. RESUMO DA DESPESA SELECIONADA */}
            <div className="p-5 rounded-[24px] bg-paper shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-[18px] bg-surface-container flex items-center justify-center text-ink shrink-0">
                    <span className="material-symbols-outlined text-[24px]">
                      {transaction.categories?.name?.toLowerCase().includes("mercado")
                        ? "shopping_cart"
                        : transaction.categories?.name?.toLowerCase().includes("refe") ||
                          transaction.categories?.name?.toLowerCase().includes("alimen")
                        ? "restaurant"
                        : "receipt_long"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-[12px] text-mid-gray uppercase tracking-wider font-medium">
                        {transaction.installment_total && transaction.installment_total > 1
                          ? `Parcela ${transaction.installment_number || 1}/${transaction.installment_total}`
                          : "Despesa Única"}
                      </span>
                      <span className="text-[12px] text-mid-gray truncate">{transactionDate}</span>
                    </div>
                    <h2 className="text-[18px] leading-[26px] text-ink truncate font-semibold">
                      {transaction.description}
                    </h2>
                    <p className="text-[13px] text-mid-gray truncate">
                      {transaction.categories?.name || "Geral"} • {transaction.accounts?.name || "Conta Bancária"}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[12px] text-mid-gray block">Total</span>
                  <span className="text-[24px] leading-[32px] text-ink font-semibold tracking-tight">
                    R$ {formatBRL(baseAmount)}
                  </span>
                </div>
              </div>

              {/* Multiple Items Accordion Toggle */}
              <div className="pt-3 flex items-center justify-between bg-surface-alt px-3.5 py-2.5 rounded-[18px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-mid-gray">receipt_long</span>
                  <span className="text-[13px] text-ink font-medium truncate">1 despesa selecionada</span>
                </div>
                <button
                  className="text-[13px] text-ink font-medium hover:underline flex items-center gap-1 shrink-0"
                  type="button"
                  onClick={() => showToast("Seleção múltipla mantida")}
                >
                  <span>Alterar</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* 2. MODO DE DIVISÃO (Segmented Pill Carousel) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Modo de Cálculo
                </label>
                <span className="text-[12px] text-mid-gray">Exato com centavos</span>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-full bg-paper shadow-sm overflow-x-auto no-scrollbar">
                <button
                  className={`mode-pill px-3 py-2 rounded-full text-[13px] whitespace-nowrap transition-all ${
                    mode === "equal"
                      ? "shadow-sm bg-ink text-paper font-medium"
                      : "bg-surface-alt text-mid-gray hover:text-ink"
                  }`}
                  onClick={() => setMode("equal")}
                  type="button"
                >
                  Divisão Igual (Rachar)
                </button>
                <button
                  className={`mode-pill px-3 py-2 rounded-full text-[13px] whitespace-nowrap transition-all ${
                    mode === "exact"
                      ? "shadow-sm bg-ink text-paper font-medium"
                      : "bg-surface-alt text-mid-gray hover:text-ink"
                  }`}
                  onClick={() => setMode("exact")}
                  type="button"
                >
                  Por Valor Exato
                </button>
                <button
                  className={`mode-pill px-3 py-2 rounded-full text-[13px] whitespace-nowrap transition-all ${
                    mode === "percent"
                      ? "shadow-sm bg-ink text-paper font-medium"
                      : "bg-surface-alt text-mid-gray hover:text-ink"
                  }`}
                  onClick={() => setMode("percent")}
                  type="button"
                >
                  Porcentagem %
                </button>
                <button
                  className={`mode-pill px-3 py-2 rounded-full text-[13px] whitespace-nowrap transition-all ${
                    mode === "receipt"
                      ? "shadow-sm bg-ink text-paper font-medium"
                      : "bg-surface-alt text-mid-gray hover:text-ink"
                  }`}
                  onClick={() => setMode("receipt")}
                  type="button"
                >
                  Itens Comprovante
                </button>
              </div>
            </div>

            {/* 3. QUEM VAI DIVIDIR? (Seleção de Amigos / Contatos) */}
            <div className="p-5 rounded-[24px] bg-paper shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] leading-[26px] text-ink font-semibold">Participantes do Rateio</h3>
                  <p className="text-[13px] text-mid-gray">Defina quem vai rachar essa conta com você</p>
                </div>
                <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-[13px] text-ink font-medium">
                  {count}
                </span>
              </div>

              {/* Card do Titular (Você) */}
              <div className="flex items-center justify-between p-3.5 rounded-[18px] bg-surface-container-low shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-paper text-[14px] font-medium shrink-0">
                    VC
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] text-ink font-semibold truncate">Você (Titular)</p>
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-surface-container-high text-[11px] text-mid-gray uppercase font-medium">
                        Pagador
                      </span>
                    </div>
                    <p className="text-[12px] text-mid-gray truncate">Sua cota nesta despesa</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[14px] text-ink font-semibold">R$ {formatBRL(share)}</span>
                  <span className="block text-[12px] text-mid-gray">Cota própria</span>
                </div>
              </div>

              {/* Quick Search Bar + New Friend Trigger */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-mid-gray">
                    search
                  </span>
                  <input
                    className="w-full h-11 pl-10 pr-4 rounded-[18px] bg-surface-alt text-[14px] text-ink placeholder-mid-gray focus:outline-none focus:bg-surface-container-low transition-all"
                    placeholder="Buscar amigo, telefone ou Pix..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="h-11 px-3.5 rounded-[18px] bg-surface-alt hover:bg-surface-container transition-all flex items-center gap-1 text-[13px] text-ink font-medium shrink-0"
                  type="button"
                  onClick={handleAddNewFriend}
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Novo</span>
                </button>
              </div>

              {/* Lista de Amigos Ativos */}
              <div className="flex flex-col gap-2.5" id="split-participants-list">
                {activeNonUsers.length === 0 ? (
                  <div className="p-4 rounded-[18px] bg-surface-alt/50 border border-dashed border-mid-gray/20 text-center">
                    <p className="text-[13px] text-mid-gray">
                      Nenhum amigo adicionado à divisão ainda.
                    </p>
                    <p className="text-[12px] text-mid-gray/80 mt-0.5">
                      Selecione um contato abaixo ou clique em <strong>+ Novo</strong> para cadastrar.
                    </p>
                  </div>
                ) : (
                  activeNonUsers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 rounded-[18px] bg-paper shadow-sm hover:shadow transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-[14px] text-ink font-medium shrink-0">
                          {m.initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] text-ink font-medium truncate">{m.name}</p>
                          <p className="text-[12px] text-mid-gray truncate">{m.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[14px] text-ink font-semibold">R$ {formatBRL(share)}</span>
                        <button
                          type="button"
                          onClick={() => toggleMember(m.id)}
                          className="w-8 h-8 rounded-full bg-surface-alt hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                          aria-label="Remover"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sugestões Frequentes / Recentes */}
              {inactiveNonUsers.length > 0 && (
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-mid-gray">group</span>
                    <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                      Contatos Disponíveis ({inactiveNonUsers.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2" id="split-frequent-chips">
                    {inactiveNonUsers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-alt hover:bg-surface-container transition-colors text-ink"
                      >
                        <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[11px] font-medium text-ink">
                          {m.initial}
                        </span>
                        <span className="text-[13px] font-medium">{m.name}</span>
                        <span className="material-symbols-outlined text-[16px] text-mid-gray">add</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. RESUMO DA DIVISÃO EM TEMPO REAL (Card Container Branco) */}
            <div className="p-5 rounded-[24px] bg-paper shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[12px] uppercase tracking-wider text-mid-gray font-medium">
                  Demonstrativo da Operação
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium text-mid-gray bg-surface-alt px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
                  Rateio em tempo real
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-mid-gray">Total da Conta</span>
                  <span className="text-ink font-medium">R$ {formatBRL(baseAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-mid-gray">Dividido entre</span>
                  <span className="text-ink font-medium">
                    {count === 1 ? "1 pessoa (Apenas você)" : `${count} pessoas (Você + ${count - 1} amigos)`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-mid-gray">Valor por pessoa</span>
                  <span className="text-ink font-semibold">R$ {formatBRL(share)} cada</span>
                </div>
              </div>
              <div className="p-3.5 rounded-[18px] bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-ink shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-ink block">Total a receber de volta</span>
                    <span className="text-[12px] text-mid-gray">
                      {((othersShare / baseAmount) * 100).toFixed(1).replace(".", ",")}% do valor total lançado
                    </span>
                  </div>
                </div>
                <span className="text-[18px] font-semibold text-ink">R$ {formatBRL(othersShare)}</span>
              </div>
              {/* Notificação do Fluxo Financeiro */}
              <div className="flex items-start gap-2 pt-1 text-on-surface-variant text-[12px]">
                <span className="material-symbols-outlined text-[16px] text-mid-gray mt-0.5 shrink-0">info</span>
                <span>
                  Será lançado automaticamente em <strong>&ldquo;Quem Me Deve&rdquo;</strong> na sua fatura com competência de Novembro.
                </span>
              </div>
            </div>

            {/* 5. ASSISTENTE DIAGNÓSTICO GUARÁ IA */}
            <div className="p-4 rounded-[24px] bg-surface-container-low flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-paper shadow-sm flex items-center justify-center text-ink shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[13px] font-semibold text-ink">Insight Guará IA</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-paper text-[10px] font-medium text-mid-gray uppercase tracking-wider">
                    Orçamento
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  Ao dividir esta despesa de R$ {formatBRL(baseAmount)} em {count} partes, seu impacto real no orçamento de Alimentação cai de R$ {formatBRL(baseAmount)} para apenas{" "}
                  <strong className="text-ink font-semibold">R$ {formatBRL(share)}</strong>, preservando sua meta de economia mensal.
                </p>
              </div>
            </div>

            {/* 6. OPÇÕES DE COBRANÇA */}
            <div className="p-5 rounded-[24px] bg-paper shadow-sm flex flex-col gap-4">
              <span className="text-[12px] uppercase tracking-wider text-mid-gray font-medium">
                Método & Envio da Cobrança
              </span>
              {/* Switch de Envio Automático */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-[14px] bg-surface-alt flex items-center justify-center text-ink shrink-0 group-hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[20px]">send_to_mobile</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink font-medium">Cobrança Automática via WhatsApp</p>
                    <p className="text-[12px] text-mid-gray">Gera texto amigável com Pix Copia e Cola</p>
                  </div>
                </div>
                <input
                  checked={whatsappShare}
                  onChange={(e) => setWhatsappShare(e.target.checked)}
                  className="w-5 h-5 rounded-[6px] accent-ink shrink-0 cursor-pointer"
                  type="checkbox"
                />
              </label>
              {/* Detalhes da Chave Pix Registrada */}
              <div className="p-3.5 rounded-[18px] bg-surface-alt flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-mid-gray shrink-0">qr_code_2</span>
                  <div className="min-w-0">
                    <span className="text-[12px] text-mid-gray block">Chave de recebimento</span>
                    <span className="text-[13px] text-ink font-medium truncate block">Celular: (11) 9****-1234</span>
                  </div>
                </div>
                <button
                  className="text-[13px] text-ink font-medium hover:underline shrink-0"
                  type="button"
                  onClick={() => showToast("Configurações de chaves Pix")}
                >
                  Trocar
                </button>
              </div>
            </div>

            {/* 7. AÇÕES DE RODAPÉ */}
            <div className="pt-2 pb-8 flex flex-col gap-2.5">
              <button
                className="w-full h-12 px-6 rounded-[18px] bg-ink text-paper text-[14px] font-medium flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                onClick={handleConfirm}
                disabled={isSubmitting}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>Salvando divisão...</span>
                  </>
                ) : count > 1 ? (
                  `Confirmar Divisão (R$ ${formatBRL(othersShare)} a receber)`
                ) : (
                  "Confirmar Divisão Individual"
                )}
              </button>
              <button
                className="w-full h-11 px-6 rounded-[18px] bg-surface-alt hover:bg-surface-container text-ink text-[14px] font-medium flex items-center justify-center transition-all"
                onClick={() => router.back()}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] bg-ink text-paper px-5 py-2.5 rounded-full text-[12px] shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
