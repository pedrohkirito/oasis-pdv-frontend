import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';

export interface ContaReceber {
  id: string;
  company_id: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  descricao: string;
  valor: number;
  valor_recebido: number;
  status: 'pendente' | 'recebido_parcial' | 'recebido' | 'vencido' | 'cancelado';
  categoria: string | null;
  venda_id: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  forma_recebimento: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'transferencia' | null;
  data_vencimento: string;
  data_recebimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { name: string; telefone: string | null } | null;
}

export function useContasReceber() {
  const { companyId } = useEmpresa();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);

  const atualizarVencidas = useCallback(async () => {
    if (!companyId) return;
    const hoje = new Date().toISOString().split('T')[0];
    await (api as any)
      .from('receivable')
      .update({ status: 'vencido' })
      .eq('company_id', companyId)
      .eq('status', 'pendente')
      .lt('due_on', hoje);
  }, [companyId]);

  const buscarContas = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await (api as any)
      .from('receivable')
      .select('*, clientes(name, telefone)')
      .eq('company_id', companyId)
      .order('due_on', { ascending: true });
    setContas((data as ContaReceber[]) || []);
    setLoading(false);
  }, [companyId]);

  const criarConta = async (conta: Partial<ContaReceber>) => {
    const { data, error } = await (api as any)
      .from('receivable')
      .insert({ ...conta, company_id: companyId })
      .select()
      .single();
    if (!error) buscarContas();
    return { data, error };
  };

  const editarConta = async (id: string, updates: Partial<ContaReceber>) => {
    const { error } = await (api as any)
      .from('receivable')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) buscarContas();
    return { error };
  };

  const receberConta = async (
    id: string,
    valorRecebido: number,
    formaRecebimento: ContaReceber['forma_recebimento'],
    dataRecebimento: string
  ) => {
    const conta = contas.find(c => c.id === id);
    if (!conta) return { error: new Error('Conta não encontrada') };

    const novoRecebido = Number(conta.valor_recebido || 0) + valorRecebido;
    const status: ContaReceber['status'] =
      novoRecebido >= Number(conta.valor) ? 'recebido' : 'recebido_parcial';

    const { error } = await (api as any)
      .from('receivable')
      .update({
        valor_recebido: novoRecebido,
        status,
        forma_recebimento: formaRecebimento,
        data_recebimento: status === 'recebido' ? dataRecebimento : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (!error) buscarContas();
    return { error };
  };

  const cancelarConta = async (id: string) => {
    await (api as any)
      .from('receivable')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', id);
    buscarContas();
  };

  const excluirConta = async (id: string) => {
    await (api as any).from('receivable').delete().eq('id', id);
    buscarContas();
  };

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      atualizarVencidas().then(() => buscarContas());
    } else {
      setLoading(false);
    }
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    contas,
    loading,
    criarConta,
    editarConta,
    receberConta,
    cancelarConta,
    excluirConta,
    buscarContas,
  };
}
