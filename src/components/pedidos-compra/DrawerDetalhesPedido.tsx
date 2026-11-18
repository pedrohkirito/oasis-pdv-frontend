import { useState, useEffect } from 'react';
import {
  ChevronRight, AlertTriangle, PackageCheck,
  Clock, User, FileText, Calendar, Printer,
  XCircle, CheckCircle,
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { escapeHtml } from '@/utils/htmlSanitize';
import type { PedidoCompra, StatusPedido, HistoricoPedido } from '@/hooks/usePedidosCompra';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  FileEdit, Factory, Truck, PackageOpen, XCircle as XCircleIcon,
} from 'lucide-react';

const STATUS_CONFIG: Record<StatusPedido, {
  label: string; color: string; bg: string; icon: React.ElementType; next?: StatusPedido;
}> = {
  rascunho:         { label: 'Rascunho',        color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: FileEdit,      next: 'confirmado'       },
  confirmado:       { label: 'Confirmado',       color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  icon: CheckCircle,   next: 'em_producao'      },
  em_producao:      { label: 'Em Produção',      color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  icon: Factory,       next: 'em_transito'      },
  em_transito:      { label: 'Em Trânsito',      color: '#8E5FCF', bg: 'rgba(142,95,207,0.1)',  icon: Truck,         next: 'recebido_parcial' },
  recebido_parcial: { label: 'Recebido Parcial', color: '#F97316', bg: 'rgba(249,115,22,0.1)',  icon: PackageOpen,   next: 'recebido'         },
  recebido:         { label: 'Recebido',         color: '#10B981', bg: 'rgba(16,185,129,0.1)',  icon: PackageCheck                           },
  cancelado:        { label: 'Cancelado',        color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircleIcon                            },
};

const fmtBRL = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDataHora = (iso: string) =>
  format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

const fmtData = (iso: string | null) =>
  iso ? format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) : '—';

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

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({ item, isLast }: { item: HistoricoPedido; isLast: boolean }) {
  const cfg = item.status_novo ? STATUS_CONFIG[item.status_novo as StatusPedido] : null;
  const Icon = cfg?.icon ?? Clock;
  const dotColor = cfg?.color ?? '#6B7280';

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: cfg?.bg ?? 'rgba(107,114,128,0.1)', color: dotColor, border: '2px solid rgba(255,255,255,0.8)',
        }}>
          <Icon style={{ width: 13, height: 13 }} />
        </div>
        {!isLast && <div style={{ width: 1, flex: 1, background: 'rgba(142,95,207,0.1)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {item.status_anterior && (
            <>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{STATUS_CONFIG[item.status_anterior as StatusPedido]?.label ?? item.status_anterior}</span>
              <ChevronRight style={{ width: 12, height: 12, color: '#9CA3AF', flexShrink: 0 }} />
            </>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: dotColor }}>
            {STATUS_CONFIG[item.status_novo as StatusPedido]?.label ?? item.status_novo}
          </span>
        </div>
        {item.observacao && (
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 3, fontStyle: 'italic' }}>"{item.observacao}"</p>
        )}
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          <User style={{ width: 11, height: 11 }} />
          {item.usuario_nome ?? 'Sistema'}
          <span>·</span>
          {fmtDataHora(item.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pedido: PedidoCompra | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (pedidoId: string, status: StatusPedido, obs?: string) => Promise<{ error: null | Error }>;
}

const sectionTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#8E5FCF',
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
};

const miniCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(142,95,207,0.1)',
  borderRadius: 12, padding: '12px 14px',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function DrawerDetalhesPedido({ pedido, open, onClose, onStatusChange }: Props) {
  const [historico, setHistorico] = useState<HistoricoPedido[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const [modalAvancar, setModalAvancar] = useState(false);
  const [obsAvancar, setObsAvancar] = useState('');
  const [confirmRecebido, setConfirmRecebido] = useState(false);
  const [avancando, setAvancando] = useState(false);

  const [qtdsRecebidas, setQtdsRecebidas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!pedido || !open) return;

    const carregar = async () => {
      setLoadingHistorico(true);
      const { data } = await (api as any)
        .from('pedidos_compra_historico')
        .select('*')
        .eq('pedido_id', pedido.id)
        .order('created_at', { ascending: true });
      setHistorico((data ?? []) as HistoricoPedido[]);
      setLoadingHistorico(false);
    };

    const qtds: Record<string, number> = {};
    (pedido.pedidos_compra_itens ?? []).forEach(i => {
      if (i.id) qtds[i.id] = i.quantidade_recebida ?? 0;
    });
    setQtdsRecebidas(qtds);

    carregar();
  }, [pedido, open]);

  if (!pedido) return null;

  const cfg = STATUS_CONFIG[pedido.status];
  const nextStatus = cfg.next;
  const nextCfg = nextStatus ? STATUS_CONFIG[nextStatus] : null;
  const atrasado = pedido.prazo_entrega && isPast(parseISO(pedido.prazo_entrega)) && !['recebido', 'cancelado'].includes(pedido.status);
  const podeCancelar = !['cancelado', 'recebido'].includes(pedido.status);

  const handleAvancar = async () => {
    if (!nextStatus) return;
    if (nextStatus === 'recebido' && !confirmRecebido) {
      setConfirmRecebido(true);
      return;
    }
    setAvancando(true);
    await onStatusChange(pedido.id, nextStatus, obsAvancar);
    setAvancando(false);
    setModalAvancar(false);
    setObsAvancar('');
    setConfirmRecebido(false);

    const { data } = await (api as any)
      .from('pedidos_compra_historico')
      .select('*')
      .eq('pedido_id', pedido.id)
      .order('created_at', { ascending: true });
    setHistorico((data ?? []) as HistoricoPedido[]);
  };

  const handleCancelar = async () => {
    if (!confirm('Cancelar este pedido?')) return;
    await onStatusChange(pedido.id, 'cancelado', 'Cancelado pelo usuário');
    onClose();
  };

  const imprimir = () => {
    const itens = pedido.pedidos_compra_itens ?? [];
    const linhasItens = itens.map(i =>
      `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${escapeHtml(i.produto_nome)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantidade}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${fmtBRL(i.valor_unitario)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${fmtBRL(Number(i.valor_total ?? i.quantidade * i.valor_unitario))}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pedido de Compra</title>
    <style>body{font-family:sans-serif;font-size:13px;color:#111;padding:24px;max-width:700px;margin:0 auto}
    h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse}
    th{background:#f5f5f5;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#555}
    @media print{button{display:none}}</style></head>
    <body>
      <h1>Pedido de Compra</h1>
      <p style="color:#666;margin-bottom:16px">${escapeHtml(pedido.numero_pedido ?? `#${pedido.id.slice(0, 8)}`)} — ${escapeHtml(cfg.label)}</p>
      <table style="margin-bottom:16px"><tbody>
        <tr><td style="color:#666;width:160px">Fornecedor:</td><td><strong>${escapeHtml(pedido.fornecedor_nome ?? '—')}</strong></td></tr>
        <tr><td style="color:#666">Prazo de Entrega:</td><td>${escapeHtml(fmtData(pedido.prazo_entrega))}</td></tr>
        <tr><td style="color:#666">Condição Pagamento:</td><td>${escapeHtml(pedido.condicao_pagamento ?? '—')}</td></tr>
        <tr><td style="color:#666">NF Fornecedor:</td><td>${escapeHtml(pedido.numero_nf_fornecedor ?? '—')}</td></tr>
        <tr><td style="color:#666">Criado em:</td><td>${escapeHtml(fmtDataHora(pedido.created_at))}</td></tr>
      </tbody></table>
      <table><thead><tr>
        <th>Produto</th><th style="text-align:center">Qtd</th>
        <th style="text-align:right">Valor Unit.</th><th style="text-align:right">Total</th>
      </tr></thead><tbody>${linhasItens}</tbody>
      <tfoot><tr>
        <td colspan="3" style="padding:8px;text-align:right;font-weight:bold">Total do Pedido:</td>
        <td style="padding:8px;text-align:right;font-weight:bold;font-size:15px">${fmtBRL(Number(pedido.valor_total))}</td>
      </tr></tfoot></table>
      ${pedido.observacoes ? `<p style="margin-top:16px;color:#555">Obs: ${escapeHtml(pedido.observacoes)}</p>` : ''}
    </body></html>`;

    const w = window.open('', '_blank', 'width=750,height=900');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  const itens = pedido.pedidos_compra_itens ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent
          side="right"
          className="p-0 overflow-hidden flex flex-col"
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'rgba(250,250,252,0.97)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderLeft: '1px solid rgba(142,95,207,0.15)',
          }}
        >
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(142,95,207,0.1)',
            background: 'linear-gradient(135deg, rgba(71,17,143,0.04), rgba(142,95,207,0.02))',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
                  {pedido.numero_pedido ?? `#${pedido.id.slice(0, 8)}`}
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', margin: '0 0 8px', lineHeight: 1.2 }}>
                  {pedido.fornecedor_nome ?? '—'}
                </h2>
                <StatusBadge status={pedido.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={imprimir}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.7)', color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Printer style={{ width: 13, height: 13 }} />
                  Imprimir
                </button>
                {nextStatus && (
                  <button
                    onClick={() => setModalAvancar(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', background: nextCfg ? nextCfg.color : '#8E5FCF', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <ChevronRight style={{ width: 13, height: 13 }} />
                    Avançar
                  </button>
                )}
                {podeCancelar && (
                  <button
                    onClick={handleCancelar}
                    style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}
                  >
                    <XCircle style={{ width: 15, height: 15 }} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Body (scrollable) ─────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Informações */}
            <div>
              <p style={{ ...sectionTitle, marginBottom: 10 }}>Informações do Pedido</p>
              <div style={{ ...miniCard, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: User,        label: 'Fornecedor',         valor: pedido.fornecedor_nome ?? '—'      },
                  { icon: FileText,    label: 'Cond. Pagamento',    valor: pedido.condicao_pagamento ?? '—'   },
                  { icon: FileText,    label: 'NF Fornecedor',      valor: pedido.numero_nf_fornecedor ?? '—' },
                  { icon: Clock,       label: 'Criado em',          valor: fmtDataHora(pedido.created_at)     },
                  ...(pedido.recebido_em ? [{ icon: PackageCheck, label: 'Recebido em', valor: fmtDataHora(pedido.recebido_em) }] : []),
                ].map(({ icon: Icon, label, valor }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <Icon style={{ width: 14, height: 14, color: '#8E5FCF', flexShrink: 0 }} />
                    <span style={{ color: '#9CA3AF', width: 128, flexShrink: 0, fontSize: 12 }}>{label}:</span>
                    <span style={{ fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{valor}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <Calendar style={{ width: 14, height: 14, color: atrasado ? '#EF4444' : '#8E5FCF', flexShrink: 0 }} />
                  <span style={{ color: '#9CA3AF', width: 128, flexShrink: 0, fontSize: 12 }}>Prazo Entrega:</span>
                  <span style={{ fontWeight: 500, color: atrasado ? '#EF4444' : '#1F2937', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {atrasado && <AlertTriangle style={{ width: 12, height: 12 }} />}
                    {fmtData(pedido.prazo_entrega)}
                    {atrasado && <span style={{ fontSize: 11, color: '#EF4444' }}>(atrasado)</span>}
                  </span>
                </div>
              </div>
              {pedido.observacoes && (
                <div style={{ ...miniCard, marginTop: 8, background: 'rgba(142,95,207,0.04)' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações</p>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{pedido.observacoes}</p>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />

            {/* Itens */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={sectionTitle}>Itens do Pedido</p>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
              </div>

              {itens.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Nenhum item cadastrado.</p>
              ) : (
                <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(142,95,207,0.1)' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))' }}>
                        {['Produto', 'Pedido', 'Recebido', 'Unit.', 'Total'].map((h, i) => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: (i >= 1 ? 'center' : 'left') as 'center' | 'left', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, idx) => (
                        <tr key={item.id ?? idx} style={{ borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
                          <td style={{ padding: '10px 12px', color: '#374151', fontSize: 12, fontWeight: 500 }}>{item.produto_nome}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' as const, fontSize: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#8E5FCF', background: 'rgba(142,95,207,0.08)', borderRadius: 20, padding: '2px 8px' }}>
                              {item.quantidade}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' as const }}>
                            {pedido.status === 'recebido_parcial' && item.id ? (
                              <Input
                                type="number"
                                min="0"
                                max={item.quantidade}
                                value={qtdsRecebidas[item.id] ?? 0}
                                onChange={e => setQtdsRecebidas(prev => ({
                                  ...prev,
                                  [item.id!]: Math.min(item.quantidade, Math.max(0, parseInt(e.target.value) || 0)),
                                }))}
                                className="h-6 w-14 text-center text-xs mx-auto"
                                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 8 }}
                              />
                            ) : (
                              <span style={{ fontSize: 12, color: '#6B7280' }}>
                                {item.quantidade_recebida ?? 0}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 12, color: '#6B7280' }}>
                            {fmtBRL(item.valor_unitario)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 13, fontWeight: 700, color: '#8E5FCF' }}>
                            {fmtBRL(Number(item.valor_total ?? item.quantidade * item.valor_unitario))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid rgba(142,95,207,0.1)', background: 'rgba(142,95,207,0.04)' }}>
                        <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Total do Pedido
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 15, fontWeight: 800, color: '#8E5FCF' }}>
                          {fmtBRL(Number(pedido.valor_total))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Avançar status */}
            {nextStatus && nextCfg && (
              <>
                <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />
                <div>
                  <p style={{ ...sectionTitle, marginBottom: 10 }}>Avançar Status</p>
                  <div
                    onClick={() => setModalAvancar(true)}
                    style={{ ...miniCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', border: `2px solid ${nextCfg.color}30`, background: nextCfg.bg, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <div>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 3px' }}>Próximo passo</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: nextCfg.color, margin: 0 }}>{nextCfg.label}</p>
                      {nextStatus === 'recebido' && (
                        <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle style={{ width: 11, height: 11 }} />
                          Atualizará o estoque automaticamente
                        </p>
                      )}
                    </div>
                    <button
                      style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, border: 'none', background: nextCfg.color, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Avançar
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Histórico */}
            <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />
            <div>
              <p style={{ ...sectionTitle, marginBottom: 14 }}>Histórico de Status</p>
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary" />
                </div>
              ) : historico.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Nenhum histórico registrado.</p>
              ) : (
                <div>
                  {historico.map((item, idx) => (
                    <TimelineItem key={item.id} item={item} isLast={idx === historico.length - 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Modal Avançar Status ──────────────────────────────────────────── */}
      <Dialog open={modalAvancar} onOpenChange={v => { if (!v) { setModalAvancar(false); setObsAvancar(''); setConfirmRecebido(false); } }}>
        <DialogContent
          className="sm:max-w-sm p-0 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 20 }}
        >
          <DialogHeader style={{ padding: '20px 24px 0' }}>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>
              Avançar para: {nextCfg?.label}
            </DialogTitle>
          </DialogHeader>

          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {nextStatus === 'recebido' && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10, fontSize: 13, color: '#92400E' }}>
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: '#F59E0B' }} />
                <p style={{ margin: 0 }}>Isso irá <strong>atualizar o estoque automaticamente</strong> com as quantidades dos itens do pedido. Confirmar?</p>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Observação (opcional)
              </label>
              <Textarea
                placeholder="Ex: Mercadoria chegou sem avarias"
                value={obsAvancar}
                onChange={e => setObsAvancar(e.target.value)}
                className="resize-none"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12, fontFamily: 'inherit' }}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter style={{ padding: '0 24px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setModalAvancar(false); setObsAvancar(''); setConfirmRecebido(false); }}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAvancar}
              disabled={avancando}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: nextCfg ? nextCfg.color : '#8E5FCF', color: '#fff', cursor: avancando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: avancando ? 0.7 : 1 }}
            >
              {avancando ? 'Avançando...' : `Confirmar — ${nextCfg?.label}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
