import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useEmpresa } from './useEmpresa'
import { startOfDay, endOfDay, startOfWeek,
         endOfWeek, startOfMonth, endOfMonth,
         format } from 'date-fns'

export function useMetas() {
  const { empresaId } = useEmpresa()
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)

  const buscarMetas = async () => {
    const { data } = await (supabase
      .from('metas' as any)
      .select('*') as any)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
    setMetas(data || [])
    setLoading(false)
  }

  const criarMeta = async (meta: any) => {
    const { data, error } = await (supabase
      .from('metas' as any)
      .insert({ ...meta, empresa_id: empresaId }) as any)
      .select().single()
    if (!error) buscarMetas()
    return { data, error }
  }

  const atualizarMeta = async (id: string, updates: any) => {
    const { error } = await (supabase
      .from('metas' as any)
      .update({ ...updates, updated_at: new Date().toISOString() }) as any)
      .eq('id', id)
    if (!error) buscarMetas()
    return { error }
  }

  const excluirMeta = async (id: string) => {
    await (supabase.from('metas' as any)
      .update({ ativo: false }) as any).eq('id', id)
    buscarMetas()
  }

  // Busca progresso de uma meta comparando com vendas reais
  const buscarProgressoMeta = async (meta: any) => {
    let realizado = 0

    if (meta.tipo === 'categoria' && meta.categoria) {
      // Soma subtotais dos itens de venda cujo produto pertença à categoria da meta,
      // dentro do período. Usa join implícito via PostgREST.
      const { data: itens } = await (supabase
        .from('itens_venda')
        .select('subtotal, produtos!inner(categoria, empresa_id), vendas!inner(data_venda, empresa_id)') as any)
        .eq('produtos.categoria', meta.categoria)
        .eq('vendas.empresa_id', empresaId)
        .gte('vendas.data_venda', meta.data_inicio)
        .lte('vendas.data_venda', meta.data_fim)

      realizado = (itens || []).reduce(
        (acc: number, i: any) => acc + Number(i.subtotal || 0), 0
      )
    } else {
      let query = (supabase
        .from('vendas')
        .select('valor, valor_final, vendedor_id, data_venda') as any)
        .eq('empresa_id', empresaId)
        .gte('data_venda', meta.data_inicio)
        .lte('data_venda', meta.data_fim)

      if (meta.tipo === 'vendedora' && meta.usuario_id) {
        query = query.eq('vendedor_id', meta.usuario_id)
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
    if (empresaId) {
      setLoading(true)
      buscarMetas()
    }
  }, [empresaId])

  return {
    metas, loading,
    criarMeta, atualizarMeta,
    excluirMeta, buscarMetas,
    buscarProgressoMeta, gerarDatas
  }
}
