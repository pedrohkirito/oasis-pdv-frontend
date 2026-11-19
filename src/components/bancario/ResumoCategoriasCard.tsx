import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const COR_CATEGORIA: Record<string, string> = {
  'Fornecedores':           '#F97316',
  'Aluguel':                '#EAB308',
  'Folha de pagamento':     '#EF4444',
  'Impostos e taxas':       '#EF4444',
  'Energia elétrica':       '#EAB308',
  'Água':                   '#3B82F6',
  'Telecomunicações':       '#6366F1',
  'Tarifas bancárias':      '#9CA3AF',
  'Transferência enviada':  '#8B5CF6',
  'Outros':                 '#9CA3AF',
}

function corCategoria(cat: string) {
  return COR_CATEGORIA[cat] || '#9CA3AF'
}

export function ResumoCategoriasCard({ companyId }: { companyId: string }) {
  const hoje = new Date()
  const iniMes = format(startOfMonth(hoje), 'yyyy-MM-dd')
  const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd')
  const mesLabel = format(hoje, 'MMMM/yyyy', { locale: ptBR })
    .replace(/^\w/, c => c.toUpperCase())

  const [categorias, setCategorias] = useState<{ name: string; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const buscar = async () => {
      setLoading(true)
      const { data } = await (api
        .from('movimentacoes_bancarias' as any)
        .select('categoria, valor, kind') as any)
        .eq('company_id', companyId)
        .eq('kind', 'debito')
        .gte('data_movimentacao', iniMes)
        .lte('data_movimentacao', fimMes)

      const agrupado: Record<string, number> = {}
      for (const m of (data || [])) {
        const cat = m.categoria || 'Outros'
        agrupado[cat] = (agrupado[cat] || 0) + Number(m.valor)
      }

      const lista = Object.entries(agrupado)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)

      setCategorias(lista)
      setLoading(false)
    }
    buscar()
  }, [companyId, iniMes, fimMes])

  const totalGeral = categorias.reduce((s, c) => s + c.total, 0)

  if (!loading && categorias.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Gastos por Categoria — {mesLabel}</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando…</p>
        ) : (
          <div className="space-y-3">
            {categorias.map(cat => {
              const pct = totalGeral > 0 ? Math.round((cat.total / totalGeral) * 100) : 0
              const cor = corCategoria(cat.name)
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: cor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm truncate">{cat.name}</span>
                      <span className="text-sm font-semibold ml-3 shrink-0">{fmtBRL(cat.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: cor }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="pt-3 border-t flex justify-between text-sm font-semibold">
              <span>Total do mês</span>
              <span>{fmtBRL(totalGeral)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
