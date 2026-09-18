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
