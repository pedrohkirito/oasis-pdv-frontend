import { useMemo } from 'react';
import { Operacao, getStatusLabel } from '@/hooks/useOperacoes';
import { AlertTriangle, Clock, CalendarCheck } from 'lucide-react';
import { isToday, isTomorrow, isPast, parseISO, differenceInDays } from 'date-fns';

interface OperacoesAlertsProps {
  operacoes: Operacao[];
}

const ALERT_STYLES = {
  destructive: {
    background: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderLeft: '3px solid #EF4444',
    iconColor: '#EF4444',
    textColor: '#B91C1C',
  },
  info: {
    background: 'rgba(59,130,246,0.05)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderLeft: '3px solid #3B82F6',
    iconColor: '#3B82F6',
    textColor: '#1D4ED8',
  },
  warning: {
    background: 'rgba(245,158,11,0.05)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderLeft: '3px solid #F59E0B',
    iconColor: '#F59E0B',
    textColor: '#92400E',
  },
};

export function OperacoesAlerts({ operacoes }: OperacoesAlertsProps) {
  const alerts = useMemo(() => {
    const items: { type: 'destructive' | 'warning' | 'info'; icon: typeof AlertTriangle; message: string }[] = [];
    const ativas = operacoes.filter(o => o.status !== 'finalizado');

    // Overdue
    const atrasadas = ativas.filter(o => {
      if (!o.data_prevista) return false;
      return isPast(parseISO(o.data_prevista)) && !isToday(parseISO(o.data_prevista));
    });
    if (atrasadas.length > 0) {
      items.push({
        type: 'destructive',
        icon: AlertTriangle,
        message: `${atrasadas.length} operação(ões) com data prevista vencida: ${atrasadas.slice(0, 3).map(o => o.cliente_nome).join(', ')}${atrasadas.length > 3 ? '...' : ''}`,
      });
    }

    // Today/Tomorrow deliveries
    const hojeTomorrow = ativas.filter(o => {
      const date = o.data_prevista || o.data_entrega;
      if (!date) return false;
      const d = parseISO(date);
      return isToday(d) || isTomorrow(d);
    });
    if (hojeTomorrow.length > 0) {
      items.push({
        type: 'info',
        icon: CalendarCheck,
        message: `${hojeTomorrow.length} entrega(s) programada(s) para hoje/amanhã: ${hojeTomorrow.slice(0, 3).map(o => o.cliente_nome).join(', ')}`,
      });
    }

    // Stalled (no update in 5+ days, not finalizado)
    const paradas = ativas.filter(o => {
      const lastUpdate = parseISO(o.updated_at);
      return differenceInDays(new Date(), lastUpdate) >= 5;
    });
    if (paradas.length > 0) {
      items.push({
        type: 'warning',
        icon: Clock,
        message: `${paradas.length} operação(ões) sem atualização há mais de 5 dias`,
      });
    }

    return items;
  }, [operacoes]);

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map((alert, i) => {
        const s = ALERT_STYLES[alert.type];
        return (
          <div
            key={i}
            style={{
              background: s.background,
              border: s.border,
              borderLeft: s.borderLeft,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <alert.icon style={{ width: 15, height: 15, color: s.iconColor, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: s.textColor, margin: 0, lineHeight: 1.4 }}>{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
