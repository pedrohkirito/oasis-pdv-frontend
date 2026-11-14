import { addDays, getDay, getYear, format } from 'date-fns';

// Calcula a data da Páscoa usando o algoritmo de Meeus/Jones/Butcher
const calcularPascoa = (ano: number): Date => {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
};

// Retorna os feriados nacionais brasileiros para um determinado ano
export const getFeriadosNacionais = (ano: number): Date[] => {
  const pascoa = calcularPascoa(ano);
  
  // Feriados fixos
  const feriadosFixos = [
    new Date(ano, 0, 1),   // Confraternização Universal
    new Date(ano, 3, 21),  // Tiradentes
    new Date(ano, 4, 1),   // Dia do Trabalho
    new Date(ano, 8, 7),   // Independência do Brasil
    new Date(ano, 9, 12),  // Nossa Senhora Aparecida
    new Date(ano, 10, 2),  // Finados
    new Date(ano, 10, 15), // Proclamação da República
    new Date(ano, 11, 25), // Natal
  ];

  // Feriados móveis (baseados na Páscoa)
  const feriadosMoveis = [
    addDays(pascoa, -47), // Carnaval (segunda)
    addDays(pascoa, -46), // Carnaval (terça)
    addDays(pascoa, -2),  // Sexta-feira Santa
    pascoa,               // Páscoa
    addDays(pascoa, 60),  // Corpus Christi
  ];

  return [...feriadosFixos, ...feriadosMoveis];
};

// Verifica se uma data é feriado nacional
export const isFeriadoNacional = (data: Date): boolean => {
  const ano = getYear(data);
  const feriados = getFeriadosNacionais(ano);
  const dataStr = format(data, 'yyyy-MM-dd');
  
  return feriados.some(feriado => format(feriado, 'yyyy-MM-dd') === dataStr);
};

// Verifica se uma data é dia útil (não é fim de semana nem feriado)
export const isDiaUtil = (data: Date): boolean => {
  const diaSemana = getDay(data);
  const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
  
  return !isFimDeSemana && !isFeriadoNacional(data);
};

// Ajusta a data de vencimento para o próximo dia útil
export const ajustarParaProximoDiaUtil = (data: Date): Date => {
  let dataAjustada = new Date(data);
  
  // Continua avançando enquanto não for dia útil
  while (!isDiaUtil(dataAjustada)) {
    dataAjustada = addDays(dataAjustada, 1);
  }
  
  return dataAjustada;
};
