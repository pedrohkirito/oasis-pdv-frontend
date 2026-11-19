import { cn } from '@/lib/utils';

type Status =
  | 'pago' | 'paga' | 'concluido' | 'concluída' | 'concluida' | 'active' | 'ativa' | 'active' | 'finalizado'
  | 'pendente' | 'em_aberto' | 'aberto'
  | 'vencido' | 'vencida' | 'cancelado' | 'cancelada' | 'inativo' | 'inativa' | 'inactive'
  | 'aguardando' | 'processando' | 'em_andamento'
  | string;

const statusMap: Record<string, { label: string; className: string }> = {
  // Positivos — verde
  pago:       { label: 'Pago',       className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  paga:       { label: 'Paga',       className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  concluido:  { label: 'Concluído',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  concluída:  { label: 'Concluída',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  concluida:  { label: 'Concluída',  className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  active:      { label: 'Ativo',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ativa:      { label: 'Ativa',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  active:     { label: 'Ativo',      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  finalizado: { label: 'Finalizado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  transmitida:{ label: 'Transmitida',className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  autorizada: { label: 'Autorizada', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },

  // Neutros — amarelo
  pendente:      { label: 'Pendente',      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  em_aberto:     { label: 'Em aberto',     className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  aberto:        { label: 'Em aberto',     className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  aguardando:    { label: 'Aguardando',    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  processando:   { label: 'Processando',   className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  em_andamento:  { label: 'Em andamento',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  homologacao:   { label: 'Homologação',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },

  // Negativos — vermelho
  vencido:    { label: 'Vencido',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  vencida:    { label: 'Vencida',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelado:  { label: 'Cancelado',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelada:  { label: 'Cancelada',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  rejeitada:  { label: 'Rejeitada',  className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  denegada:   { label: 'Denegada',   className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },

  // Inativos — cinza
  inativo:  { label: 'Inativo',  className: 'bg-muted text-muted-foreground' },
  inativa:  { label: 'Inativa',  className: 'bg-muted text-muted-foreground' },
  inactive: { label: 'Inativo',  className: 'bg-muted text-muted-foreground' },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;      // sobrescreve o label automático
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = status?.toLowerCase().replace(/\s+/g, '_') ?? '';
  const config = statusMap[key] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap',
      config.className,
      className,
    )}>
      {label ?? config.label}
    </span>
  );
}
