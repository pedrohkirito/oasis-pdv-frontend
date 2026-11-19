import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Operacao, getStatusLabel, getStatusColor } from '@/hooks/useOperacoes';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Truck, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperacoesCalendarProps {
  operacoes: Operacao[];
  onCardClick: (op: Operacao) => void;
}

export function OperacoesCalendar({ operacoes, onCardClick }: OperacoesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = getDay(days[0]);

  const getOpsForDay = (day: Date) => {
    return operacoes.filter(op => {
      if (op.data_prevista && isSameDay(new Date(op.data_prevista), day)) return true;
      if (op.data_entrega && isSameDay(new Date(op.data_entrega), day)) return true;
      if (op.data_montagem && isSameDay(new Date(op.data_montagem), day)) return true;
      return false;
    });
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {weekDays.map(d => (
            <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}

          {/* Empty cells for days before month start */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background p-2 min-h-[80px]" />
          ))}

          {days.map(day => {
            const ops = getOpsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'bg-background p-1.5 min-h-[80px] transition-colors',
                  isToday(day) && 'bg-primary/5',
                )}
              >
                <p className={cn(
                  'text-xs font-medium mb-1',
                  isToday(day) ? 'text-primary font-bold' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-0.5">
                  {ops.slice(0, 3).map(op => (
                    <button
                      key={op.id}
                      onClick={() => onCardClick(op)}
                      className={cn(
                        'w-full text-left px-1 py-0.5 rounded text-[10px] truncate flex items-center gap-0.5',
                        'hover:opacity-80 transition-opacity',
                        op.kind === 'entrega_montagem' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      )}
                    >
                      {op.kind === 'entrega_montagem' ? <Wrench className="h-2.5 w-2.5 shrink-0" /> : <Truck className="h-2.5 w-2.5 shrink-0" />}
                      <span className="truncate">{op.cliente_nome}</span>
                    </button>
                  ))}
                  {ops.length > 3 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{ops.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
