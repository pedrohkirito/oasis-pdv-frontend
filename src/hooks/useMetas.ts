import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'
import { startOfDay, endOfDay, startOfWeek,
         endOfWeek, startOfMonth, endOfMonth,
         format } from 'date-fns'

export function useMetas() {
  const { companyId } = useEmpresa()
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)

  const buscarMetas = async () => {
    const { data } = await (api
      .from('metas' as any)
      .select('*') as any)
      .eq('company_id', companyId)
      .eq('active', true)
      .order('created_at', { ascending: false })
    setMetas(data || [])
    setLoading(false)
  }

  const criarMeta = async (meta: any) => {
    const { data, error } = await (api
      .from('metas' as any)
      .insert({ ...meta, company_id: companyId }) as any)
      .select().single()
    if (!error) buscarMetas()
    return { data, error }
  }

  const atualizarMeta = async (id: string, updates: any) => {
    const { error } = await (api
      .from('metas' as any)
      .update({ ...updates, updated_at: new Date().toISOString() }) as any)
      .eq('id', id)
    if (!error) buscarMetas()
    return { error }
  }

  const excluirMeta = async (id: string) => {
    await (api.from('metas' as any)
      .update({ active: false }) as any).eq('id', id)
    buscarMetas()
  }

  // Busca progresso de uma meta comparando com vendas reais
  const buscarProgressoMeta = async (meta: any) => {
    let realizado = 0

    if (meta.kind === 'category' && meta.categoria) {
      // Soma subtotais dos itens de venda cujo produto pertença à categoria da meta,
      // dentro do período. Usa join implícito via PostgREST.
      const { data: itens } = await (api
        .from('sale_item')
        .select('subtotal, produtos!inner(categoria, empresa_id), vendas!inner(data_venda, empresa_id)') as any)
        .eq('produtos.categoria', meta.categoria)
        .eq('vendas.empresa_id', companyId)
        .gte('vendas.data_venda', meta.data_inicio)
        .lte('vendas.data_venda', meta.data_fim)

      realizado = (itens || []).reduce(
        (acc: number, i: any) => acc + Number(i.subtotal || 0), 0
      )
    } else {
      let query = (api
        .from('sale')
        .select('valor, valor_final, vendedor_id, data_venda') as any)
        .eq('company_id', companyId)
        .gte('sold_on', meta.data_inicio)
        .lte('sold_on', meta.data_fim)

      if (meta.kind === 'vendedora' && meta.usuario_id) {
        query = query.eq('seller_id', meta.usuario_id)
      }

      const { data: vendas } = await query
      realizado = (vendas || []).reduce(
        (acc: number, v: any) => acc + Number(v.valor_final ?? v.valor ?? 0), 0
      )
    }

    const percentual = meta.valor > 0
      ? (realizado / meta.valor) * 100 : 0

    return {
      meta,
      realizado,
      percentual, // não trunca — permite exibir >100% quando superar a meta
      atingida: realizado >= meta.valor,
      falta: Math.max(meta.valor - realizado, 0)
    }
  }

  // Gera datas automáticas por período
  const gerarDatas = (periodo: string, data = new Date()) => {
    switch (periodo) {
      case 'diario':
        return {
          inicio: format(startOfDay(data), 'yyyy-MM-dd'),
          fim: format(endOfDay(data), 'yyyy-MM-dd')
        }
      case 'semanal':
        return {
          inicio: format(startOfWeek(data, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          fim: format(endOfWeek(data, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        }
      case 'mensal':
        return {
          inicio: format(startOfMonth(data), 'yyyy-MM-dd'),
          fim: format(endOfMonth(data), 'yyyy-MM-dd')
        }
      default:
        return {
          inicio: format(data, 'yyyy-MM-dd'),
          fim: format(data, 'yyyy-MM-dd')
        }
    }
  }

  useEffect(() => {
    if (companyId) {
      setLoading(true)
      buscarMetas()
    }
  }, [companyId])

  return {
    metas, loading,
    criarMeta, atualizarMeta,
    excluirMeta, buscarMetas,
    buscarProgressoMeta, gerarDatas
  }
}
