import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useEmpresa } from './useEmpresa'

export interface ContaPlano {
  id: string
  empresa_id: string
  codigo: string
  nome: string
  tipo: 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'custo' | 'despesa'
  natureza: 'devedora' | 'credora'
  conta_pai_id: string | null
  sintetica: boolean
  padrao: boolean
  ativo: boolean
  created_at: string
  updated_at: string
}

// Sugere o próximo código livre sob uma conta pai, seguindo a convenção do
// seed: nível raiz → pai (ex.: "1.1", "1.2"), nível 2+ → dois dígitos com
// zero à esquerda (ex.: "1.1.01", "1.1.02").
export function sugerirProximoCodigo(contas: ContaPlano[], paiId: string): string {
  const pai = contas.find(c => c.id === paiId)
  if (!pai) return ''

  const filhos = contas.filter(c => c.conta_pai_id === paiId)
  const paiDepth = pai.codigo.split('.').length
  const padded = paiDepth >= 2

  const nums = filhos.map(f => {
    const ultimoSegmento = f.codigo.split('.').pop() || '0'
    return parseInt(ultimoSegmento, 10) || 0
  })

  const proximo = nums.length > 0 ? Math.max(...nums) + 1 : 1
  const sufixo = padded ? String(proximo).padStart(2, '0') : String(proximo)
  return `${pai.codigo}.${sufixo}`
}

export function usePlanoContas() {
  const { empresaId } = useEmpresa()
  const [contas, setContas] = useState<ContaPlano[]>([])
  const [loading, setLoading] = useState(true)

  const buscarContas = useCallback(async () => {
    if (!empresaId) return
    setLoading(true)
    const { data } = await (supabase
      .from('plano_contas' as any)
      .select('*') as any)
      .eq('empresa_id', empresaId)
      .order('codigo', { ascending: true })
    setContas((data || []) as ContaPlano[])
    setLoading(false)
  }, [empresaId])

  const criarConta = async (conta: {
    codigo: string
    nome: string
    tipo: string
    natureza: string
    conta_pai_id: string | null
    sintetica: boolean
  }) => {
    if (!empresaId) return { data: null, error: 'Sem empresa selecionada' }

    const { data, error } = await (supabase
      .from('plano_contas' as any)
      .insert({ ...conta, empresa_id: empresaId, padrao: false } as any) as any)
      .select()
      .single()

    if (!error) await buscarContas()
    return { data, error: error ? error.message : null }
  }

  const atualizarConta = async (id: string, updates: { nome?: string; ativo?: boolean }) => {
    const { error } = await (supabase
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

    const temFilhos = contas.some(c => c.conta_pai_id === id)
    if (temFilhos) {
      return { error: 'Esta conta possui contas filhas. Exclua ou mova as contas filhas primeiro.' }
    }

    const { count } = await (supabase
      .from('lancamentos_contabeis_itens' as any)
      .select('id', { count: 'exact', head: true }) as any)
      .eq('conta_id', id)

    if (count && count > 0) {
      return { error: 'Esta conta já possui lançamentos contábeis e não pode ser excluída.' }
    }

    const { error } = await (supabase.from('plano_contas' as any).delete() as any).eq('id', id)
    if (!error) await buscarContas()
    return { error: error ? error.message : null }
  }

  useEffect(() => {
    if (empresaId) buscarContas()
  }, [empresaId, buscarContas])

  return {
    contas,
    loading,
    buscarContas,
    criarConta,
    atualizarConta,
    excluirConta,
  }
}
