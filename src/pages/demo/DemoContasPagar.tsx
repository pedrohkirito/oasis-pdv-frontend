/**
 * DemoContasPagar — versão estática para demonstração pública.
 * Dados 100% fictícios. NÃO conecta ao Supabase nem a nenhum hook de auth.
 * Rota: /demo/contas-a-pagar
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Search, Plus, CalendarPlus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Status = 'pago' | 'pendente' | 'vencido';

interface ContaDemo {
  id: number;
  descricao: string;
  categoria: string;
  status: Status;
  valor: number;
  vencimento: string;   // dd/MM/yyyy
  pagamento?: string;   // dd/MM/yyyy
  nf?: string;
  parcela?: string;
}

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const CONTAS: ContaDemo[] = [
  {
    id: 1,
    descricao: 'Aluguel Comercial',
    categoria: 'Outros',
    status: 'pago',
    valor: 3500.00,
    vencimento: '01/03/2026',
    pagamento: '05/03/2026',
  },
  {
    id: 2,
    descricao: 'Fornecedor Premium',
    categoria: 'Fornecedores',
    status: 'vencido',
    valor: 2100.00,
    vencimento: '04/03/2026',
    nf: '78901',
  },
  {
    id: 3,
    descricao: 'Energia Elétrica',
    categoria: 'Outros',
    status: 'pago',
    valor: 487.30,
    vencimento: '05/03/2026',
    pagamento: '10/03/2026',
  },
  {
    id: 4,
    descricao: 'Distribuidora XYZ',
    categoria: 'Fornecedores',
    status: 'pago',
    valor: 1800.00,
    vencimento: '10/03/2026',
    pagamento: '12/03/2026',
    nf: '45231',
    parcela: '2/3',
  },
  {
    id: 5,
    descricao: 'Internet e Telefone',
    categoria: 'Outros',
    status: 'pago',
    valor: 230.00,
    vencimento: '15/03/2026',
    pagamento: '19/03/2026',
  },
  {
    id: 6,
    descricao: 'Fornecedor Central',
    categoria: 'Fornecedores',
    status: 'pendente',
    valor: 3200.00,
    vencimento: '28/03/2026',
    nf: '99012',
  },
  {
    id: 7,
    descricao: 'Contador / Honorários',
    categoria: 'Serviços',
    status: 'pago',
    valor: 850.00,
    vencimento: '20/03/2026',
    pagamento: '22/03/2026',
  },
  {
    id: 8,
    descricao: 'Software e Licenças',
    categoria: 'Outros',
    status: 'pendente',
    valor: 420.00,
    vencimento: '31/03/2026',
  },
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Badge de status (idêntico ao original) ───────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    pago:     'bg-green-100 text-green-700 border-green-200',
    pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    vencido:  'bg-red-100   text-red-700   border-red-200',
  };
  const labels: Record<Status, string> = {
    pago: 'Pago', pendente: 'Pendente', vencido: 'Vencido',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Badge de categoria ───────────────────────────────────────────────────────

const categoriaColors: Record<string, string> = {
  Fornecedores: '#3b82f6',
  Serviços:     '#8b5cf6',
  Outros:       '#6b7280',
};

function CategoriaBadge({ categoria }: { categoria: string }) {
  const color = categoriaColors[categoria] ?? '#6b7280';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      <Tag className="h-2.5 w-2.5" />
      {categoria}
    </span>
  );
}

// ─── Alert de vencimento (mesmo visual do AlertasVencimento real) ──────────────

function AlertaDemo() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const proximas = [
    { descricao: 'Fornecedor A', valor: 1200,  dias: 1 },
    { descricao: 'Fornecedor B', valor: 2100,  dias: 2 },
    { descricao: 'Fornecedor C', valor: 980,   dias: 3 },
  ];

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: 'hsl(var(--warning) / 0.1)', borderColor: 'hsl(var(--warning) / 0.5)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'hsl(var(--warning))' }}>
          <Clock className="h-4 w-4" />
          Contas Próximas do Vencimento
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Fechar alerta"
        >
          ✕
        </button>
      </div>
      <p className="text-sm font-medium text-foreground mb-2">
        5 conta(s) vencem nos próximos 7 dias - Total: R$ 8.420,00
      </p>
      <div className="flex flex-wrap gap-2">
        {proximas.map((p) => (
          <span
            key={p.descricao}
            className="text-xs px-2 py-1 rounded-md border font-medium"
            style={{
              backgroundColor: 'hsl(var(--warning) / 0.2)',
              borderColor:     'hsl(var(--warning) / 0.3)',
              color:           'hsl(var(--warning))',
            }}
          >
            {p.descricao} - {fmtBRL(p.valor)} ({p.dias} dia(s))
          </span>
        ))}
        <span
          className="text-xs px-2 py-1 rounded-md border font-medium"
          style={{
            backgroundColor: 'hsl(var(--warning) / 0.2)',
            borderColor:     'hsl(var(--warning) / 0.3)',
            color:           'hsl(var(--warning))',
          }}
        >
          +2 mais
        </span>
      </div>
    </div>
  );
}

// ─── Linha de conta (idêntica à lista real) ───────────────────────────────────

function ContaRow({ conta }: { conta: ContaDemo }) {
  return (
    <div className="group flex items-center justify-between p-4 rounded-lg border border-border/60 hover:border-primary/20 bg-card/40 hover:bg-primary/5 backdrop-blur-sm transition-all duration-200">
      {/* Info esquerda */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <p className="font-medium flex items-center gap-2 flex-wrap">
            {conta.descricao}
            {conta.parcela && (
              <span className="text-xs text-muted-foreground font-normal">(Parcela {conta.parcela})</span>
            )}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span>Venc.: {conta.vencimento}</span>
            {conta.pagamento && (
              <span className="text-green-600">Pago em: {conta.pagamento}</span>
            )}
            {conta.nf && <span>NF: {conta.nf}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <CategoriaBadge categoria={conta.categoria} />
            <StatusBadge status={conta.status} />
          </div>
        </div>
      </div>

      {/* Valor direita */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className={cn(
          'text-base font-bold',
          conta.status === 'vencido'  && 'text-destructive',
          conta.status === 'pendente' && 'text-warning',
          conta.status === 'pago'     && 'text-foreground',
        )}>
          {fmtBRL(conta.valor)}
        </span>
      </div>
    </div>
  );
}

// ─── Página demo ──────────────────────────────────────────────────────────────

export default function DemoContasPagar() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | Status>('todos');

  const filteredContas = CONTAS.filter((c) => {
    const matchSearch = c.descricao.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Totalizadores
  const totalVencido  = CONTAS.filter(c => c.status === 'vencido') .reduce((s, c) => s + c.valor, 0);
  const totalPendente = CONTAS.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0);
  const totalPago     = CONTAS.filter(c => c.status === 'pago')    .reduce((s, c) => s + c.valor, 0);
  const total         = CONTAS.reduce((s, c) => s + c.valor, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Demo banner ──────────────────────────────────────────────────── */}
      <div className="bg-[#8E5FCF] text-white text-center text-xs py-2 font-medium tracking-wide">
        🔎 Modo Demonstração — dados fictícios para fins ilustrativos
      </div>

      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

        {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Contas a Pagar</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas obrigações financeiras</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2 text-xs" disabled>
              <CalendarPlus className="h-3.5 w-3.5" />
              Exportar Pendentes
            </Button>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl" disabled>
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* ── Alerta de vencimento ─────────────────────────────────────────── */}
        <AlertaDemo />

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar conta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['todos', 'pago', 'pendente', 'vencido'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'h-8 px-3 text-xs font-medium rounded-lg border transition-colors duration-200',
                  filterStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                )}
              >
                {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card principal com totalizadores + lista ──────────────────────── */}
        <Card className="rounded-xl shadow-md bg-white">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span>Contas a Pagar</span>
                <Badge variant="outline">{filteredContas.length} contas</Badge>
              </div>

              {/* Totalizadores — mesmo visual do original */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
                  <span className="text-destructive font-medium">Vencidas:</span>
                  <span className="text-destructive font-bold">{fmtBRL(totalVencido)}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/20">
                  <span className="text-warning font-medium">Pendentes:</span>
                  <span className="text-warning font-bold">{fmtBRL(totalPendente)}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                  <span className="text-green-600 font-medium">Pagas:</span>
                  <span className="text-green-600 font-bold">{fmtBRL(totalPago)}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                  <span className="text-primary font-medium">Total:</span>
                  <span className="text-primary font-bold">{fmtBRL(total)}</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {filteredContas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma conta encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContas.map((c) => (
                  <ContaRow key={c.id} conta={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Rodapé demo ──────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Esta é uma demonstração com dados fictícios.{' '}
          <a href="/login" className="text-primary hover:underline font-medium">
            Acesse o sistema real →
          </a>
        </p>
      </div>
    </div>
  );
}
