import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useEmpresa } from './useEmpresa'
import { parseOFX } from '@/utils/ofxParser'
import { format, addDays } from 'date-fns'

const BANCOS_BR = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '033', nome: 'Santander' },
  { codigo: '077', nome: 'Inter' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '208', nome: 'BTG Pactual' },
  { codigo: '212', nome: 'Banco Original' },
  { codigo: '237', nome: 'Bradesco' },
  { codigo: '260', nome: 'Nubank' },
  { codigo: '341', nome: 'Itaú' },
  { codigo: '380', nome: 'PicPay' },
  { codigo: '422', nome: 'Safra' },
  { codigo: '748', nome: 'Sicredi' },
  { codigo: '756', nome: 'Sicoob' },
  { codigo: '999', nome: 'Mercado Pago' },
]

export function useContasBancarias() {
  const { empresaId } = useEmpresa()
  const [contas, setContas] = useState<any[]>([])
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const BANCOS = BANCOS_BR

  const buscarContas = async () => {
    const { data } = await (supabase
      .from('contas_bancarias' as any)
      .select('*') as any)
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('padrao', { ascending: false })
    setContas(data || [])
    setLoading(false)
  }

  const buscarMovimentacoes = async (
    contaId: string,
    dataInicio?: string,
    dataFim?: string
  ) => {
    let query = (supabase
      .from('movimentacoes_bancarias' as any)
      .select('*') as any)
      .eq('conta_id', contaId)
      .order('data_movimentacao', { ascending: false })

    if (dataInicio) query = query.gte('data_movimentacao', dataInicio)
    if (dataFim) query = query.lte('data_movimentacao', dataFim)

    const { data } = await query
    setMovimentacoes(data || [])
    return data || []
  }

  const criarConta = async (conta: any) => {
    if (conta.padrao) {
      await (supabase.from('contas_bancarias' as any)
        .update({ padrao: false } as any) as any)
        .eq('empresa_id', empresaId)
    }

    const { data, error } = await (supabase
      .from('contas_bancarias' as any)
      .insert({ ...conta, empresa_id: empresaId } as any) as any)
      .select().single()

    if (!error) buscarContas()
    return { data, error }
  }

  const atualizarConta = async (contaId: string, updates: any) => {
    await (supabase.from('contas_bancarias' as any)
      .update({ ...updates, updated_at: new Date().toISOString() } as any) as any)
      .eq('id', contaId)
    buscarContas()
  }

  const atualizarSaldo = async (contaId: string, saldo: number) => {
    await (supabase.from('contas_bancarias' as any)
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

    const { data: existentes } = await (supabase
      .from('movimentacoes_bancarias' as any)
      .select('identificador_externo') as any)
      .eq('conta_id', contaId)

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

    const { error } = await (supabase
      .from('movimentacoes_bancarias' as any)
      .insert(novas.map(t => ({
        ...t,
        conta_id: contaId,
        empresa_id: empresaId,
      })) as any) as any)

    if (!error) {
      buscarMovimentacoes(contaId)
      return { error: null, importadas: novas.length }
    }

    return { error }
  }

  const conciliarMovimentacao = async (
    movimentacaoId: string,
    tipo: 'conta_pagar' | 'conta_receber' | 'venda' | 'ignorar',
    referenciaId?: string
  ) => {
    const updates: any = { status_conciliacao: 'conciliado' }
    if (tipo === 'ignorar') updates.status_conciliacao = 'ignorado'
    if (tipo === 'conta_pagar') updates.conta_pagar_id = referenciaId
    if (tipo === 'conta_receber') updates.conta_receber_id = referenciaId
    if (tipo === 'venda') updates.venda_id = referenciaId

    await (supabase.from('movimentacoes_bancarias' as any)
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
    const { error } = await (supabase
      .from('transferencias_bancarias' as any)
      .insert({
        empresa_id: empresaId,
        conta_origem_id: contaOrigemId,
        conta_destino_id: contaDestinoId,
        valor,
        descricao,
        data_transferencia: data,
      } as any) as any)

    if (!error) {
      await (supabase.from('movimentacoes_bancarias' as any).insert([
        {
          empresa_id: empresaId,
          conta_id: contaOrigemId,
          tipo: 'debito',
          valor,
          descricao: `Transferência para: ${descricao}`,
          data_movimentacao: data,
          origem: 'manual',
          status_conciliacao: 'conciliado',
        },
        {
          empresa_id: empresaId,
          conta_id: contaDestinoId,
          tipo: 'credito',
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
    await (supabase.from('contas_bancarias' as any)
      .update({ ativo: false } as any) as any).eq('id', id)
    buscarContas()
  }

  const sincronizarPluggy = async (conta: any) => {
    if (!conta.pluggy_account_id) return { error: 'Conta sem ID Pluggy' }

    const dataFim = format(new Date(), 'yyyy-MM-dd')
    const dataInicio = format(addDays(new Date(), -90), 'yyyy-MM-dd')

    const { data, error } = await supabase.functions.invoke('pluggy-sync', {
      body: {
        contaId: conta.id,
        pluggyAccountId: conta.pluggy_account_id,
        dataInicio,
        dataFim,
        empresaId,
      },
    })

    if (!error) buscarMovimentacoes(conta.id)
    return { data, error }
  }

  useEffect(() => {
    if (empresaId) {
      setLoading(true)
      buscarContas()
    }
  }, [empresaId])

  return {
    contas, movimentacoes, loading, BANCOS,
    buscarContas, buscarMovimentacoes,
    criarConta, atualizarConta, atualizarSaldo,
    importarOFX, conciliarMovimentacao,
    transferirEntreContas, excluirConta,
    sincronizarPluggy,
  }
}
