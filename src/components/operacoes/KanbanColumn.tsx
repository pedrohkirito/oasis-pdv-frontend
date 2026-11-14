import { useDroppable } from '@dnd-kit/core';
import { Operacao } from '@/hooks/useOperacoes';
import { KanbanCard } from './KanbanCard';

const TAILWIND_TO_HEX: Record<string, string> = {
  'bg-blue-500': '#3B82F6',
  'bg-yellow-500': '#EAB308',
  'bg-emerald-500': '#10B981',
  'bg-orange-500': '#F97316',
  'bg-indigo-500': '#6366F1',
  'bg-teal-500': '#14B8A6',
  'bg-purple-500': '#8B5CF6',
  'bg-green-600': '#16A34A',
};

interface KanbanColumnProps {
  column: { id: string; label: string; color: string };
  operacoes: Operacao[];
  onCardClick: (op: Operacao) => void;
}

export function KanbanColumn({ column, operacoes, onCardClick }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const hexColor = TAILWIND_TO_HEX[column.color] || '#8E5FCF';

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 280,
        minHeight: 400,
        borderRadius: 16,
        background: isOver ? `rgba(${hexToRgb(hexColor)},0.06)` : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isOver ? `1px solid ${hexColor}50` : '1px solid rgba(142,95,207,0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(142,95,207,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: `linear-gradient(135deg, ${hexColor}08, ${hexColor}04)`,
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: hexColor, flexShrink: 0 }} />
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {column.label}
        </h3>
        <div style={{ fontSize: 11, fontWeight: 700, color: hexColor, background: `${hexColor}18`, borderRadius: 20, padding: '1px 8px', minWidth: 22, textAlign: 'center' }}>
          {operacoes.length}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
        {operacoes.map(op => (
          <KanbanCard key={op.id} operacao={op} onClick={() => onCardClick(op)} />
        ))}
        {operacoes.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, fontSize: 12, color: '#9CA3AF' }}>
            Nenhuma operação
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '142,95,207';
}
