import { useState, useEffect, useCallback } from 'react';
import { parseMaskedValue, formatMaskedValueAlways } from '@/utils/currencyMask';
import {
  Eye, Download, TrendingUp, Scale, Banknote, Pencil, Save,
  CalendarIcon, Archive, BarChart2, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useUserRole } from '@/hooks/useUserRole';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RelatorioCaixa, type DadosRelatorio, type MovimentacaoRelatorio } from '@/components/caixa/RelatorioCaixa';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SessaoFechada extends DadosRelatorio {
  company_id: string;
  status: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDataHora = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });

const fmtData = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });

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
  padding: '8px 12px',
  fontSize: 13,
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function HistoricoCaixa() {
  const { companyId, empresaAtiva } = useEmpresa();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));

  const [sessoes, setSessoes] = useState<SessaoFechada[]>([]);
  const [loading, setLoading] = useState(true);

  const [sessaoSelecionada, setSessaoSelecionada] = useState<DadosRelatorio | null>(null);
  const [loadingMovs, setLoadingMovs] = useState(false);

  const [editando, setEditando] = useState<SessaoFechada | null>(null);
  const [editForm, setEditForm] = useState({
    valor_abertura: 0,
    valor_fechamento_fisico: 0,
    total_dinheiro: 0,
    total_debito: 0,
    total_credito: 0,
    total_pix: 0,
    total_sangrias: 0,
    total_suprimentos: 0,
    observacao_fechamento: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ── Busca sessões fechadas ────────────────────────────────────────────────

  const buscarSessoes = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const inicioISO = new Date(dataInicio + 'T00:00:00').toISOString();
    const fimISO    = new Date(dataFim   + 'T23:59:59').toISOString();

    const { data } = await api
      .from('cash_session')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'fechado')
      .gte('opened_at', inicioISO)
      .lte('opened_at', fimISO)
      .order('opened_at', { ascending: false });

    setSessoes((data ?? []) as SessaoFechada[]);
    setLoading(false);
  }, [companyId, dataInicio, dataFim]);

  useEffect(() => {
    buscarSessoes();
  }, [buscarSessoes]);

  // ── Ver relatório completo ────────────────────────────────────────────────

  const verRelatorio = async (sessao: SessaoFechada) => {
    setLoadingMovs(true);
    setSessaoSelecionada({ ...sessao, movimentacoes: [] });

    const [{ data: movs }, { data: vendas }] = await Promise.all([
      api
        .from('cash_movement')
        .select('id, kind, valor, motivo, created_at')
        .eq('cash_session_id', sessao.id)
        .order('created_at', { ascending: true }),
      api
        .from('sale')
        .select('valor, metodo_pagamento')
        .eq('company_id', sessao.empresa_id)
        .gte('created_at', sessao.aberto_em)
        .lte('created_at', sessao.fechado_em ?? new Date().toISOString()),
    ]);

    const normalize = (s?: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const totais = (vendas ?? []).reduce(
      (acc, v) => {
        const valor = Number(v.valor ?? 0);
        const metodo = normalize(v.metodo_pagamento);
        if (metodo.includes('dinheiro'))       acc.dinheiro += valor;
        else if (metodo.includes('debito'))    acc.debito += valor;
        else if (metodo.includes('credito'))   acc.credito += valor;
        else if (metodo.includes('pix'))       acc.pix += valor;
        return acc;
      },
      { dinheiro: 0, debito: 0, credito: 0, pix: 0 },
    );

    setSessaoSelecionada({
      ...sessao,
      total_dinheiro: totais.dinheiro,
      total_debito: totais.debito,
      total_credito: totais.credito,
      total_pix: totais.pix,
      movimentacoes: (movs ?? []) as MovimentacaoRelatorio[],
    });
    setLoadingMovs(false);
  };

  // ── Abrir edição ──────────────────────────────────────────────────────────

  const abrirEdicao = (sessao: SessaoFechada) => {
    setEditando(sessao);
    setEditForm({
      valor_abertura: Number(sessao.valor_abertura),
      valor_fechamento_fisico: Number(sessao.valor_fechamento_fisico ?? 0),
      total_dinheiro: Number(sessao.total_dinheiro),
      total_debito: Number(sessao.total_debito),
      total_credito: Number(sessao.total_credito),
      total_pix: Number(sessao.total_pix),
      total_sangrias: Number(sessao.total_sangrias),
      total_suprimentos: Number(sessao.total_suprimentos),
      observacao_fechamento: sessao.observacao_fechamento ?? '',
    });
  };

  // ── Salvar edição ─────────────────────────────────────────────────────────

  const salvarEdicao = async () => {
    if (!editando) return;
    setSalvando(true);

    const esperado =
      editForm.valor_abertura +
      editForm.total_dinheiro +
      editForm.total_suprimentos -
      editForm.total_sangrias;

    const quebra = editForm.valor_fechamento_fisico - esperado;
    const totalVendas =
      editForm.total_dinheiro +
      editForm.total_debito +
      editForm.total_credito +
      editForm.total_pix;

    const { error } = await api
      .from('cash_session')
      .update({
        valor_abertura: editForm.valor_abertura,
        valor_fechamento_fisico: editForm.valor_fechamento_fisico,
        total_dinheiro: editForm.total_dinheiro,
        total_debito: editForm.total_debito,
        total_credito: editForm.total_credito,
        total_pix: editForm.total_pix,
        total_sangrias: editForm.total_sangrias,
        total_suprimentos: editForm.total_suprimentos,
        total_vendas: totalVendas,
        quebra_caixa: quebra,
        observacao_fechamento: editForm.observacao_fechamento || null,
      })
      .eq('id', editando.id);

    setSalvando(false);

    if (error) {
      toast.error('Erro ao salvar alterações');
      console.error(error);
      return;
    }

    toast.success('Caixa atualizado com sucesso');
    setEditando(null);
    buscarSessoes();
  };

  // ── Exportar CSV ─────────────────────────────────────────────────────────

  const exportarCSV = () => {
    const header = [
      'Data Abertura', 'Hora Abertura', 'Data Fechamento', 'Hora Fechamento',
      'Operadora', 'Troco Inicial', 'Total Vendas', 'Dinheiro', 'Débito',
      'Crédito', 'Pix', 'Total Sangrias', 'Total Suprimentos', 'Valor Contado', 'Quebra de Caixa',
    ].join(';');

    const linhas = sessoes.map(s => [
      fmtData(s.aberto_em),
      format(new Date(s.aberto_em), 'HH:mm'),
      s.fechado_em ? fmtData(s.fechado_em) : '',
      s.fechado_em ? format(new Date(s.fechado_em), 'HH:mm') : '',
      s.operador_nome ?? '',
      String(s.valor_abertura).replace('.', ','),
      String(s.total_vendas).replace('.', ','),
      String(s.total_dinheiro).replace('.', ','),
      String(s.total_debito).replace('.', ','),
      String(s.total_credito).replace('.', ','),
      String(s.total_pix).replace('.', ','),
      String(s.total_sangrias).replace('.', ','),
      String(s.total_suprimentos).replace('.', ','),
      String(s.valor_fechamento_fisico ?? '').replace('.', ','),
      String(s.quebra_caixa ?? '').replace('.', ','),
    ].join(';'));

    const csv = [header, ...linhas].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `historico-caixa-${dataInicio}-${dataFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Totais do período ─────────────────────────────────────────────────────

  const totalFechamentos = sessoes.length;
  const totalVendasPeriodo = sessoes.reduce((acc, s) => acc + Number(s.total_vendas), 0);
  const mediaVendasDia = totalFechamentos > 0 ? totalVendasPeriodo / totalFechamentos : 0;
  const totalQuebras = sessoes.reduce((acc, s) => acc + Number(s.quebra_caixa ?? 0), 0);
  const totalDivergencias = sessoes.filter(s => Number(s.quebra_caixa ?? 0) !== 0).length;

  // ── Helpers edição ────────────────────────────────────────────────────────

  const editEsperado =
    editForm.valor_abertura +
    editForm.total_dinheiro +
    editForm.total_suprimentos -
    editForm.total_sangrias;
  const editQuebra = editForm.valor_fechamento_fisico - editEsperado;

  // ── KPI cards ─────────────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: 'Total de Sessões',
      value: String(totalFechamentos),
      sub: 'caixas registrados',
      isCurrency: false,
      accentGradient: 'linear-gradient(90deg, #8E5FCF, #B987FF)',
      valueColor: '#8E5FCF',
      icon: <Archive style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #8E5FCF, #47118F)',
    },
    {
      label: 'Total Faturado',
      value: fmtBRL(totalVendasPeriodo),
      sub: 'em todas as sessões',
      isCurrency: true,
      accentGradient: 'linear-gradient(90deg, #10B981, #6EE7B7)',
      valueColor: '#10B981',
      icon: <TrendingUp style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #10B981, #059669)',
    },
    {
      label: 'Média por Sessão',
      value: fmtBRL(mediaVendasDia),
      sub: 'faturamento médio',
      isCurrency: true,
      accentGradient: 'linear-gradient(90deg, #3B82F6, #93C5FD)',
      valueColor: '#3B82F6',
      icon: <BarChart2 style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    },
    {
      label: 'Divergências',
      value: String(totalDivergencias),
      sub: 'sessões com quebra',
      isCurrency: false,
      accentGradient: 'linear-gradient(90deg, #EF4444, #FCA5A5)',
      valueColor: '#EF4444',
      icon: <AlertCircle style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #EF4444, #DC2626)',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
      position: 'relative',
    }}>
      {/* Orb roxo */}
      <div style={{
        position: 'fixed', top: '-200px', left: '-200px',
        width: 600, height: 600, borderRadius: '50%',
        background: '#8E5FCF', opacity: 0.06,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      {/* Orb amarelo */}
      <div style={{
        position: 'fixed', bottom: '-150px', right: '-150px',
        width: 400, height: 400, borderRadius: '50%',
        background: '#FAF66B', opacity: 0.04,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />

      <div style={{ padding: '32px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 6 }}>
              Oasis › Histórico de Caixa
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.2, margin: 0,
            }}>
              Histórico de Caixa
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: 4 }}>
              Registro completo de aberturas e fechamentos
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={exportarCSV}
              disabled={sessoes.length === 0}
              style={{
                background: sessoes.length === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(142,95,207,0.3)', color: sessoes.length === 0 ? '#C4B5FD' : '#8E5FCF',
                borderRadius: 12, padding: '10px 18px', cursor: sessoes.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (sessoes.length > 0) { e.currentTarget.style.background = '#8E5FCF'; e.currentTarget.style.color = '#fff'; }}}
              onMouseLeave={e => { if (sessoes.length > 0) { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#8E5FCF'; }}}
            >
              <Download style={{ width: 16, height: 16 }} />
              Exportar CSV
            </button>
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
              <p style={{ fontSize: card.isCurrency ? '1.1rem' : '1.75rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy', lineHeight: 1.2, marginBottom: 4 }}>
                {card.value}
              </p>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros ── */}
        <div style={{ ...glassCard, padding: '16px 20px', marginBottom: 20, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', fontFamily: 'Gilroy', flexShrink: 0 }}>Período:</span>

            {/* Date picker início */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(!dataInicio && 'text-muted-foreground')}
                  style={{
                    ...inputStyle,
                    width: 'auto', padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <CalendarIcon style={{ width: 14, height: 14, color: '#8E5FCF' }} />
                  {dataInicio ? format(parse(dataInicio, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'Início'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataInicio ? parse(dataInicio, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => date && setDataInicio(format(date, 'yyyy-MM-dd'))}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>até</span>

            {/* Date picker fim */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(!dataFim && 'text-muted-foreground')}
                  style={{
                    ...inputStyle,
                    width: 'auto', padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <CalendarIcon style={{ width: 14, height: 14, color: '#8E5FCF' }} />
                  {dataFim ? format(parse(dataFim, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy') : 'Fim'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataFim ? parse(dataFim, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => date && setDataFim(format(date, 'yyyy-MM-dd'))}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
              {sessoes.length} sessão{sessoes.length !== 1 ? 'ões' : ''} encontrada{sessoes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* ── Tabela ── */}
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(142,95,207,0.2)', borderTopColor: '#8E5FCF', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : sessoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Archive style={{ width: 36, height: 36, color: '#8E5FCF' }} />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', marginBottom: 6 }}>
                Nenhuma sessão de caixa encontrada
              </p>
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy', maxWidth: 320, margin: '0 auto' }}>
                O histórico aparecerá após o primeiro fechamento de caixa
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Cabeçalho tabela */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr 80px',
                gap: 0,
                background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))',
                borderBottom: '1px solid rgba(142,95,207,0.08)',
                padding: '12px 20px',
                minWidth: 900,
              }}>
                {['Abertura', 'Operadora', 'Troco Inicial', 'Total Vendas', 'Dinheiro', 'Sangrias', 'Contado', 'Quebra', 'Ações'].map(h => (
                  <span key={h} style={{
                    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: '#9CA3AF', fontFamily: 'Gilroy',
                    textAlign: ['Troco Inicial', 'Total Vendas', 'Dinheiro', 'Sangrias', 'Contado', 'Quebra'].includes(h) ? 'right' : 'left',
                  }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Linhas */}
              {sessoes.map(s => {
                const quebra = Number(s.quebra_caixa ?? 0);
                const isHovered = hoveredRow === s.id;
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr 80px',
                      gap: 0,
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(142,95,207,0.06)',
                      background: isHovered ? 'rgba(142,95,207,0.04)' : 'transparent',
                      transition: 'background 0.15s ease',
                      cursor: 'default',
                      alignItems: 'center',
                      minWidth: 900,
                    }}
                    onMouseEnter={() => setHoveredRow(s.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Abertura */}
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', margin: 0 }}>
                        {fmtData(s.aberto_em)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Gilroy', margin: 0 }}>
                        {format(new Date(s.aberto_em), 'HH:mm')}
                        {s.fechado_em && ` → ${format(new Date(s.fechado_em), 'HH:mm')}`}
                      </p>
                    </div>

                    {/* Operadora */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.operador_nome ? (
                        <>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: 'rgba(142,95,207,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy',
                          }}>
                            {s.operador_nome.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#1F2937', fontFamily: 'Gilroy', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.operador_nome}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>—</span>
                      )}
                    </div>

                    {/* Troco inicial */}
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', textAlign: 'right', margin: 0 }}>
                      {fmtBRL(s.valor_abertura)}
                    </p>

                    {/* Total vendas */}
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', textAlign: 'right', margin: 0 }}>
                      {fmtBRL(s.total_vendas)}
                    </p>

                    {/* Dinheiro */}
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10B981', fontFamily: 'Gilroy', textAlign: 'right', margin: 0 }}>
                      {fmtBRL(s.total_dinheiro)}
                    </p>

                    {/* Sangrias */}
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#EF4444', fontFamily: 'Gilroy', textAlign: 'right', margin: 0 }}>
                      {fmtBRL(s.total_sangrias)}
                    </p>

                    {/* Contado */}
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', textAlign: 'right', margin: 0 }}>
                      {fmtBRL(s.valor_fechamento_fisico)}
                    </p>

                    {/* Quebra */}
                    <p style={{
                      fontSize: '0.875rem', fontWeight: 700, fontFamily: 'Gilroy', textAlign: 'right', margin: 0,
                      color: quebra === 0 ? '#9CA3AF' : quebra > 0 ? '#10B981' : '#EF4444',
                    }}>
                      {quebra === 0 ? fmtBRL(0) : (quebra > 0 ? '+' : '') + fmtBRL(quebra)}
                    </p>

                    {/* Ações */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <button
                        onClick={() => verRelatorio(s)}
                        title="Ver relatório"
                        style={{
                          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                          background: 'rgba(142,95,207,0.08)', border: '1px solid rgba(142,95,207,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#8E5FCF', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#8E5FCF'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; e.currentTarget.style.color = '#8E5FCF'; }}
                      >
                        <Eye style={{ width: 13, height: 13 }} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => abrirEdicao(s)}
                          title="Editar caixa"
                          style={{
                            width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                            background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#6B7280', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#6B7280'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(107,114,128,0.08)'; e.currentTarget.style.color = '#6B7280'; }}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Totais rodapé */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr 80px',
                gap: 0,
                padding: '14px 20px',
                borderTop: '2px solid rgba(142,95,207,0.1)',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.06), rgba(71,17,143,0.03))',
                minWidth: 900,
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy' }}>
                  Total ({totalFechamentos} sessões)
                </span>
                <span />
                <span />
                <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#8E5FCF', fontFamily: 'Gilroy', textAlign: 'right', margin: 0 }}>
                  {fmtBRL(totalVendasPeriodo)}
                </p>
                <span />
                <span />
                <span />
                <p style={{ fontSize: '0.875rem', fontWeight: 800, fontFamily: 'Gilroy', textAlign: 'right', margin: 0, color: totalQuebras === 0 ? '#9CA3AF' : totalQuebras > 0 ? '#10B981' : '#EF4444' }}>
                  {totalQuebras === 0 ? fmtBRL(0) : (totalQuebras > 0 ? '+' : '') + fmtBRL(totalQuebras)}
                </p>
                <span />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Relatório ── */}
      <Dialog open={!!sessaoSelecionada} onOpenChange={open => !open && setSessaoSelecionada(null)}>
        <DialogContent
          className="sm:max-w-xl min-h-[75vh] max-h-[90vh] overflow-y-auto p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
              Relatório de Fechamento
            </h2>
          </div>
          <div style={{ padding: 24 }}>
            {loadingMovs ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(142,95,207,0.2)', borderTopColor: '#8E5FCF', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : sessaoSelecionada ? (
              <RelatorioCaixa
                dados={sessaoSelecionada}
                empresaNome={empresaAtiva?.name ?? 'Empresa'}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal Edição (Admin) ── */}
      <Dialog open={!!editando} onOpenChange={open => !open && setEditando(null)}>
        <DialogContent
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #8E5FCF, #47118F)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Pencil style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>Editar Caixa Fechado</h2>
          </div>

          {editando && (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info */}
              <div style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.1)', borderRadius: 12, padding: '12px 14px', fontSize: '0.8rem', fontFamily: 'Gilroy' }}>
                <p style={{ margin: '0 0 4px', color: '#6B7280' }}>Operador: <span style={{ color: '#1F2937', fontWeight: 600 }}>{editando.operador_nome ?? '—'}</span></p>
                <p style={{ margin: '0 0 4px', color: '#6B7280' }}>Aberto em: <span style={{ color: '#1F2937', fontWeight: 600 }}>{fmtDataHora(editando.aberto_em)}</span></p>
                {editando.fechado_em && (
                  <p style={{ margin: 0, color: '#6B7280' }}>Fechado em: <span style={{ color: '#1F2937', fontWeight: 600 }}>{fmtDataHora(editando.fechado_em)}</span></p>
                )}
              </div>

              {/* Troco inicial */}
              <div>
                <label style={labelStyle}>Troco Inicial (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMaskedValueAlways(editForm.valor_abertura)}
                  onChange={e => setEditForm(f => ({ ...f, valor_abertura: parseMaskedValue(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              {/* Vendas por método */}
              <div>
                <p style={{ ...labelStyle, marginBottom: 10 }}>Vendas por Método</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'total_dinheiro' as const, label: 'Dinheiro' },
                    { key: 'total_debito' as const,   label: 'Cartão Débito' },
                    { key: 'total_credito' as const,  label: 'Cartão Crédito' },
                    { key: 'total_pix' as const,      label: 'Pix' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label} (R$)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatMaskedValueAlways(editForm[key])}
                        onChange={e => setEditForm(f => ({ ...f, [key]: parseMaskedValue(e.target.value) }))}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Movimentações */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { key: 'total_sangrias' as const,    label: 'Total Sangrias' },
                  { key: 'total_suprimentos' as const, label: 'Total Suprimentos' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={labelStyle}>{label} (R$)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatMaskedValueAlways(editForm[key])}
                      onChange={e => setEditForm(f => ({ ...f, [key]: parseMaskedValue(e.target.value) }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              {/* Valor contado */}
              <div>
                <label style={labelStyle}>Valor Contado na Gaveta (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMaskedValueAlways(editForm.valor_fechamento_fisico)}
                  onChange={e => setEditForm(f => ({ ...f, valor_fechamento_fisico: parseMaskedValue(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              {/* Preview quebra */}
              <div style={{
                background: editQuebra === 0 ? 'rgba(142,95,207,0.04)' : editQuebra > 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${editQuebra === 0 ? 'rgba(142,95,207,0.1)' : editQuebra > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 12, padding: '12px 14px', fontSize: '0.8rem', fontFamily: 'Gilroy',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#6B7280' }}>Esperado na gaveta:</span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>{fmtBRL(editEsperado)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#6B7280' }}>Quebra de caixa:</span>
                  <span style={{ fontWeight: 800, color: editQuebra >= 0 ? '#10B981' : '#EF4444' }}>
                    {editQuebra >= 0 ? '+' : ''}{fmtBRL(editQuebra)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Total vendas:</span>
                  <span style={{ fontWeight: 600, color: '#1F2937' }}>
                    {fmtBRL(editForm.total_dinheiro + editForm.total_debito + editForm.total_credito + editForm.total_pix)}
                  </span>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label style={labelStyle}>Observações</label>
                <Textarea
                  value={editForm.observacao_fechamento}
                  onChange={e => setEditForm(f => ({ ...f, observacao_fechamento: e.target.value }))}
                  placeholder="Observações sobre o fechamento..."
                  style={{ ...inputStyle, resize: 'none', minHeight: 80 }}
                />
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={() => setEditando(null)}
                  disabled={salvando}
                  style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy' }}
                >Cancelar</button>
                <button
                  onClick={salvarEdicao}
                  disabled={salvando}
                  style={{
                    padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none',
                    background: salvando ? 'rgba(142,95,207,0.3)' : 'linear-gradient(135deg, #47118F, #8E5FCF)',
                    color: '#fff', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Save style={{ width: 14, height: 14 }} />
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
