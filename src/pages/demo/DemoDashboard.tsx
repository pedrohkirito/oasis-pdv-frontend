/**
 * DemoDashboard — versão estática para demonstração pública.
 * Dados 100% fictícios. NÃO conecta à API nem a nenhum hook de auth.
 * Rota: /demo/dashboard
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, AlertCircle, Wallet, TrendingUp,
  ArrowUpRight, ClipboardList, Truck, Clock, Plus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  variation?: number;
  badge?: React.ReactNode;
}

function MetricCard({ label, value, sub, icon: Icon, iconBg, iconColor, variation, badge }: MetricCardProps) {
  return (
    <Card className="hover:-translate-y-0.5 transition-transform duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('p-3 rounded-xl', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div className="flex items-center gap-2">
            {variation != null && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-accent-positive/90 text-text-primary">
                <ArrowUpRight className="h-3 w-3" />
                {variation.toFixed(1)}%
              </span>
            )}
            {badge}
          </div>
        </div>
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-xs text-text-secondary mt-1.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Tooltip do gráfico ───────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="liquid-glass-strong px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-2 capitalize">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-text-secondary flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          {entry.name}:
          <span className="font-semibold text-foreground ml-1">{fmtBRL(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const CHART_DATA = [
  { mes: 'out', entradas: 12000, saidas: 9000  },
  { mes: 'nov', entradas: 18000, saidas: 14000 },
  { mes: 'dez', entradas: 22000, saidas: 16000 },
  { mes: 'jan', entradas: 31000, saidas: 21000 },
  { mes: 'fev', entradas: 48000, saidas: 28000 },
  { mes: 'mar', entradas: 38000, saidas: 22000 },
];

const OPERACOES = [
  { cliente: 'João Silva',   tipo: 'Entrega Agendada', status: 'pendente'      },
  { cliente: 'Maria Santos', tipo: 'Montagem',          status: 'em_andamento'  },
  { cliente: 'Pedro Costa',  tipo: 'Entrega Agendada', status: 'atrasado'      },
  { cliente: 'Ana Oliveira', tipo: 'Instalação',        status: 'pendente'      },
];

const CONTAS_VENCENDO = [
  { descricao: 'Aluguel Comercial',  valor: 3500.00, vencimento: '24/03' },
  { descricao: 'Fornecedor Premium', valor: 2100.00, vencimento: '25/03' },
  { descricao: 'Energia Elétrica',   valor: 487.30,  vencimento: '27/03' },
  { descricao: 'Internet',           valor: 230.00,  vencimento: '28/03' },
];

const VENDAS = [
  { id: '#1042', cliente: 'Maria S.',  valor: 847.00,  status: 'Concluída' },
  { id: '#1041', cliente: 'João P.',   valor: 1230.00, status: 'Concluída' },
  { id: '#1040', cliente: 'Ana L.',    valor: 520.00,  status: 'Concluída' },
  { id: '#1039', cliente: 'Carlos M.', valor: 390.00,  status: 'Pendente'  },
  { id: '#1038', cliente: 'Lucia F.',  valor: 860.00,  status: 'Concluída' },
];

const ALERTAS = [
  { descricao: 'Fornecedor A',      valor: 1200, dias: 1 },
  { descricao: 'Fornecedor B',      valor: 2100, dias: 2 },
  { descricao: 'Distribuidora XYZ', valor: 980,  dias: 3 },
  { descricao: 'Outros',            valor: 1340, dias: 5 },
];

// ─── Status badges ────────────────────────────────────────────────────────────

function OperacaoStatusBadge({ status }: { status: string }) {
  if (status === 'atrasado') {
    return <Badge variant="destructive" className="text-[10px] shrink-0">Atrasado</Badge>;
  }
  if (status === 'em_andamento') {
    return (
      <Badge
        variant="outline"
        className="text-[10px] shrink-0 bg-yellow-50 text-yellow-700 border-yellow-200"
      >
        Em andamento
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-[10px] shrink-0">Pendente</Badge>;
}

function VendaStatusBadge({ status }: { status: string }) {
  if (status === 'Concluída') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        Concluída
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
      Pendente
    </span>
  );
}

// ─── Alerta de vencimento ─────────────────────────────────────────────────────

function AlertaVencimento() {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: 'hsl(var(--warning) / 0.1)', borderColor: 'hsl(var(--warning) / 0.5)' }}
    >
      <div
        className="flex items-center gap-2 font-semibold text-sm mb-2"
        style={{ color: 'hsl(var(--warning))' }}
      >
        <Clock className="h-4 w-4" />
        Contas Próximas do Vencimento
      </div>
      <p className="text-sm font-medium text-foreground mb-2">
        5 conta(s) vencem nos próximos 7 dias — Total: R$ 8.420,00
      </p>
      <div className="flex flex-wrap gap-2">
        {ALERTAS.map((a) => (
          <span
            key={a.descricao}
            className="text-xs px-2 py-1 rounded-md border font-medium"
            style={{
              backgroundColor: 'hsl(var(--warning) / 0.2)',
              borderColor:     'hsl(var(--warning) / 0.3)',
              color:           'hsl(var(--warning))',
            }}
          >
            {a.descricao} — {fmtBRL(a.valor)} ({a.dias} dia(s))
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
          +1 mais
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard demo ───────────────────────────────────────────────────────────

export default function DemoDashboard() {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #F8F4FF 0%, #F0E6FF 40%, #FAF5FF 70%, #EEF2FF 100%)',
    }}>
      {/* Orbs decorativos — criam profundidade para o backdrop-filter funcionar */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: -160, right: -160, width: 600, height: 600, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(142,95,207,0.14) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', bottom: -120, left: -100, width: 500, height: 500, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)',
        filter: 'blur(40px)',
      }} />
      <div aria-hidden="true" style={{
        position: 'fixed', top: '40%', left: '30%', width: 400, height: 400, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(168,139,250,0.07) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />

      {/* Faixa demo */}
      <div className="relative z-10 bg-primary text-white text-center py-2 text-sm font-medium tracking-wide">
        🔎 Modo Demonstração — dados fictícios para fins ilustrativos
      </div>

      <div className="relative z-10 p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Bem-vindo de volta, Emanuel! 👋
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Segunda-Feira, 23 de Março de 2026
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
              disabled
            >
              <Plus className="h-4 w-4" />
              Nova Venda
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl border-border" disabled>
              <Plus className="h-4 w-4" />
              Conta a Pagar
            </Button>
          </div>
        </div>

        {/* ── Alerta de vencimento ─────────────────────────────────── */}
        <AlertaVencimento />

        {/* ── 4 Metric Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Vendas Hoje"
            value={fmtBRL(3847)}
            sub="28 vendas realizadas"
            icon={ShoppingCart}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <MetricCard
            label="Contas Vencidas"
            value={fmtBRL(2100)}
            sub="1 conta em atraso"
            icon={AlertCircle}
            iconBg="bg-destructive/10"
            iconColor="text-destructive"
            badge={
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                1
              </span>
            }
          />
          <MetricCard
            label="Saldo Disponível"
            value={fmtBRL(18432.50)}
            sub="Saldo positivo"
            icon={Wallet}
            iconBg="bg-success/10"
            iconColor="text-success"
          />
          <MetricCard
            label="Lucro do Mês"
            value={fmtBRL(12640)}
            sub={`vs ${fmtBRL(10243)} mês anterior`}
            icon={TrendingUp}
            iconBg="bg-success/10"
            iconColor="text-success"
            variation={23.4}
          />
        </div>

        {/* ── Gráfico + Sidebar ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Fluxo de Caixa */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Fluxo de Caixa</CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Entradas vs saídas nos últimos 6 meses
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#8E5FCF] inline-block" />
                    Entradas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#93C5FD] inline-block" />
                    Saídas
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CHART_DATA} barGap={4} barCategoryGap="30%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <ReTooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
                    />
                    <Bar
                      dataKey="entradas"
                      name="Entradas"
                      fill="#8E5FCF"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="saidas"
                      name="Saídas"
                      fill="#93C5FD"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Coluna lateral */}
          <div className="space-y-4">

            {/* Operações Pendentes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-warning" />
                  Operações Pendentes
                </CardTitle>
                <p className="text-xs text-text-secondary">Entregas e montagens em aberto</p>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {OPERACOES.map((op) => (
                  <div
                    key={op.cliente}
                    className="flex items-center justify-between w-full py-2 px-2 rounded-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-3 w-3 text-text-secondary shrink-0" />
                        <p className="text-sm font-medium truncate">{op.cliente}</p>
                      </div>
                      <p className="text-xs text-text-secondary truncate ml-[18px]">{op.tipo}</p>
                    </div>
                    <OperacaoStatusBadge status={op.status} />
                  </div>
                ))}
                <p className="w-full text-xs text-primary font-medium py-2 text-center">
                  Ver todas (12) →
                </p>
              </CardContent>
            </Card>

            {/* Contas Vencendo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Contas Vencendo
                </CardTitle>
                <p className="text-xs text-text-secondary">Próximos 7 dias</p>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {CONTAS_VENCENDO.map((conta) => (
                  <div
                    key={conta.descricao}
                    className="flex items-center justify-between w-full py-2 px-2 rounded-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{conta.descricao}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-destructive">{fmtBRL(conta.valor)}</p>
                      <Badge variant="outline" className="text-[10px]">{conta.vencimento}</Badge>
                    </div>
                  </div>
                ))}
                <p className="w-full text-xs text-destructive font-medium py-2 text-center">
                  Ver todas (5) →
                </p>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── Últimas Vendas ───────────────────────────────────────── */}
        <Card className="bg-white rounded-xl shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Vendas Recentes</CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">5 últimas vendas</p>
              </div>
              <span className="text-xs text-primary font-semibold cursor-default">
                Ver todas →
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wide px-6 py-3">
                      Venda
                    </th>
                    <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wide px-3 py-3">
                      Cliente
                    </th>
                    <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wide px-3 py-3">
                      Valor
                    </th>
                    <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wide px-6 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {VENDAS.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-primary/5 transition-colors duration-150"
                    >
                      <td className="px-6 py-3.5 text-text-secondary text-xs font-mono whitespace-nowrap">
                        {v.id}
                      </td>
                      <td className="px-3 py-3.5 font-medium text-foreground">
                        {v.cliente}
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-foreground whitespace-nowrap">
                        {fmtBRL(v.valor)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <VendaStatusBadge status={v.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Rodapé demo ──────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Esta é uma demonstração com dados fictícios.{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Acesse o sistema real →
          </Link>
        </p>

      </div>
    </div>
  );
}
