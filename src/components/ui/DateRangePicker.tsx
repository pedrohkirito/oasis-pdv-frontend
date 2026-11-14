import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  /** Largura mínima do trigger; default w-[260px] */
  triggerClassName?: string;
  numberOfMonths?: number;
}

const SHORTCUTS: { label: string; getRange: () => DateRange }[] = [
  {
    label: 'Hoje',
    getRange: () => {
      const h = new Date();
      return { from: startOfDay(h), to: endOfDay(h) };
    },
  },
  {
    label: 'Esta semana',
    getRange: () => {
      const h = new Date();
      return { from: startOfWeek(h, { locale: ptBR }), to: endOfWeek(h, { locale: ptBR }) };
    },
  },
  {
    label: '7 dias',
    getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: '30 dias',
    getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: 'Este mês',
    getRange: () => {
      const h = new Date();
      return { from: startOfMonth(h), to: endOfMonth(h) };
    },
  },
  {
    label: 'Mês anterior',
    getRange: () => {
      const h = subMonths(new Date(), 1);
      return { from: startOfMonth(h), to: endOfMonth(h) };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecione o período',
  className,
  triggerClassName,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const handleSelect = (range: DateRange | undefined) => {
    // Mantém o calendário aberto até 'to' ser selecionado.
    onChange?.(range);

    if (!range?.from) {
      setSelecting('start');
      return;
    }
    if (range.from && !range.to) {
      setSelecting('end');
      return;
    }
    if (range.from && range.to) {
      setOpen(false);
      setSelecting('start');
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined);
    setSelecting('start');
  };

  const label = (() => {
    if (!value?.from) return placeholder;
    if (value.from && !value.to) return `${format(value.from, 'dd/MM/yyyy')} → ...`;
    return `${format(value.from, 'dd/MM/yyyy')} → ${format(value.to!, 'dd/MM/yyyy')}`;
  })();

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelecting('start');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal w-[260px]',
            !value?.from && 'text-muted-foreground',
            triggerClassName,
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{label}</span>
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') clear(e as unknown as React.MouseEvent);
              }}
              className="ml-2 rounded-sm p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Limpar período"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        {/* Indicador de qual data está sendo selecionada */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'px-2 py-1 rounded-md font-medium',
                selecting === 'start' || !value?.from
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground border border-border',
              )}
            >
              {value?.from ? format(value.from, 'dd/MM/yyyy') : 'Data inicial'}
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={cn(
                'px-2 py-1 rounded-md font-medium',
                selecting === 'end' && !value?.to
                  ? 'bg-primary text-primary-foreground'
                  : value?.to
                  ? 'bg-background text-foreground border border-border'
                  : 'bg-background text-muted-foreground border border-dashed border-border',
              )}
            >
              {value?.to ? format(value.to, 'dd/MM/yyyy') : 'Data final'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {selecting === 'start' || !value?.from
              ? 'Clique na data inicial'
              : 'Agora clique na data final'}
          </span>
        </div>

        {/* Atalhos rápidos */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-border">
          {SHORTCUTS.map((s) => (
            <Button
              key={s.label}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onChange?.(s.getRange());
                setOpen(false);
                setSelecting('start');
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={handleSelect}
          locale={ptBR}
          numberOfMonths={numberOfMonths}
          className={cn('p-3 pointer-events-auto')}
        />

        {(value?.from || value?.to) && (
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange?.(undefined);
                setOpen(false);
                setSelecting('start');
              }}
            >
              Limpar filtro
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
