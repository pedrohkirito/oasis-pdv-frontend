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
  purchase_order_id?: string;
  company_id?: string;
  product_id: string | null;
  product_name: string;
  quantidade: number;
  quantity_received: number;
  unit_amount: number;
  total_amount?: number;
  created_at?: string;
}

export interface HistoricoPedido {
  id: string;
  purchase_order_id: string;
  company_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  observacao: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface PedidoCompra {
  id: string;
  company_id: string;
  order_number: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  status: StatusPedido;
  total_amount: number;
  delivery_deadline_on: string | null;
  payment_terms: string | null;
  supplier_invoice_number: string | null;
  observacoes: string | null;
  received_on: string | null;
  created_at: string;
  updated_at: string;
  pedidos_compra_itens: ItemPedido[];
}

export interface NovoPedidoPayload {
  supplier_id?: string | null;
  supplier_name?: string | null;
  order_number?: string | null;
  delivery_deadline_on?: string | null;
  payment_terms?: string | null;
  supplier_invoice_number?: string | null;
  observacoes?: string | null;
  total_amount?: number;
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
      purchase_order_id: pedidoId,
      company_id: companyId,
      previous_status: statusAnterior,
      new_status: statusNovo,
      observacao: observacao || null,
      user_id: user?.id ?? null,
      user_name: user?.user_metadata?.name ?? user?.email ?? null,
    });
  };

  // ── Criar pedido ─────────────────────────────────────────────────────────────

  const criarPedido = async (
    pedido: NovoPedidoPayload,
    itens: Omit<ItemPedido, 'id' | 'purchase_order_id' | 'company_id' | 'total_amount' | 'created_at'>[],
  ) => {
    if (!companyId) return { data: null, error: new Error('Sem empresa') };

    const valorTotal = itens.reduce(
      (acc, i) => acc + i.quantidade * i.unit_amount,
      0,
    );

    const { data, error } = await (api as any)
      .from('purchase_order')
      .insert({ ...pedido, company_id: companyId, total_amount: valorTotal })
      .select()
      .single();

    if (error || !data) return { data: null, error };

    if (itens.length > 0) {
      await (api as any).from('purchase_order_item').insert(
        itens.map(i => ({
          ...i,
          purchase_order_id: data.id,
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
        ...(statusNovo === 'recebido' ? { received_on: new Date().toISOString() } : {}),
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
