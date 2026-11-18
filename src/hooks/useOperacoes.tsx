import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const KANBAN_COLUMNS = [
  { id: 'venda_confirmada',     label: 'Venda Confirmada',      color: 'bg-blue-500'   },
  { id: 'pronta_entrega',       label: 'Pronta Entrega',        color: 'bg-cyan-500'   },
  { id: 'pedido_feito',         label: 'Pedido Feito',          color: 'bg-amber-500'  },
  { id: 'aguardando_fornecedor',label: 'Aguardando Fornecedor', color: 'bg-orange-500' },
  { id: 'entrega_agendada',     label: 'Entrega Agendada',      color: 'bg-indigo-500' },
  { id: 'finalizado',           label: 'Finalizado',            color: 'bg-green-600'  },
] as const;

export type KanbanStatus = typeof KANBAN_COLUMNS[number]['id'];

export interface Operacao {
  id: string;
  empresa_id: string;
  venda_id: string | null;
  user_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  produtos: string;
  tipo: string;
  status: KanbanStatus;
  status_pagamento: string;
  data_prevista: string | null;
  data_entrega: string | null;
  data_montagem: string | null;
  urgencia: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  observacoes: string | null;
  vendedor?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperacaoTarefa {
  id: string;
  operacao_id: string;
  titulo: string;
  concluida: boolean;
  concluida_em: string | null;
  ordem: number;
}

export interface OperacaoHistorico {
  id: string;
  operacao_id: string;
  tipo: string;
  descricao: string;
  status_anterior: string | null;
  status_novo: string | null;
  user_id: string;
  created_at: string;
}

// Checklist alinhado às etapas do Kanban (uma tarefa por avanço de etapa).
// A 1ª etapa "Venda Confirmada" é o estado inicial e não gera tarefa.
const DEFAULT_CHECKLIST = [
  'Produto em pronta entrega',          // → pronta_entrega
  'Pedido enviado ao fornecedor',       // → pedido_feito
  'Pedido confirmado pelo fornecedor',  // → pedido_confirmado
  'Aguardando chegada do fornecedor',   // → aguardando_fornecedor
  'Entrega agendada com o cliente',     // → entrega_agendada
  'Produto entregue ao cliente',        // → entregue
  'Montagem pendente',                  // → montagem_pendente
  'Operação finalizada',                // → finalizado
];

export function useOperacoes() {
  const { empresaId } = useEmpresa();
  const { user } = useAuth();
  const { toast } = useToast();
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOperacoes = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await api
      .from('operacoes')
      .select('*, vendas:venda_id(vendedor)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching operacoes:', error);
    } else {
      const enriched = (data || []).map((op: any) => ({
        ...op,
        vendedor: op.vendas?.vendedor || null,
      }));
      setOperacoes(enriched as unknown as Operacao[]);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetchOperacoes();
  }, [fetchOperacoes]);

  const createOperacao = async (data: Partial<Operacao>) => {
    if (!empresaId || !user) return null;
    const payload = {
      ...data,
      empresa_id: empresaId,
      user_id: user.id,
      status: data.status || 'venda_confirmada',
    };

    const { data: created, error } = await api
      .from('operacoes')
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar operação', description: error.message, variant: 'destructive' });
      return null;
    }

    // Create default checklist
    const tarefas = DEFAULT_CHECKLIST.map((titulo, i) => ({
      operacao_id: created.id,
      titulo,
      ordem: i,
    }));
    await api.from('operacao_tarefas').insert(tarefas as any);

    // Add history entry
    await api.from('operacao_historico').insert({
      operacao_id: created.id,
      tipo: 'status_change',
      descricao: 'Operação criada',
      status_novo: 'venda_confirmada',
      user_id: user.id,
    } as any);

    toast({ title: 'Operação criada com sucesso!' });
    fetchOperacoes();
    return created;
  };

  const updateStatus = async (operacaoId: string, newStatus: KanbanStatus, oldStatus: string) => {
    if (!user) return;
    const { error } = await api
      .from('operacoes')
      .update({ status: newStatus } as any)
      .eq('id', operacaoId);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
      return;
    }

    await api.from('operacao_historico').insert({
      operacao_id: operacaoId,
      tipo: 'status_change',
      descricao: `Status alterado de "${getStatusLabel(oldStatus)}" para "${getStatusLabel(newStatus)}"`,
      status_anterior: oldStatus,
      status_novo: newStatus,
      user_id: user.id,
    } as any);

    setOperacoes(prev => prev.map(o => o.id === operacaoId ? { ...o, status: newStatus } : o));
  };

  const updateOperacao = async (operacaoId: string, data: Partial<Operacao>) => {
    const { error } = await api
      .from('operacoes')
      .update(data as any)
      .eq('id', operacaoId);

    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      return;
    }
    fetchOperacoes();
  };

  const deleteOperacao = async (operacaoId: string) => {
    const { error } = await api
      .from('operacoes')
      .delete()
      .eq('id', operacaoId);

    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
      return;
    }
    toast({ title: 'Operação excluída' });
    fetchOperacoes();
  };

  return { operacoes, loading, fetchOperacoes, createOperacao, updateStatus, updateOperacao, deleteOperacao };
}

export function getStatusLabel(status: string): string {
  return KANBAN_COLUMNS.find(c => c.id === status)?.label || status;
}

export function getStatusColor(status: string): string {
  return KANBAN_COLUMNS.find(c => c.id === status)?.color || 'bg-muted';
}
