import React, { useState, useEffect, useCallback } from 'react'
import { useFinanceiro } from '@/hooks/useFinanceiro'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, Wallet, Calculator, RefreshCw,
  Clock, AlertTriangle, BarChart2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ComposedChart, Bar, Line, AreaChart, Area, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtK = (v: number) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return fmtBRL(v)
}

// ─── Card métrica ─────────────────────────────────────────────────────────────

function CardMetrica({
  titulo, valor, icone, gradiente, negativo, badge, sub, borderColor,
}: {
  titulo: string
  valor: number
  icone: React.ReactNode
  gradiente: string
  negativo?: boolean
  badge?: React.ReactNode
  sub?: string
  borderColor?: string
}) {
  const cor = negativo ? '#EF4444' : valor < 0 ? '#EF4444' : '#1F2937'
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        borderTop: `3px solid ${borderColor || '#8E5FCF'}`,
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#6B7280' }}>{titulo}</p>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: gradiente, flexShrink: 0 }}>
          {icone}
        </div>
      </div>
      <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.75rem', color: cor, lineHeight: 1.2 }}>{fmtBRL(valor)}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px', fontFamily: 'Gilroy' }}>{sub}</p>}
      {badge && <div style={{ marginTop: '8px' }}>{badge}</div>}
    </div>
  )
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

const tooltipStyle = {
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(142,95,207,0.2)',
  borderRadius: '12px',
  padding: '12px 16px',
  fontFamily: 'Gilroy',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
}

function TooltipDia({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...tooltipStyle, minWidth: '160px', fontSize: '0.875rem' }}>
      <p style={{ fontWeight: 700, marginBottom: '6px', color: '#1F2937' }}>Dia {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

function TooltipSemana({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ ...tooltipStyle, minWidth: '180px', fontSize: '0.875rem' }}>
      <p style={{ fontWeight: 700, marginBottom: '6px', color: '#1F2937' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {fmtBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Gauge simples ────────────────────────────────────────────────────────────

const glassCard = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  padding: '24px',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
}

function GaugeKPI({ valor, label, descricao, benchmarkLabel }: {
  valor: number
  label: string
  descricao: string
  benchmarkLabel?: string
}) {
  const pct = Math.min(Math.max(valor, 0), 100)
  const cor = pct >= 15 ? '#10B981' : pct >= 5 ? '#F59E0B' : '#EF4444'
  const circum = 2 * Math.PI * 36
  const offset = circum - (pct / 100) * circum
  const [hovered, setHovered] = React.useState(false)

  return (
    <div style={{ ...glassCard, boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)', transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#374151', marginBottom: '12px' }}>{label}</p>
        <div style={{ position: 'relative', width: '96px', height: '96px' }}>
          <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="36" fill="none" stroke="#F3F4F6" strokeWidth="8" />
            <circle cx="40" cy="40" r="36" fill="none" stroke={cor} strokeWidth="8"
              strokeDasharray={circum} strokeDashoffset={offset}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'Gilroy', color: cor }}>{valor.toFixed(1)}%</span>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '8px', fontFamily: 'Gilroy' }}>{descricao}</p>
        {benchmarkLabel && (
          <span style={{ marginTop: '6px', background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', borderRadius: '20px', padding: '3px 12px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>{benchmarkLabel}</span>
        )}
      </div>
    </div>
  )
}

// ─── KPI numérico ─────────────────────────────────────────────────────────────

function KPINumerico({ label, valor, unidade, descricao, benchmark, positivo }: {
  label: string
  valor: number
  unidade: string
  descricao: string
  benchmark?: string
  positivo?: boolean
}) {
  const cor = positivo === undefined ? '#1F2937' : positivo ? '#10B981' : '#EF4444'
  const [hovered, setHovered] = React.useState(false)
  return (
    <div style={{ ...glassCard, boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)', transform: hovered ? 'translateY(-4px)' : 'translateY(0)' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#374151', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '2.5rem', color: cor, lineHeight: 1.1 }}>
        {valor} <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#9CA3AF' }}>{unidade}</span>
      </p>
      <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '6px', fontFamily: 'Gilroy' }}>{descricao}</p>
      {benchmark && (
        <span style={{ marginTop: '8px', display: 'inline-block', background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', borderRadius: '20px', padding: '3px 12px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>{benchmark}</span>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Financeiro() {
  const { buscarVisaoGeral, buscarFluxoProjetado, calcularCenario, buscarKPIs } = useFinanceiro()

  // Aba 1
  const [visao, setVisao] = useState<any>(null)
  // Aba 2
  const [periodoFluxo, setPeriodoFluxo] = useState(90)
  const [fluxo, setFluxo] = useState<any>(null)
  // Aba 3
  const [sliderVendas, setSliderVendas] = useState(100)
  const [sliderDespesas, setSliderDespesas] = useState(100)
  const [periodoCenario, setPeriodoCenario] = useState(30)
  const [cenario, setCenario] = useState<any>(null)
  // Aba 4
  const [kpis, setKpis] = useState<any>(null)

  const [tabAtual, setTabAtual] = useState('visao')
  const [atualizadoEm, setAtualizadoEm] = useState(new Date())
  const [carregando, setCarregando] = useState(false)

  // Carrega visão geral na montagem e ao trocar para aba 1
  useEffect(() => {
    if (tabAtual === 'visao' && !visao) {
      setCarregando(true)
      buscarVisaoGeral().then(d => { setVisao(d); setCarregando(false) })
    }
  }, [tabAtual])

  useEffect(() => {
    if (tabAtual === 'fluxo') {
      setCarregando(true)
      buscarFluxoProjetado(periodoFluxo).then(d => { setFluxo(d); setCarregando(false) })
    }
  }, [tabAtual, periodoFluxo])

  useEffect(() => {
    if (tabAtual === 'projecoes') {
      setCarregando(true)
      calcularCenario(sliderVendas, sliderDespesas, periodoCenario)
        .then(d => { setCenario(d); setCarregando(false) })
    }
  }, [tabAtual, sliderVendas, sliderDespesas, periodoCenario])

  useEffect(() => {
    if (tabAtual === 'indicadores' && !kpis) {
      setCarregando(true)
      buscarKPIs().then(d => { setKpis(d); setCarregando(false) })
    }
  }, [tabAtual])

  const atualizar = () => {
    setVisao(null); setFluxo(null); setCenario(null); setKpis(null)
    setAtualizadoEm(new Date())
    setCarregando(true)
    buscarVisaoGeral().then(d => { setVisao(d); setCarregando(false) })
  }

  const aplicarCenario = (vendas: number, despesas: number) => {
    setSliderVendas(vendas)
    setSliderDespesas(despesas)
  }

  // ── Aba 1 helpers ──────────────────────────────────────────────────────────

  const diasGrafico = (visao?.diasDoMes || []).map((d: any, i: number) => ({
    dia: i + 1,
    Entradas: d.entradas,
    Saídas: d.saidas,
    Saldo: (visao?.diasDoMes || [])
      .slice(0, i + 1)
      .reduce((s: number, x: any) => s + x.entradas - x.saidas, 0),
  }))

  // ── Aba 2 helpers ──────────────────────────────────────────────────────────

  const fluxoGrafico = (fluxo?.semanas || []).map((s: any) => ({
    semana: s.semana,
    Entradas: s.totalEntradas,
    Saídas: s.saidasPrevistas,
    Saldo: s.saldo,
  }))

  // ── Aba 3 helpers ──────────────────────────────────────────────────────────

  const cenarioGrafico = (cenario?.semanas || []).map((s: any) => ({
    semana: s.semana,
    Entradas: s.totalEntradas,
    Saídas: s.saidasPrevistas,
    Saldo: s.saldo,
  }))

  const saldoFinalCenario = (cenario?.semanas || []).reduce(
    (s: number, x: any) => s + x.saldo, 0
  )
  const piorMomento = Math.min(...(cenario?.semanas || [{ saldo: 0 }]).map((s: any) => s.saldo))
  const statusCenario =
    saldoFinalCenario > 0 && piorMomento > 0 ? 'saudavel'
    : saldoFinalCenario > 0 ? 'atencao'
    : 'critico'

  // ── Aba 4 — inadimplência estimada ────────────────────────────────────────

  const inadimplencia = kpis
    ? kpis.receitasPendentes > 0
      ? Math.min((kpis.despesasVencidas / Math.max(kpis.receitaRealizada, 1)) * 100, 100)
      : 0
    : 0

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: '-200px', left: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-150px', right: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      {/* Pulse keyframes */}
      <style>{`
        @keyframes oasis-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
        .oasis-dot { animation: oasis-pulse 2s ease-in-out infinite; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }} className="space-y-6">

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Oasis › Central Financeira
          </p>
          <h1 style={{ fontSize: '2rem', fontFamily: 'Gilroy', fontWeight: 700, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Central Financeira
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
            Visão completa da saúde financeira
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '6px 14px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem' }}>
            <span className="oasis-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            Atualizado {format(atualizadoEm, "'às' HH:mm")}
          </span>
          <button
            onClick={atualizar}
            disabled={carregando}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: carregando ? 'not-allowed' : 'pointer', opacity: carregando ? 0.7 : 1, transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!carregando) { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.5)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.3)'; }}
          >
            <RefreshCw size={14} style={carregando ? { animation: 'spin 1s linear infinite' } : {}} />
            Atualizar
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}>
            ↓ PDF
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}>
            ↓ Relatório
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tabAtual} onValueChange={setTabAtual}>
        {/* Custom pill tabs */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '16px', padding: '6px', gap: '4px' }}>
          {[
            { value: 'visao', label: '📊 Visão Geral' },
            { value: 'fluxo', label: '💸 Fluxo de Caixa' },
            { value: 'projecoes', label: '🔮 Projeções' },
            { value: 'indicadores', label: '📈 Indicadores' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setTabAtual(tab.value)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                fontFamily: 'Gilroy',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                background: tabAtual === tab.value ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent',
                color: tabAtual === tab.value ? 'white' : '#6B7280',
                boxShadow: tabAtual === tab.value ? '0 4px 15px rgba(142,95,207,0.4)' : 'none',
                transform: tabAtual === tab.value ? 'translateY(-1px)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Hidden TabsList for Tabs to work correctly */}
        <TabsList className="hidden">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="projecoes">Projeções</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        {/* ── ABA 1 — VISÃO GERAL ─────────────────────────────────────────── */}
        <TabsContent value="visao" className="space-y-6 mt-6">
          {!visao ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Carregando…</div>
          ) : (
            <>
              {/* Cards topo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CardMetrica
                  titulo="Receita do Mês"
                  valor={visao.receitaRealizada}
                  icone={<TrendingUp size={18} />}
                  gradiente="linear-gradient(135deg,#10B981,#059669)"
                  borderColor="#10B981"
                />
                <CardMetrica
                  titulo="Despesas Pagas"
                  valor={visao.despesasPagas}
                  icone={<TrendingDown size={18} />}
                  gradiente="linear-gradient(135deg,#EF4444,#B91C1C)"
                  negativo
                  borderColor="#EF4444"
                  badge={visao.despesasPendentes > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                      + {fmtBRL(visao.despesasPendentes)} pendente
                    </span>
                  )}
                />
                <CardMetrica
                  titulo="Resultado Operacional"
                  valor={visao.saldoOperacional}
                  icone={<Calculator size={18} />}
                  gradiente={visao.saldoOperacional >= 0 ? 'linear-gradient(135deg,#8E5FCF,#47118F)' : 'linear-gradient(135deg,#EF4444,#B91C1C)'}
                  borderColor={visao.saldoOperacional >= 0 ? '#8E5FCF' : '#EF4444'}
                  badge={
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: visao.margem >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: visao.margem >= 0 ? '#10B981' : '#EF4444', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                      Margem {visao.margem.toFixed(1)}%
                    </span>
                  }
                />
                <CardMetrica
                  titulo="Saldo Projetado"
                  valor={visao.saldoProjetado}
                  icone={<Wallet size={18} />}
                  gradiente="linear-gradient(135deg,#3B82F6,#1D4ED8)"
                  borderColor="#3B82F6"
                  sub="Inclui recebíveis pendentes"
                />
              </div>

              {/* Alertas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visao.saldoProjetado < 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', borderLeft: '4px solid #EF4444', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, color: '#EF4444', fontSize: '0.875rem' }}>
                      Saldo projetado negativo: <strong>{fmtBRL(visao.saldoProjetado)}</strong>
                    </p>
                  </div>
                )}
                {visao.margem > 20 && (
                  <div style={{ background: 'rgba(16,185,129,0.06)', borderLeft: '4px solid #10B981', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, color: '#10B981', fontSize: '0.875rem' }}>
                      🎉 Ótimo mês! Margem de <strong>{visao.margem.toFixed(1)}%</strong>
                    </p>
                  </div>
                )}
                {visao.despesasVencidas > 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.06)', borderLeft: '4px solid #F59E0B', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, color: '#F59E0B', fontSize: '0.875rem' }}>
                      Você tem <strong>{fmtBRL(visao.despesasVencidas)}</strong> em contas vencidas
                    </p>
                  </div>
                )}
              </div>

              {/* Gráfico evolução diária */}
              <div style={{ ...glassCard, padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Evolução do Mês</h3>
                  <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>Entradas, saídas e saldo acumulado diário</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={diasGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} width={60} />
                    <Tooltip content={<TooltipDia />} />
                    <Legend wrapperStyle={{ fontFamily: 'Gilroy', fontSize: '0.8rem' }} />
                    <Bar dataKey="Entradas" fill="#10B981" opacity={0.7} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saídas" fill="#EF4444" opacity={0.7} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Saldo" stroke="#8E5FCF" strokeWidth={2.5} dot={{ fill: '#8E5FCF', r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Grid inferior */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ ...glassCard }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingDown size={16} style={{ color: '#EF4444' }} />
                      <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: 0 }}>Próximas Saídas</h3>
                    </div>
                    <span style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>7 dias</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(visao.proximasSaidas || []).length === 0
                      ? <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>Nenhuma saída prevista</p>
                      : (visao.proximasSaidas || []).map((c: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #EF4444', background: 'transparent', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <span style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.descricao || 'Conta'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'Gilroy', fontWeight: 700, color: '#EF4444', fontSize: '0.875rem' }}>{fmtBRL(c.valor)}</span>
                            <span style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF' }}>{c.data_vencimento}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                <div style={{ ...glassCard }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={16} style={{ color: '#10B981' }} />
                      <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: 0 }}>Próximas Entradas</h3>
                    </div>
                    <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>7 dias</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(visao.proximasEntradas || []).length === 0
                      ? <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>Nenhuma entrada prevista</p>
                      : (visao.proximasEntradas || []).map((c: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #10B981', background: 'transparent', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <span style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.descricao || c.cliente_nome || 'Recebível'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'Gilroy', fontWeight: 700, color: '#10B981', fontSize: '0.875rem' }}>{fmtBRL(c.valor)}</span>
                            <span style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF' }}>{c.data_vencimento}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── ABA 2 — FLUXO DE CAIXA ──────────────────────────────────────── */}
        <TabsContent value="fluxo" className="space-y-6 mt-6">
          {/* Seletor de período */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[30, 60, 90, 180].map(d => (
              <button
                key={d}
                onClick={() => setPeriodoFluxo(d)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  border: periodoFluxo === d ? 'none' : '1.5px solid rgba(142,95,207,0.25)',
                  fontFamily: 'Gilroy',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: periodoFluxo === d ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'rgba(255,255,255,0.7)',
                  color: periodoFluxo === d ? 'white' : '#6B7280',
                  backdropFilter: periodoFluxo === d ? undefined : 'blur(20px)',
                  boxShadow: periodoFluxo === d ? '0 4px 15px rgba(142,95,207,0.35)' : 'none',
                }}
              >
                {d === 180 ? '6 meses' : `${d} dias`}
              </button>
            ))}
          </div>

          {!fluxo ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Carregando…</div>
          ) : (
            <>
              {/* Alertas pontos críticos */}
              {(fluxo.pontosCriticos || []).length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.06)', borderLeft: '4px solid #EF4444', borderRadius: '16px', padding: '16px 20px' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#EF4444', marginBottom: '8px' }}>
                    <AlertTriangle size={16} /> Pontos críticos detectados
                  </p>
                  {fluxo.pontosCriticos.map((s: any, i: number) => (
                    <p key={i} style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#EF4444', marginBottom: '2px' }}>
                      • Caixa negativo na semana de {s.inicio}: {fmtBRL(s.saldo)}
                    </p>
                  ))}
                </div>
              )}

              {/* Gráfico */}
              <div style={{ ...glassCard }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Fluxo Projetado — Próximas {periodoFluxo} dias</h3>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={fluxoGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} width={60} />
                    <Tooltip content={<TooltipSemana />} />
                    <Legend wrapperStyle={{ fontFamily: 'Gilroy', fontSize: '0.8rem' }} />
                    <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="Entradas" stroke="#10B981" fill="url(#gradEntradas)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="Saídas" stroke="#EF4444" fill="url(#gradSaidas)" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Saldo" stroke="#8E5FCF" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela semanas */}
              <div style={{ ...glassCard, padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.08)' }}>
                  <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: 0 }}>Detalhamento por Semana</h3>
                </div>
                <div style={{ overflowX: 'auto', padding: '0 24px 24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Gilroy', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
                        <th style={{ padding: '12px 16px 12px 0', textAlign: 'left', fontWeight: 600, color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semana</th>
                        <th style={{ padding: '12px 16px 12px 0', textAlign: 'right', fontWeight: 600, color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entradas</th>
                        <th style={{ padding: '12px 16px 12px 0', textAlign: 'right', fontWeight: 600, color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saídas</th>
                        <th style={{ padding: '12px 0 12px 0', textAlign: 'right', fontWeight: 600, color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(fluxo.semanas || []).map((s: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(142,95,207,0.06)', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.03)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <td style={{ padding: '12px 16px 12px 0', color: '#374151' }}>{s.semana}</td>
                          <td style={{ padding: '12px 16px 12px 0', textAlign: 'right', fontWeight: 600, color: '#10B981' }}>{fmtBRL(s.totalEntradas)}</td>
                          <td style={{ padding: '12px 16px 12px 0', textAlign: 'right', fontWeight: 600, color: '#EF4444' }}>{fmtBRL(s.saidasPrevistas)}</td>
                          <td style={{ padding: '12px 0 12px 0', textAlign: 'right', fontWeight: 700, color: s.saldo >= 0 ? '#10B981' : '#EF4444' }}>
                            {fmtBRL(s.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accordion compromissos */}
              <div style={{ ...glassCard }}>
                <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: '0 0 16px 0' }}>Compromissos por Semana</h3>
                <Accordion type="multiple">
                  {(fluxo.semanas || []).map((s: any, i: number) => {
                    const pagarSem = (fluxo.pagarFuturas || []).filter(
                      (c: any) => c.data_vencimento >= s.inicio && c.data_vencimento <= s.fim
                    )
                    const receberSem = (fluxo.receberFuturas || []).filter(
                      (c: any) => c.data_vencimento >= s.inicio && c.data_vencimento <= s.fim
                    )
                    if (pagarSem.length === 0 && receberSem.length === 0) return null
                    return (
                      <AccordionItem key={i} value={`sem-${i}`} style={{ borderColor: 'rgba(142,95,207,0.12)' }}>
                        <AccordionTrigger style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                          {s.semana} — {pagarSem.length + receberSem.length} compromissos
                        </AccordionTrigger>
                        <AccordionContent>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {pagarSem.map((c: any, j: number) => (
                              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#EF4444', padding: '4px 0' }}>
                                <span>{c.descricao || 'Conta a pagar'}</span>
                                <span>{fmtBRL(c.valor)} — {c.data_vencimento}</span>
                              </div>
                            ))}
                            {receberSem.map((c: any, j: number) => (
                              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#10B981', padding: '4px 0' }}>
                                <span>{c.descricao || c.cliente_nome || 'Conta a receber'}</span>
                                <span>{fmtBRL(c.valor)} — {c.data_vencimento}</span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── ABA 3 — PROJEÇÕES WHAT-IF ────────────────────────────────────── */}
        <TabsContent value="projecoes" className="space-y-6 mt-6">
          <div>
            <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.25rem', color: '#1F2937', margin: '0 0 4px 0' }}>Simulador de Cenários</h2>
            <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Veja como diferentes situações afetam seu caixa</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Controles */}
            <div style={{ ...glassCard, gridColumn: 'span 1' }}>
              <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: '0 0 20px 0' }}>Controles</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Cenários pré-definidos */}
                <div>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Cenários rápidos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => aplicarCenario(70, 120)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#EF4444', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                    >
                      🔴 Pessimista
                    </button>
                    <button
                      onClick={() => aplicarCenario(100, 100)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', color: '#F59E0B', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.05)'; }}
                    >
                      🟡 Realista
                    </button>
                    <button
                      onClick={() => aplicarCenario(120, 90)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.05)'; }}
                    >
                      🟢 Otimista
                    </button>
                  </div>
                </div>

                {/* Slider vendas */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>Variação nas vendas</p>
                    <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem', color: sliderVendas >= 100 ? '#10B981' : '#EF4444', background: sliderVendas >= 100 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '20px', padding: '2px 10px' }}>
                      {sliderVendas >= 100 ? '+' : ''}{sliderVendas - 100}%
                    </span>
                  </div>
                  <Slider
                    min={50} max={200} step={5}
                    value={[sliderVendas]}
                    onValueChange={([v]) => setSliderVendas(v)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Gilroy', fontSize: '0.7rem', color: '#9CA3AF', marginTop: '4px' }}>
                    <span>-50%</span><span>+100%</span>
                  </div>
                </div>

                {/* Slider despesas */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>Variação nas despesas</p>
                    <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem', color: sliderDespesas <= 100 ? '#10B981' : '#EF4444', background: sliderDespesas <= 100 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '20px', padding: '2px 10px' }}>
                      {sliderDespesas >= 100 ? '+' : ''}{sliderDespesas - 100}%
                    </span>
                  </div>
                  <Slider
                    min={70} max={150} step={5}
                    value={[sliderDespesas]}
                    onValueChange={([v]) => setSliderDespesas(v)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Gilroy', fontSize: '0.7rem', color: '#9CA3AF', marginTop: '4px' }}>
                    <span>-30%</span><span>+50%</span>
                  </div>
                </div>

                {/* Período */}
                <div>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Período</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[30, 60, 90].map(d => (
                      <button key={d}
                        onClick={() => setPeriodoCenario(d)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: '10px',
                          border: periodoCenario === d ? 'none' : '1.5px solid rgba(142,95,207,0.2)',
                          fontFamily: 'Gilroy',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: periodoCenario === d ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'rgba(255,255,255,0.5)',
                          color: periodoCenario === d ? 'white' : '#6B7280',
                        }}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico + resumo */}
            <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ ...glassCard }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: 0 }}>
                    {cenario?.cenario?.descricao || 'Cenário atual'}
                  </h3>
                </div>
                {!cenario ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Carregando…</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={cenarioGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradEntradasC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradSaidasC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'Gilroy' }} width={55} />
                      <Tooltip content={<TooltipSemana />} />
                      <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="Entradas" stroke="#10B981" fill="url(#gradEntradasC)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Saídas" stroke="#EF4444" fill="url(#gradSaidasC)" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="Saldo" stroke="#8E5FCF" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Resumo */}
              {cenario && (
                <div style={{
                  ...glassCard,
                  borderLeft: `4px solid ${statusCenario === 'saudavel' ? '#10B981' : statusCenario === 'atencao' ? '#F59E0B' : '#EF4444'}`,
                  borderRadius: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {statusCenario === 'saudavel' ? '✅' : statusCenario === 'atencao' ? '⚠️' : '🚨'}
                    </span>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', margin: 0 }}>No cenário atual:</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '4px' }}>Saldo final projetado</p>
                      <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', color: saldoFinalCenario >= 0 ? '#10B981' : '#EF4444' }}>
                        {fmtBRL(saldoFinalCenario)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '4px' }}>Pior momento do caixa</p>
                      <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', color: piorMomento >= 0 ? '#10B981' : '#EF4444' }}>
                        {fmtBRL(piorMomento)}
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <span style={{
                      fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem',
                      color: statusCenario === 'saudavel' ? '#10B981' : statusCenario === 'atencao' ? '#F59E0B' : '#EF4444',
                      background: statusCenario === 'saudavel' ? 'rgba(16,185,129,0.1)' : statusCenario === 'atencao' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      borderRadius: '20px', padding: '4px 14px',
                    }}>
                      {statusCenario === 'saudavel' ? 'Saudável' : statusCenario === 'atencao' ? 'Atenção' : 'Crítico'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── ABA 4 — INDICADORES ──────────────────────────────────────────── */}
        <TabsContent value="indicadores" className="space-y-6 mt-6">
          {!kpis ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Carregando…</div>
          ) : (
            <>
              {/* Grid KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <GaugeKPI
                  label="Margem Líquida"
                  valor={kpis.margem}
                  descricao="Quanto sobra de cada R$ vendido"
                  benchmarkLabel="Ideal: acima de 15%"
                />

                <KPINumerico
                  label="Prazo Médio de Recebimento (PMR)"
                  valor={kpis.pmr}
                  unidade="dias"
                  descricao="Tempo médio para receber após a venda"
                  benchmark="Ideal: até 30 dias"
                  positivo={kpis.pmr <= 30}
                />

                <KPINumerico
                  label="Prazo Médio de Pagamento (PMP)"
                  valor={kpis.pmp}
                  unidade="dias"
                  descricao="Tempo médio para pagar após a compra"
                  benchmark="Ideal: acima de 30 dias"
                  positivo={kpis.pmp >= 30}
                />

                <KPINumerico
                  label="Ciclo Financeiro"
                  valor={kpis.cicloFinanceiro}
                  unidade="dias"
                  descricao={kpis.cicloFinanceiro <= 0
                    ? 'Você paga depois de receber — saudável'
                    : 'Você paga antes de receber — capital de giro necessário'}
                  positivo={kpis.cicloFinanceiro <= 0}
                />

                <div style={{ ...glassCard }}>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#374151', marginBottom: '8px' }}>Runway</p>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '2.5rem', color: kpis.runwayDias >= 90 ? '#10B981' : kpis.runwayDias >= 30 ? '#F59E0B' : '#EF4444', lineHeight: 1.1 }}>
                    {kpis.runwayDias} <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#9CA3AF' }}>dias</span>
                  </p>
                  <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#6B7280', marginTop: '6px', marginBottom: '12px' }}>Tempo com o saldo atual sem novas receitas</p>
                  <div style={{ height: '6px', background: 'rgba(142,95,207,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '10px',
                        transition: 'width 0.6s ease',
                        width: `${Math.min(kpis.runwayDias, 180) / 180 * 100}%`,
                        background: kpis.runwayDias >= 90 ? 'linear-gradient(90deg, #10B981, #059669)' : kpis.runwayDias >= 30 ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #EF4444, #B91C1C)',
                      }}
                    />
                  </div>
                </div>

                <GaugeKPI
                  label="Índice de Inadimplência"
                  valor={inadimplencia}
                  descricao="Contas vencidas sobre receita total"
                  benchmarkLabel="Ideal: abaixo de 5%"
                />
              </div>

              {/* Gráfico comparativo mensal */}
              <div style={{ ...glassCard }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Comparativo Mensal</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}>
                      ↓ PDF
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}>
                      ↓ CSV
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={[
                      { mes: 'Nov', Receita: 0, Despesas: 0, Margem: 0 },
                      { mes: 'Dez', Receita: 0, Despesas: 0, Margem: 0 },
                      { mes: 'Jan', Receita: 0, Despesas: 0, Margem: 0 },
                      { mes: 'Fev', Receita: 0, Despesas: 0, Margem: 0 },
                      { mes: 'Mar', Receita: 0, Despesas: 0, Margem: 0 },
                      {
                        mes: format(new Date(), 'MMM', { locale: ptBR }),
                        Receita: kpis.receitaRealizada,
                        Despesas: kpis.despesasPagas,
                        Margem: kpis.margem,
                      },
                    ]}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} />
                    <YAxis yAxisId="left" tickFormatter={fmtK} tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} width={60} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} width={40} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontFamily: 'Gilroy', fontSize: '0.8rem' }} />
                    <Bar yAxisId="left" dataKey="Receita" fill="#10B981" opacity={0.85} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Despesas" fill="#EF4444" opacity={0.85} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="Margem" stroke="#8E5FCF" strokeWidth={2} dot />
                  </ComposedChart>
                </ResponsiveContainer>
                <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', marginTop: '12px' }}>
                  * Dados históricos dos meses anteriores serão exibidos conforme registros acumulados
                </p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
