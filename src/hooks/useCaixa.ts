import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';
import { useAuth } from './useAuth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SessaoCaixa {
  id: string;
  company_id: string;
  operador_id: string;
  operador_nome: string | null;
  fechado_por_id: string | null;
  fechado_por_nome: string | null;
  status: 'aberto' | 'fechado';
  valor_abertura: number;
  valor_fechamento_fisico: number | null;
  total_dinheiro: number;
  total_debito: number;
  total_credito: number;
  total_pix: number;
  total_vendas: number;
  total_sangrias: number;
  total_suprimentos: number;
  quebra_caixa: number | null;
  observacao_fechamento: string | null;
  aberto_em: string;
  fechado_em: string | null;
  created_at: string;
}

export interface MovimentacaoCaixa {
  id: string;
  sessao_id: string;
  company_id: string;
  kind: 'sangria' | 'suprimento';
  valor: number;
  motivo: string | null;
  operador_id: string;
  operador_nome: string | null;
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
          filter: `empresa_id=eq.${companyId}`,
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
        operador_id: user.id,
        operador_nome: user.user_metadata?.name ?? user.email ?? null,
        valor_abertura: valorAbertura,
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
        sessao_id: sessaoAtiva.id,
        company_id: companyId,
        kind,
        valor,
        motivo,
        operador_id: user.id,
        operador_nome: user.user_metadata?.name ?? user.email ?? null,
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
    // Usa valor_final (com desconto) com fallback para valor.
    const agoraIso = new Date().toISOString();
    const { data: vendas } = await api
      .from('sale')
      .select('valor, valor_final, metodo_pagamento')
      .eq('company_id', companyId)
      .gte('created_at', sessaoAtiva.aberto_em)
      .lte('created_at', agoraIso);

    const normalize = (s?: string | null) =>
      (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const totais = (vendas ?? []).reduce(
      (acc, v) => {
        const valor = Number((v as any).valor_final ?? v.valor ?? 0);
        acc.total += valor;
        const metodo = normalize(v.metodo_pagamento);
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
      Number(sessaoAtiva.valor_abertura) +
      totais.dinheiro +
      totalSuprimentos -
      totalSangrias;

    const quebra = valorFisicoContado - esperado;

    const nomeUsuario = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Operador';

    const { error } = await api
      .from('cash_session')
      .update({
        status: 'fechado',
        valor_fechamento_fisico: valorFisicoContado,
        total_dinheiro: totais.dinheiro,
        total_debito: totais.debito,
        total_credito: totais.credito,
        total_pix: totais.pix,
        total_vendas: totais.total,
        total_sangrias: totalSangrias,
        total_suprimentos: totalSuprimentos,
        quebra_caixa: quebra,
        observacao_fechamento: observacao || null,
        fechado_em: new Date().toISOString(),
        fechado_por_id: user?.id ?? null,
        fechado_por_nome: nomeUsuario,
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
