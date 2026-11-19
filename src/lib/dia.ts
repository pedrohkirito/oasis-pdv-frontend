/** Data de calendário em horário local. Data inválida vira null em vez de estourar o date-fns. */
export function diaCalendario(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length < 10) return null;
  const dia = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const date = new Date(`${dia}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
