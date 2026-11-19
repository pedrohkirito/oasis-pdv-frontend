import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { KANBAN_COLUMNS, Operacao, KanbanStatus } from '@/hooks/useOperacoes';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { staggerContainer, staggerItem } from '@/components/layout/PageTransition';

interface KanbanBoardProps {
  operacoes: Operacao[];
  onStatusChange: (id: string, newStatus: KanbanStatus, oldStatus: string) => void;
  onCardClick: (operacao: Operacao) => void;
  filters: {
    search: string;
    kind: string;
    fornecedor: string;
    pagamento: string;
  };
}

export function KanbanBoard({ operacoes, onStatusChange, onCardClick, filters }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const seteDiasAtras = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const filtered = useMemo(() => {
    return operacoes.filter(op => {
      if (filters.search && !op.customer_name.toLowerCase().includes(filters.search.toLowerCase()) && !op.produtos.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.kind && filters.kind !== 'todos' && op.kind !== filters.kind) return false;
      if (filters.fornecedor && op.supplier_name !== filters.fornecedor) return false;
      if (filters.pagamento === 'pendente' && op.payment_status !== 'pendente') return false;
      if (filters.pagamento === 'pago' && op.payment_status !== 'pago') return false;
      return true;
    });
  }, [operacoes, filters]);

  const activeOp = activeId ? operacoes.find(o => o.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const operacao = operacoes.find(o => o.id === active.id);
    if (!operacao) return;

    const newStatus = over.id as KanbanStatus;
    if (operacao.status !== newStatus && KANBAN_COLUMNS.some(c => c.id === newStatus)) {
      onStatusChange(operacao.id, newStatus, operacao.status);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <motion.div
        className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-260px)]"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {KANBAN_COLUMNS.map((column) => (
          <motion.div key={column.id} variants={staggerItem} className="flex-shrink-0">
            <KanbanColumn
              column={column}
              operacoes={filtered.filter(o => {
                if (o.status !== column.id) return false;
                if (column.id === 'finalizado') {
                  return new Date(o.updated_at || o.created_at) >= seteDiasAtras;
                }
                return true;
              })}
              onCardClick={onCardClick}
            />
          </motion.div>
        ))}
      </motion.div>

      <DragOverlay>
        {activeOp && <KanbanCard operacao={activeOp} onClick={() => {}} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
