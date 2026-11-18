import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'

export interface LinhaBalancete {
  conta_id: string
  codigo: string
  nome: string
  tipo: string
  natureza: 'devedora' | 'credora'
  sintetica: boolean
  total_debito: number
  total_credito: number
  saldo: number
}

export function useBalancete() {
  const { empresaId } = useEmpresa()
  const [linhas, setLinhas] = useState<LinhaBalancete[]>([])
  const [loading, setLoading] = useState(false)

  const buscarBalancete = useCallback(async (dataIni: string, dataFim: string) => {
    if (!empresaId) return { data: null, error: 'Sem empresa selecionada' }
    setLoading(true)
    const { data, error } = await (api.rpc('balancete', {
      p_empresa_id: empresaId,
      p_data_ini: dataIni,
      p_data_fim: dataFim,
    } as any) as any)
    setLinhas((data || []) as LinhaBalancete[])
    setLoading(false)
    return { data, error: error ? error.message : null }
  }, [empresaId])

  return { linhas, loading, buscarBalancete }
}
