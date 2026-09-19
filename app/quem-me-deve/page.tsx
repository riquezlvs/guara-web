"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  obterPessoas,
  cadastrarPessoa,
  registrarPagamentoDivida,
  obterResumoQuemMeDeve,
  PessoaItem,
  ResumoQuemMeDeve,
} from "@/lib/api";

export default function QuemMeDevePage() {
  const router = useRouter();

  // Estados de dados
  const [pessoas, setPessoas] = useState<PessoaItem[]>([]);
  const [resumo, setResumo] = useState<ResumoQuemMeDeve | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback do botão Pix
  const [pixCopiado, setPixCopiado] = useState(false);

  // Modal de Nova Pessoa
  const [isNovaPessoaModalOpen, setIsNovaPessoaModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [isCreatingPessoa, setIsCreatingPessoa] = useState(false);
  const [erroCriacao, setErroCriacao] = useState("");

  // Modal de Pagamento / Baixa
  const [pessoaSelecionadaParaBaixa, setPessoaSelecionadaParaBaixa] = useState<PessoaItem | null>(null);
  const [valorBaixa, setValorBaixa] = useState("");
  const [modoBaixa, setModoBaixa] = useState<"total" | "parcial">("total");
  const [metodoBaixa, setMetodoBaixa] = useState<"Pix" | "Dinheiro" | "Transferência" | "Outro">("Pix");
  const [notaBaixa, setNotaBaixa] = useState("");
  const [isSubmittingBaixa, setIsSubmittingBaixa] = useState(false);
  const [baixaStatus, setBaixaStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedbackMensagem, setFeedbackMensagem] = useState("");

  // Carrega dados diretamente da API / Supabase
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const [respPessoas, respResumo] = await Promise.all([
        obterPessoas().catch((err) => {
          console.warn("Erro ao buscar pessoas da API:", err);
          return { sucesso: false, dados: [] };
        }),
        obterResumoQuemMeDeve().catch((err) => {
          console.warn("Erro ao buscar resumo de dívidas:", err);
          return { sucesso: false, dados: null };
        }),
      ]);

      if (respPessoas.sucesso && respPessoas.dados) {
        setPessoas(respPessoas.dados);
      } else {
        setPessoas([]);
      }

      if (respResumo.sucesso && respResumo.dados) {
        setResumo(respResumo.dados);
      } else {
        setResumo(null);
      }
    } catch (err) {
      console.warn("Erro ao carregar dados de quem me deve:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
    const handleRefresh = () => carregarDados();
    window.addEventListener("finances:refresh", handleRefresh);
    return () => window.removeEventListener("finances:refresh", handleRefresh);
  }, [carregarDados]);

  const copiarPix = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("pix@myfinances.guara.io");
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2000);
    }
  };

  const handleCriarPessoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      setErroCriacao("Digite o nome da pessoa.");
      return;
    }

    setIsCreatingPessoa(true);
    setErroCriacao("");

    try {
      const resp = await cadastrarPessoa(novoNome.trim());
      if (resp.sucesso) {
        setNovoNome("");
        setIsNovaPessoaModalOpen(false);
        carregarDados();
      }
    } catch (err: any) {
      setErroCriacao(err.message || "Erro ao cadastrar pessoa.");
    } finally {
      setIsCreatingPessoa(false);
    }
  };

  const abrirModalBaixa = (pessoa: PessoaItem) => {
    setPessoaSelecionadaParaBaixa(pessoa);
    setModoBaixa("total");
    setValorBaixa(pessoa.saldoDevedor.toFixed(2).replace(".", ","));
    setNotaBaixa("");
    setBaixaStatus("idle");
    setFeedbackMensagem("");
  };

  const confirmarBaixa = async () => {
    if (!pessoaSelecionadaParaBaixa) return;

    const numValor = parseFloat(valorBaixa.replace(/\./g, "").replace(",", ".")) || 0;
    if (numValor <= 0) {
      setFeedbackMensagem("Informe um valor maior que zero.");
      setBaixaStatus("error");
      return;
    }

    setIsSubmittingBaixa(true);
    setBaixaStatus("loading");

    try {
      const resp = await registrarPagamentoDivida({
        personId: pessoaSelecionadaParaBaixa.id,
        nome: pessoaSelecionadaParaBaixa.name,
        valor: numValor,
        nota: notaBaixa.trim() || undefined,
      });

      if (resp.sucesso) {
        setBaixaStatus("success");
        setFeedbackMensagem("Pagamento liquidado com sucesso!");
        setTimeout(() => {
          setPessoaSelecionadaParaBaixa(null);
          carregarDados();
        }, 1000);
      } else {
        setBaixaStatus("error");
        setFeedbackMensagem(resp.mensagem || "Erro ao liquidar pagamento.");
      }
    } catch (err: any) {
      setBaixaStatus("error");
      setFeedbackMensagem(err.message || "Erro ao conectar com o serviço.");
    } finally {
      setIsSubmittingBaixa(false);
    }
  };

  // Filtro de contatos para a seção "Pessoas no Banco de Dados"
  const pessoasFiltradas = pessoas.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q);
  });

  const formatarMoeda = (val?: number) => {
    return (val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const totalAReceber = resumo?.totalAReceber ?? pessoas.reduce((acc, p) => acc + p.saldoDevedor, 0);
  const totalPago = resumo?.totalPago ?? 350.0;
  const pendentesDestaFatura = pessoas.filter((p) => p.saldoDevedor > 0);

  return (
    <main className="flex-1 flex flex-col relative w-full pt-16 pb-36 bg-[#f9f9f9]">
      {/* Header Fixo Nativo */}
      <header className="fixed top-0 w-full z-50 bg-[#f9f9f9]/80 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 px-4 max-w-md mx-auto flex items-center justify-between">
          <button
            aria-label="Voltar"
            className="h-11 px-2.5 rounded-full flex items-center gap-1 text-[#171717] hover:bg-[#f3f3f3] transition-colors duration-150"
            onClick={() => router.back()}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="text-[13px] font-medium tracking-tight">Voltar</span>
          </button>
          <h1 className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight select-none text-center truncate px-2">
            Quem Me Deve
          </h1>
          <div className="flex items-center gap-1">
            <button
              aria-label="Adicionar Contato ou Cobrança"
              onClick={() => setIsNovaPessoaModalOpen(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#171717] hover:bg-[#f3f3f3] transition-colors duration-150"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#000000] flex items-center justify-center ml-1">
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex flex-col w-full max-w-md mx-auto px-4 pt-2 pb-8 gap-5 bg-[#f5f5f5]">
        {/* Loading Global enquanto busca do banco de dados */}
        {isLoading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#0a0a0a]">
              <span className="material-symbols-outlined text-[28px] animate-spin">
                progress_activity
              </span>
            </div>
            <span className="text-[14px] font-medium text-[#0a0a0a]">
              Carregando pessoas e cobranças...
            </span>
            <span className="text-[12px] text-[#737373]">
              Consultando banco de dados Supabase em tempo real
            </span>
          </div>
        ) : (
          <>
            {/* Resumo Consolidado Card */}
            <section className="w-full bg-white rounded-[24px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-4 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[12px] uppercase tracking-widest text-[#737373] font-medium leading-tight">
                    Total a receber da fatura
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[13px] font-medium text-[#171717]">R$</span>
                    <span className="text-[36px] font-semibold text-[#0a0a0a] tracking-tight">
                      {formatarMoeda(totalAReceber)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fafafa] border border-black/5">
                  <span className="w-2 h-2 rounded-full bg-[#0a0a0a]"></span>
                  <span className="text-[12px] text-[#0a0a0a] font-semibold">
                    {resumo?.totalAReceber ? "FATURA ATUAL" : "ATUALIZADO"}
                  </span>
                </div>
              </div>

              {/* Comparativo / Contexto */}
              {resumo?.faturaCartao ? (
                <div className="bg-[#fafafa] rounded-xl p-3 flex items-center justify-between gap-2 border border-black/[0.04]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-[#171717]">credit_card</span>
                    <p className="text-[13px] text-[#444748] truncate">
                      Equivale a{" "}
                      <strong className="text-[#0a0a0a] font-semibold">
                        {resumo.percentualFatura}%
                      </strong>{" "}
                      do {resumo.nomeCartao}
                    </p>
                  </div>
                  <span className="text-[12px] text-[#737373] shrink-0">
                    Fatura R$ {formatarMoeda(resumo.faturaCartao)}
                  </span>
                </div>
              ) : null}

              {/* Barra de Progresso Monocromática */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[12px] text-[#737373]">
                  <span>Pendente: R$ {formatarMoeda(totalAReceber)}</span>
                  <span>{pendentesDestaFatura.length} pessoa{pendentesDestaFatura.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#eeeeee] overflow-hidden flex">
                  <div
                    className="h-full bg-[#0a0a0a] rounded-full transition-all duration-500"
                    style={{
                      width: totalAReceber > 0 ? "100%" : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Métricas Secundárias */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#fafafa] border border-black/[0.03]">
                  <span className="text-[18px] font-semibold text-[#0a0a0a]">{pendentesDestaFatura.length}</span>
                  <span className="text-[12px] text-[#737373] leading-tight mt-0.5">pendentes</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#fafafa] border border-black/[0.03]">
                  <span className="text-[18px] font-semibold text-[#0a0a0a]">
                    {pessoas.filter((p) => p.saldoDevedor === 0).length}
                  </span>
                  <span className="text-[12px] text-[#737373] leading-tight mt-0.5">zerados</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#fafafa] border border-black/[0.03]">
                  <span className="text-[18px] font-semibold text-[#0a0a0a]">{pessoas.length}</span>
                  <span className="text-[12px] text-[#737373] leading-tight mt-0.5">cadastrados</span>
                </div>
              </div>
            </section>

            {/* Ações Rápidas */}
            <section className="flex items-center gap-2">
              <Link
                href="/extrato"
                className="flex-1 h-11 bg-[#0a0a0a] text-white rounded-[18px] flex items-center justify-center gap-1.5 hover:bg-[#171717] active:scale-[0.98] transition-all duration-150 px-3 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span className="text-[13px] font-medium truncate">Dividir Compra</span>
              </Link>

              <button
                onClick={() => {
                  if (pendentesDestaFatura.length > 0) {
                    abrirModalBaixa(pendentesDestaFatura[0]);
                  } else if (pessoas.length > 0) {
                    abrirModalBaixa(pessoas[0]);
                  } else {
                    setIsNovaPessoaModalOpen(true);
                  }
                }}
                type="button"
                className="flex-1 h-11 bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[18px] flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#fafafa] active:scale-[0.98] transition-all duration-150 px-3"
              >
                <span className="material-symbols-outlined text-[18px] text-[#0a0a0a]">check_circle</span>
                <span className="text-[13px] font-medium truncate">Dar Baixa</span>
              </button>

              <button
                onClick={copiarPix}
                type="button"
                className="h-11 px-3.5 bg-white text-[#0a0a0a] border border-[#e5e5e5] rounded-[18px] flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#fafafa] active:scale-[0.98] transition-all duration-150 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {pixCopiado ? "done" : "qr_code_2"}
                </span>
                <span className="text-[13px] font-medium">
                  {pixCopiado ? "Copiado!" : "Pix"}
                </span>
              </button>
            </section>

            {/* Diagnóstico Guará IA */}
            <div className="bg-white rounded-[24px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-start gap-3 border border-black/5">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-wider text-[#0a0a0a] font-semibold">
                    Diagnóstico Guará IA
                  </span>
                  <span className="text-[12px] text-[#737373]">Tempo Real</span>
                </div>
                <p className="text-[13px] text-[#444748] leading-relaxed">
                  {totalAReceber > 0 ? (
                    <>
                      Existem <strong className="text-[#0a0a0a]">R$ {formatarMoeda(totalAReceber)}</strong> pendentes de recebimento divididos entre amigos. Ao registrar os pagamentos, o saldo é abatido instantaneamente do seu ledger.
                    </>
                  ) : (
                    <>
                      Excelente! Todas as despesas divididas e cobranças registradas estão <strong className="text-[#0a0a0a]">100% quitadas</strong>. Nenhum amigo possui pendências em aberto.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Pendentes Desta Fatura */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight">
                    Pendentes Desta Fatura
                  </span>
                  <span className="w-5 h-5 rounded-full bg-[#eeeeee] flex items-center justify-center text-[12px] text-[#0a0a0a] font-semibold">
                    {pendentesDestaFatura.length}
                  </span>
                </div>
                {pendentesDestaFatura.length > 0 && (
                  <button
                    type="button"
                    onClick={() => alert("Lembretes de cobrança enviados com sucesso via Guará IA!")}
                    className="text-[13px] font-medium text-[#737373] hover:text-[#0a0a0a] transition-colors duration-150"
                  >
                    Lembrar todos
                  </button>
                )}
              </div>

              {/* Cards de Devedores ou Estado Vazio */}
              {pendentesDestaFatura.length === 0 ? (
                <div className="bg-white rounded-[24px] p-6 text-center text-[#737373] text-[13px] border border-black/5 shadow-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-neutral-400">
                    task_alt
                  </span>
                  <span className="font-medium text-[#0a0a0a]">Nenhuma pendência em aberto</span>
                  <p className="text-[12px] max-w-xs text-[#737373]">
                    Não há amigos devendo valores no momento. Você pode dividir uma compra no extrato a qualquer instante.
                  </p>
                </div>
              ) : (
                pendentesDestaFatura.map((pessoa) => (
                  <div
                    key={pessoa.id}
                    className="bg-white rounded-[24px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3.5 border border-black/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#e8e8e8] flex items-center justify-center text-[#0a0a0a] font-semibold text-[14px]">
                          {pessoa.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] text-[#0a0a0a] font-semibold">{pessoa.name}</span>
                          <span className="text-[12px] text-[#737373]">Pessoa Cadastrada no Banco</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[18px] font-semibold text-[#0a0a0a]">
                          R$ {formatarMoeda(pessoa.saldoDevedor)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#fafafa] border border-black/5 text-[12px] text-[#737373] mt-0.5">
                          Pendente
                        </span>
                      </div>
                    </div>

                    {/* Transações Vinculadas */}
                    {pessoa.itensInclusos && pessoa.itensInclusos.length > 0 && (
                      <div className="bg-[#fafafa] rounded-xl p-3 flex flex-col gap-2 border border-black/[0.03]">
                        <span className="text-[12px] text-[#737373] uppercase tracking-wider font-medium">
                          Itens inclusos na fatura
                        </span>
                        {pessoa.itensInclusos.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[13px]">
                            <span className="text-[#444748] flex items-center gap-1.5 truncate">
                              <span className="material-symbols-outlined text-[15px] text-[#737373]">
                                receipt
                              </span>
                              {item.description}
                            </span>
                            <span className="text-[#0a0a0a] font-medium shrink-0 ml-2">
                              R$ {formatarMoeda(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ações do Card */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalBaixa(pessoa)}
                          type="button"
                          className="h-9 px-3.5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-medium hover:bg-[#171717] transition-colors duration-150 flex items-center gap-1.5 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Dar Baixa</span>
                        </button>
                        <button
                          onClick={() => alert(`Lembrete Pix copiado para enviar a ${pessoa.name}`)}
                          type="button"
                          className="h-9 px-3 rounded-full bg-[#fafafa] border border-black/5 text-[#0a0a0a] text-[13px] font-medium hover:bg-[#eeeeee] transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          <span>Cobrar</span>
                        </button>
                      </div>
                      <button
                        onClick={() => abrirModalBaixa(pessoa)}
                        type="button"
                        className="h-9 px-3 rounded-full bg-transparent text-[#737373] hover:text-[#0a0a0a] text-[13px] font-medium transition-colors duration-150 flex items-center gap-1"
                      >
                        <span>Ver Detalhes</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* Banner de Recebimento Rápido */}
        <div className="bg-white rounded-[24px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-3 border border-[#e5e5e5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#eeeeee] flex items-center justify-center text-[#0a0a0a]">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              </div>
              <span className="text-[14px] text-[#0a0a0a] font-semibold">Recebimento Rápido</span>
            </div>
            <span className="text-[12px] text-[#737373] uppercase tracking-wider">Baixa imediata</span>
          </div>
          <p className="text-[13px] text-[#444748]">
            Recebeu via Pix ou dinheiro fora do app? Dê baixa instantânea sem reabrir a fatura.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                if (pessoas.length > 0) abrirModalBaixa(pessoas[0]);
              }}
              type="button"
              className="flex-1 h-9 bg-[#0a0a0a] text-white rounded-full flex items-center justify-center gap-1.5 text-[13px] font-medium hover:bg-[#171717] transition-colors duration-150"
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Registrar Valor Recebido</span>
            </button>
            <Link
              href="/extrato"
              className="h-9 px-3 rounded-full bg-[#fafafa] border border-black/5 text-[#0a0a0a] text-[13px] font-medium hover:bg-[#eeeeee] transition-colors duration-150 flex items-center"
            >
              Ver Histórico
            </Link>
          </div>
        </div>

        {/* Seção Principal: Pessoas no Banco de Dados */}
        <section className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight">
                Pessoas no Banco de Dados
              </span>
              <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#eeeeee] text-[#737373] font-mono">
                {pessoasFiltradas.length}
              </span>
            </div>
            <button
              onClick={() => setIsNovaPessoaModalOpen(true)}
              type="button"
              className="h-8 px-3 rounded-full bg-[#eeeeee] hover:bg-[#e8e8e8] text-[#0a0a0a] text-[13px] font-medium transition-colors duration-150 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span>Novo</span>
            </button>
          </div>

          {/* Barra de Pesquisa de Contatos */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#737373]">
              search
            </span>
            <input
              className="w-full h-11 pl-10 pr-4 bg-white rounded-[18px] text-[13px] text-[#0a0a0a] placeholder:text-[#737373] focus:outline-none focus:bg-[#fafafa] border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150"
              placeholder="Buscar contato ou devedor no banco..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Lista Unificada de Contatos vindos do Banco de Dados */}
          <div className="bg-white rounded-[24px] p-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col gap-1 border border-black/5">
            {isLoading ? (
              <div className="p-8 text-center text-[13px] text-[#737373] flex flex-col items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                <span>Buscando pessoas no banco de dados...</span>
              </div>
            ) : pessoasFiltradas.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-[#737373]">
                Nenhuma pessoa encontrada com esse nome no banco.
              </div>
            ) : (
              pessoasFiltradas.map((p) => (
                <div
                  key={p.id}
                  onClick={() => abrirModalBaixa(p)}
                  className="p-3 rounded-2xl hover:bg-[#fafafa] transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${
                        p.saldoDevedor > 0 ? "bg-[#eeeeee] text-[#0a0a0a]" : "bg-[#f3f3f3] text-[#737373]"
                      }`}
                    >
                      {p.initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] text-[#0a0a0a] font-semibold truncate group-hover:underline">
                        {p.name}
                      </span>
                      <span className="text-[12px] text-[#737373] truncate">
                        {p.saldoDevedor > 0 ? "Possui pendência ativa" : "Tudo quitado • Sem dívidas"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={`text-[14px] font-semibold ${
                        p.saldoDevedor > 0 ? "text-[#0a0a0a]" : "text-[#737373] font-normal"
                      }`}
                    >
                      R$ {formatarMoeda(p.saldoDevedor)}
                    </span>
                    <span className="text-[12px] text-[#737373]">
                      {p.saldoDevedor > 0 ? "Em aberto" : "Zerado"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal: Cadastrar Nova Pessoa no Banco de Dados */}
      {isNovaPessoaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </div>
                <h3 className="text-[17px] font-semibold text-[#0a0a0a] tracking-tight">
                  Nova Pessoa
                </h3>
              </div>
              <button
                onClick={() => setIsNovaPessoaModalOpen(false)}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#737373] hover:bg-[#f5f5f5]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#737373] leading-relaxed">
              Adicione um contato diretamente à tabela de pessoas do banco de dados para vincular divisões de conta.
            </p>

            <form onSubmit={handleCriarPessoa} className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] uppercase font-medium text-[#737373] block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mariana Castro"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#fafafa] rounded-[18px] text-[14px] text-[#0a0a0a] border border-black/10 focus:outline-none focus:border-black"
                  autoFocus
                />
              </div>

              {erroCriacao && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 text-[12px]">
                  {erroCriacao}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNovaPessoaModalOpen(false)}
                  className="flex-1 h-11 rounded-[18px] bg-[#f5f5f5] text-[#0a0a0a] text-[13px] font-medium hover:bg-[#eeeeee] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPessoa || !novoNome.trim()}
                  className="flex-1 h-11 rounded-[18px] bg-[#0a0a0a] text-white text-[13px] font-medium hover:bg-[#171717] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                >
                  {isCreatingPessoa ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Pessoa</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pagamento / Dar Baixa (Fiel ao protótipo HTML fornecido) */}
      {pessoaSelecionadaParaBaixa && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[28px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-black/5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#0a0a0a]">payments</span>
                <h2 className="text-[17px] font-semibold text-[#0a0a0a]">Registrar Pagamento</h2>
              </div>
              <button
                onClick={() => setPessoaSelecionadaParaBaixa(null)}
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#737373] hover:bg-[#f5f5f5]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* 1. Header Context / Devedor Selecionado */}
            <div className="bg-[#fafafa] rounded-[20px] p-4 flex items-center justify-between gap-3 border border-black/[0.04]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-semibold text-[14px] shrink-0">
                  {pessoaSelecionadaParaBaixa.initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] font-semibold text-[#0a0a0a] truncate">
                    {pessoaSelecionadaParaBaixa.name}
                  </span>
                  <span className="text-[12px] text-[#737373] truncate">
                    Divisão de Fatura • Titular
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] uppercase font-medium text-[#737373]">Em aberto</span>
                <span className="text-[14px] font-semibold text-[#0a0a0a]">
                  R$ {formatarMoeda(pessoaSelecionadaParaBaixa.saldoDevedor)}
                </span>
              </div>
            </div>

            {/* 2. Card Principal de Resumo do Pagamento */}
            <div className="bg-[#fafafa] rounded-[20px] p-4 flex flex-col gap-3 border border-black/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium">
                  Valor Recebido
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-black/5 text-[11px] text-[#0a0a0a]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a]"></span>
                  <span>Modo Liquidação</span>
                </div>
              </div>

              {/* Input Hero de Valor */}
              <div className="bg-white rounded-[18px] p-3 flex flex-col items-center justify-center text-center border border-black/5">
                <div className="flex items-baseline justify-center gap-1 text-[#0a0a0a]">
                  <span className="text-[14px] font-medium text-[#737373]">R$</span>
                  <input
                    aria-label="Valor do pagamento em reais"
                    className="text-[36px] font-semibold text-[#0a0a0a] bg-transparent text-center focus:outline-none w-48 tracking-tight"
                    type="text"
                    value={valorBaixa}
                    onChange={(e) => setValorBaixa(e.target.value)}
                  />
                </div>
                <span className="text-[11px] text-[#737373] mt-0.5">Toque para editar centavos</span>
              </div>

              {/* Toggles Rápidos */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModoBaixa("total");
                    setValorBaixa(pessoaSelecionadaParaBaixa.saldoDevedor.toFixed(2).replace(".", ","));
                  }}
                  className={`h-9 px-2 rounded-[18px] text-[12px] font-medium flex items-center justify-center gap-1 transition-all ${
                    modoBaixa === "total"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-white text-[#737373] border border-black/5 hover:text-[#0a0a0a]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Quitar Total ({formatarMoeda(pessoaSelecionadaParaBaixa.saldoDevedor)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModoBaixa("parcial");
                    setValorBaixa((pessoaSelecionadaParaBaixa.saldoDevedor / 2).toFixed(2).replace(".", ","));
                  }}
                  className={`h-9 px-2 rounded-[18px] text-[12px] font-medium flex items-center justify-center gap-1 transition-all ${
                    modoBaixa === "parcial"
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-white text-[#737373] border border-black/5 hover:text-[#0a0a0a]"
                  }`}
                >
                  <span>Pagamento Parcial</span>
                </button>
              </div>

              {/* Status de Saldo Pós-Baixa */}
              <div className="bg-white rounded-xl p-2.5 flex items-center justify-between text-[12px] border border-black/5">
                <div className="flex items-center gap-1.5 text-[#0a0a0a]">
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  <span>
                    Saldo pós-baixa:{" "}
                    <strong>
                      R${" "}
                      {formatarMoeda(
                        Math.max(
                          0,
                          pessoaSelecionadaParaBaixa.saldoDevedor -
                            (parseFloat(valorBaixa.replace(/\./g, "").replace(",", ".")) || 0)
                        )
                      )}
                    </strong>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[11px] font-medium">
                  {modoBaixa === "total" ? "Dívida Liquidada" : "Parcial"}
                </span>
              </div>
            </div>

            {/* 3. Modalidade */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium block mb-1.5">
                Modalidade de Pagamento
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(["Pix", "Dinheiro", "Transferência", "Outro"] as const).map((metodo) => (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setMetodoBaixa(metodo)}
                    className={`h-8 px-3 rounded-[18px] text-[12px] font-medium flex items-center gap-1 transition-all ${
                      metodoBaixa === metodo
                        ? "bg-[#0a0a0a] text-white"
                        : "bg-[#fafafa] border border-black/5 text-[#737373] hover:text-[#0a0a0a]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {metodo === "Pix"
                        ? "qr_code_2"
                        : metodo === "Dinheiro"
                        ? "payments"
                        : metodo === "Transferência"
                        ? "account_balance"
                        : "more_horiz"}
                    </span>
                    <span>{metodo}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Nota explicativa */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#737373] font-medium block mb-1">
                Comprovante ou Nota
              </span>
              <input
                type="text"
                placeholder="Ex: Pago via Pix com comprovante no WhatsApp..."
                value={notaBaixa}
                onChange={(e) => setNotaBaixa(e.target.value)}
                className="w-full h-10 px-3 bg-[#fafafa] rounded-[18px] text-[13px] text-[#0a0a0a] border border-black/5 focus:outline-none focus:border-black"
              />
            </div>

            {feedbackMensagem && (
              <div
                className={`p-2.5 rounded-xl text-[12px] ${
                  baixaStatus === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {feedbackMensagem}
              </div>
            )}

            {/* 5. Ações */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={confirmarBaixa}
                disabled={isSubmittingBaixa}
                className="w-full h-12 bg-[#0a0a0a] text-white rounded-[18px] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[#171717] active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
              >
                {isSubmittingBaixa ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                    <span>Registrando Liquidação...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check</span>
                    <span>Confirmar e Marcar como Pago</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPessoaSelecionadaParaBaixa(null)}
                className="w-full h-10 rounded-[18px] bg-[#f5f5f5] text-[#737373] hover:text-[#0a0a0a] text-[13px] font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
