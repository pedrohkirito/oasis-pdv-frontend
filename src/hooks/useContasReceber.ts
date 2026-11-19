import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';

export interface ContaReceber {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string | null;
  descricao: string;
  valor: number;
  received_amount: number;
  status: 'pendente' | 'recebido_parcial' | 'recebido' | 'vencido' | 'cancelado';
  categoria: string | null;
  sale_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
  receipt_form: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'boleto' | 'transferencia' | null;
  due_on: string;
  received_on: string | null;
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
    formaRecebimento: ContaReceber['receipt_form'],
    dataRecebimento: string
  ) => {
    const conta = contas.find(c => c.id === id);
    if (!conta) return { error: new Error('Conta não encontrada') };

    const novoRecebido = Number(conta.received_amount || 0) + valorRecebido;
    const status: ContaReceber['status'] =
      novoRecebido >= Number(conta.valor) ? 'recebido' : 'recebido_parcial';

    const { error } = await (api as any)
      .from('receivable')
      .update({
        received_amount: novoRecebido,
        status,
        receipt_form: formaRecebimento,
        received_on: status === 'recebido' ? dataRecebimento : null,
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
