import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';
import { useAuth } from './useAuth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SessaoCaixa {
  id: string;
  company_id: string;
  operator_id: string;
  operator_name: string | null;
  closed_by_id: string | null;
  closed_by_name: string | null;
  status: 'aberto' | 'fechado';
  opening_amount: number;
  physical_closing_amount: number | null;
  total_cash: number;
  total_debit: number;
  total_credit: number;
  total_pix: number;
  total_sales: number;
  total_withdrawals: number;
  total_deposits: number;
  cash_variance: number | null;
  closing_note: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
}

export interface MovimentacaoCaixa {
  id: string;
  cash_session_id: string;
  company_id: string;
  kind: 'sangria' | 'suprimento';
  valor: number;
  motivo: string | null;
  operator_id: string;
  operator_name: string | null;
  created_at: string;
}

export interface ResultadoFechamento {
  quebra: number;
  totais: {
    total: number;
    dinheiro: number;
    debito: number;
    credito: number;
    pix: number;
  };
  totalSangrias: number;
  totalSuprimentos: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCaixa() {
  const { companyId } = useEmpresa();
  const { user } = useAuth();

  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoCaixa | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Busca sessão aberta ──────────────────────────────────────────────────

  const buscarSessaoAtiva = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    // Busca a sessão aberta mais recente da empresa.
    // Usamos limit(1) em vez de .maybeSingle() para evitar erro quando,
    // por algum motivo, houver mais de uma sessão "aberto" no banco.
    // O caixa é compartilhado entre todos os usuários da empresa.
    const { data, error } = await api
      .from('cash_session')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'aberto')
      .order('opened_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[useCaixa] erro ao buscar sessão ativa:', error);
      setSessaoAtiva(null);
    } else {
      setSessaoAtiva(((data?.[0] as SessaoCaixa) ?? null));
    }
    setLoading(false);
  }, [companyId]);

  // ── Realtime: mantém a sessão sincronizada entre usuários ────────────────

  useEffect(() => {
    if (!companyId) return;

    const channel = api
      .channel(`sessoes_caixa_${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessoes_caixa',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          buscarSessaoAtiva();
        },
      )
      .subscribe();

    return () => {
      api.removeChannel(channel);
    };
  }, [companyId, buscarSessaoAtiva]);

  // ── Abrir caixa ─────────────────────────────────────────────────────────

  const abrirCaixa = async (valorAbertura: number) => {
    if (!companyId || !user) return { data: null, error: new Error('Não autenticado') };

    const { data, error } = await api
      .from('cash_session')
      .insert({
        company_id: companyId,
        operator_id: user.id,
        operator_name: user.user_metadata?.name ?? user.email ?? null,
        opening_amount: valorAbertura,
        status: 'aberto',
      })
      .select()
      .single();

    if (!error && data) setSessaoAtiva(data as SessaoCaixa);
    return { data, error };
  };

  // ── Registrar sangria ou suprimento ─────────────────────────────────────

  const registrarMovimentacao = async (
    kind: 'sangria' | 'suprimento',
    valor: number,
    motivo: string,
  ) => {
    if (!sessaoAtiva || !user) return { error: new Error('Sem sessão ativa') };

    const { error } = await api
      .from('cash_movement')
      .insert({
        cash_session_id: sessaoAtiva.id,
        company_id: companyId,
        kind,
        valor,
        motivo,
        operator_id: user.id,
        operator_name: user.user_metadata?.name ?? user.email ?? null,
      });

    if (!error) await buscarSessaoAtiva();
    return { error };
  };

  // ── Fechar caixa ────────────────────────────────────────────────────────

  const fecharCaixa = async (
    valorFisicoContado: number,
    observacao: string,
  ): Promise<ResultadoFechamento | { error: Error }> => {
    if (!sessaoAtiva || !companyId) return { error: new Error('Sem sessão ativa') };

    // Busca vendas registradas durante a sessão (entre abertura e agora).
    // Usa final_amount (com desconto) com fallback para valor.
    const agoraIso = new Date().toISOString();
    const { data: vendas } = await api
      .from('sale')
      .select('valor, final_amount, payment_method')
      .eq('company_id', companyId)
      .gte('created_at', sessaoAtiva.opened_at)
      .lte('created_at', agoraIso);

    const normalize = (s?: string | null) =>
      (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const totais = (vendas ?? []).reduce(
      (acc, v) => {
        const valor = Number((v as any).final_amount ?? v.valor ?? 0);
        acc.total += valor;
        const metodo = normalize(v.payment_method);
        if (metodo.includes('dinheiro') || metodo.includes('especie')) acc.dinheiro += valor;
        else if (metodo.includes('debito'))                            acc.debito   += valor;
        else if (metodo.includes('credito'))                           acc.credito  += valor;
        else if (metodo.includes('pix'))                               acc.pix      += valor;
        return acc;
      },
      { total: 0, dinheiro: 0, debito: 0, credito: 0, pix: 0 },
    );

    // Busca sangrias e suprimentos da sessão
    const { data: movs } = await api
      .from('cash_movement')
      .select('kind, valor')
      .eq('cash_session_id', sessaoAtiva.id);

    const totalSangrias = (movs ?? [])
      .filter(m => m.kind === 'sangria')
      .reduce((acc, m) => acc + Number(m.valor), 0);

    const totalSuprimentos = (movs ?? [])
      .filter(m => m.kind === 'suprimento')
      .reduce((acc, m) => acc + Number(m.valor), 0);

    // Valor esperado no caixa físico:
    // abertura + dinheiro recebido + suprimentos − sangrias
    const esperado =
      Number(sessaoAtiva.opening_amount) +
      totais.dinheiro +
      totalSuprimentos -
      totalSangrias;

    const quebra = valorFisicoContado - esperado;

    const nomeUsuario = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Operador';

    const { error } = await api
      .from('cash_session')
      .update({
        status: 'fechado',
        physical_closing_amount: valorFisicoContado,
        total_cash: totais.dinheiro,
        total_debit: totais.debito,
        total_credit: totais.credito,
        total_pix: totais.pix,
        total_sales: totais.total,
        total_withdrawals: totalSangrias,
        total_deposits: totalSuprimentos,
        cash_variance: quebra,
        closing_note: observacao || null,
        closed_at: new Date().toISOString(),
        closed_by_id: user?.id ?? null,
        closed_by_name: nomeUsuario,
      })
      .eq('id', sessaoAtiva.id);

    if (error) return { error: error as unknown as Error };

    setSessaoAtiva(null);
    return { quebra, totais, totalSangrias, totalSuprimentos };
  };

  // ── Efeito inicial ───────────────────────────────────────────────────────

  useEffect(() => {
    if (companyId) buscarSessaoAtiva();
  }, [companyId, buscarSessaoAtiva]);

  return {
    sessaoAtiva,
    loading,
    abrirCaixa,
    fecharCaixa,
    registrarMovimentacao,
    buscarSessaoAtiva,
  };
}
