import { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Operacao } from '@/hooks/useOperacoes';
import { Truck, Wrench, Calendar, AlertTriangle, Clock, Eye } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PedidoEntregaDialog } from '@/components/pedido-entrega/PedidoEntregaDialog';

interface KanbanCardProps {
  operacao: Operacao;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ operacao, onClick, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dndIsDragging } = useDraggable({ id: operacao.id });
  const [hov, setHov] = useState(false);
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const suppressClickRef = useRef(false);
  const wasDraggingRef = useRef(false);

  // Track drag transitions: when a drag ends, suppress the synthetic click dnd-kit emits on pointerup.
  if (dndIsDragging && !wasDraggingRef.current) {
    wasDraggingRef.current = true;
  } else if (!dndIsDragging && wasDraggingRef.current) {
    wasDraggingRef.current = false;
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 250);
  }

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const isUrgent = operacao.urgencia === 'urgente' || operacao.urgencia === 'atrasado';
  const isOverdue = operacao.data_prevista && operacao.status !== 'finalizado'
    && isPast(parseISO(operacao.data_prevista)) && !isToday(parseISO(operacao.data_prevista));

  const borderColor = isOverdue
    ? 'rgba(239,68,68,0.4)'
    : isUrgent
    ? 'rgba(249,115,22,0.35)'
    : hov
    ? 'rgba(142,95,207,0.25)'
    : 'rgba(142,95,207,0.1)';

  const bgColor = isOverdue
    ? 'rgba(239,68,68,0.04)'
    : isUrgent
    ? 'rgba(249,115,22,0.04)'
    : 'rgba(255,255,255,0.85)';

  return (
    <>
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: bgColor,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: 12,
        cursor: 'grab',
        transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        transform: isDragging
          ? `${style?.transform || ''} rotate(2deg) scale(1.04)`
          : hov
          ? `${style?.transform || ''} translateY(-2px)`
          : style?.transform,
        boxShadow: isDragging
          ? '0 12px 32px rgba(0,0,0,0.18)'
          : hov
          ? '0 6px 18px rgba(142,95,207,0.14)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        opacity: isDragging ? 0.9 : 1,
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (suppressClickRef.current) return;
        onClick();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {operacao.cliente_nome}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 1 }}>
            {isOverdue && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#EF4444', borderRadius: 20, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock style={{ width: 9, height: 9 }} />
                Atrasado
              </span>
            )}
            {isUrgent && !isOverdue && (
              <AlertTriangle style={{ width: 13, height: 13, color: '#F97316', flexShrink: 0 }} />
            )}
          </div>
        </div>

        {/* Produtos */}
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {operacao.produtos}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px',
            background: operacao.status_pagamento === 'pago' ? 'rgba(16,185,129,0.12)' : 'transparent',
            border: operacao.status_pagamento === 'pago' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(107,114,128,0.3)',
            color: operacao.status_pagamento === 'pago' ? '#059669' : '#6B7280',
          }}>
            {operacao.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px', background: 'rgba(142,95,207,0.08)', border: '1px solid rgba(142,95,207,0.2)', color: '#8E5FCF', display: 'flex', alignItems: 'center', gap: 3 }}>
            {operacao.kind === 'entrega_montagem' ? (
              <><Wrench style={{ width: 9, height: 9 }} /> Entrega + Montagem</>
            ) : (
              <><Truck style={{ width: 9, height: 9 }} /> Entrega</>
            )}
          </span>
        </div>

        {/* Date */}
        {operacao.data_prevista && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9CA3AF' }}>
            <Calendar style={{ width: 11, height: 11 }} />
            {format(new Date(operacao.data_prevista), 'dd/MM/yyyy', { locale: ptBR })}
          </div>
        )}

        {/* Ver Pedido */}
        {operacao.venda_id && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (suppressClickRef.current) return;
              setPedidoOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: '#8E5FCF',
              background: 'rgba(142,95,207,0.08)',
              border: '1px solid rgba(142,95,207,0.2)',
              borderRadius: 8,
              padding: '4px 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: 'fit-content',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(142,95,207,0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(142,95,207,0.08)';
            }}
          >
            <Eye style={{ width: 11, height: 11 }} />
            Ver Pedido
          </button>
        )}
      </div>
    </div>
    {operacao.venda_id && (
      <PedidoEntregaDialog
        open={pedidoOpen}
        onOpenChange={(o) => {
          setPedidoOpen(o);
          if (!o) {
            suppressClickRef.current = true;
            setTimeout(() => { suppressClickRef.current = false; }, 400);
          }
        }}
        saleId={operacao.venda_id}
      />
    )}
    </>
  );
}
