import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Wallet, TrendingUp, TrendingDown,
  ArrowDownCircle, ArrowUpCircle, Plus, ShoppingBag,
  Scale, Banknote, LockKeyhole, Unlock, Lock,
  ArrowDown, ArrowUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCaixa } from '@/hooks/useCaixa';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { NovaVendaDialog } from '@/components/vendas/NovaVendaDialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface VendaDia {
  id: string;
  created_at: string;
  valor: number;
  metodo_pagamento: string | null;
  cliente_nome: string | null;
}

interface TotaisVendas {
  total: number;
  dinheiro: number;
  debito: number;
  credito: number;
  pix: number;
}

interface MovimentacaoDia {
  id: string;
  tipo: 'sangria' | 'suprimento';
  valor: number;
  motivo: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtHora = (iso: string) =>
  format(new Date(iso), 'HH:mm', { locale: ptBR });

const normalizaMetodo = (m: string | null): keyof TotaisVendas | null => {
  const s = (m ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (s.includes('dinheiro') || s.includes('especie')) return 'dinheiro';
  if (s.includes('debito')) return 'debito';
  if (s.includes('credito')) return 'credito';
  if (s.includes('pix')) return 'pix';
  return null;
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 20,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  border: '1px solid rgba(142,95,207,0.2)',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.6)',
  outline: 'none',
  fontFamily: 'Gilroy',
  color: '#1F2937',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 4,
  fontFamily: 'Gilroy',
};

const pageBg: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
  position: 'relative',
};

function PageOrbs() {
  return (
    <>
      <div style={{
        position: 'fixed', top: '-200px', left: '-200px',
        width: 600, height: 600, borderRadius: '50%',
        background: '#8E5FCF', opacity: 0.06,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-150px', right: '-150px',
        width: 400, height: 400, borderRadius: '50%',
        background: '#FAF66B', opacity: 0.04,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
    </>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function Caixa() {
  const { sessaoAtiva, loading, abrirCaixa, fecharCaixa, registrarMovimentacao } = useCaixa();
  const { empresaId } = useEmpresa();
  const { toast } = useToast();

  const [valorAbertura, setValorAbertura] = useState('');
  const [abrindo, setAbrindo] = useState(false);

  const [vendas, setVendas] = useState<VendaDia[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoDia[]>([]);
  const [loadingDados, setLoadingDados] = useState(false);

  const [modalMov, setModalMov] = useState<'sangria' | 'suprimento' | null>(null);
  const [valorMov, setValorMov] = useState('');
  const [motivoMov, setMotivoMov] = useState('');
  const [salvandoMov, setSalvandoMov] = useState(false);

  const [modalFechar, setModalFechar] = useState(false);
  const [valorFisico, setValorFisico] = useState('');
  const [obsFechar, setObsFechar] = useState('');
  const [fechando, setFechando] = useState(false);

  const [modalVenda, setModalVenda] = useState(false);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ── Busca dados do dia ──────────────────────────────────────────────────────

  const buscarDados = useCallback(async () => {
    if (!sessaoAtiva || !empresaId) return;
    setLoadingDados(true);

    const [{ data: vendasData }, { data: movsData }] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, created_at, valor, metodo_pagamento, cliente_nome')
        .eq('empresa_id', empresaId)
        .gte('created_at', sessaoAtiva.aberto_em)
        .order('created_at', { ascending: false }),
      supabase
        .from('movimentacoes_caixa')
        .select('id, tipo, valor, motivo, created_at')
        .eq('sessao_id', sessaoAtiva.id)
        .order('created_at', { ascending: false }),
    ]);

    setVendas((vendasData ?? []) as VendaDia[]);
    setMovimentacoes((movsData ?? []) as MovimentacaoDia[]);
    setLoadingDados(false);
  }, [sessaoAtiva, empresaId]);

  useEffect(() => {
    if (sessaoAtiva) buscarDados();
    else { setVendas([]); setMovimentacoes([]); }
  }, [sessaoAtiva, buscarDados]);

  const handleVendaSalva = useCallback(() => {
    buscarDados();
  }, [buscarDados]);

  // ── Totais calculados ────────────────────────────────────────────────────────

  const totais: TotaisVendas = vendas.reduce(
    (acc, v) => {
      const valor = Number(v.valor ?? 0);
      acc.total += valor;
      const key = normalizaMetodo(v.metodo_pagamento);
      if (key && key !== 'total') acc[key] += valor;
      return acc;
    },
    { total: 0, dinheiro: 0, debito: 0, credito: 0, pix: 0 },
  );

  const totalSangrias = movimentacoes
    .filter(m => m.tipo === 'sangria')
    .reduce((acc, m) => acc + Number(m.valor), 0);

  const totalSuprimentos = movimentacoes
    .filter(m => m.tipo === 'suprimento')
    .reduce((acc, m) => acc + Number(m.valor), 0);

  const saldoEstimado =
    Number(sessaoAtiva?.valor_abertura ?? 0) +
    totais.dinheiro +
    totalSuprimentos -
    totalSangrias;

  const valorEsperado = saldoEstimado;
  // Converte string formatada em pt-BR ("2.800,00") para number (2800).
  // Importante: remover separadores de milhar (.) antes de trocar a vírgula por ponto,
  // senão "2.800,00" vira "2.800.00" e parseFloat retorna 2.8.
  const parseBRL = (v: string) => parseFloat((v || '').replace(/\./g, '').replace(',', '.')) || 0;
  const valorFisicoNum = parseBRL(valorFisico);
  const diferenca = valorFisicoNum - valorEsperado;

  const maxVendas = totais.total || 1;

  // ── Ações ────────────────────────────────────────────────────────────────────

  const handleAbrirCaixa = async () => {
    const valor = parseBRL(valorAbertura);
    setAbrindo(true);
    const { error } = await abrirCaixa(valor);
    setAbrindo(false);
    if (error) {
      toast({ title: 'Erro ao abrir caixa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Caixa aberto com sucesso!' });
      setValorAbertura('');
    }
  };

  const handleRegistrarMov = async () => {
    if (!modalMov) return;
    const valor = parseBRL(valorMov);
    if (!valor || valor <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    setSalvandoMov(true);
    const { error } = await registrarMovimentacao(modalMov, valor, motivoMov);
    setSalvandoMov(false);
    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${modalMov === 'sangria' ? 'Sangria' : 'Suprimento'} registrado!` });
      setModalMov(null);
      setValorMov('');
      setMotivoMov('');
      buscarDados();
    }
  };

  const handleFecharCaixa = async () => {
    if (!valorFisico) {
      toast({ title: 'Informe o valor contado na gaveta', variant: 'destructive' });
      return;
    }
    setFechando(true);
    const resultado = await fecharCaixa(valorFisicoNum, obsFechar);
    setFechando(false);
    if ('error' in resultado) {
      toast({ title: 'Erro ao fechar caixa', description: resultado.error.message, variant: 'destructive' });
    } else {
      const quebraStr = resultado.quebra >= 0
        ? `+${fmtBRL(resultado.quebra)}`
        : fmtBRL(resultado.quebra);
      toast({
        title: 'Caixa fechado!',
        description: `Total vendas: ${fmtBRL(resultado.totais.total)} | Quebra: ${quebraStr}`,
      });
      setModalFechar(false);
      setValorFisico('');
      setObsFechar('');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Loading
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PageOrbs />
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(142,95,207,0.2)', borderTopColor: '#8E5FCF', animation: 'spin 0.8s linear infinite', position: 'relative', zIndex: 1 }} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Caixa Fechado
  // ─────────────────────────────────────────────────────────────────────────────

  if (!sessaoAtiva) {
    return (
      <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <PageOrbs />
        <div style={{ ...glassCard, width: '100%', maxWidth: 440, padding: 40, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(107,114,128,0.15), rgba(107,114,128,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LockKeyhole style={{ width: 36, height: 36, color: '#6B7280' }} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 8px' }}>
            Caixa Fechado
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 28 }}>
            Abra o caixa para começar as vendas
          </p>

          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            <label style={labelStyle}>Valor inicial (troco em caixa)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={valorAbertura}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                const num = parseInt(digits || '0', 10) / 100;
                setValorAbertura(num ? num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
              }}
              onKeyDown={e => e.key === 'Enter' && handleAbrirCaixa()}
              style={{
                ...inputStyle,
                fontSize: '1.5rem', fontWeight: 800, textAlign: 'center',
                padding: 16,
                background: 'rgba(16,185,129,0.04)',
                border: '2px solid rgba(16,185,129,0.2)',
                borderRadius: 16, color: '#10B981',
              }}
              onFocus={e => { e.target.style.borderColor = '#10B981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(16,185,129,0.2)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            onClick={handleAbrirCaixa}
            disabled={abrindo}
            style={{
              width: '100%', padding: '14px 32px', fontSize: '1rem', fontWeight: 700,
              fontFamily: 'Gilroy', borderRadius: 14, border: 'none', cursor: abrindo ? 'not-allowed' : 'pointer',
              background: abrindo ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', boxShadow: abrindo ? 'none' : '0 4px 15px rgba(16,185,129,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!abrindo) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {abrindo ? 'Abrindo...' : 'Abrir Caixa'}
          </button>

          <Link
            to="/caixa/historico"
            style={{ display: 'block', marginTop: 20, fontSize: '0.875rem', color: '#8E5FCF', fontFamily: 'Gilroy', textDecoration: 'none' }}
          >
            Ver histórico de fechamentos →
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — Caixa Aberto
  // ─────────────────────────────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: 'Vendas no Caixa',
      value: fmtBRL(totais.total),
      sub: `${vendas.length} venda${vendas.length !== 1 ? 's' : ''} realizadas`,
      accentGradient: 'linear-gradient(90deg, #8E5FCF, #B987FF)',
      valueColor: '#8E5FCF',
      icon: <ShoppingBag style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #8E5FCF, #47118F)',
    },
    {
      label: 'Sangrias',
      value: fmtBRL(totalSangrias),
      sub: `${movimentacoes.filter(m => m.tipo === 'sangria').length} retirada${movimentacoes.filter(m => m.tipo === 'sangria').length !== 1 ? 's' : ''}`,
      accentGradient: 'linear-gradient(90deg, #EF4444, #FCA5A5)',
      valueColor: '#EF4444',
      icon: <ArrowDownCircle style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #EF4444, #DC2626)',
    },
    {
      label: 'Suprimentos',
      value: fmtBRL(totalSuprimentos),
      sub: `${movimentacoes.filter(m => m.tipo === 'suprimento').length} suprimento${movimentacoes.filter(m => m.tipo === 'suprimento').length !== 1 ? 's' : ''}`,
      accentGradient: 'linear-gradient(90deg, #10B981, #6EE7B7)',
      valueColor: '#10B981',
      icon: <ArrowUpCircle style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #10B981, #059669)',
    },
    {
      label: 'Quebra de Caixa',
      value: fmtBRL(0),
      sub: 'disponível no fechamento',
      accentGradient: 'linear-gradient(90deg, #F59E0B, #FCD34D)',
      valueColor: '#F59E0B',
      icon: <Scale style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #F59E0B, #D97706)',
    },
  ];

  const allMovimentos = [
    ...vendas.map(v => ({
      id: v.id,
      tipo: 'venda' as const,
      descricao: v.cliente_nome ? `${v.cliente_nome}` : 'Venda',
      sub: v.metodo_pagamento ?? '—',
      valor: Number(v.valor),
      hora: fmtHora(v.created_at),
      entrada: true,
    })),
    ...movimentacoes.map(m => ({
      id: m.id,
      tipo: m.tipo,
      descricao: m.tipo === 'sangria' ? 'Sangria' : 'Suprimento',
      sub: m.motivo || '—',
      valor: Number(m.valor),
      hora: fmtHora(m.created_at),
      entrada: m.tipo === 'suprimento',
    })),
  ].sort((a, b) => b.hora.localeCompare(a.hora));

  return (
    <div style={pageBg}>
      <PageOrbs />
      <div style={{ padding: '32px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 6 }}>
              Oasis › Caixa
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.2, margin: 0,
            }}>
              Controle de Caixa
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: 4 }}>
              Abertura, movimentações e fechamento do caixa
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setModalMov('sangria')}
              style={{
                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(245,158,11,0.3)', color: '#D97706',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#D97706'; }}
            >
              <ArrowDown style={{ width: 14, height: 14 }} /> Sangria
            </button>
            <button
              onClick={() => setModalMov('suprimento')}
              style={{
                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(16,185,129,0.3)', color: '#059669',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#059669'; }}
            >
              <ArrowUp style={{ width: 14, height: 14 }} /> Suprimento
            </button>
            <button
              onClick={() => setModalVenda(true)}
              style={{
                padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: '#fff',
                border: 'none', boxShadow: '0 4px 15px rgba(142,95,207,0.35)',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Plus style={{ width: 16, height: 16 }} /> Nova Venda
            </button>
            <button
              onClick={() => setModalFechar(true)}
              style={{
                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#EF4444'; }}
            >
              <Lock style={{ width: 14, height: 14 }} /> Fechar Caixa
            </button>
          </div>
        </div>

        {/* ── Status Card (Caixa Aberto) ── */}
        <div style={{ ...glassCard, padding: 32, marginBottom: 24 }}>
          {/* Badge */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,0.1)', color: '#10B981',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 20, padding: '6px 16px',
              fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#10B981',
                animation: 'pulse 2s infinite',
                display: 'inline-block',
              }} />
              Caixa Aberto
            </span>
          </div>

          {/* Métricas 3 colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
            {[
              {
                icon: <Wallet style={{ width: 20, height: 20, color: '#3B82F6' }} />,
                iconBg: 'rgba(59,130,246,0.1)',
                value: fmtBRL(Number(sessaoAtiva.valor_abertura)),
                label: 'troco inicial',
                color: '#1F2937',
              },
              {
                icon: <TrendingUp style={{ width: 20, height: 20, color: '#10B981' }} />,
                iconBg: 'rgba(16,185,129,0.1)',
                value: fmtBRL(totais.total),
                label: `total vendido (${vendas.length} venda${vendas.length !== 1 ? 's' : ''})`,
                color: '#10B981',
              },
              {
                icon: <TrendingDown style={{ width: 20, height: 20, color: '#EF4444' }} />,
                iconBg: 'rgba(239,68,68,0.1)',
                value: fmtBRL(totalSangrias - totalSuprimentos > 0 ? totalSangrias : totalSangrias),
                label: `sangrias (suprimentos: ${fmtBRL(totalSuprimentos)})`,
                color: '#EF4444',
              },
            ].map((m, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(142,95,207,0.08)',
                borderRadius: 16, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.icon}
                </div>
                <div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Gilroy', color: m.color, margin: 0 }}>{m.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0 }}>{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Saldo em dinheiro (gaveta) */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 6 }}>
              Dinheiro Esperado na Gaveta
            </p>
            <p style={{
              fontSize: '3rem', fontWeight: 800, fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.1, margin: 0,
            }}>
              {fmtBRL(saldoEstimado)}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: 8, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              Abertura {fmtBRL(Number(sessaoAtiva.valor_abertura))} + Vendas em Dinheiro {fmtBRL(totais.dinheiro)} + Suprimentos {fmtBRL(totalSuprimentos)} − Sangrias {fmtBRL(totalSangrias)}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginTop: 6 }}>
              Aberto em {new Date(sessaoAtiva.aberto_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {fmtHora(sessaoAtiva.aberto_em)}
              {sessaoAtiva.operador_nome ? ` — ${sessaoAtiva.operador_nome}` : ''}
            </p>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}
          className="grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card, idx) => (
            <div
              key={idx}
              style={{
                ...glassCard,
                padding: 24,
                boxShadow: hoveredKpi === idx ? '0 16px 48px rgba(71,17,143,0.14)' : '0 8px 32px rgba(71,17,143,0.08)',
                transform: hoveredKpi === idx ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={() => setHoveredKpi(idx)}
              onMouseLeave={() => setHoveredKpi(null)}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: card.accentGradient, borderRadius: '20px 20px 0 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                  {card.label}
                </p>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy', lineHeight: 1.2, marginBottom: 4 }}>
                {card.value}
              </p>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Vendas de Hoje (full width, destaque) ── */}
        <div style={{ ...glassCard, overflow: 'hidden', marginBottom: 20, boxShadow: '0 12px 40px rgba(71,17,143,0.10)' }}>
          <div style={{
            padding: '24px 28px 20px',
            background: 'linear-gradient(135deg, rgba(142,95,207,0.12), rgba(71,17,143,0.06))',
            borderBottom: '1px solid rgba(142,95,207,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(142,95,207,0.35)',
              }}>
                <ShoppingBag style={{ width: 22, height: 22, color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'Gilroy', color: '#1F2937', margin: 0, lineHeight: 1.2 }}>
                  Vendas de Hoje
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', margin: '4px 0 0' }}>
                  Movimentações da sessão atual em tempo real
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0 }}>
                  Total vendido
                </p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Gilroy', margin: '2px 0 0',
                  background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {fmtBRL(totais.total)}
                </p>
              </div>
              <span style={{
                background: 'rgba(142,95,207,0.12)', border: '1px solid rgba(142,95,207,0.25)',
                color: '#8E5FCF', borderRadius: 20, padding: '4px 14px',
                fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem',
              }}>
                {allMovimentos.length}
              </span>
            </div>
          </div>

          {/* Cabeçalho tabela */}
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1.2fr 2fr auto auto',
            gap: 12, padding: '12px 28px',
            background: 'linear-gradient(135deg, rgba(142,95,207,0.05), rgba(71,17,143,0.02))',
            borderBottom: '1px solid rgba(142,95,207,0.06)',
          }}>
            {['', 'Tipo', 'Descrição', 'Hora', 'Valor'].map((h, i) => (
              <span key={i} style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                {h}
              </span>
            ))}
          </div>

          {allMovimentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22, margin: '0 auto 14px',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Banknote style={{ width: 32, height: 32, color: '#8E5FCF' }} />
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', marginBottom: 4 }}>
                Nenhuma venda hoje
              </p>
              <p style={{ fontSize: '0.825rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                As vendas aparecerão aqui assim que forem realizadas
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {allMovimentos.map(m => {
                const isHovered = hoveredRow === m.id;
                const iconMap: Record<string, React.ReactNode> = {
                  venda:      <ShoppingBag style={{ width: 14, height: 14, color: '#10B981' }} />,
                  sangria:    <ArrowDown style={{ width: 14, height: 14, color: '#EF4444' }} />,
                  suprimento: <ArrowUp style={{ width: 14, height: 14, color: '#10B981' }} />,
                };
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '32px 1.2fr 2fr auto auto',
                      gap: 12, padding: '14px 28px', alignItems: 'center',
                      borderBottom: '1px solid rgba(142,95,207,0.06)',
                      background: isHovered ? 'rgba(142,95,207,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                    onMouseEnter={() => setHoveredRow(m.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.entrada ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', flexShrink: 0 }}>
                      {iconMap[m.tipo]}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Gilroy', color: '#1F2937' }}>
                      {m.descricao}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.sub}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', whiteSpace: 'nowrap' }}>
                      {m.hora}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'Gilroy', whiteSpace: 'nowrap', color: m.entrada ? '#10B981' : '#EF4444' }}>
                      {m.entrada ? '+' : '-'}{fmtBRL(m.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Vendas por Pagamento (full width, abaixo) ── */}
        <div style={{ ...glassCard, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
              Vendas por Pagamento
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
              Distribuição do total vendido por método
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { label: 'Dinheiro', valor: totais.dinheiro, color: '#8E5FCF', emoji: '💵' },
              { label: 'Débito',   valor: totais.debito,   color: '#3B82F6', emoji: '💳' },
              { label: 'Crédito',  valor: totais.credito,  color: '#10B981', emoji: '💳' },
              { label: 'Pix',      valor: totais.pix,      color: '#F59E0B', emoji: '📱' },
            ].map(({ label, valor, color, emoji }) => {
              const pct = totais.total > 0 ? (valor / totais.total) * 100 : 0;
              return (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(142,95,207,0.08)',
                  borderRadius: 14, padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.85rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600 }}>{emoji} {label}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1F2937', fontFamily: 'Gilroy', margin: '0 0 8px' }}>
                    {fmtBRL(valor)}
                  </p>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(142,95,207,0.08)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modal Sangria / Suprimento ── */}
      <Dialog open={!!modalMov} onOpenChange={open => !open && setModalMov(null)}>
        <DialogContent
          className="sm:max-w-sm p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(142,95,207,0.1)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: modalMov === 'sangria' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            }}>
              {modalMov === 'sangria'
                ? <ArrowDown style={{ width: 18, height: 18, color: '#EF4444' }} />
                : <ArrowUp style={{ width: 18, height: 18, color: '#10B981' }} />
              }
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
              {modalMov === 'sangria' ? 'Registrar Sangria' : 'Registrar Suprimento'}
            </h2>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={valorMov}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const num = parseInt(digits || '0', 10) / 100;
                  setValorMov(num ? num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
                }}
                autoFocus
                style={{
                  ...inputStyle,
                  fontSize: '2rem', fontWeight: 800, textAlign: 'center', padding: 16,
                  background: modalMov === 'sangria' ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.04)',
                  border: `2px solid ${modalMov === 'sangria' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  borderRadius: 16,
                  color: modalMov === 'sangria' ? '#EF4444' : '#10B981',
                }}
                onFocus={e => {
                  const c = modalMov === 'sangria' ? '#EF4444' : '#10B981';
                  const cAlpha = modalMov === 'sangria' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)';
                  e.target.style.borderColor = c;
                  e.target.style.boxShadow = `0 0 0 3px ${cAlpha}`;
                }}
                onBlur={e => { e.target.style.borderColor = modalMov === 'sangria' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Motivo</label>
              <input
                placeholder="Descreva o motivo..."
                value={motivoMov}
                onChange={e => setMotivoMov(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegistrarMov()}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => setModalMov(null)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Cancelar</button>
            <button
              onClick={handleRegistrarMov}
              disabled={salvandoMov}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none',
                background: salvandoMov ? 'rgba(0,0,0,0.2)' : modalMov === 'sangria' ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', cursor: salvandoMov ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy',
              }}
            >{salvandoMov ? 'Salvando...' : 'Confirmar'}</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Fechar Caixa ── */}
      <Dialog open={modalFechar} onOpenChange={open => !open && setModalFechar(false)}>
        <DialogContent
          className="sm:max-w-md p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock style={{ width: 18, height: 18, color: '#EF4444' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>Fechar Caixa</h2>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Resumo em grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Saldo Inicial', value: fmtBRL(Number(sessaoAtiva.valor_abertura)), color: '#3B82F6' },
                { label: 'Entradas',      value: fmtBRL(totais.total + totalSuprimentos),  color: '#10B981' },
                { label: 'Saídas',        value: fmtBRL(totalSangrias),                    color: '#EF4444' },
                { label: 'Saldo Esperado',value: fmtBRL(valorEsperado),                    color: '#8E5FCF' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.1)', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Gilroy', color, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Detalhes de vendas */}
            <div style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.1)', borderRadius: 12, padding: '12px 14px' }}>
              {[
                { label: 'Dinheiro',      valor: totais.dinheiro },
                { label: 'Débito',        valor: totais.debito },
                { label: 'Crédito',       valor: totais.credito },
                { label: 'Pix',           valor: totais.pix },
                { label: 'Sangrias',      valor: totalSangrias },
                { label: 'Suprimentos',   valor: totalSuprimentos },
              ].map(({ label, valor }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', fontFamily: 'Gilroy', borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
                  <span style={{ color: '#6B7280' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{fmtBRL(valor)}</span>
                </div>
              ))}
            </div>

            {/* Input valor físico */}
            <div>
              <label style={labelStyle}>Valor em dinheiro contado na gaveta (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={valorFisico}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const num = parseInt(digits || '0', 10) / 100;
                  setValorFisico(num ? num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
                }}
                autoFocus
                style={{
                  ...inputStyle,
                  fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', padding: 16,
                  background: 'rgba(142,95,207,0.04)',
                  border: '2px solid rgba(142,95,207,0.2)',
                  borderRadius: 16, color: '#8E5FCF',
                }}
                onFocus={e => { e.target.style.borderColor = '#8E5FCF'; e.target.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(142,95,207,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Quebra em tempo real */}
            {valorFisico && (
              <div style={{
                padding: 16, borderRadius: 14, transition: 'all 0.3s',
                background: diferenca === 0 ? 'rgba(16,185,129,0.08)' : diferenca > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${diferenca === 0 ? 'rgba(16,185,129,0.2)' : diferenca > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <p style={{
                  fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Gilroy', textAlign: 'center', margin: 0,
                  color: diferenca === 0 ? '#10B981' : diferenca > 0 ? '#10B981' : '#EF4444',
                }}>
                  {diferenca === 0
                    ? 'Caixa conferido ✓'
                    : diferenca > 0
                      ? `Sobra de ${fmtBRL(diferenca)}`
                      : `Falta de ${fmtBRL(Math.abs(diferenca))}`
                  }
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', textAlign: 'center', marginTop: 4 }}>
                  Esperado: {fmtBRL(valorEsperado)} · Contado: {fmtBRL(valorFisicoNum)}
                </p>
              </div>
            )}

            {/* Observações */}
            <div>
              <label style={labelStyle}>Observações (opcional)</label>
              <Textarea
                placeholder="Alguma observação sobre o fechamento..."
                value={obsFechar}
                onChange={e => setObsFechar(e.target.value)}
                style={{ ...inputStyle, resize: 'none', minHeight: 60 }}
                rows={2}
              />
            </div>
          </div>

          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => setModalFechar(false)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Cancelar</button>
            <button
              onClick={handleFecharCaixa}
              disabled={fechando}
              style={{
                padding: '14px 24px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none',
                background: fechando ? 'rgba(239,68,68,0.4)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#fff', cursor: fechando ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy',
                width: '100%',
              }}
            >{fechando ? 'Fechando...' : 'Confirmar Fechamento'}</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Nova Venda ── */}
      <NovaVendaDialog
        open={modalVenda}
        onOpenChange={setModalVenda}
        onVendaSalva={handleVendaSalva}
        dataFixaHoje
      />
    </div>
  );
}
