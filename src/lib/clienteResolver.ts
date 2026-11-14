// Helper para resolver o cliente_id ao salvar uma venda/pedido.
// Estratégia (em ordem):
//   1) Match por CPF (quando informado) — mais confiável, único por cadastro.
//   2) Match por nome + telefone — desempata homônimos.
//   3) Match único por nome.
//   4) Se múltiplos com o mesmo nome e sem outro critério, retorna null
//      (para evitar gravar o cliente errado).

interface ClienteLike {
  id: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
}

const onlyDigits = (v?: string | null) => (v || '').replace(/\D/g, '');

export function resolveClienteId(
  clientes: ClienteLike[],
  filtro: { nome?: string | null; cpf?: string | null; telefone?: string | null }
): string | null {
  if (!clientes?.length) return null;

  const cpf = onlyDigits(filtro.cpf);
  if (cpf) {
    const byCpf = clientes.find(c => onlyDigits(c.cpf) === cpf);
    if (byCpf) return byCpf.id;
  }

  const nome = (filtro.nome || '').trim().toLowerCase();
  if (!nome) return null;

  const sameName = clientes.filter(c => (c.nome || '').trim().toLowerCase() === nome);
  if (sameName.length === 1) return sameName[0].id;

  const tel = onlyDigits(filtro.telefone);
  if (sameName.length > 1 && tel) {
    const byTel = sameName.find(c => onlyDigits(c.telefone) === tel);
    if (byTel) return byTel.id;
  }

  // Sem critério para desempatar — não arrisca vincular ao errado.
  return sameName.length === 1 ? sameName[0].id : null;
}
