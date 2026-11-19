// Serviços ficam na tabela `produtos` com `tipo = 'servico'`: não têm estoque,
// variações nem dados fiscais de mercadoria, e podem ser recorrentes.

export type TipoItem = 'produto' | 'servico';
export type RecorrenciaTipo = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export const RECORRENCIA_OPCOES: { value: RecorrenciaTipo; label: string; sufixo: string }[] = [
  { value: 'mensal', label: 'Mensal', sufixo: '/mês' },
  { value: 'trimestral', label: 'Trimestral', sufixo: '/trimestre' },
  { value: 'semestral', label: 'Semestral', sufixo: '/semestre' },
  { value: 'anual', label: 'Anual', sufixo: '/ano' },
];

/** Quantidade de períodos sugerida ao vender um serviço recorrente (1 ano). */
export const PERIODOS_PADRAO: Record<RecorrenciaTipo, number> = {
  mensal: 12,
  trimestral: 4,
  semestral: 2,
  anual: 1,
};

export function labelRecorrencia(tipo: string | null | undefined): string {
  return RECORRENCIA_OPCOES.find((o) => o.value === tipo)?.label ?? 'Avulso';
}

/** Sufixo de preço, ex.: "/mês". Vazio para serviço avulso ou produto. */
export function sufixoRecorrencia(item: {
  recorrente?: boolean | null;
  recorrencia_tipo?: string | null;
  recurring?: boolean | null;
  recurrence_kind?: string | null;
}): string {
  const recorrente = item.recorrente ?? item.recurring;
  const tipo = item.recorrencia_tipo ?? item.recurrence_kind;
  if (!recorrente) return '';
  return RECORRENCIA_OPCOES.find((o) => o.value === tipo)?.sufixo ?? '';
}

export function isServico(item: { tipo?: string | null; kind?: string | null } | null | undefined): boolean {
  return item?.tipo === 'servico' || item?.kind === 'servico';
}
