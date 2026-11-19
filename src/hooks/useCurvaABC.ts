import { useState } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'

/**
 * Ordena por faturamento e classifica em A (até 80% acumulado), B (até 95%) e C.
 * Exportada para reclassificar um subconjunto (ex.: só serviços).
 */
export function classificarABC<T extends { faturamento: number }>(itens: T[]) {
  const lista = [...itens].sort((a, b) => b.faturamento - a.faturamento)
  const totalFaturamento = lista.reduce((acc, p) => acc + p.faturamento, 0)

  let acumulado = 0
  return lista.map((p, i) => {
    acumulado += p.faturamento
    const percentual = totalFaturamento > 0 ? (p.faturamento / totalFaturamento) * 100 : 0
    const percentualAcumulado = totalFaturamento > 0 ? (acumulado / totalFaturamento) * 100 : 0

    let classe = 'C'
    if (percentualAcumulado <= 80) classe = 'A'
    else if (percentualAcumulado <= 95) classe = 'B'

    return { ...p, posicao: i + 1, percentual, percentualAcumulado, classe }
  })
}

export function useCurvaABC() {
  const { companyId } = useEmpresa()
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)

  const buscarCurvaABC = async (
    dataInicio: string,
    dataFim: string
  ) => {
    setLoading(true)

    // Etapa 1 — Busca os IDs das vendas do período
    const { data: vendasDoPeriodo } = await api
      .from('sale')
      .select('id')
      .eq('company_id', companyId)
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim)

    const idsVendas = vendasDoPeriodo?.map(v => v.id) || []

    if (idsVendas.length === 0) {
      setDados([])
      setLoading(false)
      return []
    }

    // Etapa 2 — Busca os itens dessas vendas
    const { data: itens } = await api
      .from('sale_item')
      .select(`
        quantidade,
        preco_unitario,
        produto_id,
        product(name, category, kind)
      `)
      .in('sale_id', idsVendas)

    // Agrupa por produto
    const porProduto = (itens || []).reduce((acc, item) => {
      const id = item.produto_id
      if (!acc[id]) {
        acc[id] = {
          produto_id: id,
          name: item.produtos?.name || 'Produto removido',
          categoria: item.produtos?.categoria || 'Sem categoria',
          tipo: item.produtos?.tipo === 'servico' ? 'servico' : 'produto',
          quantidade: 0,
          faturamento: 0,
          transacoes: 0
        }
      }
      acc[id].quantidade += item.quantidade || 0
      acc[id].faturamento += (item.quantidade || 0) *
                              (item.preco_unitario || 0)
      acc[id].transacoes += 1
      return acc
    }, {} as Record<string, any>)

    const comClassificacao = classificarABC(Object.values(porProduto) as { faturamento: number }[])

    setDados(comClassificacao)
    setLoading(false)
    return comClassificacao
  }

  return { dados, loading, buscarCurvaABC }
}
