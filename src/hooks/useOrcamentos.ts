import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'
import { useAuth } from './useAuth'

export function useOrcamentos() {
  const { empresaId, empresaAtiva } = useEmpresa()
  const { user } = useAuth()
  const [orcamentos, setOrcamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const buscarOrcamentos = async () => {
    const { data } = await api
      .from('orcamentos')
      .select('*, orcamento_itens(*)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
    setOrcamentos(data || [])
    setLoading(false)
  }

  const gerarNumero = () => {
    const data = new Date()
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const rand = Math.floor(Math.random() * 9000) + 1000
    return `ORC-${ano}${mes}-${rand}`
  }

  const criarOrcamento = async (orcamento: any, itens: any[]) => {
    const numero = gerarNumero()
    const subtotal = itens.reduce(
      (acc, i) => acc + (i.quantidade * i.preco_unitario), 0
    )
    const total = subtotal - (orcamento.desconto || 0)

    const { data, error } = await api
      .from('orcamentos')
      .insert({
        ...orcamento,
        numero,
        subtotal,
        total,
        empresa_id: empresaId
      })
      .select().single()

    if (!error && data) {
      await api.from('orcamento_itens').insert(
        itens.map(i => ({
          ...i,
          orcamento_id: data.id,
          empresa_id: empresaId,
          total: i.quantidade * i.preco_unitario - (i.desconto_item || 0)
        }))
      )
      buscarOrcamentos()
    }
    return { data, error }
  }

  const atualizarStatus = async (id: string, status: string) => {
    await api.from('orcamentos')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    buscarOrcamentos()
  }

  const converterEmVenda = async (orcamentoId: string) => {
    const orcamento = (orcamentos as any[]).find(o => o.id === orcamentoId)
    if (!orcamento) return { error: 'Orçamento não encontrado' }

    // Cria a venda com os campos corretos da tabela vendas
    const { data: venda, error } = await (api
      .from('vendas')
      .insert({
        empresa_id: empresaId,
        cliente_nome: orcamento.cliente_nome || 'Cliente',
        cliente_email: orcamento.cliente_email,
        cliente_telefone: orcamento.cliente_telefone,
        valor: orcamento.total,
        desconto: orcamento.desconto,
        observacoes: `Convertido do orçamento ${orcamento.numero}`,
        metodo_pagamento: orcamento.condicao_pagamento || 'A definir',
        bandeira: '',
        data_venda: new Date().toISOString().split('T')[0],
      } as any)
      .select().single() as any)

    if (!error && venda) {
      // Cria os itens da venda com os campos corretos de itens_venda
      const itens: any[] = orcamento.orcamento_itens || []
      const itensValidos = itens.filter(i => i.produto_id)
      if (itensValidos.length > 0) {
        await api.from('itens_venda').insert(
          itensValidos.map(i => ({
            venda_id: venda.id,
            produto_id: i.produto_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            subtotal: i.total ?? i.quantidade * i.preco_unitario,
          }))
        )
      }

      // Atualiza orçamento como convertido
      await api.from('orcamentos')
        .update({
          status: 'convertido',
          venda_id: venda.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orcamentoId)

      buscarOrcamentos()
    }
    return { data: venda, error }
  }

  const excluirOrcamento = async (id: string) => {
    await api.from('orcamentos').delete().eq('id', id)
    buscarOrcamentos()
  }

  useEffect(() => {
    if (empresaId) {
      setLoading(true)
      buscarOrcamentos()
    }
  }, [empresaId])

  return {
    orcamentos, loading,
    criarOrcamento, atualizarStatus,
    converterEmVenda, excluirOrcamento,
    buscarOrcamentos,
  }
}
