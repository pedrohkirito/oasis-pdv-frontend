import { useState, useEffect, type ReactNode } from 'react';
import { DREComponent } from '@/components/relatorios/DREComponent';
import CurvaABCComponent from '@/components/relatorios/CurvaABCComponent';
import FinanceiroComponent from '@/components/relatorios/FinanceiroComponent';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Area, AreaChart,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, FileBarChart, CalendarIcon, BarChart3 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, endOfWeek, subWeeks, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/lib/database';

type ContaPagar = Tables<'contas_pagar'>;
type Venda = Tables<'vendas'>;

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
  'hsl(210, 70%, 50%)',
  'hsl(280, 70%, 50%)',
];

const PIE_COLORS = ['#8E5FCF', '#47118F', '#10B981', '#F59E0B', '#3B82F6'];

// ── Animações ─────────────────────────────────────────────
const animacoes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

// ── Skeleton ──────────────────────────────────────────────
const Skeleton = ({ width = '100%', height = 20, radius = 8 }: { width?: string | number; height?: number; radius?: number }) => (
  <div style={{
    width, height, borderRadius: radius,
    background: 'linear-gradient(90deg, #f0eafa 25%, #e8e0f5 50%, #f0eafa 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
)

const cardGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(71,17,143,0.08), 0 1px 0 rgba(255,255,255,0.9) inset'
};

// ── KPI Card ──────────────────────────────────────────────
interface KPICardProps {
  titulo: string;
  valor: string;
  variacao: string;
  positivo: boolean;
  icone: ReactNode;
  corBorda: string;
  corIcone: string;
  sparkData: { v: number }[];
}

const KPICard = ({ titulo, valor, variacao, positivo, icone, corBorda, corIcone, sparkData }: KPICardProps) => (
  <div
    style={{
      ...cardGlass,
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 16px 48px rgba(71,17,143,0.14)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(71,17,143,0.08)';
    }}
  >
    {/* Borda superior colorida */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: '4px',
      background: corBorda,
      borderRadius: '20px 20px 0 0'
    }} />

    {/* Ícone */}
    <div style={{
      width: '44px', height: '44px',
      borderRadius: '12px',
      background: corIcone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px'
    }}>
      {icone}
    </div>

    {/* Label */}
    <p style={{
      fontSize: '0.75rem',
      color: '#9CA3AF',
      fontFamily: 'Gilroy',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      margin: '0 0 4px'
    }}>{titulo}</p>

    {/* Valor */}
    <p style={{
      fontSize: '1.75rem',
      fontWeight: 700,
      fontFamily: 'Gilroy',
      color: '#1F2937',
      margin: '0 0 12px'
    }}>{valor}</p>

    {/* Variação */}
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '20px',
      background: positivo ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      color: positivo ? '#10B981' : '#EF4444',
      fontSize: '0.75rem',
      fontFamily: 'Gilroy',
      fontWeight: 600
    }}>
      {positivo ? '↑' : '↓'} {variacao}
      <span style={{ color: '#9CA3AF', fontWeight: 400 }}>vs mês anterior</span>
    </div>

    {/* Mini sparkline */}
    <div style={{ position: 'absolute', bottom: '16px', right: '16px', opacity: 0.5 }}>
      <LineChart width={80} height={40} data={sparkData}>
        <Line type="monotone" dataKey="v" stroke="#8E5FCF" strokeWidth={2} dot={false} />
      </LineChart>
    </div>
  </div>
);

// ── Tooltip customizado ───────────────────────────────────
const TooltipVendas = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(142,95,207,0.2)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      fontFamily: 'Gilroy'
    }}>
      <p style={{ fontWeight: 700, color: '#1F2937', marginBottom: '4px', fontSize: '0.85rem' }}>{label}</p>
      <p style={{ color: '#8E5FCF', fontWeight: 600, margin: 0 }}>
        R$ {payload[0]?.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
const Relatorios = () => {
  const [activeTab, setActiveTab] = useState('vendas');
  const [tipoGrafico, setTipoGrafico] = useState<'area' | 'barras' | 'linha'>('area');
  const [periodoVendas, setPeriodoVendas] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    label: 'Este mês',
  });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const aplicarPeriodo = (label: string, from?: string, to?: string) => {
    const hoje = new Date();
    switch (label) {
      case 'Este mês':
        setPeriodo({ inicio: format(startOfMonth(hoje), 'yyyy-MM-dd'), fim: format(endOfMonth(hoje), 'yyyy-MM-dd'), label: 'Este mês' });
        break;
      case 'Mês anterior': {
        const ant = subMonths(hoje, 1);
        setPeriodo({ inicio: format(startOfMonth(ant), 'yyyy-MM-dd'), fim: format(endOfMonth(ant), 'yyyy-MM-dd'), label: 'Mês anterior' });
        break;
      }
      case 'Trimestre':
        setPeriodo({ inicio: format(startOfMonth(subMonths(hoje, 2)), 'yyyy-MM-dd'), fim: format(endOfMonth(hoje), 'yyyy-MM-dd'), label: 'Trimestre' });
        break;
      case 'Este ano':
        setPeriodo({ inicio: format(startOfYear(hoje), 'yyyy-MM-dd'), fim: format(endOfYear(hoje), 'yyyy-MM-dd'), label: 'Este ano' });
        break;
      case 'Personalizado':
        if (from && to) setPeriodo({ inicio: from, fim: to, label: 'Personalizado' });
        else setPeriodo(p => ({ ...p, label: 'Personalizado' }));
        break;
    }
  };

  const { user, loading: authLoading } = useAuth();
  const { companyId } = useEmpresa();
  const { canViewModule } = useUserRole();
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchContas();
      fetchVendas();
    }
  }, [user, periodo.inicio, periodo.fim]);

  const fetchContas = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await api
      .from('payable')
      .select('*')
      .eq('company_id', companyId)
      .gte('due_on', periodo.inicio)
      .lte('due_on', periodo.fim)
      .order('due_on', { ascending: true });

    if (!error) {
      setContas(data || []);
    }
    setLoading(false);
  };

  const fetchVendas = async () => {
    if (!companyId) return;
    const { data, error } = await api
      .from('sale')
      .select('*')
      .eq('company_id', companyId)
      .gte('sold_on', periodo.inicio)
      .lte('sold_on', periodo.fim)
      .order('sold_on', { ascending: true });

    if (!error) {
      setVendas(data || []);
    }
  };

  const getMetodoColor = (metodo: string): string => {
    const cores: Record<string, string> = {
      'Dinheiro': 'hsl(var(--success))',
      'Cartão de Crédito': 'hsl(var(--primary))',
      'Cartão de Débito': 'hsl(var(--warning))',
      'Pix': 'hsl(210, 70%, 50%)',
      'Boleto': 'hsl(280, 70%, 50%)',
    };
    return cores[metodo] || 'hsl(var(--muted-foreground))';
  };

  const dadosPorMetodoPagamento = () => {
    const metodos: Record<string, number> = {};
    vendas.forEach(venda => {
      metodos[venda.metodo_pagamento] = (metodos[venda.metodo_pagamento] || 0) + Number(venda.valor);
    });
    return Object.entries(metodos)
      .map(([name, value]) => ({
        name,
        value,
        color: getMetodoColor(name)
      }))
      .sort((a, b) => b.value - a.value);
  };

  const vendedorColors: Record<string, string> = {
    'Nice': '#ec4899',
    'Lourdes': '#8b5cf6',
  };

  const dadosPorVendedor = () => {
    const vendedores: Record<string, number> = {};
    vendas.forEach(venda => {
      const vendedor = venda.vendedor || 'Não informado';
      vendedores[vendedor] = (vendedores[vendedor] || 0) + Number(venda.valor);
    });
    return Object.entries(vendedores)
      .map(([name, value]) => ({
        name,
        value,
        color: vendedorColors[name] || '#6b7280'
      }))
      .sort((a, b) => b.value - a.value);
  };

  const calcularVendasPorPeriodo = () => {
    if (periodoVendas === 'diario') {
      const hoje = new Date();
      const inicio = subDays(hoje, 13);
      const dias = eachDayOfInterval({ start: inicio, end: hoje });
      return dias.map(dia => {
        const inicioD = startOfDay(dia);
        const fimD = endOfDay(dia);
        const vendasDia = vendas.filter(v => {
          const data = new Date(v.data_venda + 'T00:00:00');
          return data >= inicioD && data <= fimD;
        });
        const total = vendasDia.reduce((sum, v) => sum + Number(v.valor), 0);
        const quantidade = vendasDia.length;
        return {
          periodo: format(dia, 'dd/MM', { locale: ptBR }),
          valor: total,
          quantidade,
        };
      });
    } else if (periodoVendas === 'semanal') {
      const hoje = new Date();
      const inicio = startOfWeek(subWeeks(hoje, 7), { locale: ptBR });
      const semanas = eachWeekOfInterval({ start: inicio, end: hoje }, { locale: ptBR });
      return semanas.map((semana, index) => {
        const inicioS = startOfWeek(semana, { locale: ptBR });
        const fimS = endOfWeek(semana, { locale: ptBR });
        const vendasSemana = vendas.filter(v => {
          const data = new Date(v.data_venda + 'T00:00:00');
          return data >= inicioS && data <= fimS;
        });
        const total = vendasSemana.reduce((sum, v) => sum + Number(v.valor), 0);
        const quantidade = vendasSemana.length;
        return {
          periodo: `Sem ${index + 1}`,
          valor: total,
          quantidade,
        };
      });
    } else {
      const meses = eachMonthOfInterval({ start: new Date(periodo.inicio + 'T00:00:00'), end: new Date(periodo.fim + 'T00:00:00') });
      return meses.map(mes => {
        const inicioM = startOfMonth(mes);
        const fimM = endOfMonth(mes);
        const vendasMes = vendas.filter(v => {
          const data = new Date(v.data_venda + 'T00:00:00');
          return data >= inicioM && data <= fimM;
        });
        const total = vendasMes.reduce((sum, v) => sum + Number(v.valor), 0);
        const quantidade = vendasMes.length;
        return {
          periodo: format(mes, 'MMM/yy', { locale: ptBR }),
          valor: total,
          quantidade,
        };
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const calcularDadosPorPeriodo = () => {
    const meses = eachMonthOfInterval({ start: new Date(periodo.inicio + 'T00:00:00'), end: new Date(periodo.fim + 'T00:00:00') });
    return meses.map(mes => {
      const inicio = startOfMonth(mes);
      const fim = endOfMonth(mes);
      const contasMes = contas.filter(c => {
        const data = new Date(c.data_vencimento);
        return data >= inicio && data <= fim;
      });
      const despesas = contasMes.reduce((sum, c) => sum + Number(c.valor), 0);
      const pagas = contasMes.filter(c => c.status === 'pago').reduce((sum, c) => sum + Number(c.valor), 0);
      return {
        periodo: format(mes, 'MMM', { locale: ptBR }),
        despesas,
        pagas,
      };
    });
  };

  const calcularDespesasPorCategoria = () => {
    const categorias: { [key: string]: number } = {};
    contas.forEach(conta => {
      const cat = conta.categoria || 'Outros';
      categorias[cat] = (categorias[cat] || 0) + Number(conta.valor);
    });
    return Object.entries(categorias).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  };

  const calcularEvolucaoSaldo = () => {
    const dadosPeriodo = calcularDadosPorPeriodo();
    let acumulado = 0;
    return dadosPeriodo.map(d => {
      acumulado += d.pagas;
      return { periodo: d.periodo, saldo: acumulado };
    });
  };

  const calcularEvolucaoPorCategoria = () => {
    const categorias = [...new Set(contas.map(c => c.categoria || 'Outros'))];
    const meses = eachMonthOfInterval({ start: new Date(periodo.inicio + 'T00:00:00'), end: new Date(periodo.fim + 'T00:00:00') });
    return meses.map(mes => {
      const inicioM = startOfMonth(mes);
      const fimM = endOfMonth(mes);
      const contasMes = contas.filter(c => {
        const data = new Date(c.data_vencimento);
        return data >= inicioM && data <= fimM;
      });
      const resultado: { periodo: string; [key: string]: number | string } = {
        periodo: format(mes, 'MMM/yy', { locale: ptBR }),
      };
      categorias.forEach(cat => {
        resultado[cat] = contasMes
          .filter(c => (c.categoria || 'Outros') === cat)
          .reduce((sum, c) => sum + Number(c.valor), 0);
      });
      return resultado;
    });
  };

  const getCategorias = () => {
    return [...new Set(contas.map(c => c.categoria || 'Outros'))];
  };

  const calcularComparativoMensal = () => {
    const hoje = new Date();
    const mesAtual = startOfMonth(hoje);
    const fimMesAtual = endOfMonth(hoje);
    const mesAnterior = startOfMonth(subMonths(hoje, 1));
    const fimMesAnterior = endOfMonth(subMonths(hoje, 1));
    const categorias = [...new Set(contas.map(c => c.categoria || 'Outros'))];
    return categorias.map(cat => {
      const gastoAtual = contas
        .filter(c => {
          const data = new Date(c.data_vencimento);
          return data >= mesAtual && data <= fimMesAtual && (c.categoria || 'Outros') === cat;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0);
      const gastoAnterior = contas
        .filter(c => {
          const data = new Date(c.data_vencimento);
          return data >= mesAnterior && data <= fimMesAnterior && (c.categoria || 'Outros') === cat;
        })
        .reduce((sum, c) => sum + Number(c.valor), 0);
      const variacao = gastoAnterior > 0
        ? ((gastoAtual - gastoAnterior) / gastoAnterior) * 100
        : gastoAtual > 0 ? 100 : 0;
      return { categoria: cat, mesAtual: gastoAtual, mesAnterior: gastoAnterior, variacao };
    })
      .filter(item => item.mesAtual > 0 || item.mesAnterior > 0)
      .sort((a, b) => b.mesAtual - a.mesAtual);
  };

  // ── Derived data ──────────────────────────────────────────
  const dadosPeriodo = calcularDadosPorPeriodo();
  const evolucaoSaldo = calcularEvolucaoSaldo();
  const vendasPorMetodo = dadosPorMetodoPagamento();
  const vendasPorPeriodo = calcularVendasPorPeriodo();
  const vendasPorVendedor = dadosPorVendedor();

  const totalVendas = vendas.reduce((sum, v) => sum + Number(v.valor), 0);
  const totalDespesas = contas.reduce((sum, c) => sum + Number(c.valor), 0);
  const totalPago = contas.filter(c => c.status === 'pago').reduce((sum, c) => sum + Number(c.valor), 0);
  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((sum, c) => sum + Number(c.valor), 0);
  const totalVencido = contas.filter(c => c.status === 'vencido').reduce((sum, c) => sum + Number(c.valor), 0);

  // KPI derivations
  const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;
  const maiorVenda = vendas.length > 0 ? Math.max(...vendas.map(v => Number(v.valor))) : 0;

  // Sparklines from vendasPorPeriodo
  const sparkDataVendas = vendasPorPeriodo.slice(-8).map(p => ({ v: p.valor }));
  const sparkDataQtd = vendasPorPeriodo.slice(-8).map(p => ({ v: p.quantidade }));
  const sparkDataTicket = vendasPorPeriodo.slice(-8).map(p => ({
    v: p.quantidade > 0 ? p.valor / p.quantidade : 0
  }));

  // Variação: compara primeira metade vs segunda metade do período
  const midIdx = Math.floor(vendasPorPeriodo.length / 2);
  const primeiraMetade = vendasPorPeriodo.slice(0, midIdx).reduce((s, p) => s + p.valor, 0);
  const segundaMetade = vendasPorPeriodo.slice(midIdx).reduce((s, p) => s + p.valor, 0);
  const variacaoFat = primeiraMetade > 0
    ? Math.abs((segundaMetade - primeiraMetade) / primeiraMetade * 100).toFixed(1)
    : '—';
  const fatPositivo = segundaMetade >= primeiraMetade;

  const primeiraMetadeQtd = vendasPorPeriodo.slice(0, midIdx).reduce((s, p) => s + p.quantidade, 0);
  const segundaMetadeQtd = vendasPorPeriodo.slice(midIdx).reduce((s, p) => s + p.quantidade, 0);
  const variacaoQtd = primeiraMetadeQtd > 0
    ? Math.abs((segundaMetadeQtd - primeiraMetadeQtd) / primeiraMetadeQtd * 100).toFixed(1)
    : '—';
  const qtdPositivo = segundaMetadeQtd >= primeiraMetadeQtd;

  // Formas de pagamento com percentual
  const totalVendasMetodo = vendasPorMetodo.reduce((s, m) => s + m.value, 0);
  const formasPagamento = vendasPorMetodo.map(m => ({
    name: m.name,
    valor: m.value,
    percentual: totalVendasMetodo > 0 ? ((m.value / totalVendasMetodo) * 100).toFixed(1) : '0'
  }));

  // Top vendedores para lista
  const topVendedores = vendasPorVendedor.slice(0, 10);
  const maxValorVendedor = topVendedores.length > 0 ? topVendedores[0].value : 1;

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <>
    <style>{animacoes}</style>
    <div style={{
      background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Orb 1 */}
      <div style={{
        position: 'fixed',
        top: '-200px',
        left: '-200px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: '#8E5FCF',
        opacity: 0.06,
        filter: 'blur(80px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Orb 2 */}
      <div style={{
        position: 'fixed',
        bottom: '-150px',
        right: '-150px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: '#FAF66B',
        opacity: 0.04,
        filter: 'blur(80px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* All content above orbs */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '32px 32px 0'
        }}>

          {/* Left */}
          <div>
            <p style={{
              fontSize: '0.75rem',
              color: '#9CA3AF',
              marginBottom: '8px',
              fontFamily: 'Gilroy'
            }}>
              Oasis › Relatórios
            </p>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              Central de Relatórios
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#6B7280',
              marginTop: '4px',
              fontFamily: 'Gilroy'
            }}>
              Análise completa do seu negócio em tempo real
            </p>
          </div>

          {/* Right — filtro de período unificado */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Pills de período */}
            {(['Este mês', 'Mês anterior', 'Trimestre', 'Este ano', 'Personalizado'] as const).map(label => {
              const active = periodo.label === label;
              return (
                <button
                  key={label}
                  onClick={() => aplicarPeriodo(label)}
                  style={{
                    fontSize: '0.8rem',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: active ? 'none' : '1px solid rgba(142,95,207,0.2)',
                    background: active
                      ? 'linear-gradient(135deg, #8E5FCF, #47118F)'
                      : 'rgba(255,255,255,0.7)',
                    color: active ? '#fff' : '#6B7280',
                    boxShadow: active ? '0 4px 12px rgba(142,95,207,0.3)' : 'none',
                    cursor: 'pointer',
                    fontFamily: 'Gilroy',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}

            {/* Custom date inputs when Personalizado active */}
            {periodo.label === 'Personalizado' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none', background: 'rgba(255,255,255,0.9)' }}
                />
                <span style={{ color: '#9CA3AF', fontFamily: 'Gilroy', fontSize: '0.8rem' }}>até</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none', background: 'rgba(255,255,255,0.9)' }}
                />
                <button
                  onClick={() => aplicarPeriodo('Personalizado', customFrom, customTo)}
                  disabled={!customFrom || !customTo}
                  style={{ padding: '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg,#8E5FCF,#47118F)', color: '#fff', border: 'none', fontSize: '0.8rem', fontFamily: 'Gilroy', fontWeight: 700, cursor: 'pointer' }}
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Display de datas */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(142,95,207,0.15)', borderRadius: 10, padding: '6px 12px',
            }}>
              <CalendarIcon size={14} color="#8E5FCF" />
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Gilroy', whiteSpace: 'nowrap' }}>
                {format(new Date(periodo.inicio + 'T00:00:00'), 'dd/MM/yyyy')} → {format(new Date(periodo.fim + 'T00:00:00'), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{
          margin: '24px 32px 0',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(142,95,207,0.12)',
          borderRadius: '16px',
          padding: '6px',
          display: 'inline-flex',
          gap: '4px'
        }}>
          {[
            { value: 'vendas', label: '📊 Vendas' },
            { value: 'financeiro', label: '💰 Financeiro' },
            { value: 'dre', label: '📈 DRE' },
            { value: 'curva-abc', label: '🔤 Curva ABC' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Gilroy',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                ...(activeTab === tab.value ? {
                  background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(142,95,207,0.4)',
                  transform: 'translateY(-1px)'
                } : {
                  background: 'transparent',
                  color: '#6B7280'
                })
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.value) {
                  e.currentTarget.style.background = 'rgba(142,95,207,0.08)';
                  e.currentTarget.style.color = '#8E5FCF';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.value) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6B7280';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="p-8">

          {/* ── VENDAS ── */}
          {activeTab === 'vendas' && canViewModule('relatorios_graficos') && (
            <>
              {loading ? (
                <>
                  {/* Skeleton KPI cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ ...cardGlass, padding: '24px', height: '160px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Skeleton width={44} height={44} radius={12} />
                        <Skeleton width="60%" height={12} radius={6} />
                        <Skeleton width="80%" height={28} radius={8} />
                        <Skeleton width="50%" height={20} radius={20} />
                      </div>
                    ))}
                  </div>
                  {/* Skeleton gráfico */}
                  <div style={{ ...cardGlass, padding: '24px', marginTop: '16px' }}>
                    <Skeleton width="30%" height={20} radius={6} />
                    <div style={{ marginTop: '20px' }}>
                      <Skeleton width="100%" height={320} radius={12} />
                    </div>
                  </div>
                </>
              ) : vendas.length === 0 ? (
                <div style={{
                  ...cardGlass,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '80px 40px', textAlign: 'center'
                }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '24px',
                    background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '24px'
                  }}>
                    <BarChart3 size={36} color="#8E5FCF" opacity={0.6} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', marginBottom: '8px', margin: '0 0 8px' }}>
                    Nenhum dado encontrado
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: '24px', margin: '0 0 24px' }}>
                    Tente selecionar outro período ou verifique se há vendas registradas
                  </p>
                  <button
                    onClick={() => aplicarPeriodo('Este mês')}
                    style={{
                      padding: '10px 24px', borderRadius: '12px',
                      border: '1px solid rgba(142,95,207,0.3)',
                      background: 'rgba(142,95,207,0.08)',
                      color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600,
                      fontSize: '0.875rem', cursor: 'pointer'
                    }}
                  >
                    Ver este mês
                  </button>
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px'
                  }}>
                    <div style={{ animation: 'fadeInUp 0.4s ease forwards', animationDelay: '0s' }}>
                      <KPICard
                        titulo="Faturamento Total"
                        valor={formatCurrency(totalVendas)}
                        variacao={`${variacaoFat}%`}
                        positivo={fatPositivo}
                        corBorda="linear-gradient(90deg, #8E5FCF, #47118F)"
                        corIcone="linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.1))"
                        icone={<TrendingUp size={20} color="#8E5FCF" />}
                        sparkData={sparkDataVendas}
                      />
                    </div>
                    <div style={{ animation: 'fadeInUp 0.4s ease forwards', animationDelay: '0.1s', opacity: 0 }}>
                      <KPICard
                        titulo="Número de Vendas"
                        valor={String(vendas.length)}
                        variacao={`${variacaoQtd}%`}
                        positivo={qtdPositivo}
                        corBorda="linear-gradient(90deg, #3B82F6, #1D4ED8)"
                        corIcone="linear-gradient(135deg, rgba(59,130,246,0.15), rgba(29,78,216,0.1))"
                        icone={<FileBarChart size={20} color="#3B82F6" />}
                        sparkData={sparkDataQtd}
                      />
                    </div>
                    <div style={{ animation: 'fadeInUp 0.4s ease forwards', animationDelay: '0.2s', opacity: 0 }}>
                      <KPICard
                        titulo="Ticket Médio"
                        valor={formatCurrency(ticketMedio)}
                        variacao="período"
                        positivo={true}
                        corBorda="linear-gradient(90deg, #10B981, #059669)"
                        corIcone="linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))"
                        icone={<DollarSign size={20} color="#10B981" />}
                        sparkData={sparkDataTicket}
                      />
                    </div>
                    <div style={{ animation: 'fadeInUp 0.4s ease forwards', animationDelay: '0.3s', opacity: 0 }}>
                      <KPICard
                        titulo="Maior Venda"
                        valor={formatCurrency(maiorVenda)}
                        variacao="no período"
                        positivo={true}
                        corBorda="linear-gradient(90deg, #F59E0B, #D97706)"
                        corIcone="linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))"
                        icone={<TrendingUp size={20} color="#F59E0B" />}
                        sparkData={sparkDataVendas}
                      />
                    </div>
                  </div>

                  {/* Gráfico principal — Evolução de Vendas */}
                  <div style={{ ...cardGlass, padding: '24px', marginTop: '16px' }}>
                    {/* Header do card */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '24px'
                    }}>
                      <div>
                        <p style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          fontFamily: 'Gilroy',
                          color: '#1F2937',
                          margin: '0 0 2px'
                        }}>
                          Evolução de Vendas
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0 }}>
                          Receita no período selecionado
                        </p>
                      </div>

                      {/* Seletor de kind + período */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Pills kind gráfico */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(['area', 'barras', 'linha'] as const).map(kind => (
                            <button
                              key={kind}
                              onClick={() => setTipoGrafico(kind)}
                              style={{
                                fontSize: '0.75rem',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: tipoGrafico === kind ? 'none' : '1px solid rgba(142,95,207,0.25)',
                                background: tipoGrafico === kind ? '#8E5FCF' : 'transparent',
                                color: tipoGrafico === kind ? 'white' : '#8E5FCF',
                                cursor: 'pointer',
                                fontFamily: 'Gilroy',
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                textTransform: 'capitalize'
                              }}
                            >
                              {kind === 'area' ? 'Área' : kind === 'barras' ? 'Barras' : 'Linha'}
                            </button>
                          ))}
                        </div>

                        {/* Pills período */}
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                          {([
                            { v: 'diario' as const, l: 'Diário' },
                            { v: 'semanal' as const, l: 'Semanal' },
                            { v: 'mensal' as const, l: 'Mensal' }
                          ]).map(p => (
                            <button
                              key={p.v}
                              onClick={() => setPeriodoVendas(p.v)}
                              style={{
                                fontSize: '0.75rem',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: periodoVendas === p.v ? 'none' : '1px solid rgba(142,95,207,0.25)',
                                background: periodoVendas === p.v ? 'rgba(142,95,207,0.12)' : 'transparent',
                                color: '#8E5FCF',
                                cursor: 'pointer',
                                fontFamily: 'Gilroy',
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {p.l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div style={{ height: '320px' }}>
                      {vendasPorPeriodo.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGrafico === 'area' ? (
                            <AreaChart data={vendasPorPeriodo}>
                              <defs>
                                <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8E5FCF" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#8E5FCF" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip content={<TooltipVendas />} />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#8E5FCF"
                                strokeWidth={2.5}
                                fill="url(#gradVendas)"
                                dot={false}
                                activeDot={{ r: 5, fill: '#8E5FCF', strokeWidth: 2 }}
                              />
                            </AreaChart>
                          ) : tipoGrafico === 'barras' ? (
                            <BarChart data={vendasPorPeriodo}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip content={<TooltipVendas />} />
                              <Bar dataKey="amount" fill="#8E5FCF" radius={[6, 6, 0, 0]} name="Valor" />
                            </BarChart>
                          ) : (
                            <AreaChart data={vendasPorPeriodo}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip content={<TooltipVendas />} />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#8E5FCF"
                                strokeWidth={2.5}
                                fill="none"
                                dot={false}
                                activeDot={{ r: 5, fill: '#8E5FCF', strokeWidth: 2 }}
                              />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      ) : (
                        <div style={{
                          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#9CA3AF', fontFamily: 'Gilroy'
                        }}>
                          Nenhuma venda no período selecionado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid inferior */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginTop: '16px'
                  }}>

                    {/* Card esq — Top Vendedores */}
                    <div style={{ ...cardGlass, padding: '24px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <p style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          fontFamily: 'Gilroy',
                          color: '#1F2937',
                          margin: 0
                        }}>
                          Performance por Vendedor
                        </p>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(142,95,207,0.1)',
                          color: '#8E5FCF',
                          fontFamily: 'Gilroy',
                          fontWeight: 600
                        }}>
                          Por faturamento
                        </span>
                      </div>

                      {topVendedores.length > 0 ? topVendedores.map((p, i) => (
                        <div
                          key={p.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 0',
                            borderBottom: i < topVendedores.length - 1
                              ? '1px solid rgba(142,95,207,0.08)' : 'none'
                          }}
                        >
                          {/* Posição */}
                          <div style={{
                            width: '28px', height: '28px',
                            borderRadius: '8px',
                            background: i < 3
                              ? 'linear-gradient(135deg, #8E5FCF, #47118F)'
                              : 'rgba(142,95,207,0.1)',
                            color: i < 3 ? 'white' : '#8E5FCF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            fontFamily: 'Gilroy',
                            flexShrink: 0
                          }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </div>

                          {/* Nome + barra */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: '0.8rem',
                              fontFamily: 'Gilroy',
                              fontWeight: 600,
                              color: '#1F2937',
                              marginBottom: '4px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              margin: '0 0 4px'
                            }}>
                              {p.name}
                            </p>
                            <div style={{
                              height: '4px',
                              background: 'rgba(142,95,207,0.1)',
                              borderRadius: '99px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${(p.value / maxValorVendedor) * 100}%`,
                                background: 'linear-gradient(90deg, #8E5FCF, #47118F)',
                                borderRadius: '99px',
                                transition: 'width 0.8s ease'
                              }} />
                            </div>
                          </div>

                          {/* Valor */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              fontFamily: 'Gilroy',
                              color: '#1F2937',
                              margin: 0
                            }}>
                              {formatCurrency(p.value)}
                            </p>
                            <p style={{
                              fontSize: '0.7rem',
                              color: '#9CA3AF',
                              fontFamily: 'Gilroy',
                              margin: 0
                            }}>
                              {vendas.filter(v => (v.vendedor || 'Não informado') === p.name).length} vend.
                            </p>
                          </div>
                        </div>
                      )) : (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                          Nenhuma venda no período
                        </div>
                      )}
                    </div>

                    {/* Card dir — Formas de Pagamento */}
                    <div style={{ ...cardGlass, padding: '24px' }}>
                      <p style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        fontFamily: 'Gilroy',
                        color: '#1F2937',
                        margin: '0 0 20px'
                      }}>
                        Formas de Pagamento
                      </p>

                      {formasPagamento.length > 0 ? (
                        <>
                          {/* Donut chart com texto central */}
                          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 24px' }}>
                            <PieChart width={200} height={200}>
                              <Pie
                                data={formasPagamento}
                                cx={100}
                                cy={100}
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="amount"
                              >
                                {formasPagamento.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                            {/* Texto central */}
                            <div style={{
                              position: 'absolute',
                              top: '50%', left: '50%',
                              transform: 'translate(-50%, -50%)',
                              textAlign: 'center',
                              pointerEvents: 'none'
                            }}>
                              <p style={{
                                fontSize: '0.7rem', color: '#9CA3AF',
                                fontFamily: 'Gilroy', margin: '0 0 2px'
                              }}>
                                Total
                              </p>
                              <p style={{
                                fontSize: '0.9rem', fontWeight: 700,
                                color: '#8E5FCF', fontFamily: 'Gilroy', margin: 0
                              }}>
                                {formatCurrency(totalVendas)}
                              </p>
                            </div>
                          </div>

                          {/* Legenda */}
                          <div>
                            {formasPagamento.map((f, i) => (
                              <div
                                key={f.name}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '6px 0',
                                  borderBottom: '1px solid rgba(142,95,207,0.06)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    width: '10px', height: '10px',
                                    borderRadius: '50%',
                                    background: PIE_COLORS[i % PIE_COLORS.length],
                                    flexShrink: 0
                                  }} />
                                  <span style={{
                                    fontSize: '0.8rem',
                                    fontFamily: 'Gilroy',
                                    color: '#4B5563'
                                  }}>
                                    {f.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    color: '#9CA3AF',
                                    fontFamily: 'Gilroy'
                                  }}>
                                    {f.percentual}%
                                  </span>
                                  <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    fontFamily: 'Gilroy',
                                    color: '#1F2937'
                                  }}>
                                    {formatCurrency(f.valor)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                          Nenhuma venda no período
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── FINANCEIRO ── */}
          {activeTab === 'financeiro' && (
            <FinanceiroComponent dataInicio={periodo.inicio} dataFim={periodo.fim} />
          )}

          {/* ── DRE ── */}
          {activeTab === 'dre' && canViewModule('relatorios_dre') && (
            <DREComponent dataInicio={periodo.inicio} dataFim={periodo.fim} />
          )}

          {/* ── CURVA ABC ── */}
          {activeTab === 'curva-abc' && canViewModule('relatorios_curva_abc') && (
            <CurvaABCComponent dataInicio={periodo.inicio} dataFim={periodo.fim} />
          )}

        </div>
      </div>
    </div>
    </>
  );
};

export default Relatorios;
