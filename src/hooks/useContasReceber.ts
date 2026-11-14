import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';

export interface ContaReceber {
  id: string;
  empresa_id: string;
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
  clientes?: { nome: string; telefone: string | null } | null;
}

export function useContasReceber() {
  const { empresaId } = useEmpresa();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);

  const atualizarVencidas = useCallback(async () => {
    if (!empresaId) return;
    const hoje = new Date().toISOString().split('T')[0];
    await (supabase as any)
      .from('contas_receber')
      .update({ status: 'vencido' })
      .eq('empresa_id', empresaId)
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje);
  }, [empresaId]);

  const buscarContas = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('contas_receber')
      .select('*, clientes(nome, telefone)')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });
    setContas((data as ContaReceber[]) || []);
    setLoading(false);
  }, [empresaId]);

  const criarConta = async (conta: Partial<ContaReceber>) => {
    const { data, error } = await (supabase as any)
      .from('contas_receber')
      .insert({ ...conta, empresa_id: empresaId })
      .select()
      .single();
    if (!error) buscarContas();
    return { data, error };
  };

  const editarConta = async (id: string, updates: Partial<ContaReceber>) => {
    const { error } = await (supabase as any)
      .from('contas_receber')
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

    const { error } = await (supabase as any)
      .from('contas_receber')
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
    await (supabase as any)
      .from('contas_receber')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', id);
    buscarContas();
  };

  const excluirConta = async (id: string) => {
    await (supabase as any).from('contas_receber').delete().eq('id', id);
    buscarContas();
  };

  useEffect(() => {
    if (empresaId) {
      setLoading(true);
      atualizarVencidas().then(() => buscarContas());
    } else {
      setLoading(false);
    }
  }, [empresaId]); // eslint-disable-line react-hooks/exhaustive-deps

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
