import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'
import { parseOFX } from '@/utils/ofxParser'
import { format, addDays } from 'date-fns'

const BANCOS_BR = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '077', name: 'Inter' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '208', name: 'BTG Pactual' },
  { code: '212', name: 'Banco Original' },
  { code: '237', name: 'Bradesco' },
  { code: '260', name: 'Nubank' },
  { code: '341', name: 'Itaú' },
  { code: '380', name: 'PicPay' },
  { code: '422', name: 'Safra' },
  { code: '748', name: 'Sicredi' },
  { code: '756', name: 'Sicoob' },
  { code: '999', name: 'Mercado Pago' },
]

export function useContasBancarias() {
  const { companyId } = useEmpresa()
  const [contas, setContas] = useState<any[]>([])
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const BANCOS = BANCOS_BR

  const buscarContas = async () => {
    const { data } = await (api
      .from('contas_bancarias' as any)
      .select('*') as any)
      .eq('company_id', companyId)
      .eq('active', true)
      .order('padrao', { ascending: false })
    setContas(data || [])
    setLoading(false)
  }

  const buscarMovimentacoes = async (
    contaId: string,
    dataInicio?: string,
    dataFim?: string
  ) => {
    let query = (api
      .from('movimentacoes_bancarias' as any)
      .select('*') as any)
      .eq('account_id', contaId)
      .order('data_movimentacao', { ascending: false })

    if (dataInicio) query = query.gte('data_movimentacao', dataInicio)
    if (dataFim) query = query.lte('data_movimentacao', dataFim)

    const { data } = await query
    setMovimentacoes(data || [])
    return data || []
  }

  const criarConta = async (conta: any) => {
    if (conta.padrao) {
      await (api.from('contas_bancarias' as any)
        .update({ padrao: false } as any) as any)
        .eq('company_id', companyId)
    }

    const { data, error } = await (api
      .from('contas_bancarias' as any)
      .insert({ ...conta, company_id: companyId } as any) as any)
      .select().single()

    if (!error) buscarContas()
    return { data, error }
  }

  const atualizarConta = async (contaId: string, updates: any) => {
    await (api.from('contas_bancarias' as any)
      .update({ ...updates, updated_at: new Date().toISOString() } as any) as any)
      .eq('id', contaId)
    buscarContas()
  }

  const atualizarSaldo = async (contaId: string, saldo: number) => {
    await (api.from('contas_bancarias' as any)
      .update({
        saldo_atual: saldo,
        updated_at: new Date().toISOString(),
      } as any) as any)
      .eq('id', contaId)
    buscarContas()
  }

  const importarOFX = async (contaId: string, arquivo: File) => {
    const conteudo = await arquivo.text()
    const transacoes = parseOFX(conteudo)

    if (transacoes.length === 0) {
      return { error: 'Nenhuma transação encontrada no arquivo OFX' }
    }

    const { data: existentes } = await (api
      .from('movimentacoes_bancarias' as any)
      .select('identificador_externo') as any)
      .eq('account_id', contaId)

    const idsExistentes = new Set(
      existentes?.map((e: any) => e.identificador_externo) || []
    )

    const novas = transacoes.filter(
      t => !t.identificador_externo ||
           !idsExistentes.has(t.identificador_externo)
    )

    if (novas.length === 0) {
      return {
        error: null,
        importadas: 0,
        mensagem: 'Todas as transações já foram importadas',
      }
    }

    const { error } = await (api
      .from('movimentacoes_bancarias' as any)
      .insert(novas.map(t => ({
        ...t,
        conta_id: contaId,
        company_id: companyId,
      })) as any) as any)

    if (!error) {
      buscarMovimentacoes(contaId)
      return { error: null, importadas: novas.length }
    }

    return { error }
  }

  const conciliarMovimentacao = async (
    movimentacaoId: string,
    kind: 'conta_pagar' | 'conta_receber' | 'venda' | 'ignorar',
    referenciaId?: string
  ) => {
    const updates: any = { status_conciliacao: 'conciliado' }
    if (kind === 'ignorar') updates.status_conciliacao = 'ignorado'
    if (kind === 'conta_pagar') updates.conta_pagar_id = referenciaId
    if (kind === 'conta_receber') updates.conta_receber_id = referenciaId
    if (kind === 'venda') updates.venda_id = referenciaId

    await (api.from('movimentacoes_bancarias' as any)
      .update(updates) as any).eq('id', movimentacaoId)

    return { error: null }
  }

  const transferirEntreContas = async (
    contaOrigemId: string,
    contaDestinoId: string,
    valor: number,
    descricao: string,
    data: string
  ) => {
    const { error } = await (api
      .from('transferencias_bancarias' as any)
      .insert({
        company_id: companyId,
        conta_origem_id: contaOrigemId,
        conta_destino_id: contaDestinoId,
        valor,
        descricao,
        data_transferencia: data,
      } as any) as any)

    if (!error) {
      await (api.from('movimentacoes_bancarias' as any).insert([
        {
          company_id: companyId,
          conta_id: contaOrigemId,
          kind: 'debito',
          valor,
          descricao: `Transferência para: ${descricao}`,
          data_movimentacao: data,
          origem: 'manual',
          status_conciliacao: 'conciliado',
        },
        {
          company_id: companyId,
          conta_id: contaDestinoId,
          kind: 'credito',
          valor,
          descricao: `Transferência de: ${descricao}`,
          data_movimentacao: data,
          origem: 'manual',
          status_conciliacao: 'conciliado',
        },
      ] as any) as any)
      buscarContas()
    }
    return { error }
  }

  const excluirConta = async (id: string) => {
    await (api.from('contas_bancarias' as any)
      .update({ active: false } as any) as any).eq('id', id)
    buscarContas()
  }

  const sincronizarPluggy = async (conta: any) => {
    if (!conta.pluggy_account_id) return { error: 'Conta sem ID Pluggy' }

    const dataFim = format(new Date(), 'yyyy-MM-dd')
    const dataInicio = format(addDays(new Date(), -90), 'yyyy-MM-dd')

    const { data, error } = await api.functions.invoke('pluggy-sync', {
      body: {
        contaId: conta.id,
        pluggyAccountId: conta.pluggy_account_id,
        dataInicio,
        dataFim,
        companyId,
      },
    })

    if (!error) buscarMovimentacoes(conta.id)
    return { data, error }
  }

  useEffect(() => {
    if (companyId) {
      setLoading(true)
      buscarContas()
    }
  }, [companyId])

  return {
    contas, movimentacoes, loading, BANCOS,
    buscarContas, buscarMovimentacoes,
    criarConta, atualizarConta, atualizarSaldo,
    importarOFX, conciliarMovimentacao,
    transferirEntreContas, excluirConta,
    sincronizarPluggy,
  }
}
