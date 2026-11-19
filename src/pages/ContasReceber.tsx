import React, { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import {
  Plus, Search, Download, TrendingUp, AlertCircle, CheckCircle, Wallet,
  CalendarIcon, Edit, Trash2, X,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, isWithinInterval,
  startOfDay, endOfDay, addDays, addWeeks, addMonths as dfAddMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useContasReceber, type ContaReceber } from '@/hooks/useContasReceber';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { parseMaskedValue, formatMaskedValue } from '@/utils/currencyMask';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const STATUS_CFG: Record<
  ContaReceber['status'],
  { label: string; color: string; bg: string; border: string }
> = {
  pendente:         { label: 'Pendente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  recebido_parcial: { label: 'Parcial',   color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  recebido:         { label: 'Recebido',  color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
  vencido:          { label: 'Vencido',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  cancelado:        { label: 'Cancelado', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' },
};

function StatusBadge({ status }: { status: ContaReceber['status'] }) {
  const cfg = STATUS_CFG[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: 20,
      fontSize: '0.7rem', fontWeight: 600, fontFamily: 'Gilroy',
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

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
};

// ─── Estado inicial dos formulários ───────────────────────────────────────────

const NOVA_INICIAL = {
  cliente_id: '',
  cliente_nome: '',
  clienteInput: '',
  descricao: '',
  valor: 0,
  categoria: '',
  forma_recebimento: '' as ContaReceber['forma_recebimento'],
  data_vencimento: format(new Date(), 'yyyy-MM-dd'),
  observacoes: '',
};

const RECEBER_INICIAL = {
  valor_recebido: 0,
  forma_recebimento: '' as ContaReceber['forma_recebimento'],
  data_recebimento: format(new Date(), 'yyyy-MM-dd'),
  observacoes: '',
};

// ─── Geração de datas das parcelas ────────────────────────────────────────────

function gerarDatas(base: string, qtd: number, periodicidade: 'mensal' | 'quinzenal' | 'semanal'): string[] {
  const datas: string[] = [];
  const dt = parseDate(base);
  for (let i = 0; i < qtd; i++) {
    let d: Date;
    if (periodicidade === 'mensal')          d = dfAddMonths(dt, i);
    else if (periodicidade === 'quinzenal')  d = addWeeks(dt, i * 2);
    else                                     d = addWeeks(dt, i);
    datas.push(format(d, 'yyyy-MM-dd'));
  }
  return datas;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ContasReceber() {
  const { toast } = useToast();
  const { companyId } = useEmpresa();
  const { contas, loading, criarConta, editarConta, receberConta, cancelarConta, excluirConta, buscarContas } = useContasReceber();

  const [clientes, setClientes] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!companyId) return;
    api
      .from('customer')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')
      .then(({ data }) => setClientes(data || []));
  }, [companyId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [dateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [novaDialogOpen, setNovaDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [receberDialogOpen, setReceberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaAtiva, setContaAtiva] = useState<ContaReceber | null>(null);

  const [novaConta, setNovaConta] = useState(NOVA_INICIAL);
  const [clienteNaoCadastrado, setClienteNaoCadastrado] = useState(false);
  const [parcelar, setParcelar] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [periodicidade, setPeriodicidade] = useState<'mensal' | 'quinzenal' | 'semanal'>('mensal');

  const [editConta, setEditConta] = useState({ ...NOVA_INICIAL, numero_parcela: '', total_parcelas: '' });
  const [recebimento, setRecebimento] = useState(RECEBER_INICIAL);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // ─── Preview parcelas ────────────────────────────────────────────────────────

  const previewParcelas = useMemo(() => {
    if (!parcelar || !novaConta.data_vencimento || !novaConta.valor || numParcelas < 2) return [];
    const datas = gerarDatas(novaConta.data_vencimento, numParcelas, periodicidade);
    const valorParcela = Number(novaConta.valor) / numParcelas;
    return datas.map((data, i) => ({ data, valor: valorParcela, num: i + 1 }));
  }, [parcelar, novaConta.data_vencimento, novaConta.valor, numParcelas, periodicidade]);

  // ─── Preview recebimento ─────────────────────────────────────────────────────

  const previewRecebimento = useMemo(() => {
    if (!contaAtiva) return null;
    const jaRecebido = Number(contaAtiva.valor_recebido || 0);
    const novoTotal = jaRecebido + Number(recebimento.valor_recebido || 0);
    const total = Number(contaAtiva.valor);
    const status: ContaReceber['status'] = novoTotal >= total ? 'recebido' : 'recebido_parcial';
    return { novoTotal, total, status };
  }, [contaAtiva, recebimento.valor_recebido]);

  // ─── Resumos ─────────────────────────────────────────────────────────────────

  const hoje = useMemo(() => new Date(), []);
  const em30dias = useMemo(() => addDays(hoje, 30), [hoje]);
  const inicioMes = useMemo(() => startOfMonth(hoje), [hoje]);
  const fimMes = useMemo(() => endOfMonth(hoje), [hoje]);
  const em7dias = useMemo(() => addDays(hoje, 7), [hoje]);

  const totalAReceber = useMemo(() =>
    contas
      .filter(c => ['pendente', 'recebido_parcial'].includes(c.status) &&
        isWithinInterval(parseDate(c.data_vencimento), { start: startOfDay(hoje), end: endOfDay(em30dias) }))
      .reduce((s, c) => s + Number(c.valor) - Number(c.valor_recebido || 0), 0),
  [contas, hoje, em30dias]);

  const totalVencido = useMemo(() =>
    contas.filter(c => c.status === 'vencido')
      .reduce((s, c) => s + Number(c.valor) - Number(c.valor_recebido || 0), 0),
  [contas]);

  const totalRecebidoMes = useMemo(() =>
    contas.filter(c => c.status === 'recebido' && c.data_recebimento &&
      isWithinInterval(parseDate(c.data_recebimento), { start: startOfDay(inicioMes), end: endOfDay(fimMes) }))
      .reduce((s, c) => s + Number(c.valor_recebido || c.valor), 0),
  [contas, inicioMes, fimMes]);

  const totalEmAberto = useMemo(() =>
    contas.filter(c => ['pendente', 'recebido_parcial', 'vencido'].includes(c.status))
      .reduce((s, c) => s + Number(c.valor) - Number(c.valor_recebido || 0), 0),
  [contas]);

  const vencendoBreve = useMemo(() =>
    contas.filter(c =>
      ['pendente', 'recebido_parcial'].includes(c.status) &&
      isWithinInterval(parseDate(c.data_vencimento), { start: startOfDay(hoje), end: endOfDay(em7dias) })
    ),
  [contas, hoje, em7dias]);

  // ─── Filtros ─────────────────────────────────────────────────────────────────

  const filteredContas = useMemo(() =>
    contas.filter(c => {
      const matchSearch =
        (c.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
      // Filtro de data aplica só para status "recebido" (histórico); demais mostram tudo
      let matchDate = true;
      if (filterStatus === 'recebido') {
        const dataRef = c.data_recebimento ? parseDate(c.data_recebimento) : parseDate(c.data_vencimento);
        matchDate = isWithinInterval(dataRef, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      return matchSearch && matchStatus && matchDate;
    }),
  [contas, searchTerm, filterStatus, dateRange]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleCriar = async () => {
    const nomeCliente = clienteNaoCadastrado
      ? novaConta.clienteInput
      : clientes.find(c => c.id === novaConta.cliente_id)?.name || novaConta.clienteInput;

    if (!novaConta.descricao || !novaConta.valor || !novaConta.data_vencimento) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (parcelar && numParcelas >= 2) {
      const datas = gerarDatas(novaConta.data_vencimento, numParcelas, periodicidade);
      const valorParcela = Number(novaConta.valor) / numParcelas;
      const inserts = datas.map((data, i) => ({
        company_id: companyId,
        descricao: `${novaConta.descricao} (Parcela ${i + 1}/${numParcelas})`,
        cliente_id: clienteNaoCadastrado ? null : (novaConta.cliente_id || null),
        cliente_nome: nomeCliente || null,
        valor: valorParcela,
        categoria: novaConta.categoria || null,
        forma_recebimento: novaConta.forma_recebimento || null,
        data_vencimento: data,
        numero_parcela: i + 1,
        total_parcelas: numParcelas,
        observacoes: novaConta.observacoes || null,
      }));
      const { error } = await api.from('receivable').insert(inserts);
      if (error) {
        toast({ title: 'Erro ao criar parcelas', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `${numParcelas} parcelas criadas com sucesso!` });
        await buscarContas();
        setNovaDialogOpen(false);
        resetNova();
      }
      return;
    }

    const { error } = await criarConta({
      descricao: novaConta.descricao,
      cliente_id: clienteNaoCadastrado ? null : (novaConta.cliente_id || null),
      cliente_nome: nomeCliente || null,
      valor: Number(novaConta.valor),
      categoria: novaConta.categoria || null,
      forma_recebimento: novaConta.forma_recebimento || null,
      data_vencimento: novaConta.data_vencimento,
      observacoes: novaConta.observacoes || null,
    });
    if (error) {
      toast({ title: 'Erro ao criar conta', variant: 'destructive' });
    } else {
      toast({ title: 'Conta criada com sucesso!' });
      setNovaDialogOpen(false);
      resetNova();
    }
  };

  const resetNova = () => {
    setNovaConta(NOVA_INICIAL);
    setClienteNaoCadastrado(false);
    setParcelar(false);
    setNumParcelas(2);
    setPeriodicidade('mensal');
  };

  const handleEditar = async () => {
    if (!contaAtiva) return;
    if (!editConta.descricao || !editConta.valor || !editConta.data_vencimento) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const { error } = await editarConta(contaAtiva.id, {
      descricao: editConta.descricao,
      cliente_nome: editConta.clienteInput || editConta.cliente_nome || null,
      valor: Number(editConta.valor),
      categoria: editConta.categoria || null,
      forma_recebimento: editConta.forma_recebimento || null,
      data_vencimento: editConta.data_vencimento,
      observacoes: editConta.observacoes || null,
    });
    if (error) {
      toast({ title: 'Erro ao editar conta', variant: 'destructive' });
    } else {
      toast({ title: 'Conta atualizada!' });
      setEditDialogOpen(false);
      setContaAtiva(null);
    }
  };

  const handleReceber = async () => {
    if (!contaAtiva) return;
    if (!recebimento.valor_recebido || !recebimento.forma_recebimento || !recebimento.data_recebimento) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const saldo = Number(contaAtiva.valor) - Number(contaAtiva.valor_recebido || 0);
    if (Number(recebimento.valor_recebido) > saldo + 0.001) {
      toast({ title: 'Valor excede o saldo em aberto', variant: 'destructive' });
      return;
    }
    const { error } = await receberConta(
      contaAtiva.id,
      Number(recebimento.valor_recebido),
      recebimento.forma_recebimento,
      recebimento.data_recebimento
    );
    if (error) {
      toast({ title: 'Erro ao registrar recebimento', variant: 'destructive' });
    } else {
      toast({ title: 'Recebimento registrado!' });
      setReceberDialogOpen(false);
      setContaAtiva(null);
      setRecebimento(RECEBER_INICIAL);
    }
  };

  const handleExportarCSV = () => {
    const header = 'Cliente,Descrição,Status,Valor,Recebido,Vencimento,Recebimento\n';
    const rows = filteredContas.map(c =>
      [c.cliente_nome || '', c.descricao, STATUS_CFG[c.status].label,
        Number(c.valor).toFixed(2), Number(c.valor_recebido || 0).toFixed(2),
        c.data_vencimento, c.data_recebimento || ''].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-receber-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditar = (conta: ContaReceber) => {
    setContaAtiva(conta);
    setEditConta({
      ...NOVA_INICIAL,
      descricao: conta.descricao,
      cliente_nome: conta.cliente_nome || '',
      clienteInput: conta.cliente_nome || '',
      valor: conta.valor,
      categoria: conta.categoria || '',
      forma_recebimento: conta.forma_recebimento || null,
      data_vencimento: conta.data_vencimento,
      observacoes: conta.observacoes || '',
      numero_parcela: conta.numero_parcela?.toString() || '',
      total_parcelas: conta.total_parcelas?.toString() || '',
    } as typeof editConta);
    setEditDialogOpen(true);
  };

  const openReceber = (conta: ContaReceber) => {
    setContaAtiva(conta);
    const saldo = Number(conta.valor) - Number(conta.valor_recebido || 0);
    setRecebimento({ ...RECEBER_INICIAL, valor_recebido: saldo });
    setReceberDialogOpen(true);
  };

  // ─── KPI cards data ───────────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: 'A Receber',
      value: formatCurrency(totalAReceber),
      sub: 'vence nos próximos 30 dias',
      accentGradient: 'linear-gradient(90deg, #10B981, #6EE7B7)',
      valueColor: '#10B981',
      icon: <TrendingUp style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #10B981, #059669)',
    },
    {
      label: 'Vencidas',
      value: formatCurrency(totalVencido),
      sub: `${contas.filter(c => c.status === 'vencido').length} contas em atraso`,
      accentGradient: 'linear-gradient(90deg, #EF4444, #FCA5A5)',
      valueColor: '#EF4444',
      icon: <AlertCircle style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #EF4444, #DC2626)',
    },
    {
      label: 'Recebido no Mês',
      value: formatCurrency(totalRecebidoMes),
      sub: format(hoje, "MMMM 'de' yyyy", { locale: ptBR }),
      accentGradient: 'linear-gradient(90deg, #8B5CF6, #C4B5FD)',
      valueColor: '#8B5CF6',
      icon: <CheckCircle style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    },
    {
      label: 'Total em Aberto',
      value: formatCurrency(totalEmAberto),
      sub: 'pendente + parcial + vencido',
      accentGradient: 'linear-gradient(90deg, #3B82F6, #93C5FD)',
      valueColor: '#3B82F6',
      icon: <Wallet style={{ width: 16, height: 16, color: '#fff' }} />,
      iconBg: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
      position: 'relative',
    }}>
      {/* Orb roxo */}
      <div style={{
        position: 'fixed', top: '-200px', left: '-200px',
        width: '600px', height: '600px', borderRadius: '50%',
        background: '#8E5FCF', opacity: 0.06,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      {/* Orb amarelo */}
      <div style={{
        position: 'fixed', bottom: '-150px', right: '-150px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: '#FAF66B', opacity: 0.04,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />

      <div style={{ padding: '32px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 6 }}>
              Oasis › Contas a Receber
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.2, margin: 0,
            }}>
              Contas a Receber
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: 4 }}>
              Controle de recebimentos e cobranças
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
            <button
              onClick={handleExportarCSV}
              style={{
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(142,95,207,0.3)', color: '#8E5FCF',
                borderRadius: 12, padding: '10px 18px', cursor: 'pointer',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#8E5FCF'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#8E5FCF'; }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Exportar CSV
            </button>
            <button
              onClick={() => setNovaDialogOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                color: '#fff', borderRadius: 12, padding: '10px 20px',
                border: 'none', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                boxShadow: '0 4px 15px rgba(142,95,207,0.35)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Nova Conta
            </button>
          </div>
        </div>

        {/* ── Banner vencimentos próximos ── */}
        {vencendoBreve.length > 0 && (
          <div style={{
            ...glassCard,
            padding: '14px 20px',
            marginBottom: 24,
            borderLeft: '3px solid #F59E0B',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D97706' }}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Gilroy', color: '#92400E' }}>
                {vencendoBreve.length} conta{vencendoBreve.length > 1 ? 's' : ''}{' '}
                vence{vencendoBreve.length > 1 ? 'm' : ''} nos próximos 7 dias
                {' '}— Total: {formatCurrency(vencendoBreve.reduce((s, c) => s + Number(c.valor) - Number(c.valor_recebido || 0), 0))}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {vencendoBreve.map(c => (
                <button
                  key={c.id}
                  onClick={() => openReceber(c)}
                  style={{
                    fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600,
                    padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                    background: 'rgba(245,158,11,0.1)', color: '#92400E',
                    border: '1px solid rgba(245,158,11,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {c.cliente_nome || c.descricao} — {format(parseDate(c.data_vencimento), 'dd/MM')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}
          className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card, idx) => (
            <div
              key={idx}
              style={{
                ...glassCard,
                padding: 24,
                boxShadow: hoveredKpi === idx
                  ? '0 16px 48px rgba(71,17,143,0.14)'
                  : '0 8px 32px rgba(71,17,143,0.08)',
                transform: hoveredKpi === idx ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={() => setHoveredKpi(idx)}
              onMouseLeave={() => setHoveredKpi(null)}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: card.accentGradient, borderRadius: '20px 20px 0 0',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                  {card.label}
                </p>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy', lineHeight: 1.2, marginBottom: 4 }}>
                {card.value}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{ ...glassCard, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
                <input
                  placeholder="Buscar cliente ou descrição..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 36, width: 260,
                  }}
                  onFocus={e => { e.target.style.borderColor = '#8E5FCF'; e.target.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(142,95,207,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['todos', 'pendente', 'recebido_parcial', 'recebido', 'vencido', 'cancelado'] as const).map(s => {
                  const isActive = filterStatus === s;
                  const cfg = s !== 'todos' ? STATUS_CFG[s] : null;
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      style={{
                        padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                        fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem',
                        transition: 'all 0.15s',
                        background: isActive
                          ? (cfg ? cfg.bg : 'rgba(142,95,207,0.1)')
                          : 'transparent',
                        color: isActive
                          ? (cfg ? cfg.color : '#8E5FCF')
                          : '#9CA3AF',
                        border: isActive
                          ? `1px solid ${cfg ? cfg.border : 'rgba(142,95,207,0.3)'}`
                          : '1px solid transparent',
                      }}
                    >
                      {s === 'todos' ? 'Todos' : s === 'recebido_parcial' ? 'Parcial' : STATUS_CFG[s].label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
              {filteredContas.length} conta{filteredContas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* ── Tabela / Lista ── */}
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          {/* Header da tabela */}
          <div style={{
            padding: '16px 24px 12px',
            background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))',
            borderBottom: '1px solid rgba(142,95,207,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
              Contas a Receber
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['pendente', 'recebido_parcial', 'vencido'] as const).map(s => {
                const total = filteredContas.filter(c => c.status === s)
                  .reduce((sum, c) => sum + Number(c.valor) - Number(c.valor_recebido || 0), 0);
                if (total === 0) return null;
                const cfg = STATUS_CFG[s];
                return (
                  <div key={s} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 20,
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    fontSize: '0.75rem', fontFamily: 'Gilroy',
                  }}>
                    <span style={{ fontWeight: 600, color: cfg.color }}>{cfg.label}:</span>
                    <span style={{ fontWeight: 700, color: cfg.color }}>{formatCurrency(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '12px 16px' }}>
            {loading ? (
              <TableSkeleton columns={5} rows={5} />
            ) : filteredContas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 24, margin: '0 auto 16px',
                  background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp style={{ width: 36, height: 36, color: '#8E5FCF' }} />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', marginBottom: 6 }}>
                  Nenhuma conta a receber
                </p>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: 20 }}>
                  {searchTerm || filterStatus !== 'todos' ? 'Tente ajustar os filtros' : 'Registre sua primeira conta'}
                </p>
                <button
                  onClick={() => setNovaDialogOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                    color: '#fff', borderRadius: 12, padding: '10px 20px',
                    border: 'none', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  Nova Conta
                </button>
              </div>
            ) : (
              <div>
                {filteredContas.map(conta => {
                  const saldo = Number(conta.valor) - Number(conta.valor_recebido || 0);
                  const progresso = conta.valor > 0 ? (Number(conta.valor_recebido || 0) / Number(conta.valor)) * 100 : 0;
                  const isVencida = conta.status === 'vencido';
                  const isParcial = conta.status === 'recebido_parcial';
                  const canReceber = ['pendente', 'recebido_parcial', 'vencido'].includes(conta.status);
                  const isHovered = hoveredRow === conta.id;

                  return (
                    <div
                      key={conta.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        padding: '14px 8px', gap: 16,
                        borderBottom: '1px solid rgba(142,95,207,0.06)',
                        background: isHovered ? 'rgba(142,95,207,0.04)' : 'transparent',
                        borderRadius: isHovered ? 12 : 0,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={() => setHoveredRow(conta.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
                            {conta.cliente_nome && (
                              <span style={{ color: '#8E5FCF' }}>{conta.cliente_nome} — </span>
                            )}
                            {conta.descricao}
                          </p>
                          <StatusBadge status={conta.status} />
                          {conta.numero_parcela && conta.total_parcelas && (
                            <span style={{
                              fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600,
                              padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
                              border: '1px solid rgba(142,95,207,0.2)',
                            }}>
                              {conta.numero_parcela}/{conta.total_parcelas}
                            </span>
                          )}
                          {conta.categoria && (
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                              {conta.categoria}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500,
                            padding: '2px 8px', borderRadius: 8,
                            background: isVencida ? 'rgba(239,68,68,0.08)' : 'rgba(142,95,207,0.06)',
                            color: isVencida ? '#EF4444' : '#6B7280',
                          }}>
                            <CalendarIcon style={{ width: 12, height: 12 }} />
                            Vence {format(parseDate(conta.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          {conta.data_recebimento && (
                            <span style={{ fontSize: '0.75rem', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 500 }}>
                              Recebido em {format(parseDate(conta.data_recebimento), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937' }}>
                            {formatCurrency(Number(conta.valor))}
                          </span>
                          {isParcial && (
                            <span style={{ fontSize: '0.75rem', color: '#3B82F6', fontWeight: 600, fontFamily: 'Gilroy' }}>
                              Recebido: {formatCurrency(Number(conta.valor_recebido))} — Saldo: {formatCurrency(saldo)}
                            </span>
                          )}
                        </div>
                        {isParcial && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <div style={{ flex: 1, height: 4, background: 'rgba(59,130,246,0.15)', borderRadius: 4, overflow: 'hidden', maxWidth: 160 }}>
                              <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #3B82F6, #93C5FD)', width: `${progresso}%` }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#3B82F6', fontWeight: 600, fontFamily: 'Gilroy' }}>{progresso.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s',
                      }}>
                        {canReceber && (
                          <button
                            onClick={() => openReceber(conta)}
                            style={{
                              background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                              color: '#fff', borderRadius: 8, padding: '5px 12px',
                              border: 'none', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            Receber
                          </button>
                        )}
                        <button
                          onClick={() => openEditar(conta)}
                          style={{
                            width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(142,95,207,0.08)', border: '1px solid rgba(142,95,207,0.15)',
                            color: '#8E5FCF', cursor: 'pointer',
                          }}
                        >
                          <Edit style={{ width: 13, height: 13 }} />
                        </button>
                        {!['cancelado', 'recebido'].includes(conta.status) && (
                          <button
                            onClick={async () => { await cancelarConta(conta.id); toast({ title: 'Conta cancelada' }); }}
                            style={{
                              width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.15)',
                              color: '#6B7280', cursor: 'pointer',
                            }}
                          >
                            <X style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                        <button
                          onClick={() => { setContaAtiva(conta); setDeleteDialogOpen(true); }}
                          style={{
                            width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                            color: '#EF4444', cursor: 'pointer',
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialog: Nova Conta ── */}
      <Dialog open={novaDialogOpen} onOpenChange={setNovaDialogOpen}>
        <DialogContent
          className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>Nova Conta a Receber</h2>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Cliente */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Cliente</label>
              {!clienteNaoCadastrado ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Select value={novaConta.cliente_id} onValueChange={v => setNovaConta(p => ({ ...p, cliente_id: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione ou busque..." /></SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => setClienteNaoCadastrado(true)}
                    style={{ ...inputStyle, width: 'auto', padding: '8px 12px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                  >Não cadastrado</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="Nome do cliente"
                    value={novaConta.clienteInput}
                    onChange={e => setNovaConta(p => ({ ...p, clienteInput: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => setClienteNaoCadastrado(false)}
                    style={{ ...inputStyle, width: 'auto', padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}
                  >Buscar</button>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input placeholder="Ex: Venda #1042, Mensalidade" value={novaConta.descricao}
                onChange={e => setNovaConta(p => ({ ...p, descricao: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Valor total *</label>
                <input type="text" inputMode="numeric" placeholder="0,00"
                  value={formatMaskedValue(novaConta.valor)}
                  onChange={e => setNovaConta(p => ({ ...p, valor: parseMaskedValue(e.target.value) }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Vencimento *</label>
                <input type="date" value={novaConta.data_vencimento}
                  onChange={e => setNovaConta(p => ({ ...p, data_vencimento: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Categoria</label>
                <Select value={novaConta.categoria} onValueChange={v => setNovaConta(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Venda">Venda</SelectItem>
                    <SelectItem value="Serviço">Serviço</SelectItem>
                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                    <SelectItem value="Mensalidade">Mensalidade</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Forma esperada</label>
                <Select value={novaConta.forma_recebimento || ''} onValueChange={v => setNovaConta(p => ({ ...p, forma_recebimento: v as ContaReceber['forma_recebimento'] }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Switch id="parcelar" checked={parcelar} onCheckedChange={setParcelar} />
              <Label htmlFor="parcelar" style={{ fontFamily: 'Gilroy', fontSize: 13, cursor: 'pointer' }}>Parcelar</Label>
            </div>

            {parcelar && (
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(142,95,207,0.05)', border: '1px solid rgba(142,95,207,0.12)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Nº de parcelas</label>
                    <input type="number" min={2} max={12} value={numParcelas}
                      onChange={e => setNumParcelas(Math.min(12, Math.max(2, Number(e.target.value))))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Periodicidade</label>
                    <Select value={periodicidade} onValueChange={v => setPeriodicidade(v as typeof periodicidade)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {previewParcelas.length > 0 && (
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', fontFamily: 'Gilroy', marginBottom: 6 }}>Preview das parcelas:</p>
                    {previewParcelas.map(p => (
                      <div key={p.num} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid rgba(142,95,207,0.06)', fontFamily: 'Gilroy' }}>
                        <span style={{ color: '#6B7280' }}>Parcela {p.num}/{numParcelas} — {format(parseDate(p.data), 'dd/MM/yyyy')}</span>
                        <span style={{ fontWeight: 600, color: '#1F2937' }}>{formatCurrency(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Observações</label>
              <Textarea placeholder="Observações opcionais..." rows={2} value={novaConta.observacoes}
                onChange={e => setNovaConta(p => ({ ...p, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
            </div>
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={() => setNovaDialogOpen(false)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Cancelar</button>
            <button
              onClick={handleCriar}
              style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >{parcelar ? `Criar ${numParcelas} parcelas` : 'Salvar'}</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="sm:max-w-[480px] p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>Editar Conta</h2>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Descrição *</label>
              <input value={editConta.descricao}
                onChange={e => setEditConta(p => ({ ...p, descricao: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Cliente</label>
              <input placeholder="Nome do cliente" value={editConta.clienteInput}
                onChange={e => setEditConta(p => ({ ...p, clienteInput: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Valor *</label>
                <input type="text" inputMode="numeric" placeholder="0,00" value={formatMaskedValue(editConta.valor)}
                  onChange={e => setEditConta(p => ({ ...p, valor: parseMaskedValue(e.target.value) }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Vencimento *</label>
                <input type="date" value={editConta.data_vencimento}
                  onChange={e => setEditConta(p => ({ ...p, data_vencimento: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Categoria</label>
                <Select value={editConta.categoria} onValueChange={v => setEditConta(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Venda">Venda</SelectItem>
                    <SelectItem value="Serviço">Serviço</SelectItem>
                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                    <SelectItem value="Mensalidade">Mensalidade</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Forma esperada</label>
                <Select value={editConta.forma_recebimento || ''} onValueChange={v => setEditConta(p => ({ ...p, forma_recebimento: v as ContaReceber['forma_recebimento'] }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Observações</label>
              <Textarea rows={2} value={editConta.observacoes}
                onChange={e => setEditConta(p => ({ ...p, observacoes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
            </div>
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setEditDialogOpen(false)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Cancelar</button>
            <button onClick={handleEditar}
              style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Salvar</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Receber ── */}
      <Dialog open={receberDialogOpen} onOpenChange={setReceberDialogOpen}>
        <DialogContent
          className="sm:max-w-[440px] p-0"
          style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24,
            boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>Registrar Recebimento</h2>
          </div>
          {contaAtiva && (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Resumo */}
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(142,95,207,0.05)', border: '1px solid rgba(142,95,207,0.1)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', marginBottom: 2 }}>{contaAtiva.cliente_nome || '—'}</p>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Gilroy', marginBottom: 8 }}>{contaAtiva.descricao}</p>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', fontFamily: 'Gilroy' }}>
                  <span style={{ color: '#6B7280' }}>Total: <strong style={{ color: '#1F2937' }}>{formatCurrency(Number(contaAtiva.valor))}</strong></span>
                  {Number(contaAtiva.valor_recebido) > 0 && (
                    <span style={{ color: '#6B7280' }}>Recebido: <strong style={{ color: '#10B981' }}>{formatCurrency(Number(contaAtiva.valor_recebido))}</strong></span>
                  )}
                  <span style={{ color: '#8E5FCF', fontWeight: 700 }}>
                    Saldo: {formatCurrency(Number(contaAtiva.valor) - Number(contaAtiva.valor_recebido || 0))}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Valor a receber *</label>
                <input type="text" inputMode="numeric" placeholder="0,00"
                  value={formatMaskedValue(recebimento.valor_recebido)}
                  onChange={e => setRecebimento(r => ({ ...r, valor_recebido: parseMaskedValue(e.target.value) }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Forma de recebimento *</label>
                <Select value={recebimento.forma_recebimento || ''}
                  onValueChange={v => setRecebimento(r => ({ ...r, forma_recebimento: v as ContaReceber['forma_recebimento'] }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Data do recebimento *</label>
                <input type="date" value={recebimento.data_recebimento}
                  onChange={e => setRecebimento(r => ({ ...r, data_recebimento: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Observações</label>
                <Textarea rows={2} placeholder="Opcional..." value={recebimento.observacoes}
                  onChange={e => setRecebimento(r => ({ ...r, observacoes: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
              </div>

              {previewRecebimento && recebimento.valor_recebido > 0 && (
                <div style={{
                  padding: 12, borderRadius: 12, fontSize: '0.75rem', fontFamily: 'Gilroy',
                  background: STATUS_CFG[previewRecebimento.status].bg,
                  border: `1px solid ${STATUS_CFG[previewRecebimento.status].border}`,
                }}>
                  <p style={{ color: STATUS_CFG[previewRecebimento.status].color, fontWeight: 700, marginBottom: 4 }}>Após recebimento:</p>
                  <p style={{ color: '#1F2937' }}>{formatCurrency(previewRecebimento.novoTotal)} de {formatCurrency(previewRecebimento.total)} recebidos</p>
                  <p style={{ color: STATUS_CFG[previewRecebimento.status].color, fontWeight: 700, marginTop: 2 }}>
                    Status: {STATUS_CFG[previewRecebimento.status].label}
                  </p>
                </div>
              )}
            </div>
          )}
          <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setReceberDialogOpen(false)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Cancelar</button>
            <button onClick={handleReceber}
              style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy' }}
            >Confirmar Recebimento</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Excluir ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent style={{
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(142,95,207,0.15)', borderRadius: 20,
          boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Gilroy', fontWeight: 700 }}>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'Gilroy' }}>
              Essa ação não pode ser desfeita. A conta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ fontFamily: 'Gilroy' }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              style={{ background: '#EF4444', fontFamily: 'Gilroy', fontWeight: 700 }}
              onClick={async () => {
                if (contaAtiva) {
                  await excluirConta(contaAtiva.id);
                  toast({ title: 'Conta excluída' });
                  setDeleteDialogOpen(false);
                  setContaAtiva(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
