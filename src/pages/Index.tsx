import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight, ArrowDownRight,
  AlertCircle, Truck, ClipboardList, Plus, Wallet, Target,
  Upload, Download,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import {
  format, subMonths, startOfMonth, endOfMonth,
  isToday, isYesterday, startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { PdfImportDialog } from '@/components/pdf/PdfImportDialog';
import { Transaction } from '@/utils/pdfProcessor';
import { AlertasVencimento } from '@/components/AlertasVencimento';
import { getStatusLabel } from '@/hooks/useOperacoes';
import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition';
import { useLayoutActions } from '@/components/layout/LayoutActions';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useEmpresa } from '@/hooks/useEmpresa';
import { api } from '@/lib/api';
import { diaCalendario } from '@/lib/dia';
import { cn } from '@/lib/utils';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { Link } from 'react-router-dom';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Venda {
  id: string;
  amount?: number;
  sold_on?: string;
  customer_name?: string;
  products_summary?: string;
  payment_method?: string;
  seller_id?: string | null;
}

function diaVenda(venda: Venda) {
  return diaCalendario(venda.sold_on);
}

function diaConta(conta: { due_on?: string | null }) {
  return diaCalendario(conta.due_on);
}

function valorDe(registro: { amount?: unknown }) {
  const n = Number(registro.amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ─── Widget Saúde Financeira ──────────────────────────────────────────────────

function WidgetSaudeFinanceira() {
  const { buscarVisaoGeral, buscarFluxoProjetado } = useFinanceiro()
  const [visao, setVisao] = React.useState<any>(null)
  const [fluxo, setFluxo] = React.useState<any>(null)
  const [carregando, setCarregando] = React.useState(true)

  React.useEffect(() => {
    Promise.all([buscarVisaoGeral(), buscarFluxoProjetado(30)]).then(([v, f]) => {
      setVisao(v)
      setFluxo(f)
      setCarregando(false)
    })
  }, [])

  const fmtBRL2 = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Mini barras últimos 7 dias a partir dos dados do mês
  const miniBarras = visao
    ? (visao.diasDoMes || []).slice(-7).map((d: any, i: number) => ({
        dia: i + 1,
        v: d.entradas,
        s: d.saidas,
      }))
    : []

  // Saldo projetado 30 dias
  const saldoProjetado = fluxo
    ? fluxo.semanas.reduce((s: number, sem: any) => s + sem.saldo, 0)
    : 0

  // Progresso do mês (dia atual / dias no mês)
  const hoje = new Date()
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const pctMes = Math.round((hoje.getDate() / diasNoMes) * 100)

  if (carregando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="liquid-glass-white p-5 space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Saúde Financeira
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 — Resultado Operacional */}
        <div className="liquid-glass-white p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Resultado Operacional
          </p>
          <p className={`text-2xl font-bold ${(visao?.saldoOperacional || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtBRL2(visao?.saldoOperacional || 0)}
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: (visao?.margem || 0) >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: (visao?.margem || 0) >= 0 ? '#10B981' : '#EF4444',
            borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 600, width: 'fit-content',
          }}>
            Margem {(visao?.margem || 0).toFixed(1)}%
          </span>

          {/* Mini gráfico */}
          {miniBarras.length > 0 && (
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={miniBarras} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barGap={1}>
                <Bar dataKey="v" fill="#10B981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="s" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <Link to="/financeiro" className="text-xs text-primary font-medium hover:underline mt-auto">
            Ver detalhes →
          </Link>
        </div>

        {/* Card 2 — Próximas Saídas */}
        <div className="liquid-glass-white p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Vence nos próximos 7 dias
          </p>
          <p className="text-2xl font-bold text-red-600">
            {fmtBRL2(
              (fluxo?.pagarFuturas || [])
                .slice(0, 7)
                .reduce((s: number, c: any) => s + (c.valor || 0), 0)
            )}
          </p>

          <div className="space-y-1.5 flex-1">
            {(fluxo?.pagarFuturas || []).slice(0, 3).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground max-w-[120px]">
                  {c.descricao || 'Conta'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-red-600">{fmtBRL2(c.valor)}</span>
                  <span className="text-muted-foreground/60">{c.due_on?.slice(5).replace('-', '/')}</span>
                </div>
              </div>
            ))}
            {(fluxo?.pagarFuturas || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma saída prevista</p>
            )}
          </div>

          <Link to="/contas-a-pagar" className="text-xs text-primary font-medium hover:underline mt-auto">
            Ver todas →
          </Link>
        </div>

        {/* Card 3 — Fluxo Projetado */}
        <div className="liquid-glass-white p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Caixa em 30 dias
          </p>
          <p className={`text-2xl font-bold ${saldoProjetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtBRL2(saldoProjetado)}
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: saldoProjetado >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: saldoProjetado >= 0 ? '#10B981' : '#EF4444',
            borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 600, width: 'fit-content',
          }}>
            {saldoProjetado >= 0 ? '✅ Positivo' : '🚨 Atenção'}
          </span>

          {/* Mini linha do tempo */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Hoje</span>
              <span>30 dias</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pctMes}%`,
                  background: saldoProjetado >= 0
                    ? 'linear-gradient(90deg,#10B981,#34D399)'
                    : 'linear-gradient(90deg,#EF4444,#F87171)',
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pctMes}% do mês executado</p>
          </div>

          <Link to="/financeiro" className="text-xs text-primary font-medium hover:underline mt-auto">
            Ver projeção →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Componente MetricCard ────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  iconGradient?: string;
  accentGradient?: string;
  variation?: number | null;
  badge?: React.ReactNode;
  loading?: boolean;
}


function MetricCard({
  label, value, sub, icon: Icon, iconBg, iconColor, iconGradient, accentGradient, variation, badge, loading,
}: MetricCardProps) {
  const [hovered, setHovered] = React.useState(false);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(142,95,207,0.12)',
    borderRadius: '20px',
    boxShadow: hovered
      ? '0 16px 48px rgba(71,17,143,0.14)'
      : '0 8px 32px rgba(71,17,143,0.08)',
    padding: '24px',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
  };

  if (loading) {
    return (
      <div style={{ ...cardStyle, transform: 'none' }}>
        {accentGradient && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accentGradient, borderRadius: '20px 20px 0 0' }} />
        )}
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-36 mt-3 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {accentGradient && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accentGradient, borderRadius: '20px 20px 0 0' }} />
      )}
      {/* Linha 1: label + ícone */}
      <div className="flex items-start justify-between">
        <p className="text-muted-foreground" style={{
          fontSize: '0.7rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {label}
        </p>
        {iconGradient ? (
          <div style={{
            background: iconGradient,
            width: '40px', height: '40px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={18} color="white" strokeWidth={1.5} />
          </div>
        ) : (
          <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        )}
      </div>

      {/* Valor principal */}
      <p className="text-foreground" style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '12px', lineHeight: 1.2 }}>
        {value}
      </p>

      {/* Linha 3: badge + sub */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {variation != null && (
          <span style={{
            background: variation >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${variation >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: variation >= 0 ? '#10B981' : '#EF4444',
            borderRadius: '100px', padding: '3px 10px',
            fontSize: '0.75rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: '3px',
          }}>
            {variation >= 0
              ? <ArrowUpRight className="h-3 w-3" />
              : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(variation).toFixed(1)}%
          </span>
        )}
        {badge}
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── MiniGauge ───────────────────────────────────────────────────────────────

function MiniGauge({ value, color }: { value: number; color: string }) {
  return (
    <span style={{
      background: 'rgba(142,95,207,0.1)',
      border: '1px solid rgba(142,95,207,0.2)',
      color: color,
      borderRadius: '100px', padding: '3px 10px',
      fontSize: '0.75rem', fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: '3px',
    }}>
      <ArrowUpRight className="h-3 w-3" />
      {value}%
    </span>
  );
}

// ─── Tooltip do gráfico ───────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(142,95,207,0.2)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      fontFamily: 'Gilroy',
      fontSize: '0.875rem',
    }}>
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

// ─── Badge de método de pagamento ────────────────────────────────────────────

function MetodoBadge({ metodo }: { metodo?: string }) {
  const map: Record<string, { label: string; class: string }> = {
    dinheiro:  { label: 'Dinheiro',  class: 'bg-success/10 text-success' },
    cartao:    { label: 'Cartão',    class: 'bg-primary/10 text-primary' },
    pix:       { label: 'PIX',       class: 'bg-accent-positive/80 text-text-primary' },
    boleto:    { label: 'Boleto',    class: 'bg-warning/20 text-warning-foreground' },
    fiado:     { label: 'Fiado',     class: 'bg-destructive/10 text-destructive' },
  };
  const m = metodo?.toLowerCase() ?? '';
  const style = map[m] ?? { label: metodo || '—', class: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', style.class)}>
      {style.label}
    </span>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, canViewModule } = useUserRole();
  const { companyId, empresaSelecionada, empresas, loading: empresaLoading } = useEmpresa();
  const navigate = useNavigate();
  const { setActions } = useLayoutActions();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceberVencidas, setContasReceberVencidas] = useState<any[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [operacoesPendentes, setOperacoesPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin    = role === 'admin';
  const isGerente  = role === 'manager';
  const isRestrito = role === 'seller' || role === 'viewer';
  const podeVerFinanceiro = isAdmin || isGerente;

  // ── Redirect ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !empresaLoading && user && !empresaSelecionada && empresas.length > 1) {
      navigate('/selecionar-empresa');
    }
  }, [user, authLoading, empresaLoading, empresaSelecionada, empresas, navigate]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user && companyId) {
      setLoading(true);
      const fetches = [fetchVendas(), fetchOperacoesPendentes()];
      if (podeVerFinanceiro) fetches.push(fetchContasPagar(), fetchContasReceberVencidas());
      Promise.all(fetches).finally(() => setLoading(false));
    }
  }, [user, companyId, role]);

  const fetchVendas = async () => {
    if (!companyId) return;
    let query = api.from('sale').select('*').eq('company_id', companyId);
    if (isRestrito && user) {
      query = query.eq('seller_id', user.id);
    }
    const { data } = await query.order('sold_on', { ascending: false });
    setVendas(data || []);
  };

  const fetchContasPagar = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('payable').select('*')
      .eq('company_id', companyId)
      .order('due_on', { ascending: false });
    setContasPagar(data || []);
  };

  const fetchContasReceberVencidas = async () => {
    if (!companyId) return;
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await api
      .from('receivable')
      .select('id, descricao, customer_name, valor, received_amount, due_on')
      .eq('company_id', companyId)
      .eq('status', 'vencido')
      .order('due_on', { ascending: true });
    setContasReceberVencidas(data || []);
  };

  const fetchOperacoesPendentes = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('operation').select('*')
      .eq('company_id', companyId)
      .not('status', 'eq', 'finalizado')
      .order('expected_on', { ascending: true, nullsFirst: false });
    setOperacoesPendentes(data || []);
  };

  // ── Métricas derivadas ────────────────────────────────────────────────────

  const hoje = new Date();

  // Vendas hoje vs ontem
  const vendasHojeTotal = useMemo(() =>
    vendas
      .filter(v => {
        const dia = diaVenda(v);
        return dia != null && isToday(dia);
      })
      .reduce((s, v) => s + valorDe(v), 0),
  [vendas]);

  const vendasOntemTotal = useMemo(() =>
    vendas
      .filter(v => {
        const dia = diaVenda(v);
        return dia != null && isYesterday(dia);
      })
      .reduce((s, v) => s + valorDe(v), 0),
  [vendas]);

  const variacaoHoje = vendasOntemTotal > 0
    ? ((vendasHojeTotal - vendasOntemTotal) / vendasOntemTotal) * 100
    : null;

  // Contas vencidas (status pendente + data passada)
  const contasVencidas = useMemo(() =>
    contasPagar.filter(c => {
      const venc = diaConta(c);
      return c.status === 'pendente' && venc != null && venc < startOfDay(hoje);
    }),
  [contasPagar]);

  const totalVencidasValor = contasVencidas.reduce((s, c) => s + valorDe(c), 0);

  // Saldo disponível
  const totalExpenses = contasPagar.filter(c => c.status === 'pago').reduce((s, c) => s + valorDe(c), 0);
  const totalVendas   = vendas.reduce((s, v) => s + valorDe(v), 0);
  const currentBalance = totalVendas - totalExpenses;

  // Lucro do mês atual vs anterior
  const inicioMes  = startOfMonth(hoje);
  const fimMes     = endOfMonth(hoje);
  const inicioMesAnterior = startOfMonth(subMonths(hoje, 1));
  const fimMesAnterior    = endOfMonth(subMonths(hoje, 1));

  const lucroMes = useMemo(() => {
    const entrada = vendas.filter(v => {
      const d = diaVenda(v);
      return d != null && d >= inicioMes && d <= fimMes;
    }).reduce((s, v) => s + valorDe(v), 0);

    const saida = contasPagar.filter(c => {
      const d = diaConta(c);
      return d != null && d >= inicioMes && d <= fimMes && c.status === 'pago';
    }).reduce((s, c) => s + valorDe(c), 0);

    return entrada - saida;
  }, [vendas, contasPagar]);

  const lucroMesAnterior = useMemo(() => {
    const entrada = vendas.filter(v => {
      const d = diaVenda(v);
      return d != null && d >= inicioMesAnterior && d <= fimMesAnterior;
    }).reduce((s, v) => s + valorDe(v), 0);

    const saida = contasPagar.filter(c => {
      const d = diaConta(c);
      return d != null && d >= inicioMesAnterior && d <= fimMesAnterior && c.status === 'pago';
    }).reduce((s, c) => s + valorDe(c), 0);

    return entrada - saida;
  }, [vendas, contasPagar]);

  // Dados do gráfico de evolução (6 meses)
  const dadosEvolucao = useMemo(() => {
    const vendasFiltradas = isRestrito ? vendas.filter(v => v.seller_id === user?.id) : vendas;
    return Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(hoje, 5 - i);
      const inicio = startOfMonth(mes);
      const fim    = endOfMonth(mes);
      const entradas = vendasFiltradas.filter(v => {
        const d = diaVenda(v);
        return d != null && d >= inicio && d <= fim;
      }).reduce((s, v) => s + valorDe(v), 0);
      const saidas = contasPagar.filter(c => {
        const d = diaConta(c);
        return d != null && d >= inicio && d <= fim && c.status === 'pago';
      }).reduce((s, c) => s + valorDe(c), 0);
      return {
        mes: format(mes, 'MMM', { locale: ptBR }),
        entradas,
        ...(podeVerFinanceiro && { saidas }),
      };
    });
  }, [vendas, contasPagar, isRestrito, podeVerFinanceiro, user]);

  // Contas vencendo nos próximos 7 dias
  const contasVencendo = contasPagar.filter(c => {
    if (c.status !== 'pendente') return false;
    const venc = diaConta(c);
    if (!venc) return false;
    const diff = (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  // Total pendente
  // Vendas exibidas (restrito vê só as suas)
  const vendasExibidas = isRestrito ? vendas.filter(v => v.seller_id === user?.id) : vendas;

  // Nome do usuário
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'usuário';

  // ── Header actions (admin) ────────────────────────────────────────────────

  useEffect(() => {
    if (!isAdmin) { setActions(null); return; }
    setActions(
      <>
        <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
        <Button size="sm" variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </>
    );
    return () => setActions(null);
  }, [setActions, isAdmin]);

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
      position: 'relative',
    }}>
      {/* Orb roxo */}
      <div style={{
        position: 'fixed', top: '-200px', left: '-200px',
        width: '600px', height: '600px', borderRadius: '50%',
        background: '#8E5FCF', opacity: 0.06,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      {/* Orb amarelo */}
      <div style={{
        position: 'fixed', bottom: '-150px', right: '-150px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: '#FAF66B', opacity: 0.04,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      <div className="p-8 space-y-6" style={{ position: 'relative', zIndex: 1 }}>

          {/* ── Welcome header + Quick Actions ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: '6px' }}>
                Oasis › Dashboard
              </p>
              <h1 style={{
                fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
                background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', lineHeight: 1.2,
              }}>
                Bem-vindo de volta, {userName}! 👋
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: '4px' }}>
                Visão geral do seu negócio
              </p>
            </div>

          </motion.div>

          {/* ── Alertas de vencimento (admin/gerente) ── */}
          {podeVerFinanceiro && <AlertasVencimento />}

          {/* ── 4 Metric Cards ── */}
          {canViewModule('dashboard_kpis') && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Vendas Hoje */}
            <motion.div variants={staggerItem}>
              <MetricCard
                loading={loading}
                label="Vendas Hoje"
                value={fmtBRL(vendasHojeTotal)}
                sub={`${vendas.filter(v => {
                  const dia = diaVenda(v);
                  return dia != null && isToday(dia);
                }).length} vendas realizadas`}
                icon={ShoppingCart}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                iconGradient="linear-gradient(135deg, #8E5FCF, #B987FF)"
                accentGradient="linear-gradient(90deg, #8E5FCF, #B987FF)"
                variation={variacaoHoje}
              />
            </motion.div>

            {/* Contas a Pagar Vencidas — só financeiro */}
            {podeVerFinanceiro ? (
              <motion.div variants={staggerItem}>
                <MetricCard
                  loading={loading}
                  label="Contas Vencidas"
                  value={fmtBRL(totalVencidasValor)}
                  sub={`${contasVencidas.length} conta${contasVencidas.length !== 1 ? 's' : ''} em atraso`}
                  icon={AlertCircle}
                  iconBg="bg-destructive/10"
                  iconColor="text-destructive"
                  iconGradient="linear-gradient(135deg, #F59E0B, #FCD34D)"
                  accentGradient="linear-gradient(90deg, #3B82F6, #93C5FD)"
                  badge={
                    contasVencidas.length > 0 ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                        {contasVencidas.length}
                      </span>
                    ) : undefined
                  }
                />
              </motion.div>
            ) : (
              <motion.div variants={staggerItem}>
                {/* TODO: conectar à API — métrica de metas do vendedor */}
                <MetricCard
                  loading={loading}
                  label="Minhas Vendas (mês)"
                  value={fmtBRL(vendas.filter(v => {
                    const d = diaVenda(v);
                    return d != null && d >= inicioMes && d <= fimMes && v.seller_id === user?.id;
                  }).reduce((s, v) => s + valorDe(v), 0))}
                  sub="Vendas do mês corrente"
                  icon={TrendingUp}
                  iconBg="bg-success/10"
                  iconColor="text-success"
                  accentGradient="linear-gradient(90deg, #3B82F6, #93C5FD)"
                />
              </motion.div>
            )}

            {/* Saldo Disponível — só financeiro */}
            {podeVerFinanceiro ? (
              <motion.div variants={staggerItem}>
                <MetricCard
                  loading={loading}
                  label="Saldo Disponível"
                  value={fmtBRL(currentBalance)}
                  sub={currentBalance >= 0 ? 'Saldo positivo' : 'Atenção: saldo negativo'}
                  icon={Wallet}
                  iconBg={currentBalance >= 0 ? 'bg-success/10' : 'bg-destructive/10'}
                  iconColor={currentBalance >= 0 ? 'text-success' : 'text-destructive'}
                  iconGradient="linear-gradient(135deg, #10B981, #6EE7B7)"
                  accentGradient="linear-gradient(90deg, #10B981, #6EE7B7)"
                />
              </motion.div>
            ) : (
              <motion.div variants={staggerItem}>
                {/* TODO: conectar à API — operações pendentes do vendedor */}
                <MetricCard
                  loading={loading}
                  label="Ops. Pendentes"
                  value={String(operacoesPendentes.length)}
                  sub="Entregas e montagens abertas"
                  icon={ClipboardList}
                  iconBg="bg-warning/10"
                  iconColor="text-warning"
                  accentGradient="linear-gradient(90deg, #10B981, #6EE7B7)"
                />
              </motion.div>
            )}

            {/* Lucro do Mês — só financeiro */}
            {podeVerFinanceiro ? (
              <motion.div variants={staggerItem}>
                <MetricCard
                  loading={loading}
                  label="Lucro do Mês"
                  value={fmtBRL(lucroMes)}
                  sub={`vs ${fmtBRL(lucroMesAnterior)} mês anterior`}
                  icon={lucroMes >= 0 ? TrendingUp : TrendingDown}
                  iconBg={lucroMes >= 0 ? 'bg-success/10' : 'bg-destructive/10'}
                  iconColor={lucroMes >= 0 ? 'text-success' : 'text-destructive'}
                  iconGradient="linear-gradient(135deg, #3B82F6, #93C5FD)"
                  accentGradient="linear-gradient(90deg, #F59E0B, #FCD34D)"
                  badge={<MiniGauge value={23} color="#8E5FCF" />}
                />
              </motion.div>
            ) : (
              <motion.div variants={staggerItem}>
                {/* TODO: conectar à API — comissão do vendedor no mês */}
                <MetricCard
                  loading={loading}
                  label="Total de Vendas"
                  value={fmtBRL(totalVendas)}
                  sub={`${vendas.length} vendas no sistema`}
                  icon={Target}
                  iconBg="bg-primary/10"
                  iconColor="text-primary"
                  accentGradient="linear-gradient(90deg, #F59E0B, #FCD34D)"
                />
              </motion.div>
            )}
          </motion.div>
          )}

          {/* ── Gráfico + Lateral ── */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
          >

            {canViewModule('dashboard_fluxo_caixa') && (
            <motion.div
              className="liquid-glass-white lg:col-span-2"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Fluxo de Caixa</CardTitle>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {podeVerFinanceiro
                        ? 'Entradas vs saídas nos últimos 6 meses'
                        : 'Suas vendas nos últimos 6 meses'}
                    </p>
                  </div>
                  {/* Legenda */}
                  <div className="hidden sm:flex items-center gap-2">
                    <span style={{
                      background: 'rgba(142,95,207,0.1)', border: '1px solid rgba(142,95,207,0.2)',
                      color: '#8E5FCF', borderRadius: '100px', padding: '4px 12px',
                      fontSize: '0.72rem', fontWeight: 600,
                    }}>
                      Entradas
                    </span>
                    {podeVerFinanceiro && (
                      <span style={{
                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                        color: '#3B82F6', borderRadius: '100px', padding: '4px 12px',
                        fontSize: '0.72rem', fontWeight: 600,
                      }}>
                        Saídas
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {loading ? (
                    <div className="h-full flex items-end gap-3 pb-4 pt-2">
                      {[60, 80, 45, 90, 55, 75].map((h, i) => (
                        <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosEvolucao} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Gilroy' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Gilroy' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          width={40}
                        />
                        <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))', radius: 4 }} />
                        <Bar dataKey="entradas" name="Entradas" fill="#8E5FCF" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        {podeVerFinanceiro && (
                          <Bar dataKey="saidas" name="Saídas" fill="#4A9EFF" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </motion.div>
            )}

            {/* Coluna lateral direita */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
            >

              {/* Operações Pendentes */}
              {canViewModule('dashboard_operacoes_pendentes') && (
              <div className="liquid-glass-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'linear-gradient(135deg, #F59E0B, #FCD34D)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <ClipboardList size={14} color="white" strokeWidth={1.5} />
                    </div>
                    Operações Pendentes
                  </CardTitle>
                  <p className="text-xs text-text-secondary">Entregas e montagens em aberto</p>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
                    </div>
                  ) : operacoesPendentes.length > 0 ? (
                    <>
                      {operacoesPendentes.slice(0, 4).map((op) => {
                        const dataPrevista = op.expected_on ? new Date(op.expected_on) : null;
                        const vencida = dataPrevista && dataPrevista < hoje;
                        return (
                          <button
                            key={op.id}
                            onClick={() => navigate('/operacoes', { state: { openOperacaoId: op.id } })}
                            className="flex items-center justify-between w-full py-2 px-2 rounded-xl hover:bg-primary/5 transition-colors text-left group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Truck className="h-3 w-3 text-text-secondary shrink-0" />
                                <p className="text-sm font-medium truncate">{op.customer_name}</p>
                              </div>
                              <p className="text-xs text-text-secondary truncate ml-[18px]">{getStatusLabel(op.status)}</p>
                            </div>
                            <span style={{
                              background: vencida ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                              border: `1px solid ${vencida ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                              color: vencida ? '#EF4444' : '#F59E0B',
                              borderRadius: '100px', padding: '2px 8px',
                              fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                            }}>
                              {dataPrevista
                                ? (vencida ? 'Atrasada' : format(dataPrevista, 'dd/MM', { locale: ptBR }))
                                : 'Sem data'}
                            </span>
                          </button>
                        );
                      })}
                      {operacoesPendentes.length > 4 && (
                        <button
                          onClick={() => navigate('/operacoes')}
                          className="w-full text-xs text-primary hover:text-primary/80 font-medium py-2 text-center transition-colors"
                        >
                          Ver todas ({operacoesPendentes.length}) →
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-text-secondary text-center py-4">Nenhuma operação pendente</p>
                  )}
                </CardContent>
              </div>
              )}

              {/* Contas Vencendo — só financeiro */}
              {podeVerFinanceiro && canViewModule('dashboard_contas_vencendo') && (
                <div className="liquid-glass-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'linear-gradient(135deg, #EF4444, #F87171)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <AlertCircle size={14} color="white" strokeWidth={1.5} />
                      </div>
                      Contas Vencendo
                    </CardTitle>
                    <p className="text-xs text-text-secondary">Próximos 7 dias</p>
                  </CardHeader>
                  <CardContent className="space-y-0.5">
                    {loading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
                      </div>
                    ) : contasVencendo.length > 0 ? (
                      <>
                        {contasVencendo.slice(0, 4).map((conta) => {
                          const venc = diaConta(conta);
                          const vencida = venc != null && venc < hoje;
                          return (
                            <button
                              key={conta.id}
                              onClick={() => navigate('/contas-a-pagar')}
                              className="flex items-center justify-between w-full py-2 px-2 rounded-xl hover:bg-destructive/5 transition-colors text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{conta.descricao}</p>
                                <p className="text-xs text-text-secondary truncate">{conta.supplier_name}</p>
                              </div>
                              <div className="text-right ml-3 shrink-0">
                                <p className="text-sm font-semibold text-destructive">{fmtBRL(valorDe(conta))}</p>
                                <span style={{
                                  background: vencida ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                  border: `1px solid ${vencida ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                  color: vencida ? '#EF4444' : '#10B981',
                                  borderRadius: '100px', padding: '2px 8px',
                                  fontSize: '0.68rem', fontWeight: 600,
                                }}>
                                  {vencida ? 'Vencida' : format(venc, 'dd/MM', { locale: ptBR })}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                        {contasVencendo.length > 4 && (
                          <button
                            onClick={() => navigate('/contas-a-pagar')}
                            className="w-full text-xs text-destructive hover:text-destructive/80 font-medium py-2 text-center transition-colors"
                          >
                            Ver todas ({contasVencendo.length}) →
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-text-secondary text-center py-4">Nenhuma conta vencendo</p>
                    )}
                  </CardContent>
                </div>
              )}

              {/* Contas a Receber Vencidas */}
              {podeVerFinanceiro && canViewModule('dashboard_receber_vencidas') && contasReceberVencidas.length > 0 && (
                <div className="liquid-glass-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <TrendingUp size={14} color="white" strokeWidth={1.5} />
                      </div>
                      A Receber Vencidas
                    </CardTitle>
                    <p className="text-xs text-text-secondary">Contas em atraso</p>
                  </CardHeader>
                  <CardContent className="space-y-0.5">
                    {contasReceberVencidas.slice(0, 4).map((conta) => {
                      const saldo = Number(conta.valor) - Number(conta.received_amount || 0);
                      return (
                        <button
                          key={conta.id}
                          onClick={() => navigate('/contas-receber')}
                          className="flex items-center justify-between w-full py-2 px-2 rounded-xl hover:bg-emerald-500/5 transition-colors text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{conta.descricao}</p>
                            <p className="text-xs text-text-secondary truncate">{conta.customer_name || '—'}</p>
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p className="text-sm font-semibold" style={{ color: '#10B981' }}>{fmtBRL(saldo)}</p>
                            <span style={{
                              background: 'rgba(59,130,246,0.1)',
                              border: '1px solid rgba(59,130,246,0.2)',
                              color: '#3B82F6',
                              borderRadius: '100px', padding: '2px 8px',
                              fontSize: '0.68rem', fontWeight: 600,
                            }}>
                              Vencida
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {contasReceberVencidas.length > 4 && (
                      <button
                        onClick={() => navigate('/contas-receber')}
                        className="w-full text-xs font-medium py-2 text-center transition-colors"
                        style={{ color: '#10B981' }}
                      >
                        Ver todas ({contasReceberVencidas.length}) →
                      </button>
                    )}
                  </CardContent>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* ── Vendas Recentes ── */}
          {canViewModule('dashboard_vendas_recentes') && (
          <motion.div
            className="liquid-glass-white"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Vendas Recentes</CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {isRestrito
                      ? `${vendasExibidas.length} suas vendas`
                      : `${vendas.length} vendas no total`}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/vendas')}
                  className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Ver todas →
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="px-6 space-y-3 pb-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <div className="space-y-2 items-end flex flex-col">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : vendasExibidas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wide px-6 py-3">Data</th>
                        <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wide px-3 py-3">Cliente</th>
                        <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wide px-3 py-3 hidden md:table-cell">Produtos</th>
                        <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wide px-3 py-3 hidden sm:table-cell">Pagamento</th>
                        <th className="text-right text-xs font-semibold text-text-secondary uppercase tracking-wide px-6 py-3">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendasExibidas.slice(0, 7).map((venda: any) => (
                        <tr key={venda.id} className="hover:bg-muted/50 transition-colors duration-200 group border-b border-border/30 last:border-0">
                          <td className="px-6 py-3.5 whitespace-nowrap text-text-secondary text-xs">
                            {(() => {
                              const dia = diaVenda(venda);
                              return dia ? format(dia, 'dd/MM/yyyy') : '—';
                            })()}
                          </td>
                          <td className="px-3 py-3.5 font-medium text-foreground max-w-[160px] truncate">
                            {venda.customer_name}
                          </td>
                          <td className="px-3 py-3.5 text-text-secondary text-xs max-w-[200px] truncate hidden md:table-cell">
                            {venda.products_summary}
                          </td>
                          <td className="px-3 py-3.5 hidden sm:table-cell">
                            <MetodoBadge metodo={venda.payment_method} />
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-foreground whitespace-nowrap">
                            {fmtBRL(valorDe(venda))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-text-secondary">Nenhuma venda registrada</p>
                  <p className="text-xs text-text-secondary/60 mt-1">As vendas aparecerão aqui após o primeiro registro</p>
                </div>
              )}
            </CardContent>
          </motion.div>
          )}

          {/* ── Saúde Financeira ── */}
          {podeVerFinanceiro && canViewModule('dashboard_saude_financeira') && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
            >
              <WidgetSaudeFinanceira />
            </motion.div>
          )}

        </div>

      <PdfImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={(_: Transaction[]) => {
          // TODO: conectar à API — persistir transações importadas
        }}
      />
    </div>
  );
};

export default Index;
