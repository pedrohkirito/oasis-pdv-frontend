import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Lock, Unlock, Download, FileSpreadsheet, FileText, DollarSign, Loader2, Award, TrendingUp, CheckCircle, CalendarIcon, X } from 'lucide-react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useEmpresa } from '@/hooks/useEmpresa';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { escapeHtml } from '@/utils/htmlSanitize';

interface FechamentoRow {
  mes_referencia: string;
  status: string;
  total_vendido: number;
  total_comissao: number;
  data_fechamento: string | null;
  id?: string;
}

interface ComissaoDetalhe {
  vendedor_id: string;
  vendedor_nome: string;
  venda_data: string;
  cliente_nome: string;
  valor_bruto: number;
  desconto: number;
  valor_final: number;
  percentual: number;
  valor_comissao: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// --- Style constants ---
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 20,
};

const FechamentoComissoes = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  const [fechamentos, setFechamentos] = useState<FechamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; mes: string; action: 'fechar' | 'reabrir' }>({ open: false, mes: '', action: 'fechar' });
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);

  // UI state
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  useEffect(() => {
    if (user && empresaId) {
      fetchData();
      fetchVendedores();
    }
  }, [user, empresaId]);

  const fetchVendedores = async () => {
    if (!empresaId) return;
    try {
      const response = await api.functions.invoke('list-users', { method: 'POST', body: { empresa_id: empresaId } });
      if (response.data?.users) {
        setVendedores(response.data.users.map((u: any) => ({
          id: u.id,
          nome: u.nome || u.email?.split('@')[0] || 'Sem nome',
        })));
      }
    } catch (e) { console.error(e); }
  };

  const getVendedorNome = (id: string) => vendedores.find(v => v.id === id)?.nome || id.substring(0, 8);

  const fetchData = async () => {
    if (!empresaId) return;
    setLoading(true);

    // Generate last 12 months
    const meses: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(startOfMonth(new Date()), i);
      meses.push(format(d, 'yyyy-MM'));
    }

    // Fetch existing fechamentos
    const { data: fechData } = await api
      .from('fechamento_comissao')
      .select('*')
      .eq('empresa_id', empresaId);

    const fechMap: Record<string, any> = {};
    (fechData || []).forEach((f: any) => { fechMap[f.mes_referencia] = f; });

    // Fetch all comissoes with vendas data
    const { data: comissoes } = await api
      .from('comissoes')
      .select('*')
      .eq('empresa_id', empresaId);

    const vendaIds = [...new Set((comissoes || []).map(c => c.venda_id))];
    let vendasMap: Record<string, any> = {};
    if (vendaIds.length > 0) {
      const { data: vendas } = await api
        .from('vendas')
        .select('id, data_venda, valor_bruto, desconto, valor_final')
        .in('id', vendaIds)
        .eq('empresa_id', empresaId);
      (vendas || []).forEach(v => { vendasMap[v.id] = v; });
    }

    // Aggregate by month
    const monthTotals: Record<string, { vendido: number; comissao: number }> = {};
    (comissoes || []).forEach(c => {
      const venda = vendasMap[c.venda_id];
      if (!venda?.data_venda) return;
      const mes = venda.data_venda.substring(0, 7);
      if (!monthTotals[mes]) monthTotals[mes] = { vendido: 0, comissao: 0 };
      monthTotals[mes].vendido += Number(c.valor_base);
      monthTotals[mes].comissao += Number(c.valor_comissao);
    });

    const rows: FechamentoRow[] = meses.map(mes => {
      const fech = fechMap[mes];
      const totals = monthTotals[mes] || { vendido: 0, comissao: 0 };
      return {
        mes_referencia: mes,
        status: fech?.status || 'aberto',
        total_vendido: fech?.status === 'fechado' ? Number(fech.total_vendido) : totals.vendido,
        total_comissao: fech?.status === 'fechado' ? Number(fech.total_comissao) : totals.comissao,
        data_fechamento: fech?.data_fechamento || null,
        id: fech?.id,
      };
    });

    setFechamentos(rows);
    setLoading(false);
  };

  const handleFecharMes = async (mes: string) => {
    if (!empresaId || !user) return;
    setActionLoading(mes);

    const row = fechamentos.find(f => f.mes_referencia === mes);

    try {
      if (row?.id) {
        await api
          .from('fechamento_comissao')
          .update({
            status: 'fechado',
            data_fechamento: new Date().toISOString(),
            fechado_por: user.id,
            total_vendido: row.total_vendido,
            total_comissao: row.total_comissao,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', row.id);
      } else {
        await api.from('fechamento_comissao').insert({
          empresa_id: empresaId,
          mes_referencia: mes,
          status: 'fechado',
          data_fechamento: new Date().toISOString(),
          fechado_por: user.id,
          total_vendido: row?.total_vendido || 0,
          total_comissao: row?.total_comissao || 0,
        } as any);
      }

      toast({ title: 'Mês fechado', description: `Comissões de ${formatMesLabel(mes)} foram consolidadas.` });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReabrirMes = async (mes: string) => {
    if (!empresaId) return;
    setActionLoading(mes);

    try {
      const row = fechamentos.find(f => f.mes_referencia === mes);
      if (row?.id) {
        await api
          .from('fechamento_comissao')
          .update({ status: 'aberto', data_fechamento: null, updated_at: new Date().toISOString() } as any)
          .eq('id', row.id);
      }
      toast({ title: 'Mês reaberto', description: `O período ${formatMesLabel(mes)} foi reaberto para alterações.` });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatMesLabel = (mes: string) => {
    if (!mes || !mes.includes('-')) return mes || '';
    const [y, m] = mes.split('-');
    const year = Number(y);
    const month = Number(m);
    if (isNaN(year) || isNaN(month)) return mes;
    const d = new Date(year, month - 1, 1);
    if (isNaN(d.getTime())) return mes;
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const fetchDetalhesForExport = async (mes: string): Promise<ComissaoDetalhe[]> => {
    if (!empresaId) return [];

    const startDate = `${mes}-01`;
    const [y, m] = mes.split('-');
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const endDate = `${mes}-${String(lastDay).padStart(2, '0')}`;

    const { data: vendas } = await api
      .from('vendas')
      .select('id, data_venda, cliente_nome, valor_bruto, desconto, valor_final, vendedor_id')
      .eq('empresa_id', empresaId)
      .gte('data_venda', startDate)
      .lte('data_venda', endDate);

    if (!vendas || vendas.length === 0) return [];

    const vendaIds = vendas.map(v => v.id);
    const { data: comissoes } = await api
      .from('comissoes')
      .select('*')
      .in('venda_id', vendaIds);

    const comissaoMap: Record<string, any> = {};
    (comissoes || []).forEach(c => { comissaoMap[c.venda_id] = c; });

    return vendas
      .filter(v => comissaoMap[v.id])
      .map(v => ({
        vendedor_id: v.vendedor_id || comissaoMap[v.id]?.vendedor_id || '',
        vendedor_nome: getVendedorNome(v.vendedor_id || comissaoMap[v.id]?.vendedor_id || ''),
        venda_data: v.data_venda,
        cliente_nome: v.cliente_nome,
        valor_bruto: Number(v.valor_bruto || 0),
        desconto: Number(v.desconto || 0),
        valor_final: Number(v.valor_final || v.valor_bruto || 0),
        percentual: Number(comissaoMap[v.id]?.percentual || 0),
        valor_comissao: Number(comissaoMap[v.id]?.valor_comissao || 0),
      }));
  };

  const handleExportCSV = async (mes: string) => {
    const detalhes = await fetchDetalhesForExport(mes);
    if (detalhes.length === 0) {
      toast({ title: 'Sem dados', description: 'Nenhuma comissão neste período.', variant: 'destructive' });
      return;
    }

    // Group by vendedor
    const vendedorMap: Record<string, ComissaoDetalhe[]> = {};
    detalhes.forEach(d => {
      if (!vendedorMap[d.vendedor_nome]) vendedorMap[d.vendedor_nome] = [];
      vendedorMap[d.vendedor_nome].push(d);
    });

    const lines: string[] = [];
    lines.push('Vendedora;Data;Cliente;Valor Bruto;Desconto;Valor Final;% Comissão;Comissão');

    Object.entries(vendedorMap).forEach(([nome, items]) => {
      items.forEach(d => {
        lines.push([
          nome,
          format(new Date(d.venda_data), 'dd/MM/yyyy'),
          d.cliente_nome,
          d.valor_bruto.toFixed(2).replace('.', ','),
          d.desconto.toFixed(2).replace('.', ','),
          d.valor_final.toFixed(2).replace('.', ','),
          `${d.percentual}%`,
          d.valor_comissao.toFixed(2).replace('.', ','),
        ].join(';'));
      });

      const totalVendido = items.reduce((s, i) => s + i.valor_final, 0);
      const totalComissao = items.reduce((s, i) => s + i.valor_comissao, 0);
      lines.push(`${nome} - TOTAL;;;;"";${totalVendido.toFixed(2).replace('.', ',')};;${totalComissao.toFixed(2).replace('.', ',')}`);
      lines.push('');
    });

    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fechamento_comissoes_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exportado com sucesso.' });
  };

  const handleExportPDF = async (mes: string) => {
    const detalhes = await fetchDetalhesForExport(mes);
    if (detalhes.length === 0) {
      toast({ title: 'Sem dados', description: 'Nenhuma comissão neste período.', variant: 'destructive' });
      return;
    }

    const vendedorMap: Record<string, ComissaoDetalhe[]> = {};
    detalhes.forEach(d => {
      if (!vendedorMap[d.vendedor_nome]) vendedorMap[d.vendedor_nome] = [];
      vendedorMap[d.vendedor_nome].push(d);
    });

    const row = fechamentos.find(f => f.mes_referencia === mes);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let vendedorSections = '';
    Object.entries(vendedorMap).forEach(([nome, items]) => {
      const totalV = items.reduce((s, i) => s + i.valor_final, 0);
      const totalC = items.reduce((s, i) => s + i.valor_comissao, 0);

      const rows = items.map(d => `
        <tr>
          <td>${format(new Date(d.venda_data), 'dd/MM/yyyy')}</td>
          <td>${escapeHtml(d.cliente_nome)}</td>
          <td style="text-align:right">${formatCurrency(d.valor_bruto)}</td>
          <td style="text-align:right">${formatCurrency(d.desconto)}</td>
          <td style="text-align:right">${formatCurrency(d.valor_final)}</td>
          <td style="text-align:center">${d.percentual}%</td>
          <td style="text-align:right">${formatCurrency(d.valor_comissao)}</td>
        </tr>
      `).join('');

      vendedorSections += `
        <h2 style="margin-top:24px;font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;">${escapeHtml(nome)}</h2>
        <table>
          <thead><tr>
            <th>Data</th><th>Cliente</th><th style="text-align:right">Valor Bruto</th>
            <th style="text-align:right">Desconto</th><th style="text-align:right">Valor Final</th>
            <th style="text-align:center">%</th><th style="text-align:right">Comissão</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr style="font-weight:bold;background:#f0f0f0;">
            <td colspan="4">Total ${escapeHtml(nome)}</td>
            <td style="text-align:right">${formatCurrency(totalV)}</td>
            <td></td>
            <td style="text-align:right">${formatCurrency(totalC)}</td>
          </tr></tfoot>
        </table>
      `;
    });

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Fechamento ${formatMesLabel(mes)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
        .summary { display: flex; gap: 24px; margin-bottom: 16px; }
        .summary-item { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; }
        .summary-item .label { font-size: 11px; color: #888; }
        .summary-item .value { font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
        th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
        th { background: #f0f0f0; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Fechamento de Comissões — ${formatMesLabel(mes)}</h1>
      <p class="subtitle">Status: ${row?.status === 'fechado' ? 'FECHADO' : 'ABERTO'} | Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
      <div class="summary">
        <div class="summary-item"><div class="label">Total Vendido</div><div class="value">${formatCurrency(row?.total_vendido || 0)}</div></div>
        <div class="summary-item"><div class="label">Total Comissão</div><div class="value" style="color:#16a34a">${formatCurrency(row?.total_comissao || 0)}</div></div>
      </div>
      ${vendedorSections}
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const confirmAction = () => {
    if (confirmDialog.action === 'fechar') {
      handleFecharMes(confirmDialog.mes);
    } else {
      handleReabrirMes(confirmDialog.mes);
    }
    setConfirmDialog({ open: false, mes: '', action: 'fechar' });
  };

  // Derived KPI values (no new state/queries)
  const mesesFechados = fechamentos.filter(f => f.status === 'fechado').length;
  const mesesAbertos = fechamentos.filter(f => f.status === 'aberto').length;
  const totalVendidoGeral = fechamentos.reduce((s, f) => s + f.total_vendido, 0);
  const totalComissaoGeral = fechamentos.reduce((s, f) => s + f.total_comissao, 0);

  const kpiCards = [
    {
      label: 'Meses Fechados',
      value: String(mesesFechados),
      sub: 'períodos consolidados',
      color: '#10B981',
      icon: <Lock style={{ width: 18, height: 18, color: '#10B981' }} />,
      iconBg: 'rgba(16,185,129,0.12)',
    },
    {
      label: 'Meses em Aberto',
      value: String(mesesAbertos),
      sub: 'aguardando fechamento',
      color: '#F59E0B',
      icon: <Unlock style={{ width: 18, height: 18, color: '#F59E0B' }} />,
      iconBg: 'rgba(245,158,11,0.12)',
    },
    {
      label: 'Total Vendido (12m)',
      value: formatCurrency(totalVendidoGeral),
      sub: 'últimos 12 meses',
      color: '#8E5FCF',
      icon: <TrendingUp style={{ width: 18, height: 18, color: '#8E5FCF' }} />,
      iconBg: 'rgba(142,95,207,0.12)',
    },
    {
      label: 'Total Comissões (12m)',
      value: formatCurrency(totalComissaoGeral),
      sub: 'últimos 12 meses',
      color: '#F59E0B',
      icon: <Award style={{ width: 18, height: 18, color: '#F59E0B' }} />,
      iconBg: 'rgba(245,158,11,0.12)',
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
              Oasis › Fechamento
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, margin: '0 0 4px 0',
              fontFamily: 'Gilroy, sans-serif',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Fechamento de Comissões
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
              Gerencie o fechamento mensal de comissões e exporte relatórios
            </p>
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
                fontSize: '1.75rem', fontWeight: 700, color: card.color,
                margin: '0 0 4px 0', fontFamily: 'Gilroy, sans-serif',
                lineHeight: 1.2, wordBreak: 'break-word',
              }}>
                {card.value}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                {card.sub}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Main table card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{ ...glassCard, overflow: 'hidden' }}
        >
          {/* Card header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(142,95,207,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CalendarIcon style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                Períodos Mensais
              </h3>
            </div>
            <span style={{
              background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
              borderRadius: 20, padding: '4px 12px',
              fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
            }}>
              Últimos 12 meses
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Loader2 style={{ width: 28, height: 28, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
              Carregando fechamentos...
            </div>
          ) : fechamentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CalendarIcon style={{ width: 36, height: 36, color: '#8E5FCF', opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: '0 0 8px 0', fontFamily: 'Gilroy, sans-serif' }}>
                Nenhum dado para o período
              </p>
              <p style={{ fontSize: 14, color: '#9CA3AF', maxWidth: 320, margin: '0 auto', fontFamily: 'Gilroy, sans-serif', lineHeight: 1.5 }}>
                Selecione um período com vendas registradas para gerar o fechamento
              </p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 180px 180px 200px',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))',
                padding: '12px 24px', gap: 12,
                borderBottom: '1px solid rgba(142,95,207,0.08)',
              }}>
                {['Mês', 'Status', 'Total Vendido', 'Total Comissão', 'Ações'].map((col, i) => (
                  <span key={col} style={{
                    fontSize: '0.75rem', color: '#6B7280', fontWeight: 600,
                    fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: i >= 2 && i <= 3 ? 'right' : i === 4 ? 'right' : 'left',
                  }}>
                    {col}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {fechamentos.map((f, idx) => (
                <motion.div
                  key={f.mes_referencia}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.03, duration: 0.3 }}
                  onMouseEnter={() => setHoveredRow(f.mes_referencia)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 180px 180px 200px',
                    padding: '16px 24px', gap: 12, alignItems: 'center',
                    borderBottom: idx < fechamentos.length - 1 ? '1px solid rgba(142,95,207,0.06)' : 'none',
                    background: hoveredRow === f.mes_referencia ? 'rgba(142,95,207,0.04)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Month name */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: '0 0 2px 0', fontFamily: 'Gilroy, sans-serif', textTransform: 'capitalize' }}>
                      {formatMesLabel(f.mes_referencia)}
                    </p>
                    {f.data_fechamento && (
                      <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                        Fechado em {format(new Date(f.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div>
                    {f.status === 'fechado' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'rgba(16,185,129,0.1)', color: '#10B981',
                        border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: 20, padding: '5px 12px',
                        fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
                      }}>
                        <Lock style={{ width: 11, height: 11 }} />
                        Fechado
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                        border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: 20, padding: '5px 12px',
                        fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
                      }}>
                        <Unlock style={{ width: 11, height: 11 }} />
                        Aberto
                      </span>
                    )}
                  </div>

                  {/* Total vendido */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                      {formatCurrency(f.total_vendido)}
                    </span>
                  </div>

                  {/* Total comissão */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif' }}>
                      {formatCurrency(f.total_comissao)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    {/* Export dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button style={{
                          width: 34, height: 34, borderRadius: 9,
                          border: '1px solid rgba(142,95,207,0.2)',
                          background: 'rgba(255,255,255,0.6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#6B7280',
                          transition: 'all 0.15s ease',
                        }}>
                          <Download style={{ width: 14, height: 14 }} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportCSV(f.mes_referencia)}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (CSV)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPDF(f.mes_referencia)}>
                          <FileText className="h-4 w-4 mr-2" /> PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Close / Reopen */}
                    {isAdmin && (
                      f.status === 'aberto' ? (
                        <button
                          disabled={actionLoading === f.mes_referencia}
                          onClick={() => setConfirmDialog({ open: true, mes: f.mes_referencia, action: 'fechar' })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', fontSize: 12, fontWeight: 700,
                            borderRadius: 10, border: 'none',
                            background: actionLoading === f.mes_referencia
                              ? 'rgba(142,95,207,0.3)'
                              : 'linear-gradient(135deg, #47118F, #8E5FCF)',
                            color: '#fff', cursor: actionLoading === f.mes_referencia ? 'not-allowed' : 'pointer',
                            fontFamily: 'Gilroy, sans-serif',
                            transition: 'all 0.2s',
                          }}
                        >
                          {actionLoading === f.mes_referencia
                            ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                            : <Lock style={{ width: 12, height: 12 }} />}
                          Fechar Mês
                        </button>
                      ) : (
                        <button
                          disabled={actionLoading === f.mes_referencia}
                          onClick={() => setConfirmDialog({ open: true, mes: f.mes_referencia, action: 'reabrir' })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', fontSize: 12, fontWeight: 600,
                            borderRadius: 10,
                            border: '1px solid rgba(142,95,207,0.2)',
                            background: 'rgba(255,255,255,0.6)',
                            color: '#6B7280', cursor: actionLoading === f.mes_referencia ? 'not-allowed' : 'pointer',
                            fontFamily: 'Gilroy, sans-serif',
                            opacity: actionLoading === f.mes_referencia ? 0.5 : 1,
                          }}
                        >
                          {actionLoading === f.mes_referencia
                            ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                            : <Unlock style={{ width: 12, height: 12 }} />}
                          Reabrir
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Footer totals */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 180px 180px 200px',
                padding: '14px 24px', gap: 12, alignItems: 'center',
                borderTop: '2px solid rgba(142,95,207,0.1)',
                background: 'linear-gradient(135deg, rgba(142,95,207,0.04), rgba(71,17,143,0.02))',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                  Total — 12 meses
                </span>
                <span />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', textAlign: 'right' }}>
                  {formatCurrency(totalVendidoGeral)}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif', textAlign: 'right' }}>
                  {formatCurrency(totalComissaoGeral)}
                </span>
                <span />
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      {confirmDialog.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(71,17,143,0.15)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(142,95,207,0.15)',
              borderRadius: 24,
              boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
              width: '100%', maxWidth: 480,
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '24px 24px 20px',
              borderBottom: '1px solid rgba(142,95,207,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: confirmDialog.action === 'fechar'
                    ? 'rgba(16,185,129,0.12)'
                    : 'rgba(245,158,11,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {confirmDialog.action === 'fechar'
                    ? <Lock style={{ width: 18, height: 18, color: '#10B981' }} />
                    : <Unlock style={{ width: 18, height: 18, color: '#F59E0B' }} />}
                </div>
                <div>
                  <h2 style={{
                    fontSize: 16, fontWeight: 700, margin: 0,
                    fontFamily: 'Gilroy, sans-serif',
                    background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {confirmDialog.action === 'fechar' ? 'Fechar Comissão do Mês' : 'Reabrir Mês'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setConfirmDialog({ open: false, mes: '', action: 'fechar' })}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: '1px solid rgba(142,95,207,0.15)',
                  background: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6B7280',
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Period summary card */}
              <div style={{
                background: 'rgba(142,95,207,0.06)',
                border: '1px solid rgba(142,95,207,0.15)',
                borderRadius: 16, padding: 20,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>
                      Período
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif', textTransform: 'capitalize' }}>
                      {formatMesLabel(confirmDialog.mes)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>
                      Total Vendido
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#8E5FCF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                      {formatCurrency(fechamentos.find(f => f.mes_referencia === confirmDialog.mes)?.total_vendido || 0)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>
                      Comissões
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#10B981', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                      {formatCurrency(fechamentos.find(f => f.mes_referencia === confirmDialog.mes)?.total_comissao || 0)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>
                      Ação
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: confirmDialog.action === 'fechar' ? '#10B981' : '#F59E0B', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                      {confirmDialog.action === 'fechar' ? 'Fechar período' : 'Reabrir período'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                background: 'rgba(245,158,11,0.06)',
                borderLeft: '4px solid #F59E0B',
                borderRadius: 12, padding: '14px 16px',
              }}>
                <p style={{ fontSize: '0.875rem', color: '#F59E0B', margin: 0, fontFamily: 'Gilroy, sans-serif', lineHeight: 1.5 }}>
                  {confirmDialog.action === 'fechar'
                    ? '⚠ Ao fechar o mês, as comissões serão consolidadas e não será possível editar vendas deste período.'
                    : '⚠ Ao reabrir o mês, será possível editar vendas e recalcular comissões deste período.'}
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(142,95,207,0.1)',
              display: 'flex', gap: 12,
            }}>
              <button
                onClick={() => setConfirmDialog({ open: false, mes: '', action: 'fechar' })}
                style={{
                  flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600,
                  borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)',
                  background: 'transparent', color: '#6B7280',
                  cursor: 'pointer', fontFamily: 'Gilroy, sans-serif',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                style={{
                  flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700,
                  borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                  color: '#fff', cursor: 'pointer',
                  fontFamily: 'Gilroy, sans-serif',
                }}
              >
                {confirmDialog.action === 'fechar' ? 'Confirmar Fechamento' : 'Confirmar Reabertura'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FechamentoComissoes;
