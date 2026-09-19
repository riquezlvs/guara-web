export interface ChatResponse {
  sucesso: boolean;
  tipo: 'gasto' | 'entrada' | 'divida' | 'consulta' | 'resumo' | 'saldo' | 'comando' | 'mensagem';
  mensagem: string;
  dados?: Record<string, any>;
  avisos?: string[];
}

export interface DashboardResponse {
  sucesso: boolean;
  data: {
    resumo?: {
      meuGastoReal: number;
      gastosRecorrentes: number;
      quantidade: number;
      porMetodo?: Array<{ metodo: string; total: number }>;
      metas?: Array<{
        categoria: string;
        gastoAtual: number;
        limite: number;
        percentual: number;
        nivel: string;
      }>;
      safeSummary?: {
        safeToSpend: number;
        realBalance: number;
        openCreditInvoices: number;
        accountName: string;
      };
    };
    saldo?: {
      safeSummary?: {
        safeToSpend: number;
        realBalance: number;
        openCreditInvoices: number;
        accountName: string;
      };
      contas?: Array<{
        id: string;
        name: string;
        type: string;
        balance: number;
      }>;
    };
    recentes?: DashboardRecentItem[];
    patrimonio?: {
      totalNetWorth: number;
      liquidAssets: {
        total: number;
        accounts: Array<{ name: string; type: string; balance: number }>;
      };
      benefits: {
        total: number;
        accounts: Array<{ name: string; balance: number }>;
      };
      fixedIncome: {
        totalGross: number;
        totalNet: number;
        accounts: Array<{
          name: string;
          balance: number;
          cdiRate: number;
          estimatedNetBalance: number;
          accumulatedYield: number;
        }>;
      };
      variableIncome: {
        totalMarketValue: number;
        totalInvested: number;
        totalProfitLoss: number;
      };
      openCreditInvoices: {
        total: number;
        cards: Array<{ name: string; amount: number }>;
      };
    };
    poupanca?: Array<{
      id: string;
      nome: string;
      alvo: number;
      poupado: number;
      prazo: string | null;
      restante: number;
      mesesRestantes: number | null;
      valorMensal: number | null;
      concluida: boolean;
    }>;
    graficos?: {
      distribuicaoCategorias: Array<{
        categoria: string;
        total: number;
        percentual: number;
        cor: string;
      }>;
      totalCategorias: number;
      rotuloMesAtual: string;
      evolucao: {
        totalMesAtual: number;
        variacaoPercentual: number;
        seisMeses: Array<{ label: string; total: number; mesAno: string }>;
        trintaDias: Array<{ label: string; total: number; data: string }>;
        seteDias: Array<{ label: string; total: number; data: string }>;
      };
    };
  };
  mensagem?: string;
}

export interface DashboardRecentItem {
  display_id: number;
  description: string;
  total_amount: number;
  payment_method: string;
  occurred_at: string;
  entry_type?: 'expense' | 'income' | 'yield' | 'transfer';
  installment_number?: number | null;
  installment_total?: number | null;
  categories?: { name: string };
}

export interface TransactionDraft {
  originalInput: string;
  isAudio: boolean;
  audioDuration?: string;
  precision?: string;
  entryType: 'expense' | 'income';
  description: string;
  totalAmount: number;
  categoryId?: number;
  categoryName: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  cardName?: string | null;
  accountName: string;
  accountId?: string | null;
  accountBalance: number;
  occurredAt: string;
  location?: string | null;
  safeToSpend: {
    current: number;
    projected: number;
    impactPercentage: number;
    impactLabel: string;
    progressBarPercent: number;
  };
  availableCategories?: Array<{ id: number; name: string }>;
  availableAccounts?: Array<{ id: string; name: string; balance: number }>;
}

export interface PreviewResponse {
  sucesso: boolean;
  tipo: 'gasto' | 'entrada' | 'mensagem';
  mensagem: string;
  dados?: TransactionDraft;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Interpreta texto ou áudio via IA sem salvar no banco (para tela intermediária de confirmação)
 */
export async function interpretarTransacao(
  texto: string,
  isAudio?: boolean,
  audioDurationSeconds?: number
): Promise<PreviewResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: texto,
      isAudio: Boolean(isAudio),
      audioDurationSeconds,
    }),
  });

  if (!res.ok) {
    const erroData = await res.json().catch(() => ({}));
    throw new Error(erroData.mensagem || `Erro ao interpretar comando: ${res.status}`);
  }

  return res.json();
}

/**
 * Confirma e salva o lançamento validado/ajustado no Supabase
 */
export async function confirmarTransacao(
  draft: Partial<TransactionDraft> & { description: string; totalAmount: number; entryType: 'expense' | 'income' }
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entryType: draft.entryType,
      description: draft.description,
      totalAmount: draft.totalAmount,
      categoryId: draft.categoryId,
      paymentMethod: draft.paymentMethod,
      accountName: draft.accountName,
      occurredAt: draft.occurredAt,
      rawInput: draft.originalInput,
    }),
  });

  if (!res.ok) {
    const erroData = await res.json().catch(() => ({}));
    throw new Error(erroData.mensagem || `Erro ao confirmar transação: ${res.status}`);
  }

  return res.json();
}

/**
 * Envia uma mensagem em linguagem natural para o Core Engine do Guará IA
 */
export async function enviarMensagemChat(texto: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: texto }),
  });

  if (!res.ok) {
    const erroData = await res.json().catch(() => ({}));
    throw new Error(erroData.mensagem || `Erro na requisição HTTP: ${res.status}`);
  }

  return res.json();
}

/**
 * Obtém os dados consolidados do dashboard (saldo, safe-to-spend, resumo do mês e gastos recentes)
 */
export async function obterDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Erro ao obter dashboard: ${res.status}`);
  }

  return res.json();
}

export interface ItemExtrato {
  display_id: number;
  description: string;
  total_amount: number;
  occurred_at: string;
  payment_method: string;
  entry_type: 'expense' | 'income' | 'yield' | 'transfer';
  raw_input?: string;
  installment_number?: number | null;
  installment_total?: number | null;
  categories?: { id: number; name: string } | null;
  accounts?: { id: string; name: string; type: string } | null;
}

export interface ExtratoResponse {
  sucesso: boolean;
  dados: {
    mesAno: string;
    rotuloMes: string;
    totalEntradas: number;
    countEntradas: number;
    totalSaidas: number;
    countSaidas: number;
    liquidoNoMes: number;
    totalLancamentos: number;
    itens: ItemExtrato[];
  };
  mensagem?: string;
}

/**
 * Obtém o extrato completo com todas as transações, entradas e saídas reais do mês
 */
export async function obterExtrato(mesAno?: string): Promise<ExtratoResponse> {
  const query = mesAno ? `?mes=${mesAno}` : '';
  const res = await fetch(`${API_BASE_URL}/api/extrato${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Erro ao obter extrato: ${res.status}`);
  }

  return res.json();
}

export interface CartaoItem {
  id: string;
  name: string;
  closing_day: number;
  due_day?: number | null;
  card_type: string;
  is_default: boolean;
  credit_limit?: number;
  card_holder?: string | null;
  last_four_digits?: string | null;
  color_theme?: string;
  is_virtual?: boolean;
  faturaAtual: number;
  limiteDisponivel: number;
  percentualUtilizado: number;
  periodo: {
    inicio: string;
    fim: string;
    fechamento: string;
  };
  itensFatura: Array<{
    display_id: number;
    description: string;
    total_amount: number;
    occurred_at: string;
    installment_number?: number | null;
    installment_total?: number | null;
  }>;
}

export interface NovoCartaoInput {
  name: string;
  closing_day: number;
  due_day?: number;
  credit_limit?: number;
  card_type?: string;
  card_holder?: string;
  last_four_digits?: string;
  color_theme?: string;
  is_virtual?: boolean;
}

export interface CartoesResponse {
  sucesso: boolean;
  dados: CartaoItem[];
  mensagem?: string;
}

/**
 * Obtém todos os cartões cadastrados com faturas calculadas e despesas
 */
export async function obterCartoes(): Promise<CartoesResponse> {
  const res = await fetch(`${API_BASE_URL}/api/cards`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Erro ao obter cartões: ${res.status}`);
  }

  return res.json();
}

/**
 * Salva ou atualiza um cartão no backend
 */
export async function cadastrarCartao(dados: NovoCartaoInput): Promise<{ sucesso: boolean; dados: any; mensagem: string }> {
  const res = await fetch(`${API_BASE_URL}/api/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.mensagem || `Erro ao cadastrar cartão: ${res.status}`);
  }

  return res.json();
}

