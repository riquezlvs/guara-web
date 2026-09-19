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
    recentes?: Array<{
      display_id: number;
      description: string;
      total_amount: number;
      payment_method: string;
      occurred_at: string;
      categories?: { name: string };
    }>;
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
  };
  mensagem?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
