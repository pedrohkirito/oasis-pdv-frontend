import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { format, addMonths, addDays, differenceInDays } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContaPagar {
  id: string;
  company_id: string;
  descricao: string;
  valor: number;
  original_amount?: number;
  interest_amount?: number;
  penalty_amount?: number;
  discount_amount?: number;
  paid_amount?: number;
  due_on: string;
  paid_on?: string;
  settled_on?: string;
  status: string;
  categoria?: string;
  supplier_name?: string;
  supplier_id?: string;
  bank_account_id?: string;
  payment_form?: string;
  receipt_url?: string;
  document_number?: string;
  cost_center?: string;
  recorrente?: boolean;
  recurrence_kind?: string;
  recurrence_end_on?: string;
  installment_number?: number;
  installment_count?: number;
  parent_account_id?: string;
  approved_by?: string;
  approved_at?: string;
  historico?: HistoricoItem[];
  created_at?: string;
  updated_at?: string;
}

export interface HistoricoItem {
  acao: string;
  data: string;
  paid_amount?: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  forma?: string;
  data_efetiva?: string;
  observacao?: string;
}

export interface PagamentoDetalhes {
  dataPagamentoEfetivo: string;
  valorJuros?: number;
  valorMulta?: number;
  valorDesconto?: number;
  formaPagamento?: string;
  contaBancariaId?: string;
  comprovante?: string;
}

export interface FiltrosContas {
  status?: string[];
  categoria?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
  campoData?: 'due_on' | 'settled_on';
  centroCusto?: string;
  contaBancariaId?: string;
}

export interface AgingResult {
  aVencer: ContaPagar[];
  venceHoje: ContaPagar[];
  vencido1a7: ContaPagar[];
  vencido8a30: ContaPagar[];
  vencido31a60: ContaPagar[];
  vencidoMais60: ContaPagar[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContasPagar() {
  const { companyId } = useEmpresa();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Busca principal ──────────────────────────────────────────────────────

  const buscarContas = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await api
      .from('payable')
      .select('*')
      .eq('company_id', companyId)
      .order('due_on', { ascending: true });

    if (!error) setContas((data || []) as unknown as ContaPagar[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (companyId) buscarContas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // ── 1. Registrar pagamento com todos os detalhes ─────────────────────────

  const registrarPagamento = async (
    id: string,
    dados: PagamentoDetalhes
  ): Promise<{ error: unknown; valorPago?: number }> => {
    const conta = contas.find(c => c.id === id);
    if (!conta) return { error: 'Conta não encontrada' };

    const valorOriginal = conta.original_amount ?? conta.valor;
    const juros    = dados.valorJuros    ?? 0;
    const multa    = dados.valorMulta    ?? 0;
    const desconto = dados.valorDesconto ?? 0;
    const valorPago = valorOriginal + juros + multa - desconto;

    const novoHistorico: HistoricoItem[] = [
      ...((conta.historico as HistoricoItem[]) || []),
      {
        acao: 'pagamento_registrado',
        data: new Date().toISOString(),
        paid_amount: valorPago,
        juros,
        multa,
        desconto,
        forma: dados.formaPagamento,
        data_efetiva: dados.dataPagamentoEfetivo,
      },
    ];

    const { error } = await api
      .from('payable')
      .update({
        status: 'pago',
        original_amount: valorOriginal,
        interest_amount: juros,
        penalty_amount: multa,
        discount_amount: desconto,
        paid_amount: valorPago,
        settled_on: dados.dataPagamentoEfetivo,
        paid_on: dados.dataPagamentoEfetivo,
        payment_form: dados.formaPagamento,
        bank_account_id: dados.contaBancariaId ?? null,
        receipt_url: dados.comprovante ?? null,
        historico: novoHistorico as unknown as never,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) buscarContas();
    return { error, valorPago };
  };

  // ── 2. Criar conta parcelada ─────────────────────────────────────────────

  const criarContaParcelada = async (
    dadosBase: Omit<ContaPagar, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    numeroParcelas: number,
    periodicidade: 'semanal' | 'quinzenal' | 'mensal'
  ): Promise<{ error: unknown }> => {
    if (!companyId) return { error: 'Empresa não definida' };

    const parcelas: Partial<ContaPagar>[] = [];
    let dataVencimento = new Date(dadosBase.due_on + 'T00:00:00');
    const valorParcela = dadosBase.valor / numeroParcelas;

    for (let i = 1; i <= numeroParcelas; i++) {
      parcelas.push({
        ...dadosBase,
        company_id: companyId,
        descricao: `${dadosBase.descricao} (${i}/${numeroParcelas})`,
        valor: valorParcela,
        original_amount: valorParcela,
        due_on: format(dataVencimento, 'yyyy-MM-dd'),
        installment_number: i,
        installment_count: numeroParcelas,
        status: 'pendente',
        historico: [],
      });

      switch (periodicidade) {
        case 'mensal':    dataVencimento = addMonths(dataVencimento, 1); break;
        case 'quinzenal': dataVencimento = addDays(dataVencimento, 15);  break;
        case 'semanal':   dataVencimento = addDays(dataVencimento, 7);   break;
      }
    }

    const { error } = await api
      .from('payable')
      .insert(parcelas as never[]);

    if (!error) buscarContas();
    return { error };
  };

  // ── 3. Buscar com filtros avançados ──────────────────────────────────────

  const buscarContasFiltradas = async (
    filtros: FiltrosContas
  ): Promise<{ data: ContaPagar[]; error: unknown }> => {
    if (!companyId) return { data: [], error: 'Empresa não definida' };

    let query = (api as ReturnType<typeof api.from>)
      .from('payable')
      .select('*, contas_bancarias(name, banco)')
      .eq('company_id', companyId) as ReturnType<typeof api.from>;

    // workaround: use any for dynamic chaining
    let q: any = api
      .from('payable')
      .select('*, contas_bancarias(name, banco)')
      .eq('company_id', companyId);

    if (filtros.status?.length) {
      q = q.in('status', filtros.status);
    }
    if (filtros.categoria) {
      q = q.eq('category', filtros.categoria);
    }
    if (filtros.dataInicio && filtros.campoData) {
      q = q.gte(filtros.campoData, filtros.dataInicio);
    }
    if (filtros.dataFim && filtros.campoData) {
      q = q.lte(filtros.campoData, filtros.dataFim);
    }
    if (filtros.contaBancariaId) {
      q = q.eq('bank_account_id', filtros.contaBancariaId);
    }
    if (filtros.centroCusto) {
      q = q.eq('cost_center', filtros.centroCusto);
    }
    if (filtros.fornecedor) {
      q = q.ilike('supplier_name', `%${filtros.fornecedor}%`);
    }

    q = q.order('due_on', { ascending: true });

    const { data, error } = await q;
    return { data: (data || []) as ContaPagar[], error };
  };

  // ── 4. Calcular juros automático ─────────────────────────────────────────

  const calcularJurosAutomatico = (
    conta: ContaPagar,
    dataPagamento: string
  ): { juros: number; multa: number; diasAtraso: number } => {
    const vencimento  = new Date(conta.due_on + 'T00:00:00');
    const pagamento   = new Date(dataPagamento          + 'T00:00:00');
    const diasAtraso  = Math.max(0, differenceInDays(pagamento, vencimento));

    if (diasAtraso === 0) return { juros: 0, multa: 0, diasAtraso: 0 };

    const valorBase = conta.original_amount ?? conta.valor;

    // Multa: 2% uma vez (padrão legal brasileiro)
    const multa = valorBase * 0.02;

    // Juros: 1% ao mês = 0,033% ao dia
    const juros = valorBase * 0.01 * (diasAtraso / 30);

    return {
      juros: parseFloat(juros.toFixed(2)),
      multa: parseFloat(multa.toFixed(2)),
      diasAtraso,
    };
  };

  // ── 5. Relatório de aging ─────────────────────────────────────────────────

  const calcularAging = (lista: ContaPagar[]): AgingResult => {
    const hoje       = new Date();
    const hojeStr    = format(hoje, 'yyyy-MM-dd');

    return {
      aVencer: lista.filter(c =>
        c.status === 'pendente' &&
        c.due_on > hojeStr
      ),
      venceHoje: lista.filter(c =>
        c.status === 'pendente' &&
        c.due_on === hojeStr
      ),
      vencido1a7: lista.filter(c => {
        const dias = differenceInDays(hoje, new Date(c.due_on + 'T00:00:00'));
        return c.status !== 'pago' && dias >= 1 && dias <= 7;
      }),
      vencido8a30: lista.filter(c => {
        const dias = differenceInDays(hoje, new Date(c.due_on + 'T00:00:00'));
        return c.status !== 'pago' && dias >= 8 && dias <= 30;
      }),
      vencido31a60: lista.filter(c => {
        const dias = differenceInDays(hoje, new Date(c.due_on + 'T00:00:00'));
        return c.status !== 'pago' && dias >= 31 && dias <= 60;
      }),
      vencidoMais60: lista.filter(c => {
        const dias = differenceInDays(hoje, new Date(c.due_on + 'T00:00:00'));
        return c.status !== 'pago' && dias > 60;
      }),
    };
  };

  // ─────────────────────────────────────────────────────────────────────────

  return {
    // estado
    contas,
    loading,
    // busca
    buscarContas,
    buscarContasFiltradas,
    // ações
    registrarPagamento,
    criarContaParcelada,
    // utilitários
    calcularJurosAutomatico,
    calcularAging,
  };
}
