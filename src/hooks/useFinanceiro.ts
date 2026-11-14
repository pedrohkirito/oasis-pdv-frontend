import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useEmpresa } from './useEmpresa'
import {
  startOfMonth, endOfMonth, addDays,
  addMonths, format, parseISO, isAfter,
  isBefore, differenceInDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function useFinanceiro() {
  const { empresaId } = useEmpresa()
  const [loading, setLoading] = useState(false)

  // 1. VISÃO GERAL — dados do mês atual
  const buscarVisaoGeral = async () => {
    setLoading(true)
    const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const fim = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const hoje = format(new Date(), 'yyyy-MM-dd')

    // Vendas do mês
    const { data: vendas } = await supabase
      .from('vendas')
      .select('valor_final, data_venda')
      .eq('empresa_id', empresaId)
      .gte('data_venda', inicio)
      .lte('data_venda', fim)

    // Contas a pagar do mês
    const { data: contasPagar } = await supabase
      .from('contas_pagar')
      .select('valor, status, data_vencimento, data_pagamento')
      .eq('empresa_id', empresaId)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)

    // Contas a receber do mês
    const { data: contasReceber } = await supabase
      .from('contas_receber')
      .select('valor, valor_recebido, status, data_vencimento')
      .eq('empresa_id', empresaId)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)

    // Cálculos
    const receitaRealizada = vendas?.reduce(
      (acc, v) => acc + (v.valor_final || 0), 0) || 0

    const despesasPagas = contasPagar
      ?.filter(c => c.status === 'pago')
      .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

    const despesasPendentes = contasPagar
      ?.filter(c => c.status !== 'pago' && c.status !== 'cancelado')
      .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

    const despesasVencidas = contasPagar
      ?.filter(c =>
        c.status !== 'pago' &&
        c.status !== 'cancelado' &&
        c.data_vencimento < hoje
      )
      .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

    const receitasPendentes = contasReceber
      ?.filter(c => c.status === 'pendente')
      .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

    const saldoOperacional = receitaRealizada - despesasPagas
    const saldoProjetado = saldoOperacional +
      receitasPendentes - despesasPendentes

    // Evolução diária do mês
    const diasDoMes = Array.from({ length:
      new Date(new Date().getFullYear(),
               new Date().getMonth() + 1, 0).getDate()
    }, (_, i) => {
      const dia = format(new Date(
        new Date().getFullYear(),
        new Date().getMonth(), i + 1
      ), 'yyyy-MM-dd')

      const entradas = vendas
        ?.filter(v => v.data_venda?.startsWith(dia))
        .reduce((acc, v) => acc + (v.valor_final || 0), 0) || 0

      const saidas = contasPagar
        ?.filter(c => c.data_pagamento === dia && c.status === 'pago')
        .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

      return { dia, entradas, saidas, saldo: entradas - saidas }
    })

    setLoading(false)
    return {
      receitaRealizada,
      despesasPagas,
      despesasPendentes,
      despesasVencidas,
      receitasPendentes,
      saldoOperacional,
      saldoProjetado,
      diasDoMes,
      margem: receitaRealizada > 0
        ? ((receitaRealizada - despesasPagas) / receitaRealizada) * 100
        : 0
    }
  }

  // 2. FLUXO DE CAIXA PROJETADO — próximos N dias
  const buscarFluxoProjetado = async (dias = 90) => {
    setLoading(true)
    const hoje = new Date()
    const fim = addDays(hoje, dias)
    const fimStr = format(fim, 'yyyy-MM-dd')
    const hojeStr = format(hoje, 'yyyy-MM-dd')

    // Contas a pagar futuras
    const { data: pagarFuturas } = await supabase
      .from('contas_pagar')
      .select('valor, data_vencimento, descricao, categoria')
      .eq('empresa_id', empresaId)
      .in('status', ['pendente', 'vencido'])
      .gte('data_vencimento', hojeStr)
      .lte('data_vencimento', fimStr)
      .order('data_vencimento')

    // Contas a receber futuras
    const { data: receberFuturas } = await supabase
      .from('contas_receber')
      .select('valor, data_vencimento, descricao, cliente_nome')
      .eq('empresa_id', empresaId)
      .in('status', ['pendente'])
      .gte('data_vencimento', hojeStr)
      .lte('data_vencimento', fimStr)
      .order('data_vencimento')

    // Média diária de vendas (últimos 30 dias)
    const inicioHistorico = format(addDays(hoje, -30), 'yyyy-MM-dd')
    const { data: vendasHistorico } = await supabase
      .from('vendas')
      .select('valor_final')
      .eq('empresa_id', empresaId)
      .gte('data_venda', inicioHistorico)

    const mediaDiariaVendas = vendasHistorico?.length
      ? vendasHistorico.reduce(
          (acc, v) => acc + (v.valor_final || 0), 0) / 30
      : 0

    // Monta linha do tempo semanal
    const semanas: any[] = []
    let dataAtual = new Date(hoje)

    while (isBefore(dataAtual, fim)) {
      const inicioSemana = format(dataAtual, 'yyyy-MM-dd')
      const fimSemana = format(
        addDays(dataAtual, 6), 'yyyy-MM-dd'
      )

      const entradasPrevistas = receberFuturas
        ?.filter(c =>
          c.data_vencimento >= inicioSemana &&
          c.data_vencimento <= fimSemana
        )
        .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

      const entradasEstimadas = mediaDiariaVendas * 7

      const saidasPrevistas = pagarFuturas
        ?.filter(c =>
          c.data_vencimento >= inicioSemana &&
          c.data_vencimento <= fimSemana
        )
        .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

      semanas.push({
        semana: format(dataAtual, "'Sem' w", { locale: ptBR }),
        inicio: inicioSemana,
        fim: fimSemana,
        entradasPrevistas,
        entradasEstimadas,
        totalEntradas: entradasPrevistas + entradasEstimadas,
        saidasPrevistas,
        saldo: entradasPrevistas + entradasEstimadas - saidasPrevistas
      })

      dataAtual = addDays(dataAtual, 7)
    }

    // Identifica pontos críticos (saldo negativo)
    const pontosCriticos = semanas.filter(s => s.saldo < 0)

    setLoading(false)
    return {
      semanas,
      pontosCriticos,
      totalEntradasPrevistas: receberFuturas?.reduce(
        (acc, c) => acc + (c.valor || 0), 0) || 0,
      totalSaidasPrevistas: pagarFuturas?.reduce(
        (acc, c) => acc + (c.valor || 0), 0) || 0,
      mediaDiariaVendas,
      pagarFuturas: pagarFuturas || [],
      receberFuturas: receberFuturas || []
    }
  }

  // 3. CENÁRIOS WHAT-IF
  const calcularCenario = async (
    percentualVendas: number,
    percentualDespesas: number,
    dias = 30
  ) => {
    const base = await buscarFluxoProjetado(dias)

    return {
      ...base,
      semanas: base.semanas.map(s => ({
        ...s,
        totalEntradas: s.totalEntradas * (percentualVendas / 100),
        saidasPrevistas: s.saidasPrevistas * (percentualDespesas / 100),
        saldo: (s.totalEntradas * (percentualVendas / 100)) -
               (s.saidasPrevistas * (percentualDespesas / 100))
      })),
      cenario: {
        percentualVendas,
        percentualDespesas,
        descricao: percentualVendas < 100
          ? `Queda de ${100 - percentualVendas}% nas vendas`
          : `Crescimento de ${percentualVendas - 100}% nas vendas`
      }
    }
  }

  // 4. KPIs FINANCEIROS
  const buscarKPIs = async () => {
    const visao = await buscarVisaoGeral()
    const fluxo = await buscarFluxoProjetado(30)

    // Prazo médio de recebimento
    const { data: recebimentos } = await supabase
      .from('contas_receber')
      .select('created_at, data_recebimento')
      .eq('empresa_id', empresaId)
      .eq('status', 'recebido')
      .not('data_recebimento', 'is', null)
      .limit(50)

    const pmr = recebimentos?.length
      ? recebimentos.reduce((acc, r) => {
          const criado = parseISO(r.created_at)
          const recebido = parseISO(r.data_recebimento)
          return acc + differenceInDays(recebido, criado)
        }, 0) / recebimentos.length
      : 0

    // Prazo médio de pagamento
    const { data: pagamentos } = await supabase
      .from('contas_pagar')
      .select('created_at, data_pagamento')
      .eq('empresa_id', empresaId)
      .eq('status', 'pago')
      .not('data_pagamento', 'is', null)
      .limit(50)

    const pmp = pagamentos?.length
      ? pagamentos.reduce((acc, p) => {
          const criado = parseISO(p.created_at)
          const pago = parseISO(p.data_pagamento)
          return acc + differenceInDays(pago, criado)
        }, 0) / pagamentos.length
      : 0

    return {
      ...visao,
      pmr: Math.round(pmr),
      pmp: Math.round(pmp),
      cicloFinanceiro: Math.round(pmr - pmp),
      runwayDias: visao.saldoOperacional > 0 && visao.despesasPagas > 0
        ? Math.round((visao.saldoOperacional /
            (visao.despesasPagas / 30)))
        : 0,
      proximasSaidas: fluxo.pagarFuturas.slice(0, 5),
      proximasEntradas: fluxo.receberFuturas.slice(0, 5)
    }
  }

  return {
    loading,
    buscarVisaoGeral,
    buscarFluxoProjetado,
    calcularCenario,
    buscarKPIs
  }
}
