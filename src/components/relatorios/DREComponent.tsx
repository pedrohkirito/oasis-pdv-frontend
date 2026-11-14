import React, { useState, useEffect } from 'react'
import { useDRE } from '@/hooks/useDRE'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Download, FileText } from 'lucide-react'
import { subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DREData {
  periodo: { inicio: string; fim: string }
  receitaBruta: number
  totalDescontos: number
  receitaLiquida: number
  cmv: number
  lucroBruto: number
  margemBruta: number
  despesasPorCategoria: Record<string, number>
  totalDespesas: number
  totalComissoes: number
  resultadoOperacional: number
  margemLiquida: number
  quantidadeVendas: number
  ticketMedio: number
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const pct = (v: number) => `${v.toFixed(1)}%`

const variacao = (atual: number, anterior: number) => {
  if (!anterior) return null
  return ((atual - anterior) / anterior) * 100
}


// ─── Design tokens ────────────────────────────────────────────────────────────

const cardGlassDRE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(71,17,143,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
}

const cellBorder = '1px solid rgba(142,95,207,0.06)'

// ─── Badge de variação ────────────────────────────────────────────────────────

const BadgeVar = ({ val }: { val: number | null }) => {
  if (val === null) return null
  const pos = val >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
      borderRadius: '20px', fontFamily: 'Gilroy', whiteSpace: 'nowrap',
      background: pos ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      color: pos ? '#10B981' : '#EF4444',
    }}>
      {pos ? '↑' : '↓'} {Math.abs(val).toFixed(1)}%
    </span>
  )
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

const RowMais = ({ label, atual, anterior }: { label: string; atual: number; anterior?: number }) => (
  <tr>
    <td style={{ padding: '10px 20px', color: '#10B981', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
      (+) {label}
    </td>
    <td style={{ padding: '10px 20px', color: '#10B981', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Gilroy', textAlign: 'right', borderBottom: cellBorder }}>
      {fmt(atual)}
    </td>
    {anterior !== undefined && (
      <td style={{ padding: '10px 20px', color: '#9CA3AF', fontSize: '0.875rem', fontFamily: 'Gilroy', textAlign: 'right', borderBottom: cellBorder }}>
        {fmt(anterior)}
      </td>
    )}
    {anterior !== undefined && (
      <td style={{ padding: '10px 20px', textAlign: 'right', borderBottom: cellBorder }}>
        <BadgeVar val={variacao(atual, anterior)} />
      </td>
    )}
  </tr>
)

const RowMenos = ({ label, atual, anterior }: { label: string; atual: number; anterior?: number }) => (
  <tr>
    <td style={{ padding: '10px 20px', color: '#EF4444', fontSize: '0.875rem', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
      (-) {label}
    </td>
    <td style={{ padding: '10px 20px', color: '#EF4444', fontSize: '0.875rem', fontFamily: 'Gilroy', textAlign: 'right', borderBottom: cellBorder }}>
      {fmt(atual)}
    </td>
    {anterior !== undefined && (
      <td style={{ padding: '10px 20px', color: '#9CA3AF', fontSize: '0.875rem', fontFamily: 'Gilroy', textAlign: 'right', borderBottom: cellBorder }}>
        {fmt(anterior)}
      </td>
    )}
    {anterior !== undefined && (
      <td style={{ padding: '10px 20px', textAlign: 'right', borderBottom: cellBorder }}>
        <BadgeVar val={variacao(anterior, atual)} />
      </td>
    )}
  </tr>
)

const RowIgual = ({
  label, atual, anterior, margemAtual, margemAnterior, destaque,
}: {
  label: string; atual: number; anterior?: number
  margemAtual?: number; margemAnterior?: number; destaque?: boolean
}) => {
  const pos = atual >= 0
  const bg = destaque
    ? (pos ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)')
    : 'rgba(142,95,207,0.05)'
  const cor = destaque ? (pos ? '#10B981' : '#EF4444') : '#1F2937'
  const size = destaque ? '1.15rem' : '1rem'
  const weight = destaque ? 800 : 700
  const borderColor = destaque
    ? (pos ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)')
    : 'rgba(142,95,207,0.15)'

  const tdIgual = (right = false, muted = false): React.CSSProperties => ({
    padding: '13px 20px',
    background: bg,
    fontFamily: 'Gilroy',
    fontWeight: muted ? 600 : weight,
    fontSize: muted ? '0.875rem' : size,
    color: muted ? '#9CA3AF' : cor,
    textAlign: right ? 'right' : 'left',
    borderTop: `2px solid ${borderColor}`,
    borderBottom: `2px solid ${borderColor}`,
  })

  return (
    <>
      <tr>
        <td style={tdIgual()}>(=) {label}</td>
        <td style={tdIgual(true)}>{fmt(atual)}</td>
        {anterior !== undefined && (
          <td style={tdIgual(true, true)}>{fmt(anterior)}</td>
        )}
        {anterior !== undefined && (
          <td style={{ ...tdIgual(true), borderTop: `2px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}` }}>
            <BadgeVar val={variacao(atual, anterior)} />
          </td>
        )}
      </tr>
      {margemAtual !== undefined && (
        <tr>
          <td style={{ padding: '4px 20px 4px 28px', fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
            Margem
          </td>
          <td style={{ padding: '4px 20px', textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
            {pct(margemAtual)}
          </td>
          {margemAnterior !== undefined && (
            <td style={{ padding: '4px 20px', textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
              {pct(margemAnterior)}
            </td>
          )}
          {anterior !== undefined && <td style={{ borderBottom: cellBorder }} />}
        </tr>
      )}
    </>
  )
}

const RowSub = ({ label, atual, anterior }: { label: string; atual: number; anterior?: number }) => (
  <tr>
    <td style={{ padding: '7px 20px 7px 40px', fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
      (-) {label}
    </td>
    <td style={{ padding: '7px 20px', textAlign: 'right', fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
      {fmt(atual)}
    </td>
    {anterior !== undefined && (
      <td style={{ padding: '7px 20px', textAlign: 'right', fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', borderBottom: cellBorder }}>
        {fmt(anterior)}
      </td>
    )}
    {anterior !== undefined && <td style={{ borderBottom: cellBorder }} />}
  </tr>
)

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({
  titulo, valor, margem, varPct, icon: Icon, corBorda, corIcone, corIconeBg,
}: {
  titulo: string; valor: number; margem?: number
  varPct?: number | null
  icon: React.ElementType
  corBorda: string; corIcone: string; corIconeBg: string
}) => {
  const IC = Icon as any
  const pos = valor >= 0
  return (
    <div
      style={{
        ...cardGlassDRE,
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(71,17,143,0.14)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(71,17,143,0.08)'
      }}
    >
      {/* Borda superior */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '4px', background: corBorda, borderRadius: '20px 20px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: corIconeBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IC size={20} color={corIcone} />
        </div>
        {varPct !== undefined && varPct !== null && <BadgeVar val={varPct} />}
      </div>

      <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
        {titulo}
      </p>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Gilroy', color: pos ? '#1F2937' : '#EF4444', margin: '0 0 4px' }}>
        {fmt(valor)}
      </p>
      {margem !== undefined && (
        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0 }}>
          Margem {pct(margem)}
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DREComponent({ dataInicio, dataFim }: { dataInicio: string; dataFim: string }) {
  const { buscarDRE, loading } = useDRE()

  const [atual, setAtual] = useState<DREData | null>(null)
  const [anterior, setAnterior] = useState<DREData | null>(null)
  const [titulo, setTitulo] = useState('')

  // ── Busca ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dataInicio || !dataFim) return
    const ini    = new Date(dataInicio + 'T00:00:00')
    const fim    = new Date(dataFim    + 'T23:59:59')
    const iniAnt = subMonths(ini, 1)
    const fimAnt = subMonths(fim, 1)
    Promise.all([
      buscarDRE(ini.toISOString(), fim.toISOString()),
      buscarDRE(iniAnt.toISOString(), fimAnt.toISOString()),
    ]).then(([r, rAnt]) => {
      setAtual(r)
      setAnterior(rAnt)
      setTitulo(`${dataInicio} a ${dataFim}`)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim])

  // ── Exportações ───────────────────────────────────────────────────────────

  const exportarPDF = () => window.print()

  const exportarCSV = () => {
    if (!atual) return
    const linhas = [
      ['Item', 'Valor'],
      ['Receita Bruta', atual.receitaBruta],
      ['Descontos', atual.totalDescontos],
      ['Receita Líquida', atual.receitaLiquida],
      ['CMV', atual.cmv],
      ['Lucro Bruto', atual.lucroBruto],
      ['Margem Bruta %', atual.margemBruta],
      ['Total Despesas', atual.totalDespesas],
      ['Comissões', atual.totalComissoes],
      ['Resultado Operacional', atual.resultadoOperacional],
      ['Margem Líquida %', atual.margemLiquida],
      ...Object.entries(atual.despesasPorCategoria).map(([cat, v]) => [`  ${cat}`, v]),
    ]
    const csv = linhas.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DRE_${titulo.replace(/\s/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasComparativo = anterior !== null

  return (
    <div style={{ fontFamily: 'Gilroy' }}>

      {/* ── Sem dados / Loading ───────────────────────────────────────── */}
      {!atual && !loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
          Carregando dados do DRE…
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
          Carregando dados…
        </div>
      )}

      {atual && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Cards de resumo ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="print:grid print:grid-cols-4">
            <SummaryCard
              titulo="Receita Líquida"
              valor={atual.receitaLiquida}
              varPct={hasComparativo ? variacao(atual.receitaLiquida, anterior!.receitaLiquida) : null}
              icon={TrendingUp}
              corBorda="linear-gradient(90deg, #10B981, #059669)"
              corIcone="#10B981"
              corIconeBg="linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))"
            />
            <SummaryCard
              titulo="Lucro Bruto"
              valor={atual.lucroBruto}
              margem={atual.margemBruta}
              varPct={hasComparativo ? variacao(atual.lucroBruto, anterior!.lucroBruto) : null}
              icon={BarChart2}
              corBorda="linear-gradient(90deg, #8E5FCF, #47118F)"
              corIcone="#8E5FCF"
              corIconeBg="linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.1))"
            />
            <SummaryCard
              titulo="Total Despesas"
              valor={atual.totalDespesas + atual.totalComissoes}
              varPct={hasComparativo
                ? variacao(anterior!.totalDespesas + anterior!.totalComissoes, atual.totalDespesas + atual.totalComissoes)
                : null}
              icon={TrendingDown}
              corBorda="linear-gradient(90deg, #EF4444, #DC2626)"
              corIcone="#EF4444"
              corIconeBg="linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))"
            />
            <SummaryCard
              titulo="Resultado Líquido"
              valor={atual.resultadoOperacional}
              margem={atual.margemLiquida}
              varPct={hasComparativo ? variacao(atual.resultadoOperacional, anterior!.resultadoOperacional) : null}
              icon={DollarSign}
              corBorda={atual.resultadoOperacional >= 0
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : 'linear-gradient(90deg, #EF4444, #DC2626)'}
              corIcone={atual.resultadoOperacional >= 0 ? '#10B981' : '#EF4444'}
              corIconeBg={atual.resultadoOperacional >= 0
                ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))'}
            />
          </div>

          {/* ── Tabela demonstrativo ─────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(142,95,207,0.12)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(71,17,143,0.08)',
          }} className="print:shadow-none print:border">

            {/* Header do card */}
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(142,95,207,0.08)' }} className="print:hidden">
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
                  DEMONSTRATIVO DE RESULTADO
                </p>
                <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '2px 0 0' }}>{titulo}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={exportarPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: 'pointer', fontFamily: 'Gilroy', fontWeight: 600 }}
                >
                  <FileText size={14} /> PDF
                </button>
                <button
                  onClick={exportarCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: 'pointer', fontFamily: 'Gilroy', fontWeight: 600 }}
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>
            <p style={{ display: 'none', fontWeight: 700, fontSize: '1.1rem', padding: '16px 20px', fontFamily: 'Gilroy' }} className="hidden print:block">
              DEMONSTRATIVO DE RESULTADO — {titulo}
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '50%' }}>
                      Descrição
                    </th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '0.72rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {hasComparativo ? 'Atual' : 'Valor'}
                    </th>
                    {hasComparativo && (
                      <>
                        <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Anterior
                        </th>
                        <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Var.
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Receitas */}
                  <RowMais label="Receita Bruta" atual={atual.receitaBruta} anterior={anterior?.receitaBruta} />
                  <RowMenos label="Descontos" atual={atual.totalDescontos} anterior={anterior?.totalDescontos} />
                  <RowIgual label="Receita Líquida" atual={atual.receitaLiquida} anterior={anterior?.receitaLiquida} />

                  {/* CMV */}
                  <tr><td colSpan={4} style={{ padding: '8px 0' }} /></tr>
                  <RowMenos label="CMV (Custo das Mercadorias)" atual={atual.cmv} anterior={anterior?.cmv} />
                  <RowIgual
                    label="LUCRO BRUTO"
                    atual={atual.lucroBruto}
                    anterior={anterior?.lucroBruto}
                    margemAtual={atual.margemBruta}
                    margemAnterior={anterior?.margemBruta}
                  />

                  {/* Despesas operacionais */}
                  <tr>
                    <td colSpan={4} style={{ padding: '12px 20px 6px', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', fontFamily: 'Gilroy', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Despesas Operacionais
                    </td>
                  </tr>
                  {Object.entries(atual.despesasPorCategoria).map(([cat, val]) => (
                    <RowSub key={cat} label={cat} atual={val} anterior={anterior?.despesasPorCategoria?.[cat]} />
                  ))}
                  <RowSub label="Comissões" atual={atual.totalComissoes} anterior={anterior?.totalComissoes} />
                  <RowIgual
                    label="Total Despesas"
                    atual={atual.totalDespesas + atual.totalComissoes}
                    anterior={anterior ? anterior.totalDespesas + anterior.totalComissoes : undefined}
                  />

                  {/* Resultado */}
                  <tr><td colSpan={4} style={{ padding: '8px 0' }} /></tr>
                  <RowIgual
                    label="RESULTADO OPERACIONAL"
                    atual={atual.resultadoOperacional}
                    anterior={anterior?.resultadoOperacional}
                    margemAtual={atual.margemLiquida}
                    margemAnterior={anterior?.margemLiquida}
                    destaque
                  />
                </tbody>
              </table>
            </div>

            {/* Rodapé */}
            <div style={{ padding: '12px 20px', display: 'flex', gap: '24px', borderTop: '1px solid rgba(142,95,207,0.08)' }}>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                Vendas: <strong style={{ color: '#6B7280' }}>{atual.quantidadeVendas}</strong>
              </span>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                Ticket médio: <strong style={{ color: '#6B7280' }}>{fmt(atual.ticketMedio)}</strong>
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ── Print styles ──────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > *:not([data-dre-print]) { display: none; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
