import { useState } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'

export function useDRE() {
  const { empresaId } = useEmpresa()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)

  const buscarDRE = async (dataInicio: string, dataFim: string) => {
    setLoading(true)

    // 1. Receita bruta (vendas concluídas)
    const { data: vendas } = await (api
      .from('vendas')
      .select('valor_final, valor, desconto, created_at') as any)
      .eq('empresa_id', empresaId)
      .gte('created_at', dataInicio)
      .lte('created_at', dataFim)

    // 2. CMV — custo das mercadorias vendidas
    // Busca itens de venda com preço de custo
    const { data: itensVenda } = await (api
      .from('itens_venda')
      .select('quantidade, custo_unitario, venda_id, vendas!inner(created_at, empresa_id)') as any)
      .eq('vendas.empresa_id', empresaId)
      .gte('vendas.created_at', dataInicio)
      .lte('vendas.created_at', dataFim)

    // 3. Despesas operacionais (contas a pagar pagas)
    const { data: despesas } = await api
      .from('contas_pagar')
      .select('valor, categoria, data_pagamento')
      .eq('empresa_id', empresaId)
      .eq('status', 'pago')
      .gte('data_pagamento', dataInicio.split('T')[0])
      .lte('data_pagamento', dataFim.split('T')[0])

    // 4. Comissões pagas
    let comissoes: { valor_comissao: number }[] = []
    try {
      const { data } = await (api
        .from('comissoes')
        .select('valor_comissao') as any)
        .eq('empresa_id', empresaId)
        .eq('status', 'pago')
        .gte('created_at', dataInicio)
        .lte('created_at', dataFim)
      comissoes = data || []
    } catch {
      comissoes = []
    }

    // 5. Contas a receber recebidas
    const { data: recebimentos } = await api
      .from('contas_receber')
      .select('valor, valor_recebido, categoria')
      .eq('empresa_id', empresaId)
      .in('status', ['recebido', 'recebido_parcial'])
      .gte('data_recebimento', dataInicio.split('T')[0])
      .lte('data_recebimento', dataFim.split('T')[0])

    // CÁLCULOS DO DRE:
    const receitaBruta = (vendas as any[])?.reduce(
      (acc: number, v: any) => acc + (v.valor_final || v.valor || 0), 0) || 0

    const totalDescontos = (vendas as any[])?.reduce(
      (acc: number, v: any) => acc + (v.desconto || 0), 0) || 0

    const receitaLiquida = receitaBruta - totalDescontos

    const cmv = (itensVenda as any[])?.reduce(
      (acc: number, i: any) => acc + ((i.custo_unitario || 0) * (i.quantidade || 0)), 0
    ) || 0

    const lucroBruto = receitaLiquida - cmv

    const margemBruta = receitaLiquida > 0
      ? (lucroBruto / receitaLiquida) * 100 : 0

    // Agrupa despesas por categoria
    const despesasPorCategoria = despesas?.reduce((acc, d) => {
      const cat = d.categoria || 'Outras'
      acc[cat] = (acc[cat] || 0) + (d.valor || 0)
      return acc
    }, {} as Record<string, number>) || {}

    const totalDespesas = Object.values(despesasPorCategoria)
      .reduce((acc, v) => acc + v, 0)

    const totalComissoes = comissoes?.reduce(
      (acc, c) => acc + (c.valor_comissao || 0), 0) || 0

    const resultadoOperacional = lucroBruto - totalDespesas - totalComissoes

    const margemLiquida = receitaLiquida > 0
      ? (resultadoOperacional / receitaLiquida) * 100 : 0

    const resultado = {
      periodo: { inicio: dataInicio, fim: dataFim },
      receitaBruta,
      totalDescontos,
      receitaLiquida,
      cmv,
      lucroBruto,
      margemBruta,
      despesasPorCategoria,
      totalDespesas,
      totalComissoes,
      resultadoOperacional,
      margemLiquida,
      quantidadeVendas: vendas?.length || 0,
      ticketMedio: vendas?.length
        ? receitaBruta / vendas.length : 0
    }

    setDados(resultado)
    setLoading(false)
    return resultado
  }

  const buscarDREMensal = async (ano: number) => {
    // Retorna array com DRE de cada mês do ano
    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1
      const inicio = new Date(ano, i, 1).toISOString()
      const fim = new Date(ano, i + 1, 0, 23, 59, 59).toISOString()
      return { mes, inicio, fim }
    })

    const resultados = await Promise.all(
      meses.map(async ({ mes, inicio, fim }) => {
        const dre = await buscarDRE(inicio, fim)
        return { mes, ...dre }
      })
    )

    return resultados
  }

  return { dados, loading, buscarDRE, buscarDREMensal }
}
