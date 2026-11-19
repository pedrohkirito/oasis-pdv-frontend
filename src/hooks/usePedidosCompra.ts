import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';
import { useAuth } from './useAuth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusPedido =
  | 'rascunho'
  | 'confirmado'
  | 'em_producao'
  | 'em_transito'
  | 'recebido_parcial'
  | 'recebido'
  | 'cancelado';

export interface ItemPedido {
  id?: string;
  pedido_id?: string;
  empresa_id?: string;
  produto_id: string | null;
  produto_nome: string;
  quantidade: number;
  quantidade_recebida: number;
  valor_unitario: number;
  valor_total?: number;
  created_at?: string;
}

export interface HistoricoPedido {
  id: string;
  pedido_id: string;
  company_id: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  observacao: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  created_at: string;
}

export interface PedidoCompra {
  id: string;
  company_id: string;
  numero_pedido: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  status: StatusPedido;
  valor_total: number;
  prazo_entrega: string | null;
  condicao_pagamento: string | null;
  numero_nf_fornecedor: string | null;
  observacoes: string | null;
  recebido_em: string | null;
  created_at: string;
  updated_at: string;
  pedidos_compra_itens: ItemPedido[];
}

export interface NovoPedidoPayload {
  fornecedor_id?: string | null;
  fornecedor_nome?: string | null;
  numero_pedido?: string | null;
  prazo_entrega?: string | null;
  condicao_pagamento?: string | null;
  numero_nf_fornecedor?: string | null;
  observacoes?: string | null;
  valor_total?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePedidosCompra() {
  const { companyId } = useEmpresa();
  const { user } = useAuth();
  const location = useLocation();

  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Buscar pedidos ──────────────────────────────────────────────────────────

  const buscarPedidos = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data } = await (api as any)
      .from('purchase_order')
      .select('*, pedidos_compra_itens(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    setPedidos((data ?? []) as PedidoCompra[]);
    setLoading(false);
  }, [companyId]);

  // ── Registrar histórico ─────────────────────────────────────────────────────

  const registrarHistorico = async (
    pedidoId: string,
    statusAnterior: string | null,
    statusNovo: string,
    observacao: string = '',
  ) => {
    await (api as any).from('purchase_order_event').insert({
      pedido_id: pedidoId,
      company_id: companyId,
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      observacao: observacao || null,
      usuario_id: user?.id ?? null,
      usuario_nome: user?.user_metadata?.name ?? user?.email ?? null,
    });
  };

  // ── Criar pedido ─────────────────────────────────────────────────────────────

  const criarPedido = async (
    pedido: NovoPedidoPayload,
    itens: Omit<ItemPedido, 'id' | 'purchase_order_id' | 'company_id' | 'total_amount' | 'created_at'>[],
  ) => {
    if (!companyId) return { data: null, error: new Error('Sem empresa') };

    const valorTotal = itens.reduce(
      (acc, i) => acc + i.quantidade * i.valor_unitario,
      0,
    );

    const { data, error } = await (api as any)
      .from('purchase_order')
      .insert({ ...pedido, company_id: companyId, valor_total: valorTotal })
      .select()
      .single();

    if (error || !data) return { data: null, error };

    if (itens.length > 0) {
      await (api as any).from('purchase_order_item').insert(
        itens.map(i => ({
          ...i,
          pedido_id: data.id,
          company_id: companyId,
        })),
      );
    }

    await registrarHistorico(data.id, null, 'rascunho', 'Pedido criado');
    await buscarPedidos();
    return { data, error: null };
  };

  // ── Atualizar status ────────────────────────────────────────────────────────

  const atualizarStatus = async (
    pedidoId: string,
    statusNovo: StatusPedido,
    observacao: string = '',
  ) => {
    const pedido = pedidos.find(p => p.id === pedidoId);

    const { error } = await (api as any)
      .from('purchase_order')
      .update({
        status: statusNovo,
        updated_at: new Date().toISOString(),
        ...(statusNovo === 'recebido' ? { recebido_em: new Date().toISOString() } : {}),
      })
      .eq('id', pedidoId);

    if (error) return { error };

    await registrarHistorico(pedidoId, pedido?.status ?? null, statusNovo, observacao);

    // Estoque, custo médio e conta a pagar são tratados pelo trigger
    // trigger_processar_recebimento_pedido_compra ao detectar status = 'recebido'.

    await buscarPedidos();
    return { error: null };
  };

  // ── Buscar histórico de um pedido ────────────────────────────────────────────

  const buscarHistorico = async (pedidoId: string): Promise<HistoricoPedido[]> => {
    const { data } = await (api as any)
      .from('purchase_order_event')
      .select('*')
      .eq('purchase_order_id', pedidoId)
      .order('created_at', { ascending: true });
    return (data ?? []) as HistoricoPedido[];
  };

  // ── Excluir pedido ──────────────────────────────────────────────────────────

  const excluirPedido = async (pedidoId: string) => {
    const { error } = await (api as any)
      .from('purchase_order')
      .delete()
      .eq('id', pedidoId);
    if (!error) await buscarPedidos();
    return { error };
  };

  // ── Efeito inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      setPedidos([]);
      buscarPedidos();
    } else {
      setLoading(false);
    }
  }, [companyId, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pedidos,
    loading,
    criarPedido,
    atualizarStatus,
    excluirPedido,
    buscarPedidos,
    buscarHistorico,
  };
}
