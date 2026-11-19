import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, FileText, Download, XCircle, Eye, Loader2,
  CheckCircle, AlertCircle, Clock, Ban, RefreshCw,
  BarChart3, ChevronDown, X, AlertTriangle, DollarSign,
} from 'lucide-react';
import { RelatorioNFCe } from '@/components/relatorios/RelatorioNFCe';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { isServico } from '@/lib/servicos';

interface NotaFiscal {
  id: string;
  user_id: string;
  sale_id: string | null;
  kind: string;
  numero: number;
  serie: number;
  access_key: string | null;
  authorization_protocol: string | null;
  status: string;
  ambiente: string;
  total_amount: number;
  customer_name: string | null;
  customer_tax_id: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  issued_at: string;
  cancelled_at: string | null;
  created_at: string;
}

// --- Style constants ---
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 20,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 4, display: 'block', fontFamily: 'Gilroy, sans-serif',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 13,
  border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12,
  background: 'rgba(255,255,255,0.8)', outline: 'none',
  fontFamily: 'Gilroy, sans-serif', color: '#1F2937',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical' as const,
  minHeight: 80,
};

const getStatusStyle = (status: string) => {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    autorizada: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'rgba(16,185,129,0.2)', label: '✓ Autorizada' },
    pendente: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)', label: '● Pendente' },
    rejeitada: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)', label: '✗ Rejeitada' },
    cancelada: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', border: 'rgba(107,114,128,0.2)', label: 'Cancelada' },
    denegada: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)', label: 'Denegada' },
  };
  return map[status] || map.pendente;
};

// --- NotaRow sub-component ---
function NotaRow({ nota, formatCurrency, onVerDetalhes, onDownload, onCancelar, onReemitir, baixando }: {
  nota: NotaFiscal;
  formatCurrency: (v: number) => string;
  onVerDetalhes: (n: NotaFiscal) => void;
  onDownload: (n: NotaFiscal, t: 'pdf' | 'xml') => void;
  onCancelar: (n: NotaFiscal) => void;
  onReemitir: (n: NotaFiscal) => void;
  baixando: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const s = getStatusStyle(nota.status);

  return (
    <div>
      {/* Main row */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 24px',
          background: hovered ? 'rgba(142,95,207,0.04)' : 'transparent',
          transition: 'background 0.15s ease',
          borderBottom: expanded ? 'none' : '1px solid rgba(142,95,207,0.06)',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(142,95,207,0.1), rgba(71,17,143,0.06))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileText style={{ width: 18, height: 18, color: '#8E5FCF' }} />
        </div>

        {/* Number + client */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif' }}>
              NFC-e {nota.numero}
            </span>
            <span style={{
              background: s.bg, color: s.color, border: `1px solid ${s.border}`,
              borderRadius: 20, padding: '3px 10px',
              fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
            }}>
              {s.label}
            </span>
            {nota.ambiente === 'homologacao' && (
              <span style={{
                background: 'rgba(107,114,128,0.1)', color: '#6B7280',
                borderRadius: 20, padding: '2px 8px',
                fontSize: '0.7rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
              }}>
                Homologação
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '2px 0 0', fontFamily: 'Gilroy, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nota.customer_name || 'Consumidor não identificado'}
          </p>
        </div>

        {/* Date */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: 600, margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>
            {format(new Date(nota.issued_at), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
            {format(new Date(nota.issued_at), 'HH:mm')}
          </p>
        </div>

        {/* Value */}
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', flexShrink: 0, minWidth: 100, textAlign: 'right' }}>
          {formatCurrency(Number(nota.total_amount))}
        </span>

        {/* Actions (appear on hover) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s ease', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onVerDetalhes(nota); }}
            title="Ver Detalhes"
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(142,95,207,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E5FCF' }}
          >
            <Eye style={{ width: 13, height: 13 }} />
          </button>
          {nota.status === 'autorizada' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onDownload(nota, 'pdf'); }}
                disabled={baixando === `${nota.id}-pdf`}
                title="Baixar PDF"
                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}
              >
                {baixando === `${nota.id}-pdf` ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: 13, height: 13 }} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCancelar(nota); }}
                title="Cancelar NFC-e"
                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}
              >
                <XCircle style={{ width: 13, height: 13 }} />
              </button>
            </>
          )}
          {nota.status === 'rejeitada' && nota.sale_id && !nota.rejection_reason?.includes('[REEMITIDA]') && (
            <button
              onClick={(e) => { e.stopPropagation(); onReemitir(nota); }}
              title="Reemitir NFC-e"
              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(142,95,207,0.12)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexShrink: 0 }}
        >
          <ChevronDown style={{ width: 14, height: 14, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 24px 16px 80px', borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
          <div style={{
            background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.08)',
            borderRadius: 12, padding: 16,
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
          }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>Emissão</p>
              <p style={{ fontSize: '0.8rem', color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                {format(new Date(nota.issued_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            {nota.customer_tax_id && (
              <div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>CPF</p>
                <p style={{ fontSize: '0.8rem', color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{nota.customer_tax_id}</p>
              </div>
            )}
            {nota.authorization_protocol && (
              <div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>Protocolo</p>
                <p style={{ fontSize: '0.75rem', color: '#1F2937', fontFamily: 'monospace', margin: 0 }}>{nota.authorization_protocol}</p>
              </div>
            )}
            {nota.access_key && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>Chave de Acesso</p>
                <p style={{ fontSize: '0.7rem', color: '#6B7280', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all', background: 'rgba(255,255,255,0.5)', padding: '6px 10px', borderRadius: 8 }}>
                  {nota.access_key}
                </p>
              </div>
            )}
            {nota.rejection_reason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>Motivo da Rejeição</p>
                <p style={{ fontSize: '0.8rem', color: '#EF4444', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{nota.rejection_reason}</p>
              </div>
            )}
            {nota.cancellation_reason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>Cancelamento</p>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{nota.cancellation_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main component ---
const NotasFiscais = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { companyId } = useEmpresa();
  const navigate = useNavigate();

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterAmbiente, setFilterAmbiente] = useState<string>('todos');

  // Dialog states
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [cancelarDialogOpen, setCancelarDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);

  // Inutilização states
  const [inutilizarDialogOpen, setInutilizarDialogOpen] = useState(false);
  const [inutilizando, setInutilizando] = useState(false);
  const [numeroInicial, setNumeroInicial] = useState('');
  const [numeroFinal, setNumeroFinal] = useState('');
  const [justificativaInut, setJustificativaInut] = useState('');
  const [empresaFiscal, setEmpresaFiscal] = useState<any>(null);
  const [inutilizacoes, setInutilizacoes] = useState<any[]>([]);
  const [showHistoricoInut, setShowHistoricoInut] = useState(false);

  // Reemissão states
  const [reemitirDialogOpen, setReemitirDialogOpen] = useState(false);
  const [reemitindo, setReemitindo] = useState(false);
  const [notaParaReemitir, setNotaParaReemitir] = useState<NotaFiscal | null>(null);
  const [vendaOriginal, setVendaOriginal] = useState<any>(null);
  const [itensVenda, setItensVenda] = useState<any[]>([]);
  const [loadingVenda, setLoadingVenda] = useState(false);

  // Relatório state
  const [showRelatorio, setShowRelatorio] = useState(false);

  // UI state
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);

  useEffect(() => {
    if (user && companyId) {
      fetchEmpresaFiscal();
      fetchInutilizacoes();
    }
  }, [user, companyId]);

  const fetchEmpresaFiscal = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('company_fiscal_profile')
      .select('*')
      .eq('company_id', companyId)
      .single();
    setEmpresaFiscal(data);
  };

  const fetchInutilizacoes = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('nfce_voiding')
      .select('*')
      .eq('company_id', companyId)
      .order('voided_on', { ascending: false });
    setInutilizacoes(data || []);
  };

  const handleInutilizar = async () => {
    if (!empresaFiscal) {
      toast({ title: "Erro", description: "Configuração fiscal não encontrada. Configure a empresa primeiro.", variant: "destructive" });
      return;
    }
    const numInicial = parseInt(numeroInicial);
    const numFinal = parseInt(numeroFinal);
    if (!numInicial || !numFinal || numInicial > numFinal) {
      toast({ title: "Erro", description: "Informe uma faixa de numeração válida", variant: "destructive" });
      return;
    }
    if (justificativaInut.trim().length < 15) {
      toast({ title: "Erro", description: "A justificativa deve ter no mínimo 15 caracteres", variant: "destructive" });
      return;
    }
    setInutilizando(true);
    try {
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: { action: 'inutilizar', data: { empresaFiscal, numeroInicial: numInicial, numeroFinal: numFinal, justificativa: justificativaInut.trim(), userId: user?.id } }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      toast({ title: "Numeração Inutilizada", description: `Números ${numInicial} a ${numFinal} inutilizados com sucesso` });
      setInutilizarDialogOpen(false);
      setNumeroInicial(''); setNumeroFinal(''); setJustificativaInut('');
      fetchInutilizacoes();
    } catch (error: any) {
      toast({ title: "Erro ao inutilizar", description: error.message || 'Erro desconhecido', variant: "destructive" });
    } finally {
      setInutilizando(false);
    }
  };

  const handleAbrirReemitir = async (nota: NotaFiscal) => {
    setNotaParaReemitir(nota);
    setReemitirDialogOpen(true);
    setLoadingVenda(true);
    try {
      if (nota.sale_id) {
        const { data: venda } = await api.from('sale').select('*').eq('id', nota.sale_id).eq('company_id', companyId).single();
        setVendaOriginal(venda);
        const { data: itens } = await api.from('sale_item').select('*, produtos(*)').eq('sale_id', nota.sale_id);
        setItensVenda(itens || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da venda:', error);
    } finally {
      setLoadingVenda(false);
    }
  };

  const handleReemitir = async () => {
    if (!notaParaReemitir || !vendaOriginal || !empresaFiscal) {
      toast({ title: "Erro", description: "Dados insuficientes para reemissão", variant: "destructive" });
      return;
    }
    setReemitindo(true);
    try {
      // NFC-e só cobre mercadorias: itens de serviço ficam fora da nota.
      const itensProduto = itensVenda.filter(item => !isServico(item.produtos));
      if (itensProduto.length === 0) {
        throw new Error('Esta venda só tem serviços. A NFC-e cobre apenas produtos; serviços exigem NFS-e.');
      }
      const temServico = itensProduto.length !== itensVenda.length;
      const totalProdutos = Math.round(itensProduto.reduce((acc, i) => acc + Number(i.subtotal), 0) * 100) / 100;
      const itensFormatados = itensProduto.map(item => ({
        id: item.product_id,
        code: item.produtos?.code || item.product_id,
        name: item.produtos?.name || 'Produto',
        ncm: item.produtos?.ncm || '00000000',
        cfop: item.produtos?.cfop || '5102',
        commercial_unit: item.produtos?.commercial_unit || 'UN',
        origem: item.produtos?.origem || '0',
        quantidade: item.quantidade,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: {
          action: 'emitir',
          data: {
            empresaFiscal,
            venda: temServico
              ? { ...vendaOriginal, user_id: user?.id, valor: totalProdutos, final_amount: totalProdutos, gross_amount: totalProdutos, general_discount: 0 }
              : { ...vendaOriginal, user_id: user?.id },
            itens: itensFormatados,
            cliente: notaParaReemitir.customer_tax_id ? { cpf: notaParaReemitir.customer_tax_id, name: notaParaReemitir.customer_name } : null,
          }
        }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      await api.from('fiscal_document').update({ rejection_reason: `${notaParaReemitir.rejection_reason} [REEMITIDA]` }).eq('id', notaParaReemitir.id);
      toast({ title: "NFC-e Reemitida", description: `Nova NFC-e emitida com sucesso! Número: ${data.infNFe?.ide?.nNF || empresaFiscal.nfce_number}` });
      setReemitirDialogOpen(false);
      setNotaParaReemitir(null); setVendaOriginal(null); setItensVenda([]);
      fetchNotas(); fetchEmpresaFiscal();
    } catch (error: any) {
      toast({ title: "Erro ao reemitir", description: error.message || 'Erro desconhecido', variant: "destructive" });
    } finally {
      setReemitindo(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && companyId) fetchNotas();
  }, [user, companyId]);

  const fetchNotas = async () => {
    setLoading(true);
    const { data, error } = await api
      .from('fiscal_document')
      .select('*')
      .eq('company_id', companyId)
      .order('issued_at', { ascending: false });
    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar notas fiscais", variant: "destructive" });
    } else {
      setNotas(data || []);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleVerDetalhes = (nota: NotaFiscal) => {
    setSelectedNota(nota);
    setDetalhesDialogOpen(true);
  };

  const [confirmarCancelarOpen, setConfirmarCancelarOpen] = useState(false);
  const [notaParaCancelar, setNotaParaCancelar] = useState<NotaFiscal | null>(null);

  const handleAbrirCancelar = (nota: NotaFiscal) => {
    setNotaParaCancelar(nota);
    setConfirmarCancelarOpen(true);
  };

  const handleConfirmarCancelar = () => {
    if (!notaParaCancelar) return;
    setSelectedNota(notaParaCancelar);
    setMotivoCancelamento('');
    setConfirmarCancelarOpen(false);
    setCancelarDialogOpen(true);
  };

  const handleCancelar = async () => {
    if (!selectedNota || !motivoCancelamento.trim()) {
      toast({ title: "Erro", description: "Informe o motivo do cancelamento", variant: "destructive" });
      return;
    }
    setCancelando(true);
    try {
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: { action: 'cancelar', nota_id: selectedNota.id, motivo: motivoCancelamento }
      });
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Erro ao cancelar NFC-e');
      toast({ title: "NFC-e Cancelada", description: "Nota fiscal cancelada com sucesso" });
      setCancelarDialogOpen(false);
      fetchNotas();
    } catch (error: any) {
      toast({ title: "Erro ao cancelar", description: error.message || 'Erro desconhecido', variant: "destructive" });
    } finally {
      setCancelando(false);
    }
  };

  const handleDownload = async (nota: NotaFiscal, kind: 'pdf' | 'xml') => {
    setBaixando(`${nota.id}-${kind}`);
    try {
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: { action: kind === 'pdf' ? 'download_pdf' : 'download_xml', nota_id: nota.id }
      });
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || `Erro ao baixar ${kind.toUpperCase()}`);
      if (data.url) {
        window.open(data.url, '_blank');
      } else if (data.content) {
        const blob = new Blob([Uint8Array.from(atob(data.content), c => c.charCodeAt(0))], { type: kind === 'pdf' ? 'application/pdf' : 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `NFCe_${nota.numero}_${nota.serie}.${kind}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      toast({ title: `Erro ao baixar ${kind.toUpperCase()}`, description: error.message || 'Erro desconhecido', variant: "destructive" });
    } finally {
      setBaixando(null);
    }
  };

  const filteredNotas = notas.filter(nota => {
    const matchSearch =
      String(nota.numero).includes(searchTerm) ||
      nota.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.access_key?.includes(searchTerm);
    const matchStatus = filterStatus === 'todos' || nota.status === filterStatus;
    const matchAmbiente = filterAmbiente === 'todos' || nota.ambiente === filterAmbiente;
    return matchSearch && matchStatus && matchAmbiente;
  });

  const totalAutorizadas = notas.filter(n => n.status === 'autorizada').length;
  const totalCanceladas = notas.filter(n => n.status === 'cancelada').length;
  const valorTotal = notas.filter(n => n.status === 'autorizada').reduce((sum, n) => sum + Number(n.total_amount), 0);

  const kpiCards = [
    { label: 'Total Emitidas', value: String(notas.length), sub: 'notas registradas', color: '#8E5FCF', iconBg: 'rgba(142,95,207,0.12)', icon: <FileText style={{ width: 18, height: 18, color: '#8E5FCF' }} /> },
    { label: 'Autorizadas', value: String(totalAutorizadas), sub: 'autorizadas pela SEFAZ', color: '#10B981', iconBg: 'rgba(16,185,129,0.12)', icon: <CheckCircle style={{ width: 18, height: 18, color: '#10B981' }} /> },
    { label: 'Canceladas', value: String(totalCanceladas), sub: 'notas canceladas', color: '#EF4444', iconBg: 'rgba(239,68,68,0.12)', icon: <XCircle style={{ width: 18, height: 18, color: '#EF4444' }} /> },
    { label: 'Valor Total', value: formatCurrency(valorTotal), sub: 'faturamento fiscal', color: '#3B82F6', iconBg: 'rgba(59,130,246,0.12)', icon: <DollarSign style={{ width: 18, height: 18, color: '#3B82F6' }} /> },
  ];

  const statusPills = [
    { key: 'todos', label: 'Todos' },
    { key: 'autorizada', label: 'Autorizada' },
    { key: 'pendente', label: 'Pendente' },
    { key: 'rejeitada', label: 'Rejeitada' },
    { key: 'cancelada', label: 'Cancelada' },
  ];

  const ambientePills = [
    { key: 'todos', label: 'Todos' },
    { key: 'producao', label: 'Produção' },
    { key: 'homologacao', label: 'Homologação' },
  ];

  const pillActive: React.CSSProperties = {
    background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: '#fff',
    boxShadow: '0 4px 12px rgba(142,95,207,0.3)',
    border: 'none', borderRadius: 20, padding: '6px 16px',
    fontFamily: 'Gilroy, sans-serif', fontWeight: 600, fontSize: '0.8rem',
    cursor: 'pointer',
  };
  const pillInactive: React.CSSProperties = {
    background: 'transparent', color: '#6B7280',
    border: '1px solid rgba(142,95,207,0.2)', borderRadius: 20, padding: '6px 16px',
    fontFamily: 'Gilroy, sans-serif', fontWeight: 600, fontSize: '0.8rem',
    cursor: 'pointer',
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginBottom: 4, fontFamily: 'Gilroy, sans-serif' }}>
              Oasis › Notas Fiscais
            </p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 4px 0', fontFamily: 'Gilroy, sans-serif', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Notas Fiscais
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
              Emissão e gerenciamento de NFC-e
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setInutilizarDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#47118F', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}
            >
              <Ban style={{ width: 14, height: 14 }} />
              Inutilizar
            </button>
            <button
              onClick={() => setShowRelatorio(!showRelatorio)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}
            >
              <BarChart3 style={{ width: 14, height: 14 }} />
              Relatório
            </button>
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
                ...glassCard, padding: 24,
                borderTop: `4px solid ${card.color}`,
                transform: hoveredKpi === idx ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{card.label}</p>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</div>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color, margin: '0 0 4px 0', fontFamily: 'Gilroy, sans-serif', lineHeight: 1.2 }}>{card.value}</p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{card.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...glassCard, borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
            <input
              placeholder="Buscar por número, cliente ou chave..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>
          {/* Status pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {statusPills.map(p => (
              <button key={p.key} onClick={() => setFilterStatus(p.key)} style={filterStatus === p.key ? pillActive : pillInactive}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Ambiente pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ambientePills.map(p => (
              <button key={p.key} onClick={() => setFilterAmbiente(p.key)} style={filterAmbiente === p.key ? pillActive : pillInactive}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Relatório NFC-e */}
        {showRelatorio ? (
          <RelatorioNFCe onClose={() => setShowRelatorio(false)} />
        ) : (
          <>
            {/* Notas list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{ ...glassCard, overflow: 'hidden', marginBottom: 24 }}
            >
              {/* Card header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText style={{ width: 16, height: 16, color: '#fff' }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>Notas Fiscais</h3>
                </div>
                <span style={{ background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                  {filteredNotas.length} notas
                </span>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Loader2 style={{ width: 28, height: 28, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontFamily: 'Gilroy, sans-serif' }}>Carregando notas fiscais...</span>
                </div>
              ) : filteredNotas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                  <div style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px', background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText style={{ width: 36, height: 36, color: '#8E5FCF', opacity: 0.6 }} />
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: '0 0 8px 0', fontFamily: 'Gilroy, sans-serif' }}>Nenhuma nota fiscal encontrada</p>
                  <p style={{ fontSize: 14, color: '#9CA3AF', maxWidth: 320, margin: '0 auto', fontFamily: 'Gilroy, sans-serif', lineHeight: 1.5 }}>
                    Emita sua primeira nota fiscal para começar o controle fiscal
                  </p>
                </div>
              ) : (
                filteredNotas.map((nota, idx) => (
                  <motion.div
                    key={nota.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + idx * 0.03, duration: 0.3 }}
                  >
                    <NotaRow
                      nota={nota}
                      formatCurrency={formatCurrency}
                      onVerDetalhes={handleVerDetalhes}
                      onDownload={handleDownload}
                      onCancelar={handleAbrirCancelar}
                      onReemitir={handleAbrirReemitir}
                      baixando={baixando}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>

            {/* Histórico de Inutilizações */}
            <div style={{ ...glassCard, overflow: 'hidden' }}>
              <div
                style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: showHistoricoInut ? '1px solid rgba(142,95,207,0.08)' : 'none' }}
                onClick={() => setShowHistoricoInut(!showHistoricoInut)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ban style={{ width: 16, height: 16, color: '#F59E0B' }} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>Histórico de Inutilizações</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                    {inutilizacoes.length} registros
                  </span>
                  <ChevronDown style={{ width: 16, height: 16, color: '#9CA3AF', transform: showHistoricoInut ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </div>

              {showHistoricoInut && (
                <div style={{ padding: 24 }}>
                  {inutilizacoes.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', padding: '24px 0' }}>Nenhuma inutilização registrada</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {inutilizacoes.map(inut => {
                        const iutStyle = inut.status === 'autorizada'
                          ? { bg: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'rgba(16,185,129,0.2)', label: 'Autorizada' }
                          : inut.status === 'rejeitada'
                          ? { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)', label: 'Rejeitada' }
                          : { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)', label: 'Processando' };
                        return (
                          <div key={inut.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(142,95,207,0.08)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Ban style={{ width: 18, height: 18, color: '#F59E0B' }} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                                    Série {inut.serie} — Nº {inut.number_start} a {inut.number_end}
                                  </p>
                                  <span style={{ background: iutStyle.bg, color: iutStyle.color, border: `1px solid ${iutStyle.border}`, borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                                    {iutStyle.label}
                                  </span>
                                  {inut.ambiente === 'homologacao' && (
                                    <span style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280', borderRadius: 20, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                                      Homologação
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>{inut.justificativa}</p>
                                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                                  {format(new Date(inut.voided_on), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  {inut.protocolo && <span style={{ marginLeft: 8 }}>• Protocolo: <span style={{ fontFamily: 'monospace' }}>{inut.protocolo}</span></span>}
                                </p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0 0 2px', fontFamily: 'Gilroy, sans-serif' }}>Ano: {inut.ano}</p>
                              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'monospace', margin: 0 }}>
                                {inut.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal: Detalhes ── */}
      {detalhesDialogOpen && selectedNota && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth: 560, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText style={{ width: 16, height: 16, color: '#8E5FCF' }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Gilroy, sans-serif', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Detalhes da NFC-e
                </h2>
              </div>
              <button onClick={() => setDetalhesDialogOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Número/Série', value: `${selectedNota.numero}/${selectedNota.serie}` },
                { label: 'Data Emissão', value: format(new Date(selectedNota.issued_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) },
                { label: 'Valor Total', value: formatCurrency(Number(selectedNota.total_amount)) },
                { label: 'Cliente', value: selectedNota.customer_name || 'Não identificado' },
                { label: 'Ambiente', value: selectedNota.ambiente.charAt(0).toUpperCase() + selectedNota.ambiente.slice(1) },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ ...labelStyle, fontSize: 10 }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{item.value}</p>
                </div>
              ))}
              <div>
                <p style={{ ...labelStyle, fontSize: 10 }}>Status</p>
                <span style={{ ...(() => { const s = getStatusStyle(selectedNota.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}` }; })(), borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                  {getStatusStyle(selectedNota.status).label}
                </span>
              </div>
              {selectedNota.access_key && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ ...labelStyle, fontSize: 10 }}>Chave de Acesso</p>
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'monospace', margin: 0, wordBreak: 'break-all', background: 'rgba(142,95,207,0.04)', padding: '8px 12px', borderRadius: 8, letterSpacing: '0.05em' }}>
                    {selectedNota.access_key}
                  </p>
                </div>
              )}
              {selectedNota.authorization_protocol && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ ...labelStyle, fontSize: 10 }}>Protocolo de Autorização</p>
                  <p style={{ fontSize: '0.8rem', color: '#1F2937', fontFamily: 'monospace', margin: 0 }}>{selectedNota.authorization_protocol}</p>
                </div>
              )}
              {selectedNota.rejection_reason && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ ...labelStyle, fontSize: 10, color: '#EF4444' }}>Motivo da Rejeição</p>
                  <p style={{ fontSize: '0.8rem', color: '#EF4444', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{selectedNota.rejection_reason}</p>
                </div>
              )}
              {selectedNota.cancellation_reason && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ ...labelStyle, fontSize: 10 }}>Motivo do Cancelamento</p>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{selectedNota.cancellation_reason}</p>
                  {selectedNota.cancelled_at && (
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0', fontFamily: 'Gilroy, sans-serif' }}>
                      Cancelada em: {format(new Date(selectedNota.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)' }}>
              <button onClick={() => setDetalhesDialogOpen(false)} style={{ width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Modal: Confirmar Cancelamento ── */}
      {confirmarCancelarOpen && notaParaCancelar && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth: 440, overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Gilroy, sans-serif', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Cancelar Nota Fiscal
              </h2>
              <button onClick={() => setConfirmarCancelarOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 16, marginBottom: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle style={{ width: 20, height: 20, color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>Esta ação não pode ser desfeita</p>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                      Tem certeza que deseja cancelar a NFC-e nº {notaParaCancelar.numero}?
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmarCancelarOpen(false)} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
                Não, manter
              </button>
              <button onClick={handleConfirmarCancelar} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
                Sim, cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Modal: Cancelar (motivo) ── */}
      {cancelarDialogOpen && selectedNota && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle style={{ width: 16, height: 16, color: '#EF4444' }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Gilroy, sans-serif', background: 'linear-gradient(135deg, #EF4444, #DC2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Cancelar NFC-e
                </h2>
              </div>
              <button onClick={() => setCancelarDialogOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(239,68,68,0.06)', borderLeft: '4px solid #EF4444', borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ fontSize: '0.875rem', color: '#EF4444', margin: '0 0 4px', fontWeight: 700, fontFamily: 'Gilroy, sans-serif' }}>⚠ Esta ação não pode ser desfeita!</p>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                  Você está prestes a cancelar a NFC-e {selectedNota.numero}/{selectedNota.serie}
                </p>
              </div>
              <div>
                <label style={labelStyle}>Motivo do Cancelamento *</label>
                <textarea
                  placeholder="Informe o motivo do cancelamento (mínimo 15 caracteres)"
                  value={motivoCancelamento}
                  onChange={e => setMotivoCancelamento(e.target.value)}
                  rows={3}
                  style={textareaStyle}
                />
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0', fontFamily: 'Gilroy, sans-serif' }}>
                  {motivoCancelamento.length}/15 mín.
                </p>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', gap: 10 }}>
              <button onClick={() => setCancelarDialogOpen(false)} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
                Voltar
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelando || motivoCancelamento.trim().length < 15}
                style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: cancelando || motivoCancelamento.trim().length < 15 ? 'rgba(239,68,68,0.3)' : 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', cursor: cancelando || motivoCancelamento.trim().length < 15 ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {cancelando && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                Confirmar Cancelamento
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Modal: Inutilizar ── */}
      {inutilizarDialogOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ban style={{ width: 16, height: 16, color: '#F59E0B' }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Gilroy, sans-serif', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Inutilizar Numeração
                </h2>
              </div>
              <button onClick={() => setInutilizarDialogOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(245,158,11,0.06)', borderLeft: '4px solid #F59E0B', borderRadius: 12, padding: '12px 16px' }}>
                <p style={{ fontSize: '0.875rem', color: '#F59E0B', fontWeight: 700, margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>⚠ Esta ação não pode ser desfeita!</p>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                  A inutilização informa à SEFAZ os números que não serão utilizados por quebra de sequência.
                </p>
              </div>
              {empresaFiscal && (
                <div style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.1)', borderRadius: 12, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ ...labelStyle, fontSize: 10 }}>Série atual</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{empresaFiscal.nfce_series}</p>
                  </div>
                  <div>
                    <p style={{ ...labelStyle, fontSize: 10 }}>Ambiente</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif', textTransform: 'capitalize' }}>{empresaFiscal.ambiente}</p>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Número Inicial *</label>
                  <input type="number" placeholder="Ex: 1" value={numeroInicial} onChange={e => setNumeroInicial(e.target.value)} min="1" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Número Final *</label>
                  <input type="number" placeholder="Ex: 10" value={numeroFinal} onChange={e => setNumeroFinal(e.target.value)} min="1" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Justificativa *</label>
                <textarea placeholder="Informe o motivo da inutilização (mínimo 15 caracteres)" value={justificativaInut} onChange={e => setJustificativaInut(e.target.value)} rows={3} style={textareaStyle} />
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0', fontFamily: 'Gilroy, sans-serif' }}>
                  {justificativaInut.length}/15 mín.
                </p>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', gap: 10 }}>
              <button onClick={() => setInutilizarDialogOpen(false)} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
                Cancelar
              </button>
              <button
                onClick={handleInutilizar}
                disabled={inutilizando || !numeroInicial || !numeroFinal || justificativaInut.trim().length < 15}
                style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: inutilizando || !numeroInicial || !numeroFinal || justificativaInut.trim().length < 15 ? 'rgba(142,95,207,0.3)' : 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: inutilizando || !numeroInicial || !numeroFinal || justificativaInut.trim().length < 15 ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {inutilizando && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                Confirmar Inutilização
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Modal: Reemitir ── */}
      {reemitirDialogOpen && notaParaReemitir && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth: 560, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw style={{ width: 16, height: 16, color: '#F59E0B' }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Gilroy, sans-serif', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Reemitir NFC-e Rejeitada
                </h2>
              </div>
              <button onClick={() => setReemitirDialogOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingVenda ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                  <Loader2 style={{ width: 28, height: 28, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <>
                  <div style={{ background: 'rgba(245,158,11,0.06)', borderLeft: '4px solid #F59E0B', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ fontSize: '0.875rem', color: '#F59E0B', fontWeight: 700, margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>
                      NFC-e Original: {notaParaReemitir.numero}/{notaParaReemitir.serie}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                      A NFC-e será reemitida com um novo número sequencial.
                    </p>
                  </div>
                  {notaParaReemitir.rejection_reason && (
                    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EF4444', margin: '0 0 4px', fontFamily: 'Gilroy, sans-serif' }}>Motivo da Rejeição:</p>
                      <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{notaParaReemitir.rejection_reason}</p>
                    </div>
                  )}
                  {vendaOriginal && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <p style={{ ...labelStyle, fontSize: 10 }}>Cliente</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{vendaOriginal.customer_name}</p>
                        </div>
                        <div>
                          <p style={{ ...labelStyle, fontSize: 10 }}>Valor Total</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#8E5FCF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendaOriginal.valor)}
                          </p>
                        </div>
                      </div>
                      {itensVenda.length > 0 && (
                        <div>
                          <p style={labelStyle}>Itens da Venda</p>
                          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(142,95,207,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))', padding: '8px 12px', gap: 8 }}>
                              {['Produto', 'Qtd', 'Subtotal'].map(h => (
                                <span key={h} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', fontFamily: 'Gilroy, sans-serif', textAlign: h !== 'Produto' ? 'center' : 'left' }}>{h}</span>
                              ))}
                            </div>
                            {itensVenda.map((item, idx) => (
                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', padding: '8px 12px', gap: 8, borderTop: '1px solid rgba(142,95,207,0.06)' }}>
                                <span style={{ fontSize: '0.8rem', color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>{item.produtos?.name || 'Produto'}</span>
                                <span style={{ fontSize: '0.8rem', color: '#6B7280', textAlign: 'center', fontFamily: 'Gilroy, sans-serif' }}>{item.quantidade}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937', textAlign: 'right', fontFamily: 'Gilroy, sans-serif' }}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!vendaOriginal && !loadingVenda && (
                    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px' }}>
                      <p style={{ fontSize: '0.8rem', color: '#EF4444', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>
                        Não foi possível carregar os dados da venda original. A venda pode ter sido excluída.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', gap: 10 }}>
              <button onClick={() => setReemitirDialogOpen(false)} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
                Cancelar
              </button>
              <button
                onClick={handleReemitir}
                disabled={reemitindo || !vendaOriginal || !empresaFiscal}
                style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: reemitindo || !vendaOriginal || !empresaFiscal ? 'rgba(142,95,207,0.3)' : 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: reemitindo || !vendaOriginal || !empresaFiscal ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {reemitindo && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                <RefreshCw style={{ width: 13, height: 13 }} />
                Reemitir NFC-e
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NotasFiscais;
