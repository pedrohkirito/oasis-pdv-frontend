import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'

export interface LinhaBalancete {
  account_id: string
  code: string
  name: string
  kind: string
  natureza: 'devedora' | 'credora'
  sintetica: boolean
  total_debit: number
  total_credit: number
  saldo: number
}

export function useBalancete() {
  const { companyId } = useEmpresa()
  const [linhas, setLinhas] = useState<LinhaBalancete[]>([])
  const [loading, setLoading] = useState(false)

  const buscarBalancete = useCallback(async (dataIni: string, dataFim: string) => {
    if (!companyId) return { data: null, error: 'Sem empresa selecionada' }
    setLoading(true)
    const { data, error } = await (api.rpc('trial_balance', {
      p_company_id: companyId,
      p_data_ini: dataIni,
      p_data_fim: dataFim,
    } as any) as any)
    setLinhas((data || []) as LinhaBalancete[])
    setLoading(false)
    return { data, error: error ? error.message : null }
  }, [companyId])

  return { linhas, loading, buscarBalancete }
}
