import { useState } from 'react'
import { api } from '@/lib/api'
import { useEmpresa } from './useEmpresa'
import {
  startOfMonth, endOfMonth, addDays,
  addMonths, format, parseISO, isAfter,
  isBefore, differenceInDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function useFinanceiro() {
  const { companyId } = useEmpresa()
  const [loading, setLoading] = useState(false)

  // 1. VISÃO GERAL — dados do mês atual
  const buscarVisaoGeral = async () => {
    setLoading(true)
    const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const fim = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const hoje = format(new Date(), 'yyyy-MM-dd')

    // Vendas do mês
    const { data: vendas } = await api
      .from('sale')
      .select('final_amount, sold_on')
      .eq('company_id', companyId)
      .gte('sold_on', inicio)
      .lte('sold_on', fim)

    // Contas a pagar do mês
    const { data: contasPagar } = await api
      .from('payable')
      .select('valor, status, due_on, paid_on')
      .eq('company_id', companyId)
      .gte('due_on', inicio)
      .lte('due_on', fim)

    // Contas a receber do mês
    const { data: contasReceber } = await api
      .from('receivable')
      .select('valor, received_amount, status, due_on')
      .eq('company_id', companyId)
      .gte('due_on', inicio)
      .lte('due_on', fim)

    // Cálculos
    const receitaRealizada = vendas?.reduce(
      (acc, v) => acc + (v.final_amount || 0), 0) || 0

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
        c.due_on < hoje
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
        ?.filter(v => v.sold_on?.startsWith(dia))
        .reduce((acc, v) => acc + (v.final_amount || 0), 0) || 0

      const saidas = contasPagar
        ?.filter(c => c.paid_on === dia && c.status === 'pago')
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
    const { data: pagarFuturas } = await api
      .from('payable')
      .select('valor, due_on, descricao, categoria')
      .eq('company_id', companyId)
      .in('status', ['pendente', 'vencido'])
      .gte('due_on', hojeStr)
      .lte('due_on', fimStr)
      .order('due_on')

    // Contas a receber futuras
    const { data: receberFuturas } = await api
      .from('receivable')
      .select('valor, due_on, descricao, customer_name')
      .eq('company_id', companyId)
      .in('status', ['pendente'])
      .gte('due_on', hojeStr)
      .lte('due_on', fimStr)
      .order('due_on')

    // Média diária de vendas (últimos 30 dias)
    const inicioHistorico = format(addDays(hoje, -30), 'yyyy-MM-dd')
    const { data: vendasHistorico } = await api
      .from('sale')
      .select('final_amount')
      .eq('company_id', companyId)
      .gte('sold_on', inicioHistorico)

    const mediaDiariaVendas = vendasHistorico?.length
      ? vendasHistorico.reduce(
          (acc, v) => acc + (v.final_amount || 0), 0) / 30
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
          c.due_on >= inicioSemana &&
          c.due_on <= fimSemana
        )
        .reduce((acc, c) => acc + (c.valor || 0), 0) || 0

      const entradasEstimadas = mediaDiariaVendas * 7

      const saidasPrevistas = pagarFuturas
        ?.filter(c =>
          c.due_on >= inicioSemana &&
          c.due_on <= fimSemana
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
    const { data: recebimentos } = await api
      .from('receivable')
      .select('created_at, received_on')
      .eq('company_id', companyId)
      .eq('status', 'recebido')
      .not('received_on', 'is', null)
      .limit(50)

    const pmr = recebimentos?.length
      ? recebimentos.reduce((acc, r) => {
          const criado = parseISO(r.created_at)
          const recebido = parseISO(r.received_on)
          return acc + differenceInDays(recebido, criado)
        }, 0) / recebimentos.length
      : 0

    // Prazo médio de pagamento
    const { data: pagamentos } = await api
      .from('payable')
      .select('created_at, paid_on')
      .eq('company_id', companyId)
      .eq('status', 'pago')
      .not('paid_on', 'is', null)
      .limit(50)

    const pmp = pagamentos?.length
      ? pagamentos.reduce((acc, p) => {
          const criado = parseISO(p.created_at)
          const pago = parseISO(p.paid_on)
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
