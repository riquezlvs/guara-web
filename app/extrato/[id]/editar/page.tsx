"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  obterExtrato,
  ItemExtrato,
  atualizarTransacao,
  excluirTransacao,
  obterCategoriasDisponiveis,
  obterContasDisponiveis,
} from "@/lib/api";

const PRESET_TAGS = [
  "#Alimentação",
  "#Trabalho",
  "#Lazer",
  "#Viagem",
  "#Essencial",
  "#Mercado",
  "#Fixo",
  "#Urgente",
];

export default function EditarLancamentoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [transaction, setTransaction] = useState<ItemExtrato | null>(null);

  // Form states initialized with transaction details
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txTime, setTxTime] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [ignoreStats, setIgnoreStats] = useState(false);
  const [reimbursable, setReimbursable] = useState(false);

  // Selected Category and Account
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("Geral");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("pix");
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [selectedAccountName, setSelectedAccountName] = useState<string>("Conta Bancária");

  // Available options from DB
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [availableAccounts, setAvailableAccounts] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);

  // Modals for selection
  const [modalCategoryOpen, setModalCategoryOpen] = useState(false);
  const [modalAccountOpen, setModalAccountOpen] = useState(false);

  // Modal / Confirm delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [extratoRes, categoriesRes, accountsRes] = await Promise.all([
          params.id
            ? obterExtrato(undefined, params.id).catch(() => obterExtrato())
            : obterExtrato(),
          obterCategoriasDisponiveis().catch(() => ({ sucesso: false, dados: [] })),
          obterContasDisponiveis().catch(() => ({ sucesso: false, dados: [] })),
        ]);

        if (categoriesRes.sucesso && Array.isArray(categoriesRes.dados) && mounted) {
          setAvailableCategories(categoriesRes.dados);
        }
        if (accountsRes.sucesso && Array.isArray(accountsRes.dados) && mounted) {
          setAvailableAccounts(accountsRes.dados);
        }

        let found = extratoRes.dados?.itens?.find(
          (item) => String(item.display_id) === params.id || (item as any).id === params.id
        ) || extratoRes.dados?.itens?.[0];

        if (found && mounted) {
          setTransaction(found);
          setEntryType(found.entry_type === "income" ? "income" : "expense");
          setAmount(
            Number(found.total_amount).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          );
          setMerchant(found.description || "");

          if (found.occurred_at) {
            const dt = new Date(found.occurred_at);
            setTxDate(dt.toLocaleDateString("pt-BR"));
            setTxTime(dt.toLocaleTimeString("pt-BR"));
          } else {
            setTxDate(new Date().toLocaleDateString("pt-BR"));
            setTxTime(new Date().toLocaleTimeString("pt-BR"));
          }

          setNotes(found.observation || "");
          setTags(found.categories?.name ? [`#${found.categories.name}`] : []);

          setSelectedCategoryId(found.categories?.id);
          setSelectedCategoryName(found.categories?.name || "Geral");
          setSelectedPaymentMethod(found.payment_method || "pix");
          setSelectedAccountId(found.accounts?.id);
          setSelectedAccountName(found.accounts?.name || "Conta Bancária");
        }
      } catch (err) {
        console.warn("Erro ao buscar detalhes da transação para edição:", err);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  const handleSave = async () => {
    if (!transaction) return;
    const cleanAmount = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      showToast("Informe um valor válido maior que zero.");
      return;
    }
    if (!merchant.trim()) {
      showToast("Informe o nome do estabelecimento/descrição.");
      return;
    }

    setIsSaving(true);
    try {
      await atualizarTransacao(transaction.display_id, {
        description: merchant.trim(),
        total_amount: cleanAmount,
        entry_type: entryType,
        category_id: selectedCategoryId,
        payment_method: selectedPaymentMethod,
        observation: notes.trim() || undefined,
      });

      showToast("Alterações salvas com sucesso!");
      window.dispatchEvent(new CustomEvent("finances:refresh"));
      setTimeout(() => {
        router.back();
      }, 700);
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar alterações.");
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!transaction) return;
    setShowDeleteModal(false);
    try {
      await excluirTransacao(transaction.display_id);
      showToast("Lançamento excluído com sucesso!");
      window.dispatchEvent(new CustomEvent("finances:refresh"));
      setTimeout(() => {
        router.push("/extrato");
      }, 700);
    } catch (err: any) {
      showToast(err.message || "Erro ao excluir lançamento.");
    }
  };

  const toggleTag = (tagName: string) => {
    setTags((prev) => {
      if (prev.includes(tagName)) {
        return prev.filter((t) => t !== tagName);
      }
      return [...prev, tagName];
    });
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const addTag = () => {
    const newTag = prompt("Digite o nome da nova tag:");
    if (newTag) {
      const formatted = newTag.startsWith("#") ? newTag : `#${newTag}`;
      if (!tags.includes(formatted)) {
        setTags((prev) => [...prev, formatted]);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-canvas font-sans text-body-md text-on-surface antialiased flex flex-col min-h-screen">
        <header className="fixed top-0 inset-x-0 z-50 bg-canvas/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
          <div className="h-14 px-4 max-w-xl mx-auto flex items-center justify-between">
            <button
              aria-label="Cancelar edição"
              className="h-11 px-2 -ml-2 flex items-center gap-1 text-mid-gray hover:text-ink transition-colors rounded-lg"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="text-[14px] font-medium">Cancelar</span>
            </button>
            <h1 className="text-[18px] leading-[26px] font-semibold text-ink truncate px-2 text-center flex-1">
              Editar Lançamento
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
      <div className="bg-canvas font-sans text-body-md text-on-surface antialiased flex flex-col min-h-screen">
        <header className="fixed top-0 inset-x-0 z-50 bg-canvas/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
          <div className="h-14 px-4 max-w-xl mx-auto flex items-center justify-between">
            <button
              aria-label="Voltar"
              className="h-11 px-2 -ml-2 flex items-center gap-1 text-mid-gray hover:text-ink transition-colors rounded-lg"
              onClick={() => router.back()}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="text-[14px] font-medium">Voltar</span>
            </button>
            <h1 className="text-[18px] leading-[26px] font-semibold text-ink truncate px-2 text-center flex-1">
              Editar Lançamento
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
            Não foi possível encontrar este lançamento para edição.
          </p>
          <button
            onClick={() => router.push("/extrato")}
            className="px-5 py-2.5 rounded-full bg-ink text-paper text-[13px] font-medium"
            type="button"
          >
            Ir para o Extrato
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-canvas font-sans text-body-md text-on-surface antialiased flex flex-col min-h-screen">
      {/* Top Fixed Header - Padrão Guará */}
      <header className="fixed top-0 inset-x-0 z-50 bg-canvas/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-14 px-4 max-w-xl mx-auto flex items-center justify-between gap-2">
          <button
            aria-label="Voltar"
            className="h-9 px-3 rounded-full bg-white shadow-sm flex items-center gap-1.5 text-[12px] font-medium text-ink hover:bg-[#fafafa] active:scale-95 transition-all"
            onClick={() => router.back()}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Voltar</span>
          </button>
          
          <div className="flex flex-col items-center justify-center min-w-0 flex-1">
            <span className="text-[10px] text-[#737373] uppercase tracking-[0.16em] font-medium">
              Guará Financeiro
            </span>
            <h1 className="text-[16px] font-semibold text-ink truncate leading-tight">
              Editar Lançamento
            </h1>
          </div>

          <button
            aria-label="Salvar lançamento"
            className="h-9 px-3.5 flex items-center gap-1.5 text-white bg-[#0a0a0a] hover:bg-[#171717] active:scale-[0.98] transition-all rounded-full shadow-sm text-[12px] font-medium disabled:opacity-50"
            onClick={handleSave}
            type="button"
            disabled={isSaving}
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                isSaving ? "animate-spin" : ""
              }`}
            >
              {isSaving ? "progress_activity" : "check"}
            </span>
            <span>{isSaving ? "Salvando..." : "Salvar"}</span>
          </button>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex flex-col relative w-full pt-14 pb-safe bg-canvas flex-1">
        <div className="flex flex-col w-full pb-10">
          <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-3 pt-2">
            {/* IA Assistant Context Pill Card */}
            <div className="bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-start gap-2 transition-all">
              <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-ink text-[16px]">auto_awesome</span>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                    Guará IA • Sincronização
                  </span>
                  <span className="text-[12px] text-mid-gray font-medium">Auto-revisão</span>
                </div>
                <p className="text-[13px] text-ink-soft leading-tight">
                  Lançamento importado via cartão. As alterações recalcularão o orçamento de{" "}
                  <span className="text-[13px] font-medium text-ink underline decoration-hairline underline-offset-2">
                    Alimentação
                  </span>{" "}
                  automaticamente.
                </p>
              </div>
            </div>

            {/* Valor da Transação Card */}
            <div className="bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Valor do Lançamento
                </span>
                <span className="text-[12px] text-mid-gray flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink"></span>
                  BRL (R$)
                </span>
              </div>

              {/* Amount Input Container */}
              <div className="flex items-baseline justify-start gap-2 py-1">
                <span className="text-[36px] leading-[40px] text-ink tracking-tight font-semibold select-none">
                  {entryType === "expense" ? "− R$" : "+ R$"}
                </span>
                <input
                  aria-label="Valor monetário do lançamento"
                  className="text-[36px] leading-[40px] font-semibold text-ink bg-transparent focus:outline-none w-full tracking-tight placeholder-mid-gray selection:bg-surface-container"
                  inputMode="decimal"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Segmented Type Controller */}
              <div className="grid grid-cols-2 bg-canvas p-1 rounded-[18px] gap-1 select-none">
                <button
                  className={`h-9 rounded-[18px] text-[13px] flex items-center justify-center gap-1.5 transition-all ${
                    entryType === "expense"
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-medium"
                      : "text-mid-gray hover:text-ink font-normal"
                  }`}
                  onClick={() => setEntryType("expense")}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                  <span>Despesa (Saída)</span>
                </button>
                <button
                  className={`h-9 rounded-[18px] text-[13px] flex items-center justify-center gap-1.5 transition-all ${
                    entryType === "income"
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-medium"
                      : "text-mid-gray hover:text-ink font-normal"
                  }`}
                  onClick={() => setEntryType("income")}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">south_west</span>
                  <span>Receita (Entrada)</span>
                </button>
              </div>
            </div>

            {/* Detalhes Principais Card */}
            <div className="bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Identificação &amp; Origem
                </span>
                <span className="text-[12px] text-mid-gray">ID #{transaction.display_id}</span>
              </div>

              {/* Estabelecimento */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] uppercase text-mid-gray tracking-wider font-medium"
                  htmlFor="merchant-name"
                >
                  Estabelecimento
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-11 px-3.5 bg-canvas rounded-[18px] text-ink text-[14px] focus:outline-none focus:bg-surface-alt transition-colors"
                    id="merchant-name"
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                  <span className="material-symbols-outlined text-mid-gray text-[18px] absolute right-3 pointer-events-none">
                    storefront
                  </span>
                </div>
                <span className="text-[12px] text-mid-gray px-1">
                  Identificador original: {transaction.description}
                </span>
              </div>

              {/* Categoria Picker Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Categoria
                </span>
                <button
                  aria-label="Alterar categoria"
                  className="w-full p-3 bg-canvas hover:bg-surface-container active:scale-[0.99] rounded-[18px] flex items-center justify-between gap-2 transition-all text-left cursor-pointer border border-black/5"
                  type="button"
                  onClick={() => setModalCategoryOpen(true)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0 shadow-sm text-ink">
                      <span className="material-symbols-outlined text-[18px]">
                        {selectedCategoryName.toLowerCase().includes("mercado")
                          ? "shopping_cart"
                          : selectedCategoryName.toLowerCase().includes("refe") ||
                            selectedCategoryName.toLowerCase().includes("alimen")
                          ? "restaurant"
                          : selectedCategoryName.toLowerCase().includes("trans")
                          ? "directions_car"
                          : selectedCategoryName.toLowerCase().includes("saúde") ||
                            selectedCategoryName.toLowerCase().includes("saude")
                          ? "medical_services"
                          : selectedCategoryName.toLowerCase().includes("lazer")
                          ? "celebration"
                          : "category"}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] text-ink font-semibold truncate">
                          {selectedCategoryName}
                        </span>
                        <span className="px-2 py-0.5 rounded-[18px] bg-paper text-ink text-[10px] uppercase shadow-sm shrink-0 font-medium">
                          Alterar
                        </span>
                      </div>
                      <span className="text-[12px] text-mid-gray">Toque para selecionar outra</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mid-gray text-[20px] shrink-0">
                    expand_more
                  </span>
                </button>
              </div>

              {/* Conta de Origem / Forma de Pagamento */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Conta de Origem / Pagamento
                </span>
                <button
                  aria-label="Selecionar conta bancária e pagamento"
                  className="w-full p-3 bg-canvas hover:bg-surface-container active:scale-[0.99] rounded-[18px] flex items-center justify-between gap-2 transition-all text-left cursor-pointer border border-black/5"
                  type="button"
                  onClick={() => setModalAccountOpen(true)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0 shadow-sm text-ink">
                      <span className="material-symbols-outlined text-[18px]">
                        {selectedPaymentMethod === "pix"
                          ? "payments"
                          : selectedPaymentMethod === "credit_card"
                          ? "credit_card"
                          : "account_balance"}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] text-ink font-semibold truncate">
                          {selectedAccountName}
                        </span>
                        <span className="px-2 py-0.5 rounded-[18px] bg-paper text-ink text-[10px] uppercase shadow-sm shrink-0 font-medium">
                          {selectedPaymentMethod === "credit_card" ? "Crédito" : selectedPaymentMethod === "pix" ? "PIX" : "Débito"}
                        </span>
                      </div>
                      <span className="text-[12px] text-mid-gray">Toque para alterar conta ou método</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mid-gray text-[20px] shrink-0">
                    expand_more
                  </span>
                </button>
              </div>

              {/* Data e Horário Dual Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] uppercase text-mid-gray tracking-wider font-medium"
                    htmlFor="tx-date"
                  >
                    Data
                  </label>
                  <div className="relative flex items-center">
                    <input
                      className="w-full h-11 pl-3.5 pr-9 bg-canvas rounded-[18px] text-ink text-[14px] focus:outline-none focus:bg-surface-alt transition-colors"
                      id="tx-date"
                      type="text"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                    />
                    <span className="material-symbols-outlined text-mid-gray text-[18px] absolute right-3 pointer-events-none">
                      calendar_today
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[12px] uppercase text-mid-gray tracking-wider font-medium"
                    htmlFor="tx-time"
                  >
                    Horário
                  </label>
                  <div className="relative flex items-center">
                    <input
                      className="w-full h-11 pl-3.5 pr-9 bg-canvas rounded-[18px] text-ink text-[14px] focus:outline-none focus:bg-surface-alt transition-colors"
                      id="tx-time"
                      type="text"
                      value={txTime}
                      onChange={(e) => setTxTime(e.target.value)}
                    />
                    <span className="material-symbols-outlined text-mid-gray text-[18px] absolute right-3 pointer-events-none">
                      schedule
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações Avançadas & Orçamento Card */}
            <div className="bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Orçamento &amp; Controles
                </span>
                <span className="material-symbols-outlined text-mid-gray text-[18px]">tune</span>
              </div>

              {/* Teto Orçamentário Target */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Vinculação Orçamentária
                </span>
                <button
                  className="w-full p-3 bg-canvas hover:bg-surface-container active:scale-[0.99] rounded-[18px] flex items-center justify-between text-left transition-all"
                  type="button"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-ink text-[18px]">pie_chart</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium text-ink truncate">
                        Teto Mensal de Alimentação (Outubro)
                      </span>
                      <span className="text-[12px] text-mid-gray">Consumido: R$ 1.180 / R$ 1.800 (65%)</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mid-gray text-[18px]">expand_more</span>
                </button>
              </div>

              {/* Toggle Switches Container */}
              <div className="flex flex-col gap-3 pt-1">
                {/* Switch 1: Ignorar estatísticas */}
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-ink">Ignorar no consumo mensal</span>
                    <span className="text-[12px] text-mid-gray">Oculta dos gráficos de fluxo médio</span>
                  </div>
                  <button
                    aria-checked={ignoreStats}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                      ignoreStats ? "bg-ink" : "bg-surface-container"
                    }`}
                    onClick={() => setIgnoreStats(!ignoreStats)}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-paper shadow-sm transform transition-transform ${
                        ignoreStats ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></span>
                  </button>
                </div>

                <div className="w-full h-px bg-hairline"></div>

                {/* Switch 2: Lançamento reembolsável */}
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-ink">Lançamento reembolsável</span>
                    <span className="text-[12px] text-mid-gray">Sinalizado para acerto corporativo</span>
                  </div>
                  <button
                    aria-checked={reimbursable}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                      reimbursable ? "bg-ink" : "bg-surface-container"
                    }`}
                    onClick={() => setReimbursable(!reimbursable)}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-paper shadow-sm transform transition-transform ${
                        reimbursable ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Anotações, Tags & Comprovante Card */}
            <div className="bg-paper rounded-[24px] shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.08)] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Notas &amp; Anexos
                </span>
                <span className="text-[12px] text-mid-gray">3 anexos fiscais</span>
              </div>

              {/* Anotações Textarea */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] uppercase text-mid-gray tracking-wider font-medium"
                  htmlFor="tx-notes"
                >
                  Anotações Pessoais
                </label>
                <textarea
                  className="w-full p-3 bg-canvas rounded-[18px] text-ink text-[13px] focus:outline-none focus:bg-surface-alt transition-colors resize-none leading-relaxed"
                  id="tx-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Tags Pré-prontas e Tags Vinculadas */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                    Tags Rápidas (Toque para adicionar)
                  </label>
                  <span className="text-[11px] text-mid-gray">{tags.length} selecionada(s)</span>
                </div>

                {/* Pre-made tag pills */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {PRESET_TAGS.map((pt) => {
                    const isSelected = tags.includes(pt);
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => toggleTag(pt)}
                        className={`h-7 px-3 rounded-full text-[12px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#0a0a0a] text-white shadow-xs"
                            : "bg-surface-alt text-mid-gray hover:text-ink hover:bg-surface-container"
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[13px]">check</span>
                        )}
                        <span>{pt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom tags added */}
                {tags.some((t) => !PRESET_TAGS.includes(t)) && (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[11px] text-mid-gray">Tags personalizadas:</span>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {tags
                        .filter((t) => !PRESET_TAGS.includes(t))
                        .map((t) => (
                          <span
                            key={t}
                            className="h-7 px-2.5 rounded-full bg-[#0a0a0a] text-white flex items-center gap-1 text-[12px] font-medium shadow-xs"
                          >
                            <span>{t}</span>
                            <button
                              aria-label={`Remover tag ${t}`}
                              className="text-white/70 hover:text-white flex items-center"
                              onClick={() => removeTag(t)}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[13px]">close</span>
                            </button>
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div className="pt-0.5">
                  <button
                    className="h-7 px-3 rounded-full bg-canvas border border-dashed border-mid-gray/40 hover:bg-surface-container text-mid-gray hover:text-ink flex items-center gap-1 text-[12px] transition-colors cursor-pointer"
                    onClick={addTag}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Criar tag personalizada</span>
                  </button>
                </div>
              </div>

              {/* Comprovante Fiscal Attachment Item */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Comprovante / Nota Fiscal
                </span>
                <div className="p-3 bg-canvas rounded-[18px] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-[10px] bg-paper flex items-center justify-center shrink-0 shadow-sm text-mid-gray">
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium text-ink truncate">
                        Comprovante Fiscal
                      </span>
                      <span className="text-[12px] text-mid-gray">Nenhum arquivo anexado</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="h-7 px-2.5 rounded-[18px] bg-paper hover:bg-surface-container text-ink text-[13px] shadow-sm transition-colors font-medium cursor-pointer"
                      type="button"
                      onClick={() => showToast("Funcionalidade de upload em desenvolvimento")}
                    >
                      Anexar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Group */}
            <div className="flex flex-col gap-2 pt-2">
              {/* Primary Save Button */}
              <button
                className="w-full h-11 rounded-[18px] bg-ink text-paper text-[14px] font-medium flex items-center justify-center gap-2 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1)] hover:bg-ink-soft active:scale-[0.99] transition-all"
                onClick={handleSave}
                type="button"
                disabled={isSaving}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isSaving ? "animate-spin" : ""
                  }`}
                >
                  {isSaving ? "progress_activity" : "check"}
                </span>
                <span>{isSaving ? "Salvando Alterações..." : "Salvar Alterações"}</span>
              </button>

              {/* Secondary Cancel Button */}
              <button
                className="w-full h-11 rounded-[18px] bg-paper text-ink text-[14px] font-medium flex items-center justify-center gap-2 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.05)] hover:bg-canvas active:scale-[0.99] transition-all"
                onClick={() => router.back()}
                type="button"
              >
                <span>Cancelar e Descartar Edições</span>
              </button>

              {/* Destructive Delete Button */}
              <div className="pt-2 flex justify-center">
                <button
                  className="h-10 px-4 rounded-[18px] text-ember hover:bg-red-50 active:scale-[0.98] transition-all flex items-center gap-1.5 text-[13px] font-medium"
                  onClick={() => setShowDeleteModal(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  <span>Excluir lançamento permanentemente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal / Tela de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-paper rounded-[28px] p-6 shadow-2xl border border-black/5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 text-ember flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">delete_forever</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-[19px] leading-6 font-semibold text-ink tracking-tight">
                Excluir lançamento?
              </h2>
              <p className="text-[13px] text-mid-gray leading-relaxed">
                Tem certeza que deseja excluir permanentemente o lançamento de{" "}
                <strong className="text-ink">&ldquo;{merchant}&rdquo;</strong> no valor de{" "}
                <strong className="text-ink">R$ {amount}</strong>?
              </p>
              <div className="mt-2 p-3 rounded-[16px] bg-surface-container-low text-[12px] text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">
                  warning
                </span>
                <span>
                  Esta ação é irreversível e recalculará o teto orçamentário mensal da categoria Alimentação.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                className="w-full h-11 rounded-[18px] bg-ember text-white text-[14px] font-medium hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
                onClick={handleDeleteConfirmed}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Sim, excluir lançamento</span>
              </button>
              <button
                className="w-full h-11 rounded-[18px] bg-surface-alt hover:bg-surface-container text-ink text-[14px] font-medium transition-all"
                onClick={() => setShowDeleteModal(false)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bottom Sheet: Selecionar Categoria */}
      {modalCategoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-paper rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl border border-black/5 flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-ink">category</span>
                <h3 className="text-[16px] font-semibold text-ink">Selecionar Categoria</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCategoryOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-mid-gray hover:text-ink cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 py-1">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSelectedCategoryName(cat.name);
                      setModalCategoryOpen(false);
                    }}
                    className={`p-3 rounded-[16px] flex items-center gap-2.5 text-left transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-[#0a0a0a] text-white border-transparent shadow-sm"
                        : "bg-surface-alt hover:bg-surface-container text-ink border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {cat.name.toLowerCase().includes("mercado")
                        ? "shopping_cart"
                        : cat.name.toLowerCase().includes("refe") || cat.name.toLowerCase().includes("alimen")
                        ? "restaurant"
                        : cat.name.toLowerCase().includes("trans")
                        ? "directions_car"
                        : cat.name.toLowerCase().includes("saúde") || cat.name.toLowerCase().includes("saude")
                        ? "medical_services"
                        : cat.name.toLowerCase().includes("lazer")
                        ? "celebration"
                        : "label"}
                    </span>
                    <span className="text-[13px] font-medium truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Bottom Sheet: Selecionar Conta e Forma de Pagamento */}
      {modalAccountOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-paper rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl border border-black/5 flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-black/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-ink">account_balance</span>
                <h3 className="text-[16px] font-semibold text-ink">Conta &amp; Pagamento</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAccountOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-mid-gray hover:text-ink cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Método de Pagamento */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-mid-gray font-medium">
                Método de Pagamento
              </span>
              <div className="grid grid-cols-3 gap-1.5 bg-canvas p-1 rounded-[16px]">
                {[
                  { id: "pix", label: "PIX", icon: "payments" },
                  { id: "credit_card", label: "Crédito", icon: "credit_card" },
                  { id: "debit_card", label: "Débito", icon: "account_balance_wallet" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(m.id)}
                    className={`py-2 px-1 rounded-[12px] flex items-center justify-center gap-1 text-[12px] font-medium transition-all cursor-pointer ${
                      selectedPaymentMethod === m.id
                        ? "bg-[#0a0a0a] text-white shadow-xs"
                        : "text-mid-gray hover:text-ink"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conta Bancária */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[11px] uppercase tracking-wider text-mid-gray font-medium">
                Conta Vinculada
              </span>
              <div className="flex flex-col gap-1.5">
                {availableAccounts.length === 0 ? (
                  <div className="p-3 rounded-[16px] bg-surface-alt text-[12px] text-mid-gray text-center">
                    Nenhuma conta cadastrada adicionalmente.
                  </div>
                ) : (
                  availableAccounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setSelectedAccountName(acc.name);
                          setModalAccountOpen(false);
                        }}
                        className={`p-3 rounded-[16px] flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0a0a0a] text-white border-transparent shadow-sm"
                            : "bg-surface-alt hover:bg-surface-container text-ink border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[18px]">
                            {acc.type === "checking" ? "account_balance" : "savings"}
                          </span>
                          <span className="text-[13px] font-medium">{acc.name}</span>
                        </div>
                        <span className="text-[12px] font-mono opacity-80">
                          R$ {acc.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] bg-ink text-paper px-5 py-2.5 rounded-full text-[12px] shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
