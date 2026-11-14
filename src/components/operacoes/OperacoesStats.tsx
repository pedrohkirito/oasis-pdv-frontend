import React, { useState, useMemo } from 'react';
import { Operacao } from '@/hooks/useOperacoes';
import { Package, AlertTriangle, Truck, Wrench } from 'lucide-react';
import { isToday, isPast, parseISO } from 'date-fns';

interface OperacoesStatsProps {
  operacoes: Operacao[];
}

const BORDER_COLORS = ['#8E5FCF', '#EF4444', '#10B981', '#8B5CF6'];
const ICON_BGS = ['rgba(142,95,207,0.1)', 'rgba(239,68,68,0.1)', 'rgba(16,185,129,0.1)', 'rgba(139,92,246,0.1)'];
const ICON_COLORS = ['#8E5FCF', '#EF4444', '#10B981', '#8B5CF6'];

export function OperacoesStats({ operacoes }: OperacoesStatsProps) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    const ativas = operacoes.filter(o => o.status !== 'finalizado');
    const atrasadas = ativas.filter(o => {
      if (!o.data_prevista) return false;
      return isPast(parseISO(o.data_prevista)) && !isToday(parseISO(o.data_prevista));
    });
    const entregasHoje = operacoes.filter(o => {
      if (o.status === 'finalizado') return false;
      const date = o.data_prevista || o.data_entrega;
      return date && isToday(parseISO(date));
    });
    const montagensPendentes = operacoes.filter(o => o.tipo?.includes('montagem') && o.status !== 'finalizado');

    return {
      total: ativas.length,
      atrasadas: atrasadas.length,
      entregasHoje: entregasHoje.length,
      montagensPendentes: montagensPendentes.length,
    };
  }, [operacoes]);

  const items = [
    { label: 'Ativas', value: stats.total, icon: Package },
    { label: 'Atrasadas', value: stats.atrasadas, icon: AlertTriangle },
    { label: 'Entregas hoje', value: stats.entregasHoje, icon: Truck },
    { label: 'Montagens pendentes', value: stats.montagensPendentes, icon: Wrench },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
      {items.map((item, i) => (
        <div
          key={item.label}
          onMouseEnter={() => setHovIdx(i)}
          onMouseLeave={() => setHovIdx(null)}
          style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(142,95,207,0.12)',
            borderRadius: 16,
            borderTop: `3px solid ${BORDER_COLORS[i]}`,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transform: hovIdx === i ? 'translateY(-4px)' : 'translateY(0)',
            boxShadow: hovIdx === i ? '0 8px 24px rgba(142,95,207,0.13)' : '0 2px 8px rgba(142,95,207,0.05)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            cursor: 'default',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: ICON_BGS[i], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <item.icon style={{ width: 18, height: 18, color: ICON_COLORS[i] }} />
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F2937', lineHeight: 1, margin: 0 }}>{item.value}</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
