import React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressoMeta {
  meta: {
    id: string
    kind: string
    periodo: string
    valor: number
    usuario_nome?: string
    categoria?: string
    data_inicio: string
    data_fim: string
  }
  realizado: number
  percentual: number
  atingida: boolean
  falta: number
}

interface BarraMetaProps extends ProgressoMeta {
  compact?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function corBarra(pct: number): string {
  if (pct >= 100) return '#10B981'
  if (pct >= 80)  return '#3B82F6'
  if (pct >= 50)  return '#F59E0B'
  return '#EF4444'
}

function labelPeriodo(periodo: string): string {
  const map: Record<string, string> = {
    diario: 'do Dia',
    semanal: 'da Semana',
    mensal: 'do Mês',
  }
  return map[periodo] ?? ''
}

function labelTipo(meta: ProgressoMeta['meta']): string {
  if (meta.kind === 'vendedora' && meta.usuario_nome) return meta.usuario_nome
  if (meta.kind === 'category' && meta.categoria) return `Categoria: ${meta.categoria}`
  return 'Meta da Loja'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BarraMeta({ meta, realizado, percentual, atingida, falta, compact = false }: BarraMetaProps) {
  const cor = corBarra(percentual)
  const titulo = `🎯 Meta ${labelPeriodo(meta.periodo)} — ${labelTipo(meta)}`

  return (
    <div
      style={{
        border: `1.5px solid ${atingida ? '#10B981' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 12,
        padding: compact ? '10px 14px' : '14px 18px',
        background: atingida ? 'rgba(16,185,129,0.04)' : 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Faixa de celebração quando atingida */}
      {atingida && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #10B981, #34D399, #10B981)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite',
        }} />
      )}

      {/* Título + badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: 600, color: '#1F2937' }}>
          {titulo}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {atingida && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#10B981',
              background: 'rgba(16,185,129,0.12)', padding: '2px 8px',
              borderRadius: 20, animation: 'pulse 2s infinite',
            }}>
              ✅ Meta atingida!
            </span>
          )}
          <span style={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: '#1F2937' }}>
            {fmtBRL(meta.valor)}
          </span>
        </div>
      </div>

      {/* Realizado */}
      {!compact && (
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
          Realizado: <strong style={{ color: '#1F2937' }}>{fmtBRL(realizado)}</strong>
        </div>
      )}

      {/* Barra de progresso */}
      <div style={{ position: 'relative', marginBottom: compact ? 4 : 8 }}>
        <div style={{
          height: compact ? 6 : 10,
          background: '#F3F4F6',
          borderRadius: 99,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(percentual, 100)}%`,
            background: cor,
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <span style={{
          position: 'absolute', right: 0, top: compact ? -16 : -18,
          fontSize: 11, fontWeight: 700, color: cor,
        }}>
          {percentual.toFixed(0)}%
        </span>
      </div>

      {/* Falta / atingida */}
      {!compact && (
        <div style={{ fontSize: 11, color: atingida ? '#10B981' : '#6B7280' }}>
          {atingida
            ? `🎉 Superou em ${fmtBRL(realizado - meta.valor)}`
            : `Falta ${fmtBRL(falta)} para atingir a meta`
          }
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
