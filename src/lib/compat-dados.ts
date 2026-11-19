/** Traduz tabelas/colunas do schema antigo (pt) para o inglês do backend e devolve os dois nomes na resposta. */

const TABLE_ALIASES: Record<string, string> = {
  produtos: 'product',
  clientes: 'customer',
  fornecedores: 'supplier',
  empresas: 'company',
  categorias_produto: 'product_category',
  vendas: 'sale',
  itens_venda: 'sale_item',
  contas_receber: 'receivable',
  contas_pagar: 'payable',
};

const COLUMN_ALIASES: Record<string, string> = {
  nome: 'name',
  preco: 'price',
  custo: 'cost',
  estoque: 'stock',
  ativo: 'active',
  codigo: 'code',
  descricao: 'description',
  tipo: 'kind',
  categoria: 'category',
  cor: 'color',
  recorrente: 'recurring',
  telefone: 'phone',
  telefone_adicional: 'additional_phone',
  cpf: 'tax_id',
  cnpj: 'tax_id',
  endereco: 'street',
  bairro: 'district',
  cidade: 'city',
  estado: 'state',
  cep: 'postal_code',
  observacoes: 'notes',
  origem: 'source',
  valor: 'amount',
  empresa_id: 'company_id',
  quantidade: 'quantity',
};

const RESPONSE_PAIRS: Array<[string, string]> = [
  ['name', 'nome'],
  ['price', 'preco'],
  ['cost', 'custo'],
  ['stock', 'estoque'],
  ['active', 'ativo'],
  ['code', 'codigo'],
  ['description', 'descricao'],
  ['kind', 'tipo'],
  ['category', 'categoria'],
  ['color', 'cor'],
  ['recurring', 'recorrente'],
  ['phone', 'telefone'],
  ['additional_phone', 'telefone_adicional'],
  ['tax_id', 'cpf'],
  ['tax_id', 'cnpj'],
  ['street', 'endereco'],
  ['district', 'bairro'],
  ['city', 'cidade'],
  ['state', 'estado'],
  ['postal_code', 'cep'],
  ['notes', 'observacoes'],
  ['source', 'origem'],
  ['amount', 'valor'],
  ['company_id', 'empresa_id'],
  ['quantity', 'quantidade'],
];

const EMBED_ALIASES: Array<[string, string]> = [
  ['supplier', 'fornecedores'],
  ['sale', 'vendas'],
  ['product', 'produtos'],
  ['customer', 'clientes'],
];

function splitSelect(input: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function remapColumn(column: string) {
  return column
    .split('.')
    .map((part) => TABLE_ALIASES[part] ?? COLUMN_ALIASES[part] ?? part)
    .join('.');
}

function remapSelect(select: string) {
  if (!select || select.trim() === '*') return select;
  return splitSelect(select)
    .map((part) => {
      const match = part.match(/^([a-zA-Z0-9_]+)(![a-zA-Z]+)?(:[a-zA-Z0-9_]+)?\((.*)\)$/);
      if (match?.[1] && match[4] != null) {
        const table = TABLE_ALIASES[match[1]] ?? match[1];
        const inner = match[2] ?? '';
        const alias = match[3] ?? '';
        return `${table}${inner}${alias}(${remapSelect(match[4])})`;
      }
      return remapColumn(part);
    })
    .join(', ');
}

function remapKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(remapKeys);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[COLUMN_ALIASES[key] ?? key] = remapKeys(nested);
  }
  return out;
}

export function remapQuery<T extends {
  table: string;
  select?: string;
  filters?: { op: string; column: string; value: unknown }[];
  nots?: { op: string; column: string; value: unknown }[];
  order?: { column: string; ascending: boolean }[];
  values?: unknown;
}>(query: T): T {
  return {
    ...query,
    table: TABLE_ALIASES[query.table] ?? query.table,
    select: query.select ? remapSelect(query.select) : query.select,
    filters: query.filters?.map((filter) => ({ ...filter, column: remapColumn(filter.column) })),
    nots: query.nots?.map((filter) => ({ ...filter, column: remapColumn(filter.column) })),
    order: query.order?.map((item) => ({ ...item, column: remapColumn(item.column) })),
    values: query.values != null ? remapKeys(query.values) : query.values,
  };
}

export function aliasResponse(data: unknown): unknown {
  if (data == null) return data;
  if (Array.isArray(data)) return data.map(aliasResponse);
  if (typeof data !== 'object') return data;

  const row = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = aliasResponse(value);
  }
  for (const [english, portuguese] of RESPONSE_PAIRS) {
    if (out[english] == null && out[portuguese] != null) out[english] = out[portuguese];
    if (out[portuguese] == null && out[english] != null) out[portuguese] = out[english];
  }
  for (const [english, portuguese] of EMBED_ALIASES) {
    if (out[english] != null && out[portuguese] == null) out[portuguese] = out[english];
    if (out[portuguese] != null && out[english] == null) out[english] = out[portuguese];
  }
  return out;
}
