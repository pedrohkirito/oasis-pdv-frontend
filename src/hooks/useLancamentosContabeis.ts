import { useCallback } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'

export interface ItemLancamento {
  conta_id: string
  code: string
  name: string
  kind: 'debito' | 'credito'
  valor: number
}

export interface LancamentoContabil {
  id: string
  data_lancamento: string
  historico: string
  origem: string
  origem_id: string | null
  created_at: string
  total: number
  itens: ItemLancamento[]
  estornado: boolean
  total_registros: number
}

export interface SaldoPatrimonial {
  conta_id: string
  code: string
  name: string
  natureza: 'devedora' | 'credora'
  saldo: number
}

export interface ItemNovoLancamento {
  conta_id: string
  kind: 'debito' | 'credito'
  valor: number
}

export const ORIGENS_MANUAIS = ['manual', 'abertura', 'ajuste']

export const ORIGEM_LABEL: Record<string, string> = {
  manual: 'Manual',
  abertura: 'Abertura',
  ajuste: 'Ajuste',
  estorno: 'Estorno',
  venda: 'Venda',
  venda_cmv: 'CMV',
  recebimento: 'Recebimento',
  conta_receber_avulsa: 'Receita avulsa',
  pagamento: 'Pagamento',
  pedido_compra: 'Compra',
}

export function useLancamentosContabeis() {
  const { companyId } = useEmpresa()

  const listar = useCallback(async (params: {
    dataIni: string
    dataFim: string
    origem?: string | null
    limite?: number
    offset?: number
  }) => {
    if (!companyId) return { data: [] as LancamentoContabil[], error: 'Sem empresa selecionada' }
    const { data, error } = await (api.rpc('list_journal_entries', {
      p_company_id: companyId,
      p_data_ini: params.dataIni,
      p_data_fim: params.dataFim,
      p_origem: params.origem ?? null,
      p_limite: params.limite ?? 200,
      p_offset: params.offset ?? 0,
    } as any) as any)
    return { data: (data || []) as LancamentoContabil[], error: error ? error.message as string : null }
  }, [companyId])

  const criar = useCallback(async (params: {
    data: string
    historico: string
    origem: 'manual' | 'abertura' | 'ajuste'
    itens: ItemNovoLancamento[]
  }) => {
    if (!companyId) return { id: null, error: 'Sem empresa selecionada' }
    const { data, error } = await (api.rpc('create_journal_entry', {
      p_header: {
        company_id: companyId,
        data_lancamento: params.data,
        historico: params.historico,
        origem: params.origem,
      },
      p_itens: params.itens,
    } as any) as any)
    return { id: (data as string | null) ?? null, error: error ? error.message as string : null }
  }, [companyId])

  const estornar = useCallback(async (journalEntryId: string, motivo: string) => {
    const { data, error } = await (api.rpc('reverse_journal_entry', {
      p_lancamento_id: journalEntryId,
      p_motivo: motivo,
    } as any) as any)
    return { id: (data as string | null) ?? null, error: error ? error.message as string : null }
  }, [])

  const saldosPatrimoniais = useCallback(async (data: string) => {
    if (!companyId) return { data: [] as SaldoPatrimonial[], error: 'Sem empresa selecionada' }
    const { data: rows, error } = await (api.rpc('balance_sheet', {
      p_company_id: companyId,
      p_data: data,
    } as any) as any)
    return { data: (rows || []) as SaldoPatrimonial[], error: error ? error.message as string : null }
  }, [companyId])

  const primeiraVenda = useCallback(async (): Promise<string | null> => {
    if (!companyId) return null
    const { data } = await (api
      .from('sale')
      .select('sold_on') as any)
      .eq('company_id', companyId)
      .order('sold_on', { ascending: true })
      .limit(1)
    return data?.[0]?.data_venda ?? null
  }, [companyId])

  return { listar, criar, estornar, saldosPatrimoniais, primeiraVenda }
}

// Valores em centavos inteiros para somar sem erro de ponto flutuante.
export const paraCentavos = (texto: string): number => {
  const t = texto.trim()
  // Com vírgula: formato pt-BR ("1.234,56"). Sem vírgula: ponto é decimal ("100.5").
  const limpo = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = parseFloat(limpo)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

export const deCentavos = (c: number): number => Math.round(c) / 100

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
