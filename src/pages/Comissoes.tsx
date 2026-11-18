import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  CalendarIcon, DollarSign, TrendingUp, ShoppingCart, Award, Users,
  Download, FileSpreadsheet, FileText, Target, ChevronLeft, ChevronRight,
  Loader2, Trophy, BarChart2, CheckCircle,
} from 'lucide-react';
import MetaVendedorCard from '@/components/comissoes/MetaVendedorCard';
import MetaConfigDialog from '@/components/comissoes/MetaConfigDialog';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useEmpresa } from '@/hooks/useEmpresa';
import { api } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/utils/errorHandler';
import { escapeHtml } from '@/utils/htmlSanitize';

// --- Types ---
interface ComissaoComVenda {
  id: string;
  venda_id: string;
  vendedor_id: string;
  empresa_id: string | null;
  valor_base: number;
  percentual: number;
  valor_comissao: number;
  data_calculo: string;
  created_at: string;
  venda_cliente_nome?: string;
  venda_produtos?: string;
  venda_data?: string;
  vendedor_nome?: string;
}

interface VendedorInfo {
  id: string;
  nome: string;
  email: string;
}

const PAGE_SIZE = 50;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// --- Export helpers ---
const exportToCSV = (data: ComissaoComVenda[], getVendedorNome: (id: string) => string, isAdmin: boolean) => {
  const headers = ['Data', ...(isAdmin ? ['Vendedor'] : []), 'Cliente', 'Produtos', 'Valor Venda', '% Vigente', 'Comissão'];
  const rows = data.map(c => [
    c.venda_data ? format(new Date(c.venda_data), 'dd/MM/yyyy') : '-',
    ...(isAdmin ? [getVendedorNome(c.vendedor_id)] : []),
    c.venda_cliente_nome || '-',
    `"${(c.venda_produtos || '-').replace(/"/g, '""')}"`,
    Number(c.valor_base).toFixed(2).replace('.', ','),
    `${c.percentual}%`,
    Number(c.valor_comissao).toFixed(2).replace('.', ','),
  ]);
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comissoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPDF = (
  data: ComissaoComVenda[],
  getVendedorNome: (id: string) => string,
  isAdmin: boolean,
  totalVendido: number,
  totalComissao: number
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = data.map(c => `
    <tr>
      <td>${c.venda_data ? format(new Date(c.venda_data), 'dd/MM/yyyy') : '-'}</td>
      ${isAdmin ? `<td>${escapeHtml(getVendedorNome(c.vendedor_id))}</td>` : ''}
      <td>${escapeHtml(c.venda_cliente_nome || '-')}</td>
      <td>${escapeHtml(c.venda_produtos || '-')}</td>
      <td style="text-align:right">${formatCurrency(Number(c.valor_base))}</td>
      <td style="text-align:center">${c.percentual}%</td>
      <td style="text-align:right">${formatCurrency(Number(c.valor_comissao))}</td>
    </tr>
  `).join('');

  printWindow.document.write(`<!DOCTYPE html><html><head><title>Relatório de Comissões</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
      .summary { display: flex; gap: 24px; margin-bottom: 16px; }
      .summary-item { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; }
      .summary-item .label { font-size: 11px; color: #888; }
      .summary-item .value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>Relatório de Comissões</h1>
    <p class="subtitle">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
    <div class="summary">
      <div class="summary-item"><div class="label">Total Vendido</div><div class="value">${formatCurrency(totalVendido)}</div></div>
      <div class="summary-item"><div class="label">Total Comissão</div><div class="value" style="color:#16a34a">${formatCurrency(totalComissao)}</div></div>
      <div class="summary-item"><div class="label">Registros</div><div class="value">${data.length}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Data</th>${isAdmin ? '<th>Vendedor</th>' : ''}<th>Cliente</th><th>Produtos</th>
        <th style="text-align:right">Valor</th><th style="text-align:center">%</th><th style="text-align:right">Comissão</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></body></html>`);
  printWindow.document.close();
  printWindow.print();
};

// --- Chart data builder ---
const buildChartData = (comissoes: ComissaoComVenda[]) => {
  const map: Record<string, { vendido: number; comissao: number }> = {};
  comissoes.forEach(c => {
    if (!c.venda_data) return;
    const key = c.venda_data.substring(0, 7);
    if (!map[key]) map[key] = { vendido: 0, comissao: 0 };
    map[key].vendido += Number(c.valor_base);
    map[key].comissao += Number(c.valor_comissao);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [y, m] = key.split('-');
      return {
        mes: `${m}/${y}`,
        vendido: Number(val.vendido.toFixed(2)),
        comissao: Number(val.comissao.toFixed(2)),
      };
    });
};

// --- Style constants ---
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 20,
};

const Comissoes = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const isAdmin = role === 'admin' || role === 'gerente';
  const isAdminOnly = role === 'admin';

  // Vendedor/visualizador always locked to own ID
  const effectiveVendedorFilter = (!isAdmin && user) ? user.id : null;

  const [comissoes, setComissoes] = useState<ComissaoComVenda[]>([]);
  const [vendedores, setVendedores] = useState<VendedorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [metas, setMetas] = useState<Record<string, number>>({});
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [paginatedComissoes, setPaginatedComissoes] = useState<ComissaoComVenda[]>([]);
  const [pageLoading, setPageLoading] = useState(false);

  // Totals (summary) - calculated from ALL matching records, not just current page
  const [totalVendido, setTotalVendido] = useState(0);
  const [totalComissao, setTotalComissao] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedVendedor, setSelectedVendedor] = useState<string>(() =>
    effectiveVendedorFilter || 'todos'
  );
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // UI state
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredRankRow, setHoveredRankRow] = useState<string | null>(null);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedVendedor, dateRange]);

  useEffect(() => {
    if (user && empresaId) {
      loadAll();
    }
  }, [user, empresaId]);

  // Reload paginated data when page/filters change
  useEffect(() => {
    if (user && empresaId) {
      fetchPaginatedComissoes();
    }
  }, [page, selectedVendedor, dateRange, empresaId]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchSummaryTotals(),
      fetchPaginatedComissoes(),
      fetchAllForChartAndRanking(),
      isAdmin ? fetchVendedores() : Promise.resolve(),
      fetchMetas(),
    ]);
    setLoading(false);
  };

  const getActiveVendedorFilter = () => effectiveVendedorFilter || (selectedVendedor !== 'todos' ? selectedVendedor : null);

  // Build base query with mandatory filters
  const buildVendaIdsQuery = useCallback(async (): Promise<string[]> => {
    if (!empresaId) return [];

    let query = api
      .from('vendas')
      .select('id')
      .eq('empresa_id', empresaId);

    const vendedorFilter = getActiveVendedorFilter();
    if (vendedorFilter) {
      query = query.eq('vendedor_id', vendedorFilter);
    }

    if (dateRange.from) {
      query = query.gte('data_venda', format(dateRange.from, 'yyyy-MM-dd'));
    }
    if (dateRange.to) {
      query = query.lte('data_venda', format(dateRange.to, 'yyyy-MM-dd'));
    }

    const { data } = await query;
    return (data || []).map(v => v.id);
  }, [empresaId, selectedVendedor, effectiveVendedorFilter, dateRange]);

  // Fetch summary totals (all matching, no pagination)
  const fetchSummaryTotals = async () => {
    if (!empresaId) return;

    const vendaIds = await buildVendaIdsQuery();
    if (vendaIds.length === 0) {
      setTotalVendido(0);
      setTotalComissao(0);
      setTotalRecords(0);
      setTotalCount(0);
      return;
    }

    // Batch vendaIds in chunks of 100 to avoid query limits
    let allComissoes: any[] = [];
    for (let i = 0; i < vendaIds.length; i += 100) {
      const chunk = vendaIds.slice(i, i + 100);
      let query = api
        .from('comissoes')
        .select('valor_base, valor_comissao')
        .eq('empresa_id', empresaId)
        .in('venda_id', chunk);

      const { data } = await query;
      if (data) allComissoes = allComissoes.concat(data);
    }

    const tv = allComissoes.reduce((s, c) => s + Number(c.valor_base), 0);
    const tc = allComissoes.reduce((s, c) => s + Number(c.valor_comissao), 0);
    setTotalVendido(tv);
    setTotalComissao(tc);
    setTotalRecords(allComissoes.length);
    setTotalCount(allComissoes.length);
  };

  // Fetch paginated detail rows
  const fetchPaginatedComissoes = async () => {
    if (!empresaId) return;
    setPageLoading(true);

    const vendaIds = await buildVendaIdsQuery();
    if (vendaIds.length === 0) {
      setPaginatedComissoes([]);
      setTotalCount(0);
      setPageLoading(false);
      return;
    }

    // Get page of comissoes filtered by vendaIds
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = api
      .from('comissoes')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .in('venda_id', vendaIds)
      .order('data_calculo', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      handleApiError(error, 'Erro ao carregar comissões');
      setPaginatedComissoes([]);
      setPageLoading(false);
      return;
    }

    if (count !== null) setTotalCount(count);

    // Enrich with venda data
    const pageVendaIds = [...new Set((data || []).map(c => c.venda_id))];
    let vendasMap: Record<string, any> = {};
    if (pageVendaIds.length > 0) {
      const { data: vendas } = await api
        .from('vendas')
        .select('id, cliente_nome, produtos, data_venda, vendedor')
        .in('id', pageVendaIds)
        .eq('empresa_id', empresaId);
      if (vendas) {
        vendas.forEach(v => { vendasMap[v.id] = v; });
      }
    }

    const enriched: ComissaoComVenda[] = (data || []).map(c => ({
      ...c,
      venda_cliente_nome: vendasMap[c.venda_id]?.cliente_nome,
      venda_produtos: vendasMap[c.venda_id]?.produtos,
      venda_data: vendasMap[c.venda_id]?.data_venda,
      vendedor_nome: vendasMap[c.venda_id]?.vendedor,
    }));

    setPaginatedComissoes(enriched);
    setPageLoading(false);
  };

  // Fetch all for chart and ranking (lightweight - only aggregation fields)
  const fetchAllForChartAndRanking = async () => {
    if (!empresaId) return;

    const vendaIds = await buildVendaIdsQuery();
    if (vendaIds.length === 0) {
      setComissoes([]);
      return;
    }

    let allComissoes: any[] = [];
    for (let i = 0; i < vendaIds.length; i += 100) {
      const chunk = vendaIds.slice(i, i + 100);
      const { data } = await api
        .from('comissoes')
        .select('id, venda_id, vendedor_id, valor_base, percentual, valor_comissao, data_calculo, empresa_id, created_at')
        .eq('empresa_id', empresaId)
        .in('venda_id', chunk);
      if (data) allComissoes = allComissoes.concat(data);
    }

    // Enrich with venda dates for chart
    const allVendaIds = [...new Set(allComissoes.map(c => c.venda_id))];
    let vendasMap: Record<string, any> = {};
    for (let i = 0; i < allVendaIds.length; i += 100) {
      const chunk = allVendaIds.slice(i, i + 100);
      const { data: vendas } = await api
        .from('vendas')
        .select('id, data_venda')
        .in('id', chunk)
        .eq('empresa_id', empresaId);
      if (vendas) vendas.forEach(v => { vendasMap[v.id] = v; });
    }

    const enriched: ComissaoComVenda[] = allComissoes.map(c => ({
      ...c,
      venda_data: vendasMap[c.venda_id]?.data_venda,
    }));

    setComissoes(enriched);
  };

  const fetchMetas = async () => {
    if (!empresaId) return;
    const mesAtual = format(new Date(), 'yyyy-MM');
    const { data } = await api
      .from('metas_vendedor')
      .select('vendedor_id, valor_meta')
      .eq('empresa_id', empresaId)
      .eq('mes_referencia', mesAtual);

    const map: Record<string, number> = {};
    (data || []).forEach((m: any) => { map[m.vendedor_id] = Number(m.valor_meta); });
    setMetas(map);
  };

  const fetchVendedores = async () => {
    if (!empresaId) return;
    try {
      const { data, error } = await api.functions.invoke('list-users', {
        body: { empresa_id: empresaId },
      });
      if (error || !data?.users) return;
      setVendedores(
        data.users.map((u: any) => ({
          id: u.id,
          nome: u.nome || u.email?.split('@')[0] || 'Sem nome',
          email: u.email || '',
        }))
      );
    } catch (e) {
      console.error('Error fetching vendedores:', e);
    }
  };

  const getVendedorNome = (vendedorId: string) => {
    const v = vendedores.find(v => v.id === vendedorId);
    if (v) return v.nome;
    const c = comissoes.find(c => c.vendedor_id === vendedorId && c.vendedor_nome);
    if (c?.vendedor_nome) return c.vendedor_nome;
    return vendedorId.substring(0, 8) + '...';
  };

  const chartData = useMemo(() => buildChartData(comissoes), [comissoes]);

  const ranking = useMemo(() => {
    if (!isAdmin) return [];
    const map: Record<string, { vendedor_id: string; total_vendido: number; total_comissao: number; qtd: number }> = {};
    comissoes.forEach(c => {
      if (!map[c.vendedor_id]) {
        map[c.vendedor_id] = { vendedor_id: c.vendedor_id, total_vendido: 0, total_comissao: 0, qtd: 0 };
      }
      map[c.vendedor_id].total_vendido += Number(c.valor_base);
      map[c.vendedor_id].total_comissao += Number(c.valor_comissao);
      map[c.vendedor_id].qtd += 1;
    });
    return Object.values(map).sort((a, b) => b.total_vendido - a.total_vendido);
  }, [comissoes, isAdmin]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleExportCSV = () => {
    exportToCSV(paginatedComissoes, getVendedorNome, isAdmin);
    toast({ title: 'Exportação CSV', description: 'Arquivo CSV gerado com sucesso.' });
  };

  const handleExportPDF = () => {
    exportToPDF(paginatedComissoes, getVendedorNome, isAdmin, totalVendido, totalComissao);
  };

  // Reload everything when filters change
  useEffect(() => {
    if (user && empresaId && !loading) {
      fetchSummaryTotals();
      fetchAllForChartAndRanking();
    }
  }, [selectedVendedor, dateRange]);

  // Derived KPI values
  const melhorVendedora = ranking[0] ? getVendedorNome(ranking[0].vendedor_id) : '—';
  const ticketMedio = totalRecords > 0 ? totalComissao / totalRecords : 0;
  const maxRankComissao = ranking[0]?.total_comissao || 1;

  const getMedalStyle = (idx: number): React.CSSProperties => {
    if (idx === 0) return { background: 'linear-gradient(135deg, #F59E0B, #D97706)' };
    if (idx === 1) return { background: 'linear-gradient(135deg, #9CA3AF, #6B7280)' };
    if (idx === 2) return { background: 'linear-gradient(135deg, #CD7F32, #A0522D)' };
    return { background: 'rgba(142,95,207,0.1)' };
  };

  const getMedalLabel = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return String(idx + 1);
  };

  const getBarColor = (idx: number) => {
    if (idx === 0) return '#F59E0B';
    if (idx === 1) return '#9CA3AF';
    if (idx === 2) return '#CD7F32';
    return '#8E5FCF';
  };

  const getInitials = (nome: string) =>
    nome.split(' ').slice(0, 2).map(n => n[0] || '').join('').toUpperCase() || '?';

  const kpiCards = [
    {
      label: 'Total Comissão',
      value: formatCurrency(totalComissao),
      sub: `${totalRecords} comissões no período`,
      color: '#F59E0B',
      borderGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      icon: <DollarSign style={{ width: 18, height: 18, color: '#F59E0B' }} />,
      iconBg: 'rgba(245,158,11,0.12)',
    },
    {
      label: 'Total Vendido',
      value: formatCurrency(totalVendido),
      sub: 'volume total no período',
      color: '#10B981',
      borderGradient: 'linear-gradient(135deg, #10B981, #059669)',
      icon: <CheckCircle style={{ width: 18, height: 18, color: '#10B981' }} />,
      iconBg: 'rgba(16,185,129,0.12)',
    },
    {
      label: 'Melhor Vendedora',
      value: melhorVendedora,
      sub: 'maior comissão do período',
      color: '#8E5FCF',
      borderGradient: 'linear-gradient(135deg, #8E5FCF, #47118F)',
      icon: <Trophy style={{ width: 18, height: 18, color: '#8E5FCF' }} />,
      iconBg: 'rgba(142,95,207,0.12)',
      smallValue: true,
    },
    {
      label: 'Ticket Médio Comissão',
      value: formatCurrency(ticketMedio),
      sub: 'média por comissão',
      color: '#3B82F6',
      borderGradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      icon: <BarChart2 style={{ width: 18, height: 18, color: '#3B82F6' }} />,
      iconBg: 'rgba(59,130,246,0.12)',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
      {/* Orbs */}
      <div style={{
        position: 'fixed', top: -200, left: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)',
        zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: -150, right: -150,
        width: 400, height: 400, borderRadius: '50%',
        background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginBottom: 4, fontFamily: 'Gilroy, sans-serif' }}>
              Oasis › Comissões
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, margin: '0 0 4px 0',
              fontFamily: 'Gilroy, sans-serif',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {isAdmin ? 'Comissões' : 'Minhas Comissões'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
              {isAdmin ? 'Controle de comissões por vendedora' : 'Acompanhe suas vendas e comissões'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {isAdminOnly && (
              <button
                onClick={() => setMetaDialogOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', fontSize: 13, fontWeight: 600,
                  borderRadius: 12, border: '1px solid rgba(142,95,207,0.25)',
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)', color: '#47118F',
                  cursor: 'pointer', fontFamily: 'Gilroy, sans-serif',
                }}
              >
                <Target style={{ width: 14, height: 14 }} />
                Configurar Metas
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', fontSize: 13, fontWeight: 600,
                  borderRadius: 12, border: '1px solid rgba(142,95,207,0.25)',
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)', color: '#47118F',
                  cursor: 'pointer', fontFamily: 'Gilroy, sans-serif',
                }}>
                  <Download style={{ width: 14, height: 14 }} />
                  Exportar
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar CSV (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
          {kpiCards.map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              onMouseEnter={() => setHoveredKpi(idx)}
              onMouseLeave={() => setHoveredKpi(null)}
              style={{
                ...glassCard,
                padding: 24,
                borderTop: `4px solid ${card.color}`,
                transform: hoveredKpi === idx ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                  {card.label}
                </p>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <p style={{
                fontSize: card.smallValue ? '1.1rem' : '1.75rem',
                fontWeight: 700, color: card.color, margin: '0 0 4px 0',
                fontFamily: 'Gilroy, sans-serif',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}>
                {card.value}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                {card.sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          ...glassCard,
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {/* Vendor filter (admin only) */}
          {isAdmin && (
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger style={{
                background: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(142,95,207,0.2)',
                borderRadius: 12, padding: '10px 14px',
                fontFamily: 'Gilroy, sans-serif', fontSize: 13,
                minWidth: 200, height: 'auto',
              }}>
                <Users className="h-4 w-4 mr-2 text-purple-500" />
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vendedores.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date range */}
          <DateRangePicker
            value={dateRange.from || dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
            onChange={(range) => setDateRange({ from: range?.from, to: range?.to })}
            placeholder="Selecione o período"
          />
        </div>

        {/* Meta Progress Section */}
        {Object.keys(metas).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              fontSize: '1rem', fontWeight: 700, marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'Gilroy, sans-serif', color: '#1F2937',
            }}>
              <Target style={{ width: 18, height: 18, color: '#8E5FCF' }} />
              Metas do Mês
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isAdmin ? 'repeat(3, 1fr)' : '1fr',
              gap: 16,
              maxWidth: isAdmin ? undefined : 400,
            }}>
              {isAdmin ? (
                Object.entries(metas).map(([vendedorId, meta]) => {
                  const vendido = comissoes
                    .filter(c => c.vendedor_id === vendedorId)
                    .reduce((s, c) => s + Number(c.valor_base), 0);
                  return (
                    <MetaVendedorCard
                      key={vendedorId}
                      vendedorNome={getVendedorNome(vendedorId)}
                      meta={meta}
                      vendido={vendido}
                      showVendedorName={true}
                    />
                  );
                })
              ) : (
                user && metas[user.id] ? (
                  <MetaVendedorCard
                    vendedorNome=""
                    meta={metas[user.id]}
                    vendido={totalVendido}
                    showVendedorName={false}
                  />
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Evolution Chart */}
        {chartData.length > 1 && (
          <div style={{ ...glassCard, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(142,95,207,0.08)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                Evolução de Comissões
              </h3>
            </div>
            <div style={{ padding: '20px 24px', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorVendido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8E5FCF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8E5FCF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorComissao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(142,95,207,0.2)',
                      borderRadius: 12, padding: '12px 16px',
                      fontFamily: 'Gilroy, sans-serif',
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'vendido' ? 'Vendido' : 'Comissão']}
                  />
                  <Area type="monotone" dataKey="vendido" stroke="#8E5FCF" fillOpacity={1} fill="url(#colorVendido)" strokeWidth={2} />
                  <Area type="monotone" dataKey="comissao" stroke="#10B981" fillOpacity={1} fill="url(#colorComissao)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ranking (admin only) */}
        {isAdmin && ranking.length > 0 && (
          <div style={{ ...glassCard, marginBottom: 24, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(142,95,207,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                  Ranking do Período
                </h3>
              </div>
              <span style={{
                background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 20, padding: '4px 12px',
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
              }}>
                {dateRange.from ? format(dateRange.from, 'MMM yyyy', { locale: ptBR }) : 'Período atual'}
              </span>
            </div>

            {/* List */}
            <div>
              {ranking.map((r, idx) => (
                <motion.div
                  key={r.vendedor_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                  onMouseEnter={() => setHoveredRankRow(r.vendedor_id)}
                  onMouseLeave={() => setHoveredRankRow(null)}
                  style={{
                    padding: '16px 24px',
                    borderBottom: idx < ranking.length - 1 ? '1px solid rgba(142,95,207,0.06)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: hoveredRankRow === r.vendedor_id ? 'rgba(142,95,207,0.04)' : 'transparent',
                    transition: 'background 0.15s ease',
                    cursor: 'default',
                  }}
                >
                  {/* Medal */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: idx < 3 ? 18 : 13, fontWeight: 700,
                    color: idx < 3 ? undefined : '#8E5FCF',
                    flexShrink: 0,
                    ...getMedalStyle(idx),
                  }}>
                    {getMedalLabel(idx)}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Gilroy, sans-serif',
                  }}>
                    {getInitials(getVendedorNome(r.vendedor_id))}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: '0 0 4px 0', fontFamily: 'Gilroy, sans-serif' }}>
                      {getVendedorNome(r.vendedor_id)}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 6px 0', fontFamily: 'Gilroy, sans-serif' }}>
                      {r.qtd} venda{r.qtd !== 1 ? 's' : ''} no período
                    </p>
                    {/* Progress bar */}
                    <div style={{ height: 6, borderRadius: 99, background: 'rgba(142,95,207,0.1)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round((r.total_comissao / maxRankComissao) * 100)}%`,
                        background: getBarColor(idx),
                        borderRadius: 99,
                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </div>
                  </div>

                  {/* Values */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#8E5FCF', margin: '0 0 2px 0', fontFamily: 'Gilroy, sans-serif' }}>
                      {formatCurrency(r.total_comissao)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                      {r.total_vendido > 0
                        ? `${((r.total_comissao / r.total_vendido) * 100).toFixed(1)}% de ${formatCurrency(r.total_vendido)}`
                        : formatCurrency(r.total_vendido)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed table */}
        <div style={{ ...glassCard, overflow: 'hidden' }}>
          {/* Table header bar */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(142,95,207,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                Detalhamento
              </h3>
            </div>
            <span style={{
              background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
              borderRadius: 20, padding: '4px 12px',
              fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
            }}>
              {totalCount} registros
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
              <Loader2 style={{ width: 28, height: 28, margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
              Carregando...
            </div>
          ) : paginatedComissoes.length === 0 && !pageLoading ? (
            /* Empty state */
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Award style={{ width: 36, height: 36, color: '#8E5FCF', opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: '0 0 8px 0', fontFamily: 'Gilroy, sans-serif' }}>
                Nenhuma comissão encontrada
              </p>
              <p style={{ fontSize: 14, color: '#9CA3AF', maxWidth: 300, margin: '0 auto', fontFamily: 'Gilroy, sans-serif', lineHeight: 1.5 }}>
                As comissões serão geradas automaticamente a cada venda
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {pageLoading && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  background: 'rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <Loader2 style={{ width: 24, height: 24, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
                </div>
              )}

              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isAdmin ? '180px 1fr 100px 130px 80px 130px' : '1fr 100px 130px 80px 130px',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))',
                padding: '12px 20px', gap: 12,
                borderBottom: '1px solid rgba(142,95,207,0.08)',
              }}>
                {isAdmin && (
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Vendedora
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cliente / Produtos
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Data
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Valor Venda
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  %
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Comissão
                </span>
              </div>

              {/* Rows */}
              {paginatedComissoes.map(c => (
                <div
                  key={c.id}
                  onMouseEnter={() => setHoveredRow(c.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isAdmin ? '180px 1fr 100px 130px 80px 130px' : '1fr 100px 130px 80px 130px',
                    padding: '14px 20px', gap: 12, alignItems: 'center',
                    borderBottom: '1px solid rgba(142,95,207,0.06)',
                    background: hoveredRow === c.id ? 'rgba(142,95,207,0.04)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(142,95,207,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif',
                      }}>
                        {getInitials(getVendedorNome(c.vendedor_id))}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getVendedorNome(c.vendedor_id)}
                      </span>
                    </div>
                  )}

                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '0 0 2px 0', fontFamily: 'Gilroy, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.venda_cliente_nome || '-'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.venda_produtos || '—'}
                    </p>
                  </div>

                  <span style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif' }}>
                    {c.venda_data ? format(new Date(c.venda_data), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  </span>

                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', textAlign: 'right' }}>
                    {formatCurrency(Number(c.valor_base))}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{
                      background: 'rgba(107,114,128,0.08)', color: '#6B7280',
                      borderRadius: 20, padding: '3px 8px',
                      fontSize: '0.75rem', fontFamily: 'Gilroy, sans-serif', fontWeight: 600,
                    }}>
                      {c.percentual}%
                    </span>
                  </div>

                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif', textAlign: 'right' }}>
                    {formatCurrency(Number(c.valor_comissao))}
                  </span>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', borderTop: '1px solid rgba(142,95,207,0.08)',
                }}>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                    Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      disabled={page === 0 || pageLoading}
                      onClick={() => setPage(p => p - 1)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '7px 14px', fontSize: 13, fontWeight: 600,
                        borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)',
                        background: 'rgba(255,255,255,0.6)', color: '#47118F',
                        cursor: page === 0 || pageLoading ? 'not-allowed' : 'pointer',
                        opacity: page === 0 || pageLoading ? 0.5 : 1,
                        fontFamily: 'Gilroy, sans-serif',
                      }}
                    >
                      <ChevronLeft style={{ width: 14, height: 14 }} />
                      Anterior
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#47118F', padding: '0 8px', fontFamily: 'Gilroy, sans-serif' }}>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1 || pageLoading}
                      onClick={() => setPage(p => p + 1)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '7px 14px', fontSize: 13, fontWeight: 600,
                        borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)',
                        background: 'rgba(255,255,255,0.6)', color: '#47118F',
                        cursor: page >= totalPages - 1 || pageLoading ? 'not-allowed' : 'pointer',
                        opacity: page >= totalPages - 1 || pageLoading ? 0.5 : 1,
                        fontFamily: 'Gilroy, sans-serif',
                      }}
                    >
                      Próxima
                      <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meta Config Dialog */}
        {isAdminOnly && empresaId && (
          <MetaConfigDialog
            open={metaDialogOpen}
            onOpenChange={setMetaDialogOpen}
            empresaId={empresaId}
            vendedores={vendedores}
            onSaved={fetchMetas}
          />
        )}
      </div>
    </div>
  );
};

export default Comissoes;
