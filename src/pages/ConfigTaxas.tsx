import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Percent, ChevronDown, Calculator, BarChart2, TrendingDown, Banknote, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GerenciarMetodosPagamento from '@/components/config/GerenciarMetodosPagamento';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// ─── Constantes ───────────────────────────────────────────────────────────────

const BANDEIRAS = ['MasterCard', 'Visa', 'Amex', 'Elo'];

const BANDEIRAS_INFO: Record<string, { logo: string; bg: string; color: string; short: string }> = {
  MasterCard: {
    logo: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/mastercard.svg',
    bg: '#EB001B', color: '#fff', short: 'MC',
  },
  Visa: {
    logo: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/visa.svg',
    bg: '#1A1F71', color: '#fff', short: 'VI',
  },
  Amex: {
    logo: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/amex.svg',
    bg: '#2E77BC', color: '#fff', short: 'AX',
  },
  Elo: {
    logo: 'https://raw.githubusercontent.com/aaronfagan/svg-credit-card-payment-icons/main/flat/elo.svg',
    bg: '#FFD700', color: '#333', short: 'EL',
  },
};

interface TaxaRow {
  metodo_pagamento: string;
  parcelas: number;
  bandeira: string;
  taxa_percentual: number;
  tipo_taxa: 'percentual' | 'fixo';
  prazo_recebimento: 'mesmo_dia' | 'dia_seguinte' | 'parcelado';
}

const formatCurrency = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

// ─── Mock chart data ──────────────────────────────────────────────────────────

const CHART_DATA = [
  { mes: 'Nov', faturamento: 12000, taxas: 280 },
  { mes: 'Dez', faturamento: 18500, taxas: 430 },
  { mes: 'Jan', faturamento: 14000, taxas: 320 },
  { mes: 'Fev', faturamento: 16200, taxas: 380 },
  { mes: 'Mar', faturamento: 21000, taxas: 490 },
  { mes: 'Abr', faturamento: 19800, taxas: 455 },
];

// ─── Bandeira logo com fallback ───────────────────────────────────────────────

function BandeiraBadge({ bandeira, size = 'md' }: { bandeira: string; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const info = BANDEIRAS_INFO[bandeira] ?? { bg: '#8E5FCF', color: '#fff', short: bandeira.slice(0, 2).toUpperCase(), logo: '' };
  const dims = size === 'sm' ? { w: 36, h: 24 } : size === 'lg' ? { w: 60, h: 40 } : { w: 48, h: 32 };

  if (!imgError && info.logo) {
    return (
      <img
        src={info.logo}
        alt={bandeira}
        onError={() => setImgError(true)}
        style={{ width: dims.w, height: dims.h, objectFit: 'contain', borderRadius: 4, flexShrink: 0, display: 'block' }}
      />
    );
  }
  return (
    <div style={{ width: dims.w, height: dims.h, borderRadius: 6, background: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: info.color, fontFamily: 'Gilroy, sans-serif', letterSpacing: '0.02em' }}>{info.short}</span>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const fat = payload.find((p: any) => p.dataKey === 'faturamento')?.value ?? 0;
  const tax = payload.find((p: any) => p.dataKey === 'taxas')?.value ?? 0;
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12, padding: '12px 16px', fontFamily: 'Gilroy, sans-serif' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 12, color: '#8E5FCF', margin: '2px 0' }}>Faturamento: {formatCurrency(fat)}</p>
      <p style={{ fontSize: 12, color: '#EF4444', margin: '2px 0' }}>Custo taxas: {formatCurrency(tax)}</p>
      <p style={{ fontSize: 12, color: '#10B981', margin: '2px 0' }}>Líquido: {formatCurrency(fat - tax)}</p>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>% taxa: {((tax / fat) * 100).toFixed(2)}%</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfigTaxas() {
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const [taxas, setTaxas] = useState<TaxaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTabCredito, setActiveTabCredito] = useState('MasterCard');
  const [activeTabDebito, setActiveTabDebito] = useState('MasterCard');
  const [expandedCredito, setExpandedCredito] = useState(false);
  const [expandedDebito, setExpandedDebito] = useState(false);
  const [metodosAtivos, setMetodosAtivos] = useState<string[]>([]);

  const fetchMetodosAtivos = useCallback(async () => {
    if (!empresaId) return;
    const { data } = await api
      .from('metodos_pagamento')
      .select('nome, ativo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true);
    if (data) {
      setMetodosAtivos(data.map((m: any) => m.nome));
    }
  }, [empresaId]);

  useEffect(() => { fetchMetodosAtivos(); }, [fetchMetodosAtivos]);

  const isMetodoAtivo = (nome: string) => metodosAtivos.length === 0 || metodosAtivos.includes(nome);

  const buildInitialTaxas = useCallback((): TaxaRow[] => {
    const rows: TaxaRow[] = [];
    for (const m of ['Dinheiro', 'PIX', 'Boleto']) {
      rows.push({ metodo_pagamento: m, parcelas: 0, bandeira: '', taxa_percentual: 0, tipo_taxa: 'percentual', prazo_recebimento: 'parcelado' });
    }
    for (const b of BANDEIRAS) {
      rows.push({ metodo_pagamento: 'Cartão de Crédito', parcelas: 0, bandeira: b, taxa_percentual: 0, tipo_taxa: 'percentual', prazo_recebimento: 'parcelado' });
      for (let i = 2; i <= 12; i++) {
        rows.push({ metodo_pagamento: 'Cartão de Crédito', parcelas: i, bandeira: b, taxa_percentual: 0, tipo_taxa: 'percentual', prazo_recebimento: 'parcelado' });
      }
    }
    for (const b of BANDEIRAS) {
      rows.push({ metodo_pagamento: 'Cartão de Débito', parcelas: 0, bandeira: b, taxa_percentual: 0, tipo_taxa: 'percentual', prazo_recebimento: 'parcelado' });
    }
    return rows;
  }, []);

  const fetchTaxas = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const initial = buildInitialTaxas();
    const { data } = await api
      .from('taxas_pagamento')
      .select('metodo_pagamento, taxa_percentual, parcelas, bandeira, tipo_taxa, prazo_recebimento')
      .eq('empresa_id', empresaId);

    if (data) {
      const merged = initial.map(row => {
        const found = (data as any[]).find(
          d => d.metodo_pagamento === row.metodo_pagamento &&
               Number(d.parcelas) === row.parcelas &&
               (d.bandeira || '') === row.bandeira
        );
        return found
          ? { ...row, taxa_percentual: Number(found.taxa_percentual), tipo_taxa: found.tipo_taxa || 'percentual', prazo_recebimento: found.prazo_recebimento || 'parcelado' }
          : row;
      });
      setTaxas(merged as TaxaRow[]);
    } else {
      setTaxas(initial);
    }
    setLoading(false);
  }, [empresaId, buildInitialTaxas]);

  useEffect(() => { fetchTaxas(); }, [fetchTaxas]);

  const handleChange = (metodo: string, parcelas: number, bandeira: string, field: 'taxa_percentual' | 'tipo_taxa' | 'prazo_recebimento', valor: string) => {
    setTaxas(prev =>
      prev.map(t =>
        t.metodo_pagamento === metodo && t.parcelas === parcelas && t.bandeira === bandeira
          ? { ...t, [field]: field === 'taxa_percentual' ? (parseFloat(valor.replace(',', '.')) || 0) : valor }
          : t
      )
    );
  };

  const handleMaskedInput = (metodo: string, parcelas: number, bandeira: string, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    handleChange(metodo, parcelas, bandeira, 'taxa_percentual', num.toString());
  };

  const formatTaxaDisplay = (value: number | undefined) => {
    if (!value || value === 0) return '';
    return value.toFixed(2).replace('.', ',');
  };

  const getTaxa = (metodo: string, parcelas: number, bandeira: string) =>
    taxas.find(t => t.metodo_pagamento === metodo && t.parcelas === parcelas && t.bandeira === bandeira);

  const handleSalvar = async () => {
    if (!empresaId) return;
    setSaving(true);
    for (const taxa of taxas) {
      const { error } = await api
        .from('taxas_pagamento')
        .upsert(
          {
            empresa_id: empresaId,
            metodo_pagamento: taxa.metodo_pagamento,
            parcelas: taxa.parcelas,
            bandeira: taxa.bandeira,
            taxa_percentual: taxa.taxa_percentual,
            tipo_taxa: taxa.tipo_taxa,
            prazo_recebimento: taxa.prazo_recebimento,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'empresa_id,metodo_pagamento,parcelas,bandeira' }
        );
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }
    toast({ title: 'Taxas salvas com sucesso!' });
    setSaving(false);
  };

  const calcLiquido = (valor: number, taxa: TaxaRow | undefined) => {
    if (!taxa || taxa.taxa_percentual <= 0) return valor;
    return taxa.tipo_taxa === 'fixo'
      ? valor - taxa.taxa_percentual
      : valor - (valor * taxa.taxa_percentual / 100);
  };

  // ── UI-only states ─────────────────────────────────────────────────────────
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [chartPeriodo, setChartPeriodo] = useState<'semanal' | 'mensal' | 'anual'>('mensal');
  const [simValorRaw, setSimValorRaw] = useState('100,00');
  const [simBandeira, setSimBandeira] = useState('MasterCard');
  const [simMetodo, setSimMetodo] = useState('Cartão de Crédito');
  const [simParcelas, setSimParcelas] = useState(0);
  const [simDropdownOpen, setSimDropdownOpen] = useState(false);

  // ── KPI computations ───────────────────────────────────────────────────────
  const avg = (arr: TaxaRow[]) => arr.length === 0 ? 0 : arr.reduce((s, t) => s + t.taxa_percentual, 0) / arr.length;
  const avgDebito   = avg(taxas.filter(t => t.metodo_pagamento === 'Cartão de Débito'   && t.taxa_percentual > 0));
  const avgVistaAll = avg(taxas.filter(t => t.metodo_pagamento === 'Cartão de Crédito'  && t.parcelas === 0 && t.taxa_percentual > 0));
  const avgParc     = avg(taxas.filter(t => t.metodo_pagamento === 'Cartão de Crédito'  && t.parcelas > 0  && t.taxa_percentual > 0));

  // ── Custos reais em R$ no mês corrente ────────────────────────────────────
  const [custoDebito, setCustoDebito] = useState(0);
  const [custoCredito1x, setCustoCredito1x] = useState(0);
  const [custoParcelado, setCustoParcelado] = useState(0);
  const [custoTotalMes, setCustoTotalMes] = useState(0);

  useEffect(() => {
    const calcularCustos = async () => {
      if (!empresaId || taxas.length === 0) return;
      const now = new Date();
      const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const fim = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const { data } = await api
        .from('vendas')
        .select('valor, valor_final, metodo_pagamento, parcelas, bandeira')
        .eq('empresa_id', empresaId)
        .gte('created_at', inicio)
        .lt('created_at', fim);

      let cDeb = 0, cCre1 = 0, cParc = 0;
      (data || []).forEach((v: any) => {
        const valor = Number(v.valor_final ?? v.valor ?? 0);
        const metodo = (v.metodo_pagamento || '').toLowerCase();
        const parcelas = Number(v.parcelas || 0);
        const bandeira = v.bandeira || '';
        let taxa: TaxaRow | undefined;
        let bucket: 'deb' | 'cre1' | 'parc' | null = null;
        if (metodo.includes('débito') || metodo.includes('debito')) {
          taxa = getTaxa('Cartão de Débito', 0, bandeira);
          bucket = 'deb';
        } else if (metodo.includes('crédito') || metodo.includes('credito')) {
          if (parcelas <= 1) {
            taxa = getTaxa('Cartão de Crédito', 0, bandeira);
            bucket = 'cre1';
          } else {
            taxa = getTaxa('Cartão de Crédito', parcelas, bandeira);
            bucket = 'parc';
          }
        }
        if (!taxa || !bucket) return;
        const custo = taxa.tipo_taxa === 'fixo'
          ? taxa.taxa_percentual
          : valor * (taxa.taxa_percentual / 100);
        if (bucket === 'deb') cDeb += custo;
        else if (bucket === 'cre1') cCre1 += custo;
        else cParc += custo;
      });
      setCustoDebito(cDeb);
      setCustoCredito1x(cCre1);
      setCustoParcelado(cParc);
      setCustoTotalMes(cDeb + cCre1 + cParc);
    };
    calcularCustos();
  }, [empresaId, taxas]);

  // ── Simulator ─────────────────────────────────────────────────────────────
  const simValor = parseFloat(simValorRaw.replace(/\./g, '').replace(',', '.')) || 0;
  const simTaxa = (() => {
    if (simMetodo === 'PIX' || simMetodo === 'Dinheiro') return getTaxa(simMetodo, 0, '');
    if (simMetodo === 'Cartão de Débito') return getTaxa('Cartão de Débito', 0, simBandeira);
    return getTaxa('Cartão de Crédito', simParcelas, simBandeira);
  })();
  const simLiquido = calcLiquido(simValor, simTaxa);
  const simCusto = simValor - simLiquido;
  const simTaxaPerc = simTaxa?.taxa_percentual || 0;

  // ── Estilos base ───────────────────────────────────────────────────────────
  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(142,95,207,0.12)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 12px', fontSize: 13,
    border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: 10, background: 'rgba(255,255,255,0.8)',
    outline: 'none', fontFamily: 'Gilroy, sans-serif',
    color: '#1F2937', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 4, display: 'block', fontFamily: 'Gilroy, sans-serif',
  };

  // ── renderSimpleRow redesign ───────────────────────────────────────────────
  const renderSimpleRow = (metodo: string, label: string, icon: string) => {
    const taxa = getTaxa(metodo, 0, '');
    const tipoTaxa = taxa?.tipo_taxa || 'percentual';
    const isZeroTax = metodo === 'Dinheiro' || metodo === 'PIX';
    return (
      <div key={metodo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
        {/* Esquerda: ícone + nome + preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>{icon}</div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', display: 'block' }}>{label}</span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
              Ex: R$ 1.000 → Líq: {formatCurrency(calcLiquido(1000, taxa))}
            </span>
          </div>
        </div>
        {/* Direita: badges + toggle + input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 300 }}>
          {isZeroTax && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Sem taxa
            </span>
          )}
          {(metodo === 'PIX' || metodo === 'Boleto') && (
            <ToggleGroup
              type="single"
              value={tipoTaxa}
              onValueChange={(v) => v && handleChange(metodo, 0, '', 'tipo_taxa', v)}
              style={{ border: '1px solid rgba(142,95,207,0.2)', borderRadius: 8, flexShrink: 0 }}
            >
              <ToggleGroupItem value="percentual" style={{ height: 30, padding: '0 10px', fontSize: 12, fontFamily: 'Gilroy, sans-serif' }}>%</ToggleGroupItem>
              <ToggleGroupItem value="fixo"       style={{ height: 30, padding: '0 10px', fontSize: 12, fontFamily: 'Gilroy, sans-serif' }}>R$</ToggleGroupItem>
            </ToggleGroup>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              type="text" inputMode="decimal"
              value={formatTaxaDisplay(taxa?.taxa_percentual)}
              onChange={e => handleMaskedInput(metodo, 0, '', e.target.value)}
              placeholder="0,00"
              style={{ ...inputStyle, width: 70, minWidth: 60, padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#8E5FCF' }}
            />
            <span style={{ fontSize: 13, color: '#9CA3AF', flexShrink: 0, fontFamily: 'Gilroy, sans-serif' }}>
              {tipoTaxa === 'percentual' ? '%' : 'R$'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── renderCardSection redesign ─────────────────────────────────────────────
  const renderCardSection = (
    metodo: string, temParcelas: boolean,
    activeTab: string, setActiveTab: (v: string) => void,
    expanded: boolean, setExpanded: (v: boolean) => void
  ) => (
    <div key={metodo} style={{ ...glassCard, padding: 0, overflow: 'hidden' }}>
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif', borderBottom: expanded ? '1px solid rgba(142,95,207,0.1)' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard style={{ width: 18, height: 18, color: '#8E5FCF' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1F2937', display: 'block', fontFamily: 'Gilroy, sans-serif' }}>{metodo}</span>
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
              Configure taxas por bandeira{temParcelas ? ' e número de parcelas' : ''}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8E5FCF', background: 'rgba(142,95,207,0.08)', padding: '4px 12px', borderRadius: 20, fontFamily: 'Gilroy, sans-serif' }}>
            {BANDEIRAS.length} bandeiras
          </span>
          <ChevronDown style={{ width: 18, height: 18, color: '#9CA3AF', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </div>
      </button>

      {/* Accordion body */}
      <div style={{ maxHeight: expanded ? 800 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        <div style={{ padding: '20px 24px' }}>
          {/* Bandeira pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {BANDEIRAS.map(b => (
              <button key={b} onClick={() => setActiveTab(b)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 12,
                  border: activeTab === b ? '2px solid #8E5FCF' : '1px solid rgba(142,95,207,0.15)',
                  background: activeTab === b ? 'rgba(142,95,207,0.06)' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}>
                <BandeiraBadge bandeira={b} size="sm" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: activeTab === b ? '#5B2D9E' : '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                  {b}
                </span>
              </button>
            ))}
          </div>

          {/* Active bandeira content */}
          {BANDEIRAS.filter(b => b === activeTab).map(b => {
            const avistaTaxa = getTaxa(metodo, 0, b);
            const parcelasRows = temParcelas
              ? taxas.filter(t => t.metodo_pagamento === metodo && t.parcelas > 0 && t.bandeira === b).sort((a, c) => a.parcelas - c.parcelas)
              : [];
            return (
              <div key={b}>
                {/* À vista */}
                <div style={{ background: 'rgba(142,95,207,0.03)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px', gap: 12, alignItems: 'center', padding: '0 4px 0 0' }}>
                    <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
                      {temParcelas ? 'Crédito 1x' : 'Débito'}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
                      Líq: {formatCurrency(calcLiquido(1000, avistaTaxa))}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="text" inputMode="decimal"
                        value={formatTaxaDisplay(avistaTaxa?.taxa_percentual)}
                        onChange={e => handleMaskedInput(metodo, 0, b, e.target.value)}
                        placeholder="0,00"
                        style={{ ...inputStyle, width: 80, textAlign: 'center', fontWeight: 700, color: '#8E5FCF' }}
                      />
                      <Percent style={{ width: 13, height: 13, color: '#9CA3AF', flexShrink: 0 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 4 }}>
                    <span style={{ ...labelStyle, marginBottom: 0, whiteSpace: 'nowrap' }}>Prazo de recebimento</span>
                    <select
                      value={avistaTaxa?.prazo_recebimento || 'parcelado'}
                      onChange={e => handleChange(metodo, 0, b, 'prazo_recebimento', e.target.value)}
                      style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                    >
                      <option value="mesmo_dia">Mesmo dia</option>
                      <option value="dia_seguinte">Dia seguinte</option>
                      <option value="parcelado">Parcelado (conforme nº de parcelas)</option>
                    </select>
                  </div>
                </div>

                {/* Parcelado */}
                {temParcelas && parcelasRows.length > 0 && (
                  <div>
                    <span style={{ ...labelStyle, marginBottom: 10 }}>Taxas por parcela</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {parcelasRows.map(taxa => {
                        const taxaEfetiva = taxa.taxa_percentual > 0 ? taxa.taxa_percentual : (avistaTaxa?.taxa_percentual || 0);
                        const modalidadeColor = taxa.parcelas <= 6
                          ? { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' }
                          : { bg: 'rgba(239,68,68,0.1)', color: '#EF4444' };
                        return (
                          <div key={taxa.parcelas} style={{ background: 'rgba(142,95,207,0.03)', borderRadius: 12, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif', background: modalidadeColor.bg, color: modalidadeColor.color }}>
                                {taxa.parcelas}x
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
                                {formatCurrency(1000 - (1000 * taxaEfetiva / 100))}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input
                                type="text" inputMode="decimal"
                                value={formatTaxaDisplay(taxa.taxa_percentual)}
                                onChange={e => handleMaskedInput(metodo, taxa.parcelas, b, e.target.value)}
                                placeholder="0,00"
                                style={{ ...inputStyle, flex: 1, textAlign: 'center', fontWeight: 700, color: '#8E5FCF', padding: '5px 8px', fontSize: 12 }}
                              />
                              <Percent style={{ width: 11, height: 11, color: '#9CA3AF', flexShrink: 0 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mini summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
                  {[
                    { label: temParcelas ? 'Crédito 1x' : 'Débito', value: formatTaxaDisplay(avistaTaxa?.taxa_percentual) || '0,00', suffix: '%' },
                    { label: 'Líquido R$1.000', value: formatCurrency(calcLiquido(1000, avistaTaxa)), suffix: '' },
                    { label: 'Taxa máxima', value: temParcelas ? (formatTaxaDisplay(parcelasRows[parcelasRows.length - 1]?.taxa_percentual) || '0,00') : '—', suffix: temParcelas ? '%' : '' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(142,95,207,0.04)', borderRadius: 10, padding: '10px 14px' }}>
                      <span style={{ ...labelStyle, fontSize: 9, marginBottom: 2 }}>{s.label}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif' }}>{s.value}{s.suffix}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>
              Oasis › Configurações › Taxa Maquininha
            </p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy, sans-serif', margin: 0, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Taxa da Maquininha
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif', margin: '6px 0 0' }}>
              Configure as taxas por bandeira e parcelamento
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setModalOpen(true)}
              style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
              + Nova Taxa
            </button>
            <button onClick={handleSalvar} disabled={saving}
              style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy, sans-serif', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando…' : 'Salvar Configurações'}
            </button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Custo Médio Débito',     value: custoDebito    > 0 ? formatCurrency(custoDebito)    : '—', sub: 'taxa débito no mês',     icon: <CreditCard style={{ width: 18, height: 18, color: '#3B82F6' }} />, iconBg: 'rgba(59,130,246,0.12)',    borderColor: '#3B82F6', valueColor: '#3B82F6' },
            { label: 'Custo Médio Crédito 1x', value: custoCredito1x > 0 ? formatCurrency(custoCredito1x) : '—', sub: 'taxa crédito à vista',   icon: <Percent style={{ width: 18, height: 18, color: '#8E5FCF' }} />,    iconBg: 'rgba(142,95,207,0.12)', borderColor: '#8E5FCF', valueColor: '#8E5FCF' },
            { label: 'Custo Médio Parcelado',  value: custoParcelado > 0 ? formatCurrency(custoParcelado) : '—', sub: 'taxa parcelado no mês',  icon: <BarChart2 style={{ width: 18, height: 18, color: '#F59E0B' }} />,   iconBg: 'rgba(245,158,11,0.12)',    borderColor: '#F59E0B', valueColor: '#F59E0B' },
            { label: 'Custo no Mês',           value: custoTotalMes  > 0 ? formatCurrency(custoTotalMes)  : '—', sub: 'em taxas este mês',      icon: <TrendingDown style={{ width: 18, height: 18, color: '#EF4444' }} />, iconBg: 'rgba(239,68,68,0.12)',     borderColor: '#EF4444', valueColor: '#EF4444' },
          ].map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
              onMouseEnter={() => setHoveredKpi(i)} onMouseLeave={() => setHoveredKpi(null)}
              style={{
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(142,95,207,0.12)', borderRadius: 20, padding: 24,
                borderTop: `4px solid ${card.borderColor}`,
                transform: hoveredKpi === i ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default',
              }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                {card.icon}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy, sans-serif', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 6, fontFamily: 'Gilroy, sans-serif' }}>{card.sub}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937', marginTop: 2, fontFamily: 'Gilroy, sans-serif' }}>{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Simulador */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          style={{ ...glassCard, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator style={{ width: 18, height: 18, color: '#8E5FCF' }} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', display: 'block' }}>Simulador de Taxa</span>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>Calcule o valor líquido de uma venda</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Valor da venda</label>
              <input
                type="text" inputMode="decimal"
                value={simValorRaw}
                onChange={e => setSimValorRaw(e.target.value)}
                style={{ width: '100%', padding: '14px', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Gilroy, sans-serif', color: '#8E5FCF', textAlign: 'center', background: 'rgba(142,95,207,0.04)', border: '2px solid rgba(142,95,207,0.2)', borderRadius: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Bandeira</label>
              {/* Custom dropdown com logos */}
              <button
                type="button"
                onClick={() => setSimDropdownOpen(o => !o)}
                style={{ ...inputStyle, width: '100%', padding: '10px 12px', height: 52, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {simBandeira
                    ? <BandeiraBadge bandeira={simBandeira} size="sm" />
                    : <span style={{ width: 36, height: 24, borderRadius: 4, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📱</span>
                  }
                  <span style={{ fontWeight: 600, color: '#1F2937', fontSize: 13, fontFamily: 'Gilroy, sans-serif' }}>
                    {simBandeira || 'Pix / Dinheiro'}
                  </span>
                </div>
                <ChevronDown style={{ width: 16, height: 16, color: '#9CA3AF', transform: simDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {simDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 12, boxShadow: '0 8px 32px rgba(142,95,207,0.12)', marginTop: 4, overflow: 'hidden' }}>
                  {[...BANDEIRAS.map(b => ({ value: b, label: b, logo: true })), { value: '', label: 'Pix / Dinheiro', logo: false }].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setSimBandeira(opt.value); setSimDropdownOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: simBandeira === opt.value ? 'rgba(142,95,207,0.06)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(142,95,207,0.05)' }}
                    >
                      {opt.logo
                        ? <BandeiraBadge bandeira={opt.value} size="sm" />
                        : <span style={{ width: 36, height: 24, borderRadius: 4, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📱</span>
                      }
                      <span style={{ fontSize: 13, fontWeight: 600, color: simBandeira === opt.value ? '#5B2D9E' : '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Modalidade</label>
              <select
                value={`${simMetodo}|${simParcelas}`}
                onChange={e => {
                  const [m, p] = e.target.value.split('|');
                  setSimMetodo(m);
                  setSimParcelas(Number(p));
                }}
                style={{ ...inputStyle, width: '100%', padding: '10px 12px', height: 52 }}
              >
                <option value="Cartão de Débito|0">Débito</option>
                <option value="Cartão de Crédito|0">Crédito 1x</option>
                {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={`Cartão de Crédito|${n}`}>Crédito {n}x</option>)}
                <option value="PIX|0">Pix</option>
                <option value="Dinheiro|0">Dinheiro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, background: 'rgba(142,95,207,0.04)', borderRadius: 14, padding: 20 }}>
            {[
              { label: 'Taxa aplicada',  value: `${simTaxaPerc.toFixed(2).replace('.', ',')}%`, color: '#8E5FCF' },
              { label: 'Valor da taxa',  value: `- ${formatCurrency(simCusto)}`,                color: '#EF4444' },
              { label: 'Valor líquido',  value: formatCurrency(simLiquido),                     color: '#10B981', big: true },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <span style={{ ...labelStyle, marginBottom: 6, display: 'block', textAlign: 'center' }}>{s.label}</span>
                <span style={{ fontSize: s.big ? '1.5rem' : '1.25rem', fontWeight: 800, color: s.color, fontFamily: 'Gilroy, sans-serif' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Taxas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          {loading ? (
            <div style={{ ...glassCard, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CreditCard style={{ width: 32, height: 32, color: '#8E5FCF' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>Carregando taxas…</p>
            </div>
          ) : (
            <>
              {/* Simples métodos */}
              {(isMetodoAtivo('Dinheiro') || isMetodoAtivo('PIX') || isMetodoAtivo('Boleto')) && (
                <div style={{ ...glassCard, overflow: 'visible', width: '100%', boxSizing: 'border-box', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Banknote style={{ width: 14, height: 14, color: '#10B981' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Gilroy, sans-serif' }}>
                      Meios de pagamento
                    </span>
                  </div>
                  {isMetodoAtivo('Dinheiro') && renderSimpleRow('Dinheiro', 'Dinheiro', '💵')}
                  {isMetodoAtivo('PIX')      && renderSimpleRow('PIX',      'PIX',      '📱')}
                  {isMetodoAtivo('Boleto')   && renderSimpleRow('Boleto',   'Boleto',   '📄')}
                </div>
              )}

              {/* Cartões */}
              {isMetodoAtivo('Cartão de Crédito') && renderCardSection('Cartão de Crédito', true,  activeTabCredito, setActiveTabCredito, expandedCredito, setExpandedCredito)}
              {isMetodoAtivo('Cartão de Débito')  && renderCardSection('Cartão de Débito',  false, activeTabDebito,  setActiveTabDebito,  expandedDebito,  setExpandedDebito)}
            </>
          )}
        </motion.div>

        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
          style={{ ...glassCard, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', display: 'block' }}>Custo com Taxas por Período</span>
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>Faturamento bruto vs. custo de taxas</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['semanal', 'mensal', 'anual'] as const).map(p => (
                <button key={p} onClick={() => setChartPeriodo(p)}
                  style={{ padding: '5px 14px', borderRadius: 20, border: chartPeriodo === p ? 'none' : '1px solid rgba(142,95,207,0.2)', background: chartPeriodo === p ? '#8E5FCF' : 'transparent', color: chartPeriodo === p ? '#fff' : '#6B7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif', transition: 'all 0.2s' }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8E5FCF" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#8E5FCF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTax" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="faturamento" stroke="#8E5FCF" strokeWidth={2} fill="url(#gradFat)" />
              <Area type="monotone" dataKey="taxas"       stroke="#EF4444" strokeWidth={2} fill="url(#gradTax)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* GerenciarMetodosPagamento — INALTERADO */}
        <GerenciarMetodosPagamento onMetodosChange={fetchMetodosAtivos} />
      </div>

      {/* ── Modal Nova Taxa ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
            onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Gilroy, sans-serif' }}>Nova Taxa</h2>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>Adicionar nova configuração de taxa</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Bandeira</label>
                <select style={{ ...inputStyle, width: '100%' }}>
                  {BANDEIRAS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Modalidade</label>
                <select style={{ ...inputStyle, width: '100%' }}>
                  <option>Débito</option>
                  <option>Crédito 1x</option>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n}>Crédito {n}x</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Taxa (%)</label>
                  <input placeholder="0,00" style={{ ...inputStyle, width: '100%', fontWeight: 700, color: '#8E5FCF' }} />
                </div>
                <div>
                  <label style={labelStyle}>Prazo (dias)</label>
                  <input type="number" placeholder="30" style={{ ...inputStyle, width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Observações</label>
                <textarea placeholder="Observações..." style={{ ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical' }} />
              </div>
            </div>
            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>Cancelar</button>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>Salvar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
