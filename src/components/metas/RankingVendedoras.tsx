import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useEmpresa } from '@/hooks/useEmpresa'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendedoraStats {
  usuario_id: string
  nome: string
  realizado: number
  meta?: number
  percentual?: number
}

interface RankingVendedorasProps {
  /** Se não informado, usa o mês atual */
  dataInicio?: string
  dataFim?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const MEDALHAS = ['🥇', '🥈', '🥉']

function corBarra(pct: number): string {
  if (pct >= 100) return '#10B981'
  if (pct >= 80)  return '#3B82F6'
  if (pct >= 50)  return '#F59E0B'
  return '#EF4444'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RankingVendedoras({ dataInicio, dataFim }: RankingVendedorasProps) {
  const { empresaId } = useEmpresa()
  const [ranking, setRanking]   = useState<VendedoraStats[]>([])
  const [loading, setLoading]   = useState(true)

  const ini = dataInicio ?? format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const fim = dataFim    ?? format(endOfMonth(new Date()),   'yyyy-MM-dd')
  const tituloMes = format(startOfMonth(new Date()), 'MMMM/yyyy', { locale: ptBR })

  useEffect(() => {
    if (!empresaId) return
    carregarRanking()
  }, [empresaId, ini, fim])

  const carregarRanking = async () => {
    setLoading(true)

    // Busca vendas do período agrupadas por vendedor
    const { data: vendas } = await (api
      .from('vendas')
      .select('valor, vendedor, vendedor_id, usuario_id') as any)
      .eq('empresa_id', empresaId)
      .gte('created_at', ini + 'T00:00:00')
      .lte('created_at', fim + 'T23:59:59')

    // Busca metas de vendedoras do período
    const { data: metasData } = await (api
      .from('metas' as any)
      .select('usuario_id, usuario_nome, valor') as any)
      .eq('empresa_id', empresaId)
      .eq('tipo', 'vendedora')
      .eq('ativo', true)
      .lte('data_inicio', fim)
      .gte('data_fim', ini)

    // Agrupa vendas por vendedor
    const porVendedor: Record<string, { nome: string; total: number }> = {}
    for (const v of (vendas || [])) {
      const chave = v.usuario_id || v.vendedor_id || v.vendedor || 'desconhecido'
      const nome  = v.vendedor || 'Não identificado'
      if (!porVendedor[chave]) porVendedor[chave] = { nome, total: 0 }
      porVendedor[chave].total += v.valor || 0
    }

    // Monta ranking com meta individual quando disponível
    const metaMap: Record<string, number> = {}
    for (const m of (metasData || [])) {
      if (m.usuario_id) metaMap[m.usuario_id] = m.valor
    }

    const lista: VendedoraStats[] = Object.entries(porVendedor)
      .map(([uid, { nome, total }]) => {
        const meta = metaMap[uid]
        return {
          usuario_id: uid,
          nome,
          realizado: total,
          meta,
          percentual: meta ? Math.min((total / meta) * 100, 100) : undefined,
        }
      })
      .sort((a, b) => b.realizado - a.realizado)

    setRanking(lista)
    setLoading(false)
  }

  const maiorValor = ranking[0]?.realizado || 1

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🏆 Ranking de Vendedoras
          <span className="text-sm font-normal text-muted-foreground capitalize">— {tituloMes}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Carregando…</div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma venda registrada no período
          </div>
        ) : (
          <div className="space-y-4">
            {ranking.map((v, idx) => {
              const larguraBarra = (v.realizado / maiorValor) * 100
              const cor = v.percentual !== undefined ? corBarra(v.percentual) : '#8b5cf6'
              return (
                <div key={v.usuario_id}>
                  {/* Linha: medalha + nome + valor */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
                        {MEDALHAS[idx] ?? `${idx + 1}º`}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>
                        {v.nome}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>
                        {fmtBRL(v.realizado)}
                      </span>
                      {v.percentual !== undefined && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: corBarra(v.percentual),
                          background: `${corBarra(v.percentual)}18`,
                          padding: '1px 7px', borderRadius: 20,
                        }}>
                          {v.percentual.toFixed(0)}% da meta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra */}
                  <div style={{ height: 7, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${larguraBarra}%`,
                      background: cor,
                      borderRadius: 99,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>

                  {/* Falta para meta */}
                  {v.meta !== undefined && v.realizado < v.meta && (
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                      Falta {fmtBRL(v.meta - v.realizado)} para a meta
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
