import React, { useState, useMemo } from 'react';
import {
  FileEdit, CheckCircle, Truck, PackageOpen, PackageCheck,
  XCircle, Plus, LayoutGrid, List, MoreHorizontal,
  AlertTriangle, ChevronRight, Search, Calendar,
  ShoppingBag, Clock, Package, DollarSign, Factory,
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePedidosCompra, type PedidoCompra, type StatusPedido } from '@/hooks/usePedidosCompra';
import { useEmpresa } from '@/hooks/useEmpresa';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModalNovoPedido } from '@/components/pedidos-compra/ModalNovoPedido';
import { DrawerDetalhesPedido } from '@/components/pedidos-compra/DrawerDetalhesPedido';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusPedido, {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
  next?: StatusPedido;
}> = {
  rascunho:         { label: 'Rascunho',         color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: FileEdit,      next: 'confirmado'       },
  confirmado:       { label: 'Confirmado',        color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  icon: CheckCircle,   next: 'em_producao'      },
  em_producao:      { label: 'Em Produção',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  icon: Factory,       next: 'em_transito'      },
  em_transito:      { label: 'Em Trânsito',       color: '#8E5FCF', bg: 'rgba(142,95,207,0.1)',  icon: Truck,         next: 'recebido_parcial' },
  recebido_parcial: { label: 'Recebido Parcial',  color: '#F97316', bg: 'rgba(249,115,22,0.1)',  icon: PackageOpen,   next: 'recebido'         },
  recebido:         { label: 'Recebido',          color: '#10B981', bg: 'rgba(16,185,129,0.1)',  icon: PackageCheck                           },
  cancelado:        { label: 'Cancelado',         color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle                                },
};

const STATUS_ORDER: StatusPedido[] = [
  'rascunho', 'confirmado', 'em_producao', 'em_transito',
  'recebido_parcial', 'recebido', 'cancelado',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (iso: string | null) =>
  iso ? format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) : '—';

const isAtrasado = (prazo: string | null) =>
  !!prazo && isPast(parseISO(prazo));

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusPedido }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
    }}>
      <Icon style={{ width: 10, height: 10 }} />
      {cfg.label}
    </span>
  );
}

// ─── Menu de ações ────────────────────────────────────────────────────────────

interface AcoesMenuProps {
  pedido: PedidoCompra;
  onVerDetalhes: () => void;
  onAvancar: () => void;
  onCancelar: () => void;
}

function AcoesMenu({ pedido, onVerDetalhes, onAvancar, onCancelar }: AcoesMenuProps) {
  const cfg = STATUS_CONFIG[pedido.status];
  const podeAvancar = !!cfg.next;
  const podeCancelar = pedido.status !== 'cancelado' && pedido.status !== 'recebido';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
          <MoreHorizontal style={{ width: 14, height: 14 }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onVerDetalhes} className="gap-2 cursor-pointer">
          <Package className="h-3.5 w-3.5" />
          Ver detalhes
        </DropdownMenuItem>
        {podeAvancar && (
          <DropdownMenuItem onClick={onAvancar} className="gap-2 cursor-pointer text-blue-600">
            <ChevronRight className="h-3.5 w-3.5" />
            Avançar status
          </DropdownMenuItem>
        )}
        {podeCancelar && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancelar} className="gap-2 cursor-pointer text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              Cancelar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Card Kanban ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  pedido: PedidoCompra;
  onVerDetalhes: () => void;
  onAvancar: () => void;
  onCancelar: () => void;
}

function KanbanCard({ pedido, onVerDetalhes, onAvancar, onCancelar }: KanbanCardProps) {
  const [hov, setHov] = useState(false);
  const atrasado = isAtrasado(pedido.delivery_deadline_on);
  const itens = pedido.pedidos_compra_itens?.length ?? 0;

  return (
    <div
      onClick={onVerDetalhes}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: atrasado ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${atrasado ? 'rgba(239,68,68,0.3)' : hov ? 'rgba(142,95,207,0.28)' : 'rgba(142,95,207,0.1)'}`,
        borderRadius: 14,
        padding: 12,
        cursor: 'pointer',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? '0 6px 18px rgba(142,95,207,0.13)' : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column' as const, gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pedido.order_number ?? `#${pedido.id.slice(0, 8)}`}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pedido.supplier_name ?? '—'}
          </p>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <AcoesMenu pedido={pedido} onVerDetalhes={onVerDetalhes} onAvancar={onAvancar} onCancelar={onCancelar} />
        </div>
      </div>

      <p style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0 }}>
        {fmtBRL(Number(pedido.total_amount))}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#6B7280' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Package style={{ width: 11, height: 11 }} />
          {itens} {itens === 1 ? 'item' : 'itens'}
        </span>
        {pedido.delivery_deadline_on && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: atrasado ? '#EF4444' : '#6B7280', fontWeight: atrasado ? 600 : 400 }}>
            {atrasado && <AlertTriangle style={{ width: 11, height: 11 }} />}
            <Calendar style={{ width: 11, height: 11 }} />
            {fmtData(pedido.delivery_deadline_on)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── View Kanban ──────────────────────────────────────────────────────────────

interface KanbanViewProps {
  pedidos: PedidoCompra[];
  onVerDetalhes: (p: PedidoCompra) => void;
  onAvancar: (p: PedidoCompra) => void;
  onCancelar: (p: PedidoCompra) => void;
}

function KanbanView({ pedidos, onVerDetalhes, onAvancar, onCancelar }: KanbanViewProps) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ display: 'flex', gap: 14, minWidth: 'max-content' }}>
        {STATUS_ORDER.map(status => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const colPedidos = pedidos.filter(p => p.status === status);

          return (
            <div key={status} style={{ width: 236, flexShrink: 0 }}>
              {/* Column header */}
              <div style={{
                background: cfg.bg,
                border: `1px solid ${cfg.color}28`,
                borderRadius: '14px 14px 0 0',
                padding: '10px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon style={{ width: 12, height: 12, color: cfg.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                    {cfg.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: 'rgba(255,255,255,0.65)', borderRadius: 20, padding: '1px 8px', minWidth: 22, textAlign: 'center' as const }}>
                  {colPedidos.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                background: 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${cfg.color}18`,
                borderTop: 'none',
                borderRadius: '0 0 14px 14px',
                padding: 8,
                minHeight: 120,
                display: 'flex', flexDirection: 'column' as const, gap: 8,
              }}>
                {colPedidos.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, border: '2px dashed rgba(142,95,207,0.12)', borderRadius: 10, fontSize: 12, color: '#9CA3AF' }}>
                    Vazio
                  </div>
                ) : (
                  colPedidos.map(p => (
                    <KanbanCard
                      key={p.id}
                      pedido={p}
                      onVerDetalhes={() => onVerDetalhes(p)}
                      onAvancar={() => onAvancar(p)}
                      onCancelar={() => onCancelar(p)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── View Tabela ──────────────────────────────────────────────────────────────

interface TabelaViewProps {
  pedidos: PedidoCompra[];
  onVerDetalhes: (p: PedidoCompra) => void;
  onAvancar: (p: PedidoCompra) => void;
  onCancelar: (p: PedidoCompra) => void;
}

function TabelaView({ pedidos, onVerDetalhes, onAvancar, onCancelar }: TabelaViewProps) {
  if (pedidos.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingBag style={{ width: 32, height: 32, color: '#8E5FCF', opacity: 0.8 }} />
        </div>
        <div style={{ textAlign: 'center' as const }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: '0 0 6px' }}>Nenhum pedido encontrado</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Tente ajustar os filtros de busca</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))' }}>
            {['Nº Pedido', 'Fornecedor', 'Itens', 'Valor Total', 'Prazo Entrega', 'Status', 'Criado em', 'Ações'].map(h => (
              <th key={h} style={{ padding: '12px 20px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pedidos.map(p => {
            const atrasado = isAtrasado(p.delivery_deadline_on);
            const itens = p.pedidos_compra_itens?.length ?? 0;
            return (
              <tr
                key={p.id}
                onClick={() => onVerDetalhes(p)}
                style={{ borderBottom: '1px solid rgba(142,95,207,0.06)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(142,95,207,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    {p.order_number ?? `#${p.id.slice(0, 8)}`}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', maxWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#8E5FCF', flexShrink: 0 }}>
                      {(p.supplier_name ?? 'FN').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {p.supplier_name ?? '—'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'center' as const }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#8E5FCF', background: 'rgba(142,95,207,0.08)', borderRadius: 20, padding: '3px 10px' }}>
                    {itens} {itens === 1 ? 'item' : 'itens'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', fontWeight: 700, color: '#1F2937', whiteSpace: 'nowrap' as const, fontSize: 14 }}>
                  {fmtBRL(Number(p.total_amount))}
                </td>
                <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' as const }}>
                  {p.delivery_deadline_on ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: atrasado ? '#EF4444' : '#6B7280', fontWeight: atrasado ? 600 : 400 }}>
                      {atrasado && <AlertTriangle style={{ width: 12, height: 12 }} />}
                      {fmtData(p.delivery_deadline_on)}
                    </span>
                  ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                </td>
                <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ padding: '16px 20px', color: '#9CA3AF', fontSize: 11, whiteSpace: 'nowrap' as const }}>
                  {format(parseISO(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
                <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                  <AcoesMenu
                    pedido={p}
                    onVerDetalhes={() => onVerDetalhes(p)}
                    onAvancar={() => onAvancar(p)}
                    onCancelar={() => onCancelar(p)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 20,
};

export default function PedidosCompra() {
  const { companyId } = useEmpresa();
  const { pedidos, loading, atualizarStatus, excluirPedido, criarPedido } = usePedidosCompra();

  const [view, setView] = useState<'kanban' | 'tabela'>('kanban');
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | 'todos'>('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [hovKpi, setHovKpi] = useState<number | null>(null);

  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoCompra | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [novoPedidoOpen, setNovoPedidoOpen] = useState(false);

  // ── Filtros ───────────────────────────────────────────────────────────────

  const fornecedores = useMemo(() => {
    const nomes = new Set(pedidos.map(p => p.supplier_name).filter(Boolean));
    return Array.from(nomes) as string[];
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false;
      if (filtroFornecedor && p.supplier_name !== filtroFornecedor) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (p.order_number ?? '').toLowerCase().includes(q) ||
          (p.supplier_name ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pedidos, filtroStatus, filtroFornecedor, search]);

  // ── Cards de resumo ───────────────────────────────────────────────────────

  const hoje = new Date();
  const ativos = pedidos.filter(p => !['rascunho', 'cancelado', 'recebido'].includes(p.status));
  const atrasados = pedidos.filter(p =>
    p.delivery_deadline_on &&
    isPast(parseISO(p.delivery_deadline_on)) &&
    !['recebido', 'cancelado'].includes(p.status),
  );
  const aguardando = pedidos.filter(p =>
    p.status === 'em_transito' || p.status === 'recebido_parcial',
  );
  const valorAberto = ativos.reduce((acc, p) => acc + Number(p.total_amount), 0);

  // ── Ações ────────────────────────────────────────────────────────────────

  const handleAvancar = async (pedido: PedidoCompra) => {
    const next = STATUS_CONFIG[pedido.status].next;
    if (!next) return;
    await atualizarStatus(pedido.id, next);
  };

  const handleCancelar = async (pedido: PedidoCompra) => {
    if (!confirm(`Cancelar o pedido ${pedido.order_number ?? pedido.id.slice(0, 8)}?`)) return;
    await atualizarStatus(pedido.id, 'cancelado', 'Cancelado pelo usuário');
  };

  const handleVerDetalhes = (p: PedidoCompra) => {
    setPedidoSelecionado(p);
    setDrawerOpen(true);
  };

  const handleStatusChangeDrawer = async (pedidoId: string, status: StatusPedido, obs?: string) => {
    const result = await atualizarStatus(pedidoId, status, obs);
    setPedidoSelecionado(prev =>
      prev?.id === pedidoId ? { ...prev, status, ...(status === 'recebido' ? { received_on: new Date().toISOString() } : {}) } : prev
    );
    return result ?? { error: null };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (!companyId) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const kpiCards = [
    { label: 'Pedidos Ativos', value: String(ativos.length), sub: 'excl. rascunhos e cancelados', color: '#8E5FCF', bg: 'rgba(142,95,207,0.1)', Icon: ShoppingBag },
    { label: 'Atrasados', value: String(atrasados.length), sub: 'prazo de entrega vencido', color: atrasados.length > 0 ? '#EF4444' : '#10B981', bg: atrasados.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', Icon: AlertTriangle },
    { label: 'Aguardando', value: String(aguardando.length), sub: 'em trânsito ou recebimento parcial', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', Icon: Clock },
    { label: 'Valor em Aberto', value: fmtBRL(valorAberto), sub: 'pedidos ativos', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', Icon: DollarSign },
  ];

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative' }}>
        {/* Orb roxo */}
        <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
        {/* Orb amarelo */}
        <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: '#8E5FCF', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                PDV › Pedidos de Compra
              </p>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0, lineHeight: 1.2 }}>
                Pedidos de Compra
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>
                Gestão de compras e reposição de estoque
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* View toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 12, padding: 3, gap: 2 }}>
                {([
                  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
                  { id: 'tabela', label: 'Tabela', Icon: List },
                ] as const).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', background: view === id ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'transparent', color: view === id ? '#fff' : '#6B7280' }}
                  >
                    <Icon style={{ width: 13, height: 13 }} />
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setNovoPedidoOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Novo Pedido
              </button>
            </div>
          </div>

          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {kpiCards.map((card, i) => (
              <div
                key={card.label}
                onMouseEnter={() => setHovKpi(i)}
                onMouseLeave={() => setHovKpi(null)}
                style={{
                  ...glassCard,
                  borderTop: `3px solid ${card.color}`,
                  padding: 24,
                  display: 'flex', alignItems: 'center', gap: 16,
                  transform: hovKpi === i ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: hovKpi === i ? `0 12px 32px ${card.color}22` : '0 2px 8px rgba(142,95,207,0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  cursor: 'default',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <card.Icon style={{ width: 20, height: 20, color: card.color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: i === 3 ? '1.2rem' : '1.75rem', fontWeight: 700, color: '#1F2937', lineHeight: 1, margin: 0 }}>
                    {card.value}
                  </p>
                  <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: 500 }}>{card.label}</p>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filtros ───────────────────────────────────────────────────── */}
          <div style={{ ...glassCard, padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            {/* Status pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(['todos', ...STATUS_ORDER] as (StatusPedido | 'todos')[]).map(s => {
                const active = filtroStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFiltroStatus(s)}
                    style={{
                      padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                      background: active ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent',
                      color: active ? '#fff' : '#6B7280',
                      boxShadow: active ? '0 4px 12px rgba(142,95,207,0.3)' : 'none',
                      outline: active ? 'none' : '1px solid rgba(142,95,207,0.2)',
                    }}
                  >
                    {s === 'todos' ? 'Todos' : STATUS_CONFIG[s].label}
                  </button>
                );
              })}
            </div>

            <div style={{ width: 1, height: 28, background: 'rgba(142,95,207,0.1)', margin: '0 2px', flexShrink: 0 }} />

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                placeholder="Buscar por nº ou fornecedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12, background: 'rgba(255,255,255,0.8)', outline: 'none', fontFamily: 'inherit', color: '#1F2937', boxSizing: 'border-box' }}
              />
            </div>

            {/* Fornecedor select */}
            {fornecedores.length > 0 && (
              <Select value={filtroFornecedor || '_todos'} onValueChange={v => setFiltroFornecedor(v === '_todos' ? '' : v)}>
                <SelectTrigger className="w-44 h-9 text-xs bg-white/80" style={{ border: '1px solid rgba(142,95,207,0.2)', borderRadius: 10 }}>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_todos">Todos os fornecedores</SelectItem>
                  {fornecedores.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(search || filtroStatus !== 'todos' || filtroFornecedor) && (
              <button
                onClick={() => { setSearch(''); setFiltroStatus('todos'); setFiltroFornecedor(''); }}
                style={{ fontSize: 12, color: '#8E5FCF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
              >
                Limpar filtros
              </button>
            )}

            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto', flexShrink: 0 }}>
              {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Conteúdo principal ────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
            </div>
          ) : (
            view === 'kanban' ? (
              <KanbanView
                pedidos={pedidosFiltrados}
                onVerDetalhes={handleVerDetalhes}
                onAvancar={handleAvancar}
                onCancelar={handleCancelar}
              />
            ) : (
              <div style={{ ...glassCard, overflow: 'hidden' }}>
                <TabelaView
                  pedidos={pedidosFiltrados}
                  onVerDetalhes={handleVerDetalhes}
                  onAvancar={handleAvancar}
                  onCancelar={handleCancelar}
                />
              </div>
            )
          )}
        </div>
      </div>

      <ModalNovoPedido
        open={novoPedidoOpen}
        onOpenChange={setNovoPedidoOpen}
        onCriado={criarPedido}
      />

      <DrawerDetalhesPedido
        pedido={pedidoSelecionado}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setPedidoSelecionado(null); }}
        onStatusChange={handleStatusChangeDrawer}
      />
    </>
  );
}
