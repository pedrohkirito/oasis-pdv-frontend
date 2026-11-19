import React, { useState, useMemo, useEffect } from 'react'
import { classificarABC, useCurvaABC } from '@/hooks/useCurvaABC'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { BarChart3, Download } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Produto {
  produto_id: string
  name: string
  categoria: string
  tipo: 'produto' | 'servico'
  quantidade: number
  faturamento: number
  transacoes: number
  posicao: number
  percentual: number
  percentualAcumulado: number
  classe: 'A' | 'B' | 'C'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const COR_CLASSE: Record<string, string> = {
  A: '#10B981',
  B: '#F59E0B',
  C: '#9CA3AF',
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const cardGlassABC: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(71,17,143,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
}

// ─── Badge de classe premium ──────────────────────────────────────────────────

const BadgeClasse = ({ classe }: { classe: string }) => {
  const styles: Record<string, React.CSSProperties> = {
    A: { background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white' },
    B: { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white' },
    C: { background: 'rgba(156,163,175,0.2)', color: '#6B7280' },
  }
  return (
    <span style={{
      ...( styles[classe] ?? styles.C ),
      padding: '4px 12px',
      borderRadius: '20px',
      fontWeight: 700,
      fontFamily: 'Gilroy',
      fontSize: '0.75rem',
      display: 'inline-block',
    }}>
      {classe}
    </span>
  )
}

const BadgeCategoria = ({ cat }: { cat: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 6px', borderRadius: '6px',
    fontSize: '0.65rem', background: 'rgba(142,95,207,0.08)',
    color: '#8E5FCF', fontFamily: 'Gilroy', marginLeft: '6px',
  }}>
    {cat}
  </span>
)

// ─── Tooltip personalizado ────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const corClasse = d?.classe === 'A' ? '#10B981' : d?.classe === 'B' ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(142,95,207,0.2)',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      fontFamily: 'Gilroy',
    }}>
      <p style={{ fontWeight: 700, color: '#1F2937', marginBottom: 8, fontSize: '0.9rem' }}>
        {d?.nomeCompleto}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
          Faturamento: <strong style={{ color: '#1F2937' }}>
            R$ {d?.faturamento?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </strong>
        </span>
        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
          % do total: <strong style={{ color: '#1F2937' }}>{d?.percentual?.toFixed(1)}%</strong>
        </span>
        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
          % acumulado: <strong style={{ color: '#1F2937' }}>{d?.percentualAcumulado?.toFixed(1)}%</strong>
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: corClasse, marginTop: 4 }}>
          CLASSE {d?.classe}
        </span>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CurvaABCComponent({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) {
  const { dados, loading, buscarCurvaABC } = useCurvaABC()

  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [tipoSel, setTipoSel] = useState<'todos' | 'produto' | 'servico'>('todos')

  const todos = dados as Produto[]
  const temServicos = useMemo(() => todos.some(p => p.tipo === 'servico'), [todos])

  // Ao separar produtos de serviços, a curva é recalculada dentro do grupo.
  const produtos = useMemo(() => {
    if (tipoSel === 'todos') return todos
    return classificarABC(todos.filter(p => p.tipo === tipoSel)) as Produto[]
  }, [todos, tipoSel])

  const categorias = useMemo(() => {
    const cats = [...new Set(produtos.map(p => p.categoria))].sort()
    return cats
  }, [produtos])

  const produtosFiltrados = useMemo(() => {
    if (categoriaSel === 'todas') return produtos
    return produtos.filter(p => p.categoria === categoriaSel)
  }, [produtos, categoriaSel])

  const resumo = useMemo(() => {
    const grupos: Record<string, { count: number; total: number }> = {
      A: { count: 0, total: 0 },
      B: { count: 0, total: 0 },
      C: { count: 0, total: 0 },
    }
    produtos.forEach(p => {
      grupos[p.classe].count++
      grupos[p.classe].total += p.faturamento
    })
    return grupos
  }, [produtos])

  const dadosGrafico = useMemo(() =>
    produtosFiltrados.slice(0, 20).map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name,
      nomeCompleto: p.name,
      faturamento: p.faturamento,
      percentual: p.percentual,
      percentualAcumulado: p.percentualAcumulado,
      classe: p.classe,
    })),
    [produtosFiltrados]
  )

  useEffect(() => {
    if (dataInicio && dataFim) {
      buscarCurvaABC(
        new Date(dataInicio + 'T00:00:00').toISOString(),
        new Date(dataFim   + 'T23:59:59').toISOString()
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim])

  const exportarCSV = () => {
    const linhas = [
      ['#', 'Produto', 'Categoria', 'Classe', 'Qtd Vendida', 'Faturamento', '% Total', '% Acumulado', 'Transações'],
      ...produtosFiltrados.map(p => [
        p.posicao, p.name, p.categoria, p.classe, p.quantidade,
        p.faturamento.toFixed(2).replace('.', ','),
        p.percentual.toFixed(2).replace('.', ','),
        p.percentualAcumulado.toFixed(2).replace('.', ','),
        p.transacoes,
      ]),
    ]
    const csv = linhas.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CurvaABC_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const temDados = produtosFiltrados.length > 0

  return (
    <div style={{ fontFamily: 'Gilroy', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Filtro de categoria ───────────────────────────────────── */}
      {categorias.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Categoria
          </label>
          <Select value={categoriaSel} onValueChange={setCategoriaSel}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {temServicos && (
            <>
              <label style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tipo
              </label>
              <Select value={tipoSel} onValueChange={v => { setTipoSel(v as typeof tipoSel); setCategoriaSel('todas') }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Produtos e serviços</SelectItem>
                  <SelectItem value="produto">Só produtos</SelectItem>
                  <SelectItem value="servico">Só serviços</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
          Carregando dados…
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {!loading && produtos.length === 0 && (
        <div style={{
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', marginBottom: '8px' }}>
            Nenhum dado encontrado
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
            Selecione um período com vendas registradas e clique em Gerar Curva ABC
          </p>
        </div>
      )}

      {!loading && temDados && (
        <>
          {/* ── Cards resumo por classe ───────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

            {/* Classe A */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '20px', padding: '24px',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(16,185,129,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', fontSize: '1.5rem', fontWeight: 800,
                fontFamily: 'Gilroy', color: 'white'
              }}>A</div>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Classe A</p>
              <p style={{ fontSize: '0.72rem', color: '#34D399', fontFamily: 'Gilroy', margin: '0 0 12px' }}>~80% do faturamento</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', fontFamily: 'Gilroy', margin: '0 0 4px' }}>{fmt(resumo.A.total)}</p>
              <p style={{ fontSize: '0.75rem', color: '#6EE7B7', fontFamily: 'Gilroy', margin: 0 }}>
                {resumo.A.count} produto{resumo.A.count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Classe B */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '20px', padding: '24px',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(245,158,11,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', fontSize: '1.5rem', fontWeight: 800,
                fontFamily: 'Gilroy', color: 'white'
              }}>B</div>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Classe B</p>
              <p style={{ fontSize: '0.72rem', color: '#FBBF24', fontFamily: 'Gilroy', margin: '0 0 12px' }}>~15% do faturamento</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D97706', fontFamily: 'Gilroy', margin: '0 0 4px' }}>{fmt(resumo.B.total)}</p>
              <p style={{ fontSize: '0.75rem', color: '#FDE68A', fontFamily: 'Gilroy', margin: 0 }}>
                {resumo.B.count} produto{resumo.B.count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Classe C */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(156,163,175,0.12), rgba(156,163,175,0.05))',
              border: '1px solid rgba(156,163,175,0.25)',
              borderRadius: '20px', padding: '24px',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(156,163,175,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #9CA3AF, #6B7280)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', fontSize: '1.5rem', fontWeight: 800,
                fontFamily: 'Gilroy', color: 'white'
              }}>C</div>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Classe C</p>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 12px' }}>~5% do faturamento</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6B7280', fontFamily: 'Gilroy', margin: '0 0 4px' }}>{fmt(resumo.C.total)}</p>
              <p style={{ fontSize: '0.75rem', color: '#D1D5DB', fontFamily: 'Gilroy', margin: 0 }}>
                {resumo.C.count} produto{resumo.C.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── Gráfico de Pareto ──────────────────────────────────────── */}
          <div style={{ ...cardGlassABC, padding: '24px' }}>
            <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>
              Gráfico de Pareto
            </p>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 16px' }}>
              Top {dadosGrafico.length} produtos por faturamento
            </p>

            {/* Legenda */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { cor: '#10B981', label: 'Classe A — 80% do faturamento' },
                { cor: '#F59E0B', label: 'Classe B — 15%' },
                { cor: '#9CA3AF', label: 'Classe C — 5%' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, background: item.cor, borderRadius: 3 }} />
                  <span style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy' }}>{item.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 20, height: 0, borderTop: '2px dashed #EF4444' }} />
                <span style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy' }}>Limite 80%</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dadosGrafico} margin={{ top: 5, right: 30, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Gilroy', fill: '#9CA3AF' }} angle={-40} textAnchor="end" interval={0} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fontFamily: 'Gilroy', fill: '#9CA3AF' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fontFamily: 'Gilroy', fill: '#9CA3AF' }} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#EF4444"
                  strokeDasharray="6 3"
                  label={{
                    value: '80%',
                    fill: '#EF4444',
                    fontSize: 11,
                    fontFamily: 'Gilroy',
                    fontWeight: 700,
                    position: 'right',
                  }}
                />
                <Bar yAxisId="left" dataKey="faturamento" name="Faturamento" radius={[4, 4, 0, 0]}>
                  {dadosGrafico.map((entry, index) => (
                    <Cell key={index} fill={entry.classe === 'A' ? '#10B981' : entry.classe === 'B' ? '#F59E0B' : '#9CA3AF'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" name="% Acumulado" stroke="#8E5FCF" strokeWidth={2.5} dot={{ r: 3, fill: '#8E5FCF' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── Tabela completa ───────────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(142,95,207,0.12)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(71,17,143,0.08)',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(142,95,207,0.08)' }}>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
                  Ranking Completo
                </p>
                <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '2px 0 0' }}>
                  {produtosFiltrados.length} produtos
                </p>
              </div>
              <button
                onClick={exportarCSV}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: 'pointer', fontFamily: 'Gilroy', fontWeight: 600 }}
              >
                <Download size={14} /> Exportar CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))' }}>
                    {['#', 'Produto', 'Classe', 'Qtd', 'Faturamento', '% do Total', '% Acum.', 'Transações'].map((h, i) => (
                      <th key={h} style={{
                        padding: '12px 16px',
                        textAlign: i === 0 || i === 2 ? 'center' : i >= 3 ? 'right' : 'left',
                        fontSize: '0.72rem', color: '#6B7280', fontFamily: 'Gilroy',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map(p => (
                    <tr
                      key={p.produto_id}
                      style={{ borderBottom: '1px solid rgba(142,95,207,0.06)', transition: 'background 0.15s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem', fontFamily: 'Gilroy' }}>
                        {p.posicao}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', fontSize: '0.875rem' }}>{p.name}</span>
                        <BadgeCategoria cat={p.categoria} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <BadgeClasse classe={p.classe} />
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280', fontFamily: 'Gilroy', fontSize: '0.875rem' }}>
                        {p.quantidade.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', fontSize: '0.875rem' }}>
                        {fmt(p.faturamento)}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(142,95,207,0.1)', borderRadius: '99px', overflow: 'hidden', minWidth: '60px' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(p.percentual, 100)}%`,
                              background: COR_CLASSE[p.classe] ?? '#9CA3AF',
                              borderRadius: '99px',
                              transition: 'width 0.8s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', width: '38px', textAlign: 'right' }}>
                            {p.percentual.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#9CA3AF', fontFamily: 'Gilroy', fontSize: '0.8rem' }}>
                        {p.percentualAcumulado.toFixed(1)}%
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#9CA3AF', fontFamily: 'Gilroy', fontSize: '0.875rem' }}>
                        {p.transacoes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
