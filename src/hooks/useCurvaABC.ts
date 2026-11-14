import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useEmpresa } from './useEmpresa'

export function useCurvaABC() {
  const { empresaId } = useEmpresa()
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(false)

  const buscarCurvaABC = async (
    dataInicio: string,
    dataFim: string
  ) => {
    setLoading(true)

    // Etapa 1 — Busca os IDs das vendas do período
    const { data: vendasDoPeriodo } = await supabase
      .from('vendas')
      .select('id')
      .eq('empresa_id', empresaId)
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim)

    const idsVendas = vendasDoPeriodo?.map(v => v.id) || []

    if (idsVendas.length === 0) {
      setDados([])
      setLoading(false)
      return []
    }

    // Etapa 2 — Busca os itens dessas vendas
    const { data: itens } = await supabase
      .from('itens_venda')
      .select(`
        quantidade,
        preco_unitario,
        produto_id,
        produtos(nome, categoria)
      `)
      .in('venda_id', idsVendas)

    // Agrupa por produto
    const porProduto = (itens || []).reduce((acc, item) => {
      const id = item.produto_id
      if (!acc[id]) {
        acc[id] = {
          produto_id: id,
          nome: item.produtos?.nome || 'Produto removido',
          categoria: item.produtos?.categoria || 'Sem categoria',
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

    // Ordena por faturamento decrescente
    const lista = Object.values(porProduto)
      .sort((a: any, b: any) => b.faturamento - a.faturamento)

    // Calcula total e percentuais acumulados
    const totalFaturamento = lista.reduce(
      (acc, p: any) => acc + p.faturamento, 0
    )

    let acumulado = 0
    const comClassificacao = lista.map((p: any, i) => {
      acumulado += p.faturamento
      const percentual = totalFaturamento > 0
        ? (p.faturamento / totalFaturamento) * 100 : 0
      const percentualAcumulado = totalFaturamento > 0
        ? (acumulado / totalFaturamento) * 100 : 0

      // Classificação ABC
      let classe = 'C'
      if (percentualAcumulado <= 80) classe = 'A'
      else if (percentualAcumulado <= 95) classe = 'B'

      return {
        ...p,
        posicao: i + 1,
        percentual,
        percentualAcumulado,
        classe
      }
    })

    setDados(comClassificacao)
    setLoading(false)
    return comClassificacao
  }

  return { dados, loading, buscarCurvaABC }
}
