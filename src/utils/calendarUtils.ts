import { format } from 'date-fns';

interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  value: number;
  fornecedor?: string;
  categoria?: string;
}

/**
 * Formats a date to ICS format (YYYYMMDD)
 */
const formatICSDate = (date: Date): string => {
  return format(date, 'yyyyMMdd');
};

/**
 * Formats currency to Brazilian Real
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Escapes special characters for ICS format
 */
const escapeICS = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Generates a unique ID for the ICS event
 */
const generateUID = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@lafiore`;
};

/**
 * Creates an ICS file content for a calendar event
 */
export const generateICSContent = (event: CalendarEvent): string => {
  const { title, description, startDate, value, fornecedor, categoria } = event;
  
  const eventTitle = `💰 ${title} - ${formatCurrency(value)}`;
  
  let eventDescription = `Valor: ${formatCurrency(value)}`;
  if (fornecedor) {
    eventDescription += `\\nFornecedor: ${fornecedor}`;
  }
  if (categoria) {
    eventDescription += `\\nCategoria: ${categoria}`;
  }
  if (description) {
    eventDescription += `\\n\\n${description}`;
  }
  
  const dateStr = formatICSDate(startDate);
  const now = new Date();
  const dtStamp = format(now, "yyyyMMdd'T'HHmmss'Z'");
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LaFiore//Contas a Pagar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${generateUID()}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${escapeICS(eventTitle)}`,
    `DESCRIPTION:${escapeICS(eventDescription)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete: ${escapeICS(title)} vence amanhã`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
};

/**
 * Downloads an ICS file for the given event
 */
export const downloadICSFile = (event: CalendarEvent): void => {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `conta-${format(event.startDate, 'yyyy-MM-dd')}-${event.title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Generates ICS content for multiple events in a single file
 */
export const generateMultipleICSContent = (events: CalendarEvent[]): string => {
  const now = new Date();
  const dtStamp = format(now, "yyyyMMdd'T'HHmmss'Z'");
  
  const eventsContent = events.map(event => {
    const { title, description, startDate, value, fornecedor, categoria } = event;
    
    const eventTitle = `💰 ${title} - ${formatCurrency(value)}`;
    
    let eventDescription = `Valor: ${formatCurrency(value)}`;
    if (fornecedor) {
      eventDescription += `\\nFornecedor: ${fornecedor}`;
    }
    if (categoria) {
      eventDescription += `\\nCategoria: ${categoria}`;
    }
    if (description) {
      eventDescription += `\\n\\n${description}`;
    }
    
    const dateStr = formatICSDate(startDate);
    
    return [
      'BEGIN:VEVENT',
      `UID:${generateUID()}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${escapeICS(eventTitle)}`,
      `DESCRIPTION:${escapeICS(eventDescription)}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Lembrete: ${escapeICS(title)} vence amanhã`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LaFiore//Contas a Pagar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    eventsContent,
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
};

/**
 * Downloads an ICS file with multiple events
 */
export const downloadMultipleICSFile = (events: CalendarEvent[], filename?: string): void => {
  if (events.length === 0) return;
  
  const icsContent = generateMultipleICSContent(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `contas-pendentes-${format(new Date(), 'yyyy-MM-dd')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Creates a calendar event from a bill (conta a pagar)
 */
export const createCalendarEventFromConta = (conta: {
  descricao: string;
  valor: number;
  data_vencimento: string;
  fornecedor_nome?: string | null;
  categoria?: string | null;
  observacoes?: string | null;
}): CalendarEvent => {
  // Parse date string to Date object
  const [year, month, day] = conta.data_vencimento.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  
  return {
    title: conta.descricao,
    description: conta.observacoes || '',
    startDate,
    value: conta.valor,
    fornecedor: conta.fornecedor_nome || undefined,
    categoria: conta.categoria || undefined
  };
};
