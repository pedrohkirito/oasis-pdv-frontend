import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'

export interface ContaPlano {
  id: string
  company_id: string
  code: string
  name: string
  kind: 'active' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'cost' | 'despesa'
  natureza: 'devedora' | 'credora'
  parent_account_id: string | null
  sintetica: boolean
  padrao: boolean
  active: boolean
  created_at: string
  updated_at: string
}

// Sugere o próximo código livre sob uma conta pai, seguindo a convenção do
// seed: nível raiz → pai (ex.: "1.1", "1.2"), nível 2+ → dois dígitos com
// zero à esquerda (ex.: "1.1.01", "1.1.02").
export function sugerirProximoCodigo(contas: ContaPlano[], paiId: string): string {
  const pai = contas.find(c => c.id === paiId)
  if (!pai) return ''

  const filhos = contas.filter(c => c.parent_account_id === paiId)
  const paiDepth = pai.code.split('.').length
  const padded = paiDepth >= 2

  const nums = filhos.map(f => {
    const ultimoSegmento = f.code.split('.').pop() || '0'
    return parseInt(ultimoSegmento, 10) || 0
  })

  const proximo = nums.length > 0 ? Math.max(...nums) + 1 : 1
  const sufixo = padded ? String(proximo).padStart(2, '0') : String(proximo)
  return `${pai.code}.${sufixo}`
}

export function usePlanoContas() {
  const { companyId } = useEmpresa()
  const [contas, setContas] = useState<ContaPlano[]>([])
  const [loading, setLoading] = useState(true)

  const buscarContas = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await (api
      .from('plano_contas' as any)
      .select('*') as any)
      .eq('company_id', companyId)
      .order('code', { ascending: true })
    setContas((data || []) as ContaPlano[])
    setLoading(false)
  }, [companyId])

  const criarConta = async (conta: {
    code: string
    name: string
    kind: string
    natureza: string
    parent_account_id: string | null
    sintetica: boolean
  }) => {
    if (!companyId) return { data: null, error: 'Sem empresa selecionada' }

    const { data, error } = await (api
      .from('plano_contas' as any)
      .insert({ ...conta, company_id: companyId, padrao: false } as any) as any)
      .select()
      .single()

    if (!error) await buscarContas()
    return { data, error: error ? error.message : null }
  }

  const atualizarConta = async (id: string, updates: { name?: string; active?: boolean }) => {
    const { error } = await (api
      .from('plano_contas' as any)
      .update({ ...updates, updated_at: new Date().toISOString() } as any) as any)
      .eq('id', id)

    if (!error) await buscarContas()
    return { error: error ? error.message : null }
  }

  const excluirConta = async (id: string) => {
    const conta = contas.find(c => c.id === id)
    if (!conta) return { error: 'Conta não encontrada' }

    if (conta.padrao) {
      return { error: 'Contas padrão do sistema não podem ser excluídas.' }
    }

    const temFilhos = contas.some(c => c.parent_account_id === id)
    if (temFilhos) {
      return { error: 'Esta conta possui contas filhas. Exclua ou mova as contas filhas primeiro.' }
    }

    const { count } = await (api
      .from('lancamentos_contabeis_itens' as any)
      .select('id', { count: 'exact', head: true }) as any)
      .eq('account_id', id)

    if (count && count > 0) {
      return { error: 'Esta conta já possui lançamentos contábeis e não pode ser excluída.' }
    }

    const { error } = await (api.from('plano_contas' as any).delete() as any).eq('id', id)
    if (!error) await buscarContas()
    return { error: error ? error.message : null }
  }

  useEffect(() => {
    if (companyId) buscarContas()
  }, [companyId, buscarContas])

  return {
    contas,
    loading,
    buscarContas,
    criarConta,
    atualizarConta,
    excluirConta,
  }
}
