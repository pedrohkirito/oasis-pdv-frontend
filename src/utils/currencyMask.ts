/**
 * Converts raw input to a decimal number using RTL digit entry.
 * E.g. typing "350" → 3.50, "1000" → 10.00
 */
export const parseMaskedValue = (rawValue: string): number => {
  const digits = rawValue.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};

/**
 * Formats a number for display with 2 decimal places using Brazilian locale.
 * Returns empty string for 0/undefined/null.
 */
export const formatMaskedValue = (value: number | undefined | null): string => {
  if (!value || value === 0) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats a number for display, always showing value (including 0,00).
 */
export const formatMaskedValueAlways = (value: number | undefined | null): string => {
  const v = value ?? 0;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
