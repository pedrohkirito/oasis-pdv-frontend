import { Button } from '@/components/ui/button';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRangeShortcutsProps {
  onSelect: (range: { from: Date; to: Date }) => void;
}

export function DateRangeShortcuts({ onSelect }: DateRangeShortcutsProps) {
  const hoje = new Date();

  const shortcuts = [
    {
      label: 'Hoje',
      getRange: () => ({
        from: startOfDay(hoje),
        to: endOfDay(hoje),
      }),
    },
    {
      label: 'Esta semana',
      getRange: () => ({
        from: startOfWeek(hoje, { locale: ptBR }),
        to: endOfWeek(hoje, { locale: ptBR }),
      }),
    },
    {
      label: 'Este mês',
      getRange: () => ({
        from: startOfMonth(hoje),
        to: endOfMonth(hoje),
      }),
    },
    {
      label: 'Mês anterior',
      getRange: () => ({
        from: startOfMonth(subMonths(hoje, 1)),
        to: endOfMonth(subMonths(hoje, 1)),
      }),
    },
    {
      label: 'Mês seguinte',
      getRange: () => ({
        from: startOfMonth(addMonths(hoje, 1)),
        to: endOfMonth(addMonths(hoje, 1)),
      }),
    },
    {
      label: 'Últimos 30 dias',
      getRange: () => ({
        from: subDays(hoje, 29),
        to: hoje,
      }),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b">
      {shortcuts.map((shortcut) => (
        <Button
          key={shortcut.label}
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSelect(shortcut.getRange())}
        >
          {shortcut.label}
        </Button>
      ))}
    </div>
  );
}
