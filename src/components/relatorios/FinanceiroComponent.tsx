import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Percent, Calculator, Lightbulb,
  AlertTriangle, CheckCircle, Info, ExternalLink, CalendarIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import {
  format, startOfMonth, endOfMonth, subMonths,
  startOfWeek, endOfWeek, eachWeekOfInterval, differenceInDays,
  addDays, isBefore, isAfter, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const C = {
  roxo:    '#8E5FCF',
  roxoEsc: '#47118F',
  verde:   '#10B981',
  verm:    '#EF4444',
  ambar:   '#F59E0B',
  azul:    '#3B82F6',
  cinza:   '#9CA3AF',
};

const CAT_COLORS = ['#8E5FCF','#F59E0B','#3B82F6','#EF4444','#9CA3AF','#10B981','#F97316'];

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(71,17,143,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
};

const label: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  fontFamily: 'Gilroy', display: 'block', marginBottom: 2,
};

// ─── Formatadores ─────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,#f0eafa 25%,#e8e0f5 50%,#f0eafa 75%)',
    backgroundSize: '200% 100%', animation: 'fin-shimmer 1.5s infinite',
  }} />
);

// ─── Tooltip customizado ──────────────────────────────────────────────────────
function GlassTooltip({ active, payload, label: lbl }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...card, padding: '12px 16px', fontSize: 12, fontFamily: 'Gilroy', minWidth: 160 }}>
      <p style={{ fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>{lbl}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || C.roxo, margin: '2px 0', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Badge de variação ────────────────────────────────────────────────────────
function Variacao({ atual, anterior, label: lbl }: { atual: number; anterior: number; label?: string }) {
  if (anterior === 0) return null;
  const diff = ((atual - anterior) / Math.abs(anterior)) * 100;
  const pos = diff >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 8px', borderRadius: 99, fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600,
      background: pos ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      color: pos ? C.verde : C.verm,
    }}>
      {pos ? '↑' : '↓'} {Math.abs(diff).toFixed(1).replace('.', ',')}%
      {lbl && <span style={{ color: C.cinza, fontWeight: 400 }}> {lbl}</span>}
    </span>
  );
}

// ─── Barra de progresso ───────────────────────────────────────────────────────
function BarraIndicador({ valor, max = 100 }: { valor: number; max?: number }) {
  const pct = Math.min((valor / max) * 100, 100);
  const cor = valor < 50 ? C.verde : valor < 70 ? C.ambar : C.verm;
  return (
    <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 99, transition: 'width 0.8s ease' }} />
    </div>
  );
}

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface VendaRow { final_amount: number; valor: number; gross_amount: number | null; desconto: number | null; sold_on: string; payment_method: string; }
interface ContaPagarRow { valor: number; categoria: string | null; paid_on: string | null; due_on: string; status: string; }
interface ContaReceberRow { id: string; customer_name: string | null; valor: number; received_amount: number; due_on: string; received_on: string | null; status: string; }
interface TaxaRow { payment_method: string; fee_percent: number; parcelas: number; bandeira: string; }

interface Dados {
  // KPIs
  receitaBruta: number; descontos: number; receitaLiquida: number;
  despesasPagas: number; resultado: number; margemLiquida: number;
  qtdVendas: number; ticketMedio: number; diasPeriodo: number;
  // Anterior
  receitaAnterior: number; despesasAnterior: number; ticketAnterior: number;
  // Timeline receita
  timeline: { periodo: string; bruta: number; liquida: number }[];
  // Despesas por categoria
  categorias: { name: string; value: number; color: string }[];
  // Efficiency
  inadimplencia: number; taxaDesconto: number; custoComissoes: number;
  // Fluxo
  fluxo: { semana: string; entradas: number; saidas: number; saldo: number }[];
  // Recebíveis
  aging: { faixa: string; valor: number; count: number; color: string }[];
  totalReceber: number; totalVencido: number; proximos30: number;
  top5: ContaReceberRow[];
  // Comparativo 6 meses
  comparativo: { mes: string; receita: number; despesas: number; resultado: number }[];
  // Formas pagamento
  formas: { name: string; valor: number; custoTaxa: number; taxaPerc: number }[];
  // Insights
  insights: { kind: 'positivo' | 'atencao' | 'critico' | 'oportunidade' | 'tendencia'; titulo: string; corpo: string }[];
}

const dadosVazios: Dados = {
  receitaBruta: 0, descontos: 0, receitaLiquida: 0,
  despesasPagas: 0, resultado: 0, margemLiquida: 0,
  qtdVendas: 0, ticketMedio: 0, diasPeriodo: 30,
  receitaAnterior: 0, despesasAnterior: 0, ticketAnterior: 0,
  timeline: [], categorias: [],
  inadimplencia: 0, taxaDesconto: 0, custoComissoes: 0,
  fluxo: [], aging: [],
  totalReceber: 0, totalVencido: 0, proximos30: 0, top5: [],
  comparativo: [], formas: [],
  insights: [],
};

// ─── Helpers de período ───────────────────────────────────────────────────────

function periodoAnterior(inicio: Date, fim: Date): { inicio: Date; fim: Date } {
  const dias = differenceInDays(fim, inicio) + 1;
  return { inicio: addDays(inicio, -dias), fim: addDays(fim, -dias) };
}

// ─── Geração de insights ──────────────────────────────────────────────────────
function gerarInsights(d: Dados): Dados['insights'] {
  const list: Dados['insights'] = [];

  if (d.margemLiquida > 0) {
    if (d.margemLiquida >= 20) {
      list.push({ kind: 'positivo', titulo: 'Margem saudável', corpo: `Margem líquida de ${fmtPct(d.margemLiquida)} está em bom nível. Continue monitorando as despesas.` });
    } else if (d.margemLiquida < 5) {
      list.push({ kind: 'critico', titulo: 'Margem crítica', corpo: `Margem líquida de apenas ${fmtPct(d.margemLiquida)}. Revise urgentemente as despesas ou estratégia de precificação.` });
    }
  }
  if (d.inadimplencia > 15) {
    list.push({ kind: 'critico', titulo: 'Alta inadimplência', corpo: `${fmtPct(d.inadimplencia)} das contas a receber estão vencidas (${fmt(d.totalVencido)}). Acione a cobrança imediatamente.` });
  } else if (d.inadimplencia > 5) {
    list.push({ kind: 'atencao', titulo: 'Inadimplência em atenção', corpo: `${fmtPct(d.inadimplencia)} de inadimplência (${fmt(d.totalVencido)}). Acompanhe de perto o recebimento.` });
  }
  if (d.taxaDesconto > 15) {
    const ganho = d.receitaBruta * (d.taxaDesconto - 10) / 100;
    list.push({ kind: 'oportunidade', titulo: 'Política de desconto elevada', corpo: `Taxa de desconto média de ${fmtPct(d.taxaDesconto)}. Reduzir para 10% geraria mais ${fmt(ganho)} de receita.` });
  }
  if (d.resultado < 0) {
    list.push({ kind: 'critico', titulo: 'Resultado negativo', corpo: `O período fechou com prejuízo de ${fmt(Math.abs(d.resultado))}. Revise despesas e busque aumentar receita.` });
  }
  if (d.receitaAnterior > 0 && d.receitaLiquida > d.receitaAnterior * 1.05) {
    list.push({ kind: 'positivo', titulo: 'Crescimento de receita', corpo: `Receita cresceu ${fmtPct((d.receitaLiquida/d.receitaAnterior - 1)*100)} vs. período anterior. Tendência positiva!` });
  }
  if (d.despesasAnterior > 0 && d.despesasPagas > d.despesasAnterior * 1.1 && d.receitaLiquida <= d.receitaAnterior * 1.05) {
    list.push({ kind: 'atencao', titulo: 'Despesas crescendo mais rápido', corpo: `Despesas subiram ${fmtPct((d.despesasPagas/d.despesasAnterior-1)*100)} enquanto a receita cresceu menos. Risco de compressão de margem.` });
  }
  if (d.custoComissoes > 0 && d.receitaLiquida > 0) {
    const pct = (d.custoComissoes / d.receitaLiquida) * 100;
    if (pct > 10) {
      list.push({ kind: 'atencao', titulo: 'Comissões elevadas', corpo: `Comissões representam ${fmtPct(pct)} da receita líquida. Avalie a estrutura de remuneração variável.` });
    }
  }
  if (list.length === 0) {
    list.push({ kind: 'positivo', titulo: 'Sem alertas críticos', corpo: 'Os indicadores financeiros do período estão dentro dos parâmetros normais. Continue acompanhando regularmente.' });
  }
  return list;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FinanceiroComponent({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) {
  const { companyId } = useEmpresa();

  const [loading, setLoading] = useState(true);
  const [dados, setDados]     = useState<Dados>(dadosVazios);

  // ── Fetch principal ─────────────────────────────────────────────────────────
  const fetchDados = async () => {
    if (!companyId || !dataInicio || !dataFim) return;
    setLoading(true);

    const inicio = new Date(dataInicio + 'T00:00:00');
    const fim    = new Date(dataFim    + 'T23:59:59');
    const { inicio: iniAnt, fim: fimAnt } = periodoAnterior(inicio, fim);
    const inicioStr = dataInicio;
    const fimStr    = dataFim;
    const iniAntStr = format(iniAnt, 'yyyy-MM-dd');
    const fimAntStr = format(fimAnt, 'yyyy-MM-dd');
    const hoje      = format(new Date(), 'yyyy-MM-dd');

    // ── Queries paralelas ────────────────────────────────────────────────────
    const [
      { data: vendas     },
      { data: vendasAnt  },
      { data: contas     },
      { data: contasAnt  },
      { data: receber    },
      { data: taxas      },
      { data: comissoes  },
    ] = await Promise.all([
      api.from('sale').select('final_amount,valor,gross_amount,desconto,sold_on,payment_method')
        .eq('company_id', companyId).gte('sold_on', inicioStr).lte('sold_on', fimStr),
      api.from('sale').select('final_amount,valor')
        .eq('company_id', companyId).gte('sold_on', iniAntStr).lte('sold_on', fimAntStr),
      api.from('payable').select('valor,categoria,paid_on,due_on,status')
        .eq('company_id', companyId).eq('status', 'pago')
        .gte('paid_on', inicioStr).lte('paid_on', fimStr),
      api.from('payable').select('amount')
        .eq('company_id', companyId).eq('status', 'pago')
        .gte('paid_on', iniAntStr).lte('paid_on', fimAntStr),
      api.from('receivable').select('id,customer_name,valor,received_amount,due_on,received_on,status')
        .eq('company_id', companyId).order('due_on', { ascending: true }),
      (api as any).from('payment_fee').select('payment_method,fee_percent,parcelas,bandeira')
        .eq('company_id', companyId).eq('parcelas', 0),
      (api as any).from('commission').select('commission_amount,status').eq('company_id', companyId)
        .eq('status', 'pago').gte('created_at', inicioStr).lte('created_at', fimStr + 'T23:59:59'),
    ]);

    const vs    = (vendas     || []) as VendaRow[];
    const vsAnt = (vendasAnt  || []) as Pick<VendaRow,'final_amount'|'amount'>[];
    const cps   = (contas     || []) as ContaPagarRow[];
    const cpsAnt= (contasAnt  || []) as { valor: number }[];
    const crs   = (receber    || []) as ContaReceberRow[];
    const txs   = (taxas      || []) as TaxaRow[];
    const cms   = (comissoes  || []) as { commission_amount: number }[];

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const receitaBruta   = vs.reduce((s,v) => s + (Number(v.gross_amount) || Number(v.valor) || 0), 0);
    const descontos      = vs.reduce((s,v) => s + (Number(v.desconto) || 0), 0);
    const receitaLiquida = vs.reduce((s,v) => s + (Number(v.final_amount) || Number(v.valor) || 0), 0);
    const despesasPagas  = cps.reduce((s,c) => s + Number(c.valor), 0);
    const resultado      = receitaLiquida - despesasPagas;
    const margemLiquida  = receitaLiquida > 0 ? (resultado / receitaLiquida) * 100 : 0;
    const qtdVendas      = vs.length;
    const ticketMedio    = qtdVendas > 0 ? receitaLiquida / qtdVendas : 0;
    const diasPeriodo    = Math.max(differenceInDays(fim, inicio) + 1, 1);

    const receitaAnterior  = vsAnt.reduce((s,v) => s + (Number(v.final_amount) || Number(v.valor) || 0), 0);
    const despesasAnterior = cpsAnt.reduce((s,c) => s + Number(c.valor), 0);
    const ticketAnterior   = vsAnt.length > 0 ? receitaAnterior / vsAnt.length : 0;

    // ── Timeline receita (por semana) ─────────────────────────────────────────
    const semanas = eachWeekOfInterval({ start: inicio, end: fim }, { locale: ptBR });
    const timeline = semanas.map((sem, i) => {
      const ini = startOfWeek(sem, { locale: ptBR });
      const end_ = endOfWeek(sem, { locale: ptBR });
      const sv = vs.filter(v => {
        const d = parseISO(v.sold_on + 'T00:00:00');
        return !isBefore(d, ini) && !isAfter(d, end_);
      });
      const bruta   = sv.reduce((s,v) => s + (Number(v.gross_amount) || Number(v.valor) || 0), 0);
      const liquida = sv.reduce((s,v) => s + (Number(v.final_amount) || Number(v.valor) || 0), 0);
      return { periodo: semanas.length <= 6 ? format(ini, 'dd/MM', { locale: ptBR }) : `S${i+1}`, bruta, liquida };
    });

    // ── Despesas por categoria ─────────────────────────────────────────────────
    const catMap: Record<string, number> = {};
    cps.forEach(c => {
      const cat = c.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + Number(c.valor);
    });
    const categorias = Object.entries(catMap)
      .sort((a,b) => b[1]-a[1])
      .map(([name, value], i) => ({ name, value, color: CAT_COLORS[i % CAT_COLORS.length] }));

    // ── Comissões ─────────────────────────────────────────────────────────────
    const custoComissoes = cms.reduce((s,c) => s + Number(c.commission_amount), 0);

    // ── Inadimplência e taxa de desconto ──────────────────────────────────────
    const totalReceber = crs.reduce((s,c) => s + Number(c.valor), 0);
    const totalVencido = crs.filter(c => c.status === 'vencido' || (c.status === 'pendente' && c.due_on < hoje))
      .reduce((s,c) => s + Number(c.valor), 0);
    const inadimplencia = totalReceber > 0 ? (totalVencido / totalReceber) * 100 : 0;
    const taxaDesconto  = receitaBruta  > 0 ? (descontos   / receitaBruta) * 100 : 0;

    // ── Fluxo de caixa semanal ────────────────────────────────────────────────
    const fluxo = semanas.map((sem, i) => {
      const ini = startOfWeek(sem, { locale: ptBR });
      const end_ = endOfWeek(sem, { locale: ptBR });
      const iniS = format(ini,  'yyyy-MM-dd');
      const endS = format(end_, 'yyyy-MM-dd');
      const entradas = vs
        .filter(v => v.sold_on >= iniS && v.sold_on <= endS)
        .reduce((s,v) => s + (Number(v.final_amount) || 0), 0);
      const saidas = cps
        .filter(c => c.paid_on && c.paid_on >= iniS && c.paid_on <= endS)
        .reduce((s,c) => s + Number(c.valor), 0);
      return { semana: semanas.length <= 6 ? format(ini,'dd/MM',{locale:ptBR}) : `S${i+1}`, entradas, saidas, saldo: entradas - saidas };
    });

    // ── Aging de recebíveis ───────────────────────────────────────────────────
    const agingDefs = [
      { faixa: 'A vencer',         min: 1,   max: 9999, color: C.azul,  fn: (c: ContaReceberRow) => c.due_on > hoje && (c.status === 'pendente') },
      { faixa: 'Vence em 7 dias',  min: 0,   max: 7,    color: C.ambar, fn: (c: ContaReceberRow) => c.due_on >= hoje && differenceInDays(parseISO(c.due_on), new Date()) <= 7 && c.status === 'pendente' },
      { faixa: '1-30 dias',        min: 1,   max: 30,   color: '#F97316', fn: (c: ContaReceberRow) => { const d = differenceInDays(new Date(), parseISO(c.due_on)); return d >= 1 && d <= 30 && c.status !== 'recebido' && c.status !== 'cancelado' && c.due_on < hoje; } },
      { faixa: '31-60 dias',       min: 31,  max: 60,   color: '#EF4444', fn: (c: ContaReceberRow) => { const d = differenceInDays(new Date(), parseISO(c.due_on)); return d >= 31 && d <= 60 && c.status !== 'recebido' && c.status !== 'cancelado'; } },
      { faixa: '+60 dias',         min: 61,  max: 9999, color: '#991B1B', fn: (c: ContaReceberRow) => { const d = differenceInDays(new Date(), parseISO(c.due_on)); return d > 60 && c.status !== 'recebido' && c.status !== 'cancelado'; } },
    ];
    const aging = agingDefs.map(def => {
      const grupo = crs.filter(def.fn);
      return { faixa: def.faixa, valor: grupo.reduce((s,c) => s + Number(c.valor), 0), count: grupo.length, color: def.color };
    });

    const proximos30 = crs
      .filter(c => c.status === 'pendente' && c.due_on >= hoje && c.due_on <= format(addDays(new Date(), 30), 'yyyy-MM-dd'))
      .reduce((s,c) => s + Number(c.valor), 0);
    const top5 = crs
      .filter(c => c.status === 'pendente' || c.status === 'vencido')
      .sort((a,b) => Number(b.valor) - Number(a.valor))
      .slice(0, 5);

    // ── Comparativo 6 meses ───────────────────────────────────────────────────
    const { data: v6 } = await api.from('sale')
      .select('final_amount,valor,sold_on')
      .eq('company_id', companyId)
      .gte('sold_on', format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'));
    const { data: c6 } = await api.from('payable')
      .select('valor,paid_on')
      .eq('company_id', companyId).eq('status', 'pago')
      .gte('paid_on', format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'));

    const comparativo = Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(new Date(), 5 - i);
      const mesI = format(startOfMonth(mes), 'yyyy-MM-dd');
      const mesF = format(endOfMonth(mes),   'yyyy-MM-dd');
      const rec = (v6 || []).filter((v:any) => v.sold_on >= mesI && v.sold_on <= mesF)
        .reduce((s:number, v:any) => s + (Number(v.final_amount) || Number(v.valor) || 0), 0);
      const desp = (c6 || []).filter((c:any) => c.paid_on && c.paid_on >= mesI && c.paid_on <= mesF)
        .reduce((s:number, c:any) => s + Number(c.valor), 0);
      return { mes: format(mes, 'MMM', { locale: ptBR }), receita: rec, despesas: desp, resultado: rec - desp };
    });

    // ── Formas de pagamento ───────────────────────────────────────────────────
    const formaMap: Record<string, number> = {};
    vs.forEach(v => { formaMap[v.payment_method] = (formaMap[v.payment_method] || 0) + (Number(v.final_amount) || 0); });
    const formas = Object.entries(formaMap)
      .sort((a,b) => b[1]-a[1])
      .map(([name, valor]) => {
        const tx = txs.find(t => t.payment_method === name && t.parcelas === 0);
        const taxaPerc = tx ? Number(tx.fee_percent) : 0;
        return { name, valor, taxaPerc, custoTaxa: valor * taxaPerc / 100 };
      });

    // ── Montar e gerar insights ───────────────────────────────────────────────
    const d: Dados = {
      receitaBruta, descontos, receitaLiquida, despesasPagas, resultado, margemLiquida,
      qtdVendas, ticketMedio, diasPeriodo,
      receitaAnterior, despesasAnterior, ticketAnterior,
      timeline, categorias, inadimplencia, taxaDesconto, custoComissoes,
      fluxo, aging, totalReceber, totalVencido, proximos30, top5,
      comparativo, formas, insights: [],
    };
    d.insights = gerarInsights(d);
    setDados(d);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDados(); }, [companyId, dataInicio, dataFim]);

  // ── Exportar CSV ───────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const linhas = [
      ['KPI', 'Valor'],
      ['Receita Bruta', dados.receitaBruta.toFixed(2)],
      ['Descontos', dados.descontos.toFixed(2)],
      ['Receita Líquida', dados.receitaLiquida.toFixed(2)],
      ['Despesas Pagas', dados.despesasPagas.toFixed(2)],
      ['Resultado', dados.resultado.toFixed(2)],
      ['Margem Líquida %', dados.margemLiquida.toFixed(2)],
      [''],
      ['Mês', 'Receita', 'Despesas', 'Resultado'],
      ...dados.comparativo.map(m => [m.mes, m.receita.toFixed(2), m.despesas.toFixed(2), m.resultado.toFixed(2)]),
      [''],
      ['Faixa Aging', 'Valor', 'Quantidade'],
      ...dados.aging.map(a => [a.faixa, a.valor.toFixed(2), a.count]),
    ];
    const csv = linhas.map(l => l.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'financeiro.csv';
    a.click();
  };

  // ── Insight styles ────────────────────────────────────────────────────────
  const insightStyle: Record<string, { border: string; bg: string; color: string; emoji: string }> = {
    positivo:    { border: C.verde, bg: 'rgba(16,185,129,0.06)',   color: '#065F46', emoji: '🟢' },
    atencao:     { border: C.ambar, bg: 'rgba(245,158,11,0.06)',   color: '#92400E', emoji: '🟡' },
    critico:     { border: C.verm,  bg: 'rgba(239,68,68,0.06)',    color: '#991B1B', emoji: '🔴' },
    oportunidade:{ border: C.roxo,  bg: 'rgba(142,95,207,0.06)',   color: '#4C1D95', emoji: '💡' },
    tendencia:   { border: C.azul,  bg: 'rgba(59,130,246,0.06)',   color: '#1E40AF', emoji: '📊' },
  };

  const totalEntradas = dados.fluxo.reduce((s,f) => s + f.entradas, 0);
  const totalSaidas   = dados.fluxo.reduce((s,f) => s + f.saidas, 0);
  const saldoFluxo    = totalEntradas - totalSaidas;
  const totalTaxas    = dados.formas.reduce((s,f) => s + f.custoTaxa, 0);
  const taxasPercRec  = dados.receitaLiquida > 0 ? (totalTaxas / dados.receitaLiquida) * 100 : 0;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <>
    <style>{`
      @keyframes fin-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    `}</style>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── SEÇÃO 1 — KPIs ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Sk w={44} h={44} r={12} /><Sk w="60%" /><Sk w="80%" h={28} r={8} /><Sk w="50%" h={20} r={20} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[
            {
              titulo: 'Receita Líquida', valor: fmt(dados.receitaLiquida),
              sub: 'após descontos e devoluções',
              borda: 'linear-gradient(90deg,#10B981,#34D399)',
              iconeBg: 'rgba(16,185,129,0.1)', icone: <TrendingUp size={20} color={C.verde} />,
              badge: <Variacao atual={dados.receitaLiquida} anterior={dados.receitaAnterior} label="vs anterior" />,
            },
            {
              titulo: 'Margem Líquida',
              valor: fmtPct(dados.margemLiquida),
              sub: '(Receita − Despesas) / Receita',
              borda: 'linear-gradient(90deg,#8E5FCF,#B987FF)',
              iconeBg: 'rgba(142,95,207,0.1)', icone: <Percent size={20} color={C.roxo} />,
              badge: (
                <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600,
                  background: dados.margemLiquida >= 20 ? 'rgba(16,185,129,0.1)' : dados.margemLiquida >= 5 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  color: dados.margemLiquida >= 20 ? C.verde : dados.margemLiquida >= 5 ? C.ambar : C.verm }}>
                  {dados.margemLiquida >= 20 ? 'Saudável' : dados.margemLiquida >= 5 ? 'Atenção' : 'Crítico'}
                </span>
              ),
            },
            {
              titulo: 'Despesas Totais', valor: fmt(dados.despesasPagas),
              sub: `${dados.receitaLiquida > 0 ? fmtPct(dados.despesasPagas/dados.receitaLiquida*100) : '0%'} da receita`,
              borda: 'linear-gradient(90deg,#EF4444,#FCA5A5)',
              iconeBg: 'rgba(239,68,68,0.1)', icone: <TrendingDown size={20} color={C.verm} />,
              badge: <Variacao atual={dados.despesasPagas} anterior={dados.despesasAnterior} label="vs anterior" />,
            },
            {
              titulo: 'Resultado Líquido',
              valor: fmt(dados.resultado),
              sub: `Margem: ${fmtPct(dados.margemLiquida)}`,
              borda: dados.resultado >= 0 ? 'linear-gradient(90deg,#10B981,#34D399)' : 'linear-gradient(90deg,#EF4444,#FCA5A5)',
              iconeBg: dados.resultado >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              icone: <Calculator size={20} color={dados.resultado >= 0 ? C.verde : C.verm} />,
              badge: dados.resultado >= 0
                ? <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: C.verde }}>Positivo ✓</span>
                : <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: C.verm }}>Negativo ⚠</span>,
            },
          ].map((kpi, i) => (
            <div key={i} style={{ ...card, padding: 24, position: 'relative', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 16px 48px rgba(71,17,143,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(71,17,143,0.08)'; }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: kpi.borda, borderRadius: '20px 20px 0 0' }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: kpi.iconeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {kpi.icone}
              </div>
              <p style={{ ...label, marginBottom: 4 }}>{kpi.titulo}</p>
              <p style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>{kpi.valor}</p>
              <p style={{ fontSize: '0.72rem', color: C.cinza, fontFamily: 'Gilroy', margin: '0 0 10px' }}>{kpi.sub}</p>
              {kpi.badge}
            </div>
          ))}
        </div>
      )}

      {/* ── SEÇÃO 2 — ANÁLISE DE RECEITA ────────────────────────────────────── */}
      <div style={{ ...card, padding: 24 }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 20px' }}>Composição da Receita</p>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}><Sk h={280} r={12} /><Sk h={280} r={12} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, alignItems: 'start' }}>
            {/* Gráfico */}
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dados.timeline} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBruta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.roxo} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.roxo} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLiquida" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.verde} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.verde} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<GlassTooltip />} />
                  <Area type="monotone" dataKey="bruta"   name="Receita Bruta"   stroke={C.roxo}  strokeWidth={2} fill="url(#gradBruta)" />
                  <Area type="monotone" dataKey="liquida" name="Receita Líquida" stroke={C.verde} strokeWidth={2} fill="url(#gradLiquida)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { l: 'Receita Bruta',     v: dados.receitaBruta,   sub: '100% da receita',                                                                 cor: C.roxo,  bold: false },
                { l: '(-) Descontos',     v: -dados.descontos,     sub: `${fmtPct(dados.taxaDesconto)} da receita bruta`,                                   cor: C.verm,  bold: false },
                { l: '(=) Receita Líq.',  v: dados.receitaLiquida, sub: `${fmtPct(dados.receitaBruta > 0 ? dados.receitaLiquida/dados.receitaBruta*100 : 100)} aproveitado`, cor: C.verde, bold: true },
              ].map(r => (
                <div key={r.l} style={{ background: 'rgba(142,95,207,0.03)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: r.bold ? 700 : 500, fontFamily: 'Gilroy', color: '#374151' }}>{r.l}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Gilroy', color: r.cor }}>{fmt(r.v)}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: C.cinza, fontFamily: 'Gilroy' }}>{r.sub}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                {[
                  { l: 'Ticket médio', v: fmt(dados.ticketMedio), badge: <Variacao atual={dados.ticketMedio} anterior={dados.ticketAnterior} /> },
                  { l: 'Vendas/dia',   v: `${(dados.qtdVendas / dados.diasPeriodo).toFixed(1)}/dia`, badge: null },
                ].map(s => (
                  <div key={s.l} style={{ background: 'rgba(142,95,207,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={label}>{s.l}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'Gilroy', color: C.roxo, fontSize: '0.95rem' }}>{s.v}</span>
                    {s.badge && <div style={{ marginTop: 4 }}>{s.badge}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SEÇÃO 3 — CUSTOS E DESPESAS ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Donut */}
        <div style={{ ...card, padding: 24 }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>Onde vai o dinheiro</p>
          <p style={{ fontSize: '0.75rem', color: C.cinza, fontFamily: 'Gilroy', margin: '0 0 16px' }}>Despesas pagas no período</p>
          {loading ? <Sk h={220} r={12} /> : dados.categorias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.cinza, fontFamily: 'Gilroy' }}>Sem despesas no período</div>
          ) : (
            <>
              <div style={{ position: 'relative', height: 200, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dados.categorias} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                      {dados.categorias.map((_, i) => <Cell key={i} fill={dados.categorias[i].color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontFamily: 'Gilroy', borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <p style={{ fontSize: '0.65rem', color: C.cinza, fontFamily: 'Gilroy', margin: 0 }}>Total</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>{fmt(dados.despesasPagas)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dados.categorias.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.78rem', fontFamily: 'Gilroy', color: '#374151', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                    <div style={{ width: 80, flexShrink: 0 }}><BarraIndicador valor={dados.despesasPagas > 0 ? (cat.value/dados.despesasPagas)*100 : 0} /></div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#374151', flexShrink: 0 }}>{fmt(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Eficiência */}
        <div style={{ ...card, padding: 24 }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>Eficiência Operacional</p>
          <p style={{ fontSize: '0.75rem', color: C.cinza, fontFamily: 'Gilroy', margin: '0 0 20px' }}>Indicadores de performance financeira</p>
          {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0,1,2,3,4].map(i => <Sk key={i} h={60} r={10} />)}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  titulo: 'Custo como % da Receita', valor: fmtPct(dados.receitaLiquida > 0 ? dados.despesasPagas/dados.receitaLiquida*100 : 0),
                  pct: dados.receitaLiquida > 0 ? dados.despesasPagas/dados.receitaLiquida*100 : 0,
                  bench: 'Ideal: <50%',
                  status: dados.receitaLiquida > 0 && dados.despesasPagas/dados.receitaLiquida < 0.5 ? 'Excelente' : dados.receitaLiquida > 0 && dados.despesasPagas/dados.receitaLiquida < 0.7 ? 'Atenção' : 'Crítico',
                },
                {
                  titulo: 'Despesa por Venda', valor: fmt(dados.qtdVendas > 0 ? dados.despesasPagas/dados.qtdVendas : 0),
                  pct: 0, bench: 'Custo médio por transação', status: '',
                },
                {
                  titulo: 'Inadimplência', valor: fmtPct(dados.inadimplencia),
                  pct: dados.inadimplencia, bench: 'Ideal: <5%',
                  status: dados.inadimplencia < 5 ? 'Saudável' : dados.inadimplencia < 15 ? 'Atenção' : 'Crítico',
                },
                {
                  titulo: 'Taxa de Desconto Médio', valor: fmtPct(dados.taxaDesconto),
                  pct: dados.taxaDesconto, bench: 'Alto desconto comprime margem',
                  status: dados.taxaDesconto < 5 ? 'Baixo' : dados.taxaDesconto < 15 ? 'Moderado' : 'Elevado',
                },
                {
                  titulo: 'Custo de Comissões', valor: fmt(dados.custoComissoes),
                  pct: dados.receitaLiquida > 0 ? dados.custoComissoes/dados.receitaLiquida*100 : 0,
                  bench: `${fmtPct(dados.receitaLiquida > 0 ? dados.custoComissoes/dados.receitaLiquida*100 : 0)} da receita`,
                  status: '',
                },
              ].map((kpi, i) => (
                <div key={i} style={{ background: 'rgba(142,95,207,0.03)', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: 'Gilroy', color: '#374151' }}>{kpi.titulo}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {kpi.status && (
                        <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'Gilroy',
                          background: kpi.status === 'Excelente' || kpi.status === 'Saudável' || kpi.status === 'Baixo' ? 'rgba(16,185,129,0.1)' : kpi.status === 'Atenção' || kpi.status === 'Moderado' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: kpi.status === 'Excelente' || kpi.status === 'Saudável' || kpi.status === 'Baixo' ? C.verde : kpi.status === 'Atenção' || kpi.status === 'Moderado' ? C.ambar : C.verm }}>
                          {kpi.status}
                        </span>
                      )}
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Gilroy', color: C.roxo }}>{kpi.valor}</span>
                    </div>
                  </div>
                  {kpi.pct > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><BarraIndicador valor={kpi.pct} /></div>}
                  <span style={{ fontSize: '0.7rem', color: C.cinza, fontFamily: 'Gilroy' }}>{kpi.bench}</span>
                  {kpi.titulo === 'Custo de Comissões' && (
                    <Link to="/comissoes" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.roxo, textDecoration: 'none', fontFamily: 'Gilroy', fontWeight: 600, marginLeft: 8 }}>
                      Ver detalhes <ExternalLink size={10} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SEÇÃO 4 — FLUXO DE CAIXA ────────────────────────────────────────── */}
      <div style={{ ...card, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>Fluxo de Caixa Realizado</p>
            <p style={{ fontSize: '0.75rem', color: C.cinza, fontFamily: 'Gilroy', margin: '2px 0 0' }}>Entradas e saídas efetivas do período</p>
          </div>
        </div>
        {loading ? <Sk h={300} r={12} /> : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={dados.fluxo} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="entradas" name="Entradas" fill={C.verde} radius={[4,4,0,0]} opacity={0.85} />
                <Bar dataKey="saidas"   name="Saídas"   fill={C.verm}  radius={[4,4,0,0]} opacity={0.85} />
                <Line type="monotone" dataKey="saldo" name="Saldo" stroke={C.roxo} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
              {[
                { l: 'Total Entradas', v: fmt(totalEntradas), cor: C.verde },
                { l: 'Total Saídas',   v: fmt(totalSaidas),   cor: C.verm  },
                { l: 'Saldo Líquido',  v: fmt(saldoFluxo),    cor: saldoFluxo >= 0 ? C.verde : C.verm },
              ].map(s => (
                <div key={s.l} style={{ background: 'rgba(142,95,207,0.04)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <span style={label}>{s.l}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Gilroy', color: s.cor, display: 'block' }}>{s.v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── SEÇÃO 5 — RECEBÍVEIS ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Aging */}
        <div style={{ ...card, padding: 24 }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>Aging de Contas a Receber</p>
          <p style={{ fontSize: '0.75rem', color: C.cinza, fontFamily: 'Gilroy', margin: '0 0 16px' }}>Quanto está vencido e há quanto tempo</p>
          {loading ? <Sk h={220} r={12} /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dados.aging} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="faixa" tick={{ fontSize: 10, fill: '#374151', fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontFamily: 'Gilroy', borderRadius: 12 }} />
                  <Bar dataKey="amount" name="Valor" radius={[0,4,4,0]}>
                    {dados.aging.map((a, i) => <Cell key={i} fill={a.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {dados.totalVencido > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={14} color={C.verm} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Gilroy', color: C.verm }}>Risco de inadimplência: {fmt(dados.totalVencido)}</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#991B1B', fontFamily: 'Gilroy', margin: '4px 0 0' }}>
                    {dados.aging.filter(a => a.faixa !== 'A vencer' && a.faixa !== 'Vence em 7 dias').reduce((s,a) => s+a.count,0)} contas vencidas
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Performance recebimentos */}
        <div style={{ ...card, padding: 24 }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 20px' }}>Performance de Recebimentos</p>
          {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0,1,2,3].map(i => <Sk key={i} h={56} r={10} />)}</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { l: 'Total a Receber',  v: fmt(dados.totalReceber), cor: C.cinza, bg: 'rgba(142,95,207,0.04)' },
                { l: 'A Receber (pendente)', v: fmt(dados.proximos30), cor: C.ambar, bg: 'rgba(245,158,11,0.05)' },
                { l: 'Vencido',          v: fmt(dados.totalVencido), cor: C.verm,  bg: 'rgba(239,68,68,0.05)' },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: r.bg, borderRadius: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'Gilroy', color: '#374151', fontWeight: 600 }}>{r.l}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'Gilroy', color: r.cor }}>{r.v}</span>
                </div>
              ))}
              {dados.top5.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ ...label, marginBottom: 8 }}>Top 5 recebíveis em aberto</p>
                  {dados.top5.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', color: '#374151', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.customer_name || 'Cliente'}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Gilroy', color: c.status === 'vencido' ? C.verm : C.ambar, flexShrink: 0 }}>
                        {fmt(Number(c.valor))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SEÇÃO 6 — COMPARATIVO MENSAL ────────────────────────────────────── */}
      <div style={{ ...card, padding: 24 }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 20px' }}>Evolução dos últimos 6 meses</p>
        {loading ? <Sk h={280} r={12} /> : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dados.comparativo} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="receita"   name="Receita"   fill={C.roxo}  radius={[4,4,0,0]} opacity={0.85} />
                <Bar dataKey="despesas"  name="Despesas"  fill={C.verm}  radius={[4,4,0,0]} opacity={0.85} />
                <Bar dataKey="resultado" name="Resultado" fill={C.verde} radius={[4,4,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
            {/* Tabela comparativa */}
            <div style={{ marginTop: 20, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Gilroy', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {['Mês','Receita','Despesas','Resultado','Margem'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Mês' ? 'left' : 'right', color: C.cinza, fontWeight: 600, borderBottom: '1px solid rgba(142,95,207,0.1)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.comparativo.map((m, i) => {
                    const maxRec = Math.max(...dados.comparativo.map(x => x.receita));
                    const minRec = Math.min(...dados.comparativo.filter(x => x.receita > 0).map(x => x.receita));
                    const isBest = m.receita === maxRec && m.receita > 0;
                    const isWorst = m.receita === minRec && m.receita > 0 && m.receita !== maxRec;
                    const bg = isBest ? 'rgba(16,185,129,0.06)' : isWorst ? 'rgba(239,68,68,0.06)' : i === dados.comparativo.length - 1 ? 'rgba(142,95,207,0.06)' : 'transparent';
                    const margem = m.receita > 0 ? (m.resultado/m.receita)*100 : 0;
                    const prev = i > 0 ? dados.comparativo[i-1] : null;
                    return (
                      <tr key={m.mes} style={{ background: bg }}>
                        <td style={{ padding: '9px 12px', fontWeight: i === dados.comparativo.length-1 ? 700 : 500, color: '#1F2937' }}>{m.mes}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: C.roxo }}>{fmt(m.receita)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: C.verm  }}>{fmt(m.despesas)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: m.resultado >= 0 ? C.verde : C.verm }}>{fmt(m.resultado)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                          <span style={{ color: margem >= 10 ? C.verde : margem >= 0 ? C.ambar : C.verm, fontWeight: 600 }}>{fmtPct(margem)}</span>
                          {prev && prev.receita > 0 && (
                            <span style={{ marginLeft: 6, fontSize: '0.7rem', color: m.receita >= prev.receita ? C.verde : C.verm }}>
                              {m.receita >= prev.receita ? '↑' : '↓'}{Math.abs((m.receita/prev.receita-1)*100).toFixed(0)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Rodapé */}
                  <tr style={{ borderTop: '2px solid rgba(142,95,207,0.12)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1F2937', fontSize: '0.75rem' }}>Média</td>
                    {(['receita','despesas','resultado'] as const).map(k => {
                      const avg = dados.comparativo.reduce((s,m) => s + m[k], 0) / Math.max(dados.comparativo.length,1);
                      return <td key={k} style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#1F2937' }}>{fmt(avg)}</td>;
                    })}
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#9CA3AF' }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── SEÇÃO 7 — FORMAS DE PAGAMENTO ───────────────────────────────────── */}
      <div style={{ ...card, padding: 24 }}>
        <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>Receita por Forma de Pagamento</p>
        <p style={{ fontSize: '0.75rem', color: C.cinza, fontFamily: 'Gilroy', margin: '0 0 20px' }}>Impacto das taxas no resultado</p>
        {loading ? <Sk h={200} r={12} /> : dados.formas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: C.cinza, fontFamily: 'Gilroy' }}>Sem vendas no período</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, alignItems: 'start' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dados.formas} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.cinza, fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#374151', fontFamily: 'Gilroy' }} axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontFamily: 'Gilroy', borderRadius: 12 }} />
                <Bar dataKey="amount" name="Valor" radius={[0,4,4,0]}>
                  {dados.formas.map((f, i) => {
                    const cor = f.name === 'PIX' || f.name === 'Dinheiro' ? C.verde : f.name === 'Cartão de Débito' ? C.azul : f.taxaPerc > 2 ? C.ambar : C.roxo;
                    return <Cell key={i} fill={cor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Gilroy', fontSize: '0.75rem' }}>
                <thead>
                  <tr>
                    {['Forma','Valor Bruto','Taxa%','Custo'].map(h => (
                      <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Forma' ? 'left' : 'right', color: C.cinza, fontWeight: 600, borderBottom: '1px solid rgba(142,95,207,0.1)', fontSize: '0.68rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.formas.map(f => (
                    <tr key={f.name}>
                      <td style={{ padding: '6px 8px', color: '#374151', fontWeight: 600 }}>{f.name}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#374151' }}>{fmt(f.valor)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: f.taxaPerc > 0 ? C.ambar : C.verde }}>{f.taxaPerc > 0 ? fmtPct(f.taxaPerc) : '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: f.custoTaxa > 0 ? C.verm : C.verde, fontWeight: 700 }}>{f.custoTaxa > 0 ? `-${fmt(f.custoTaxa)}` : 'Sem taxa'}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(142,95,207,0.1)' }}>
                    <td colSpan={3} style={{ padding: '6px 8px', fontWeight: 700, color: '#1F2937' }}>Total taxas</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: C.verm }}>{fmt(totalTaxas)}</td>
                  </tr>
                </tbody>
              </table>
              {taxasPercRec > 3 && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: '0.75rem', fontFamily: 'Gilroy', color: '#92400E' }}>
                  💡 Incentive PIX e dinheiro para reduzir o custo de <strong>{fmt(totalTaxas)}</strong>/período ({fmtPct(taxasPercRec)} da receita)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SEÇÃO 8 — INSIGHTS ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lightbulb size={18} color={C.roxo} />
          </div>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>💡 Insights Financeiros</p>
            <p style={{ fontSize: '0.75rem', color: C.cinza, fontFamily: 'Gilroy', margin: 0 }}>Análise automática do período</p>
          </div>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0,1,2].map(i => <Sk key={i} h={60} r={10} />)}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
            {dados.insights.map((ins, i) => {
              const s = insightStyle[ins.kind] ?? insightStyle.tendencia;
              return (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}22`, borderLeft: `4px solid ${s.border}`, borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Gilroy', color: s.color, margin: '0 0 4px' }}>
                    {s.emoji} {ins.titulo}
                  </p>
                  <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', color: s.color, margin: 0, opacity: 0.85, lineHeight: 1.5 }}>{ins.corpo}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
    </>
  );
}
