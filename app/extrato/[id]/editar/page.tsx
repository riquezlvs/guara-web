"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditarLancamentoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  // Form states initialized with transaction details
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("45,00");
  const [merchant, setMerchant] = useState("Restaurante da Esquina");
  const [txDate, setTxDate] = useState("24/10/2024");
  const [txTime, setTxTime] = useState("13:24:18");
  const [notes, setNotes] = useState(
    "Almoço de equipe após reunião de alinhamento trimestral com time de produto."
  );
  const [tags, setTags] = useState<string[]>(["#Almoço", "#Trabalho", "#Reembolsável"]);
  const [ignoreStats, setIgnoreStats] = useState(false);
  const [reimbursable, setReimbursable] = useState(true);

  // Modal / Confirm delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("Alterações salvas com sucesso!");
      setTimeout(() => {
        router.back();
      }, 500);
    }, 400);
  };

  const handleDeleteConfirmed = () => {
    setShowDeleteModal(false);
    showToast("Lançamento excluído com sucesso!");
    setTimeout(() => {
      router.push("/extrato");
    }, 600);
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

  return (
    <div className="bg-canvas font-sans text-body-md text-on-surface antialiased flex flex-col min-h-screen">
      {/* Top Fixed Header */}
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
          <div className="flex items-center justify-end gap-2">
            <button
              aria-label="Salvar lançamento"
              className="h-11 px-3 flex items-center gap-1.5 text-paper bg-ink-soft hover:bg-ink active:scale-[0.98] transition-all rounded-full shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1)]"
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
              <span className="text-[13px] font-medium">
                {isSaving ? "Salvando..." : "Salvar"}
              </span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 ml-1">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
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
                <span className="text-[12px] text-mid-gray">ID #TX-89240</span>
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
                  Razão Social: Alimentação &amp; Gastronomia Urbana Ltda. (CNPJ 48.910.112/0001-44)
                </span>
              </div>

              {/* Categoria Picker Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Categoria
                </span>
                <button
                  aria-label="Alterar categoria de Alimentação e Restaurante"
                  className="w-full p-3 bg-canvas hover:bg-surface-container active:scale-[0.99] rounded-[18px] flex items-center justify-between gap-2 transition-all text-left"
                  type="button"
                  onClick={() => showToast("Categoria classificada por IA")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-ink text-[18px]">restaurant</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] text-ink font-medium truncate">
                          Alimentação &amp; Restaurante
                        </span>
                        <span className="px-2 py-0.5 rounded-[18px] bg-paper text-ink text-[10px] uppercase shadow-sm shrink-0 font-medium">
                          IA 99% Confiança
                        </span>
                      </div>
                      <span className="text-[12px] text-mid-gray">Subcategoria: Almoço / Refeição Diária</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mid-gray text-[20px] shrink-0">
                    chevron_right
                  </span>
                </button>
              </div>

              {/* Conta de Origem Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Conta de Origem / Pagamento
                </span>
                <button
                  aria-label="Selecionar conta de débito Nubank"
                  className="w-full p-3 bg-canvas hover:bg-surface-container active:scale-[0.99] rounded-[18px] flex items-center justify-between gap-2 transition-all text-left"
                  type="button"
                  onClick={() => showToast("Conta sincronizada via Open Finance")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-ink text-[18px]">credit_card</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] text-ink font-medium truncate">
                        Nubank CC (Débito) • Final 4091
                      </span>
                      <span className="text-[12px] text-mid-gray">Saldo disponível: R$ 4.250,00</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mid-gray text-[20px] shrink-0">
                    chevron_right
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

              {/* Tags Collection */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] uppercase text-mid-gray tracking-wider font-medium">
                  Tags Vinculadas
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="h-7 px-2.5 rounded-[18px] bg-canvas flex items-center gap-1 text-[13px] text-ink group hover:bg-surface-container transition-colors"
                    >
                      <span>{t}</span>
                      <button
                        aria-label={`Remover tag ${t}`}
                        className="text-mid-gray hover:text-ink flex items-center"
                        onClick={() => removeTag(t)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                  <button
                    className="h-7 px-2.5 rounded-[18px] bg-canvas hover:bg-surface-container text-mid-gray hover:text-ink flex items-center gap-1 text-[13px] transition-colors"
                    onClick={addTag}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Nova Tag</span>
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
                    <div className="w-8 h-8 rounded-[10px] bg-paper flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-ink text-[18px]">description</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-medium text-ink truncate">
                        NFC-e 3819 anexada (PDF)
                      </span>
                      <span className="text-[12px] text-mid-gray">420 KB • Validado via SEFAZ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="h-7 px-2.5 rounded-[18px] bg-paper hover:bg-surface-container text-ink text-[13px] shadow-sm transition-colors font-medium"
                      type="button"
                      onClick={() => showToast("Upload de novo comprovante")}
                    >
                      Substituir
                    </button>
                    <button
                      aria-label="Remover anexo fiscal"
                      className="w-7 h-7 rounded-[18px] hover:bg-surface-container text-mid-gray hover:text-ink flex items-center justify-center transition-colors"
                      type="button"
                      onClick={() => showToast("Comprovante mantido")}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
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

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] bg-ink text-paper px-5 py-2.5 rounded-full text-[12px] shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
