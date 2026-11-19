import React, { useState, useMemo } from 'react'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NovoOrcamentoDialog } from './NovoOrcamentoDialog'
import { PDFOrcamento } from './PDFOrcamento'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Search, MoreHorizontal, Eye, FileText, Send, CheckCircle2,
  XCircle, ShoppingCart, Trash2, DollarSign, TrendingUp, ScrollText, CheckCircle,
} from 'lucide-react'
import { format, isPast, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusOrcamento =
  | 'rascunho' | 'enviado' | 'aprovado'
  | 'recusado' | 'expirado' | 'convertido'

interface OrcamentoItem {
  id: string
  product_name: string
  variacao?: string
  quantidade: number
  unit_price: number
  item_discount?: number
  total: number
  product_id?: string
}

interface Orcamento {
  id: string
  numero: string
  status: StatusOrcamento
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  validade?: string
  subtotal: number
  desconto?: number
  total: number
  observacoes?: string
  payment_terms?: string
  created_at: string
  sale_id?: string
  orcamento_itens?: OrcamentoItem[]
}

// ─── Config de status ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusOrcamento, { label: string; cor: string; bg: string }> = {
  rascunho:   { label: 'Rascunho',   cor: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  enviado:    { label: 'Enviado',    cor: '#3B82F6', bg: 'rgba(59,130,246,0.1)'  },
  aprovado:   { label: 'Aprovado',   cor: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  recusado:   { label: 'Recusado',   cor: '#EF4444', bg: 'rgba(239,68,68,0.1)'   },
  expirado:   { label: 'Expirado',   cor: '#F59E0B', bg: 'rgba(245,158,11,0.1)'  },
  convertido: { label: 'Convertido', cor: '#8E5FCF', bg: 'rgba(142,95,207,0.1)'  },
}

const TODOS_STATUS: StatusOrcamento[] = ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado', 'convertido']

const COR_FAIXA: Record<StatusOrcamento, string> = {
  rascunho: '#9CA3AF', enviado: '#3B82F6', aprovado: '#10B981',
  recusado: '#EF4444', expirado: '#F59E0B', convertido: '#8E5FCF',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (iso: string) => { try { return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR }) } catch { return iso } }

const getValidadeColor = (val: string | undefined, status: StatusOrcamento): string => {
  if (!val) return '#9CA3AF'
  if (status === 'convertido' || status === 'aprovado') return '#10B981'
  const date = parseISO(val)
  if (isPast(date)) return '#EF4444'
  if (differenceInDays(date, new Date()) <= 7) return '#F59E0B'
  return '#10B981'
}

// ─── BadgeStatus ──────────────────────────────────────────────────────────────

const BadgeStatus = ({ status }: { status: StatusOrcamento }) => {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.rascunho
  return (
    <span style={{
      color: c.cor, background: c.bg,
      border: `1px solid ${c.cor}40`,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, fontFamily: 'Gilroy',
      whiteSpace: 'nowrap' as const,
    }}>
      {c.label}
    </span>
  )
}

// ─── BtnMini ─────────────────────────────────────────────────────────────────

function BtnMini({ label, bg, color, border, hoverBg, hoverColor, onClick }: {
  label: string; bg: string; color: string; border: string
  hoverBg: string; hoverColor: string; onClick: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        background: hov ? hoverBg : bg,
        color: hov ? hoverColor : color,
        border, borderRadius: 8, padding: '6px 12px',
        fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  )
}

// ─── OrcamentoCard ────────────────────────────────────────────────────────────

function OrcamentoCard({ o, onDetalhes, onPDF, onAprovar, onAtualizarStatus, onExcluir }: {
  o: Orcamento
  onDetalhes: () => void
  onPDF: () => void
  onAprovar: () => void
  onAtualizarStatus: (id: string, status: string) => void
  onExcluir: () => void
}) {
  const [hover, setHover] = useState(false)
  const qtdItens = o.orcamento_itens?.length ?? 0
  const validadeColor = getValidadeColor(o.validade, o.status)

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(142,95,207,0.12)',
        borderRadius: 20,
        overflow: 'hidden',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover
          ? '0 16px 48px rgba(71,17,143,0.12)'
          : '0 2px 8px rgba(71,17,143,0.04)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Faixa colorida topo */}
      <div style={{ height: 4, background: COR_FAIXA[o.status] }} />

      {/* Corpo */}
      <div style={{ padding: '20px 20px 12px' }}>
        {/* Linha 1: numero + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 600, letterSpacing: '0.05em' }}>
            {o.numero}
          </span>
          <BadgeStatus status={o.status} />
        </div>

        {/* Nome cliente */}
        <p style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Gilroy', color: '#1F2937', margin: '0 0 4px' }}>
          {o.customer_name || 'Sem cliente'}
        </p>

        {/* Email/telefone */}
        <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', margin: 0 }}>
          {o.customer_email || o.customer_phone || `Criado em ${fmtData(o.created_at)}`}
        </p>

        {/* Divisória */}
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.08)', margin: '12px 0' }} />

        {/* Grid 3 colunas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Itens</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy', margin: 0 }}>
              {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Total</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy', margin: 0 }}>
              {fmtBRL(o.total)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Válido até</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: validadeColor, fontFamily: 'Gilroy', margin: 0 }}>
              {o.validade ? fmtData(o.validade) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        borderTop: '1px solid rgba(142,95,207,0.08)',
        padding: '12px 20px',
        display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center',
      }}>
        <BtnMini
          label="Ver detalhes"
          bg="rgba(142,95,207,0.08)" color="#8E5FCF"
          border="1px solid rgba(142,95,207,0.2)"
          hoverBg="#8E5FCF" hoverColor="white"
          onClick={onDetalhes}
        />
        <BtnMini
          label="Gerar PDF"
          bg="rgba(107,114,128,0.07)" color="#6B7280"
          border="1px solid rgba(107,114,128,0.15)"
          hoverBg="#6B7280" hoverColor="white"
          onClick={onPDF}
        />
        {o.status === 'enviado' && (
          <BtnMini
            label="Aprovar"
            bg="rgba(16,185,129,0.1)" color="#10B981"
            border="1px solid rgba(16,185,129,0.2)"
            hoverBg="#10B981" hoverColor="white"
            onClick={onAprovar}
          />
        )}
        <div style={{ marginLeft: 'auto' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#9CA3AF', padding: '4px 6px', borderRadius: 6,
                  display: 'flex', alignItems: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#8E5FCF' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF' }}
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onDetalhes}>
                <Eye className="h-4 w-4 mr-2" /> Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPDF}>
                <FileText className="h-4 w-4 mr-2" /> Gerar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {o.status === 'rascunho' && (
                <DropdownMenuItem onClick={() => onAtualizarStatus(o.id, 'enviado')}>
                  <Send className="h-4 w-4 mr-2" /> Marcar como Enviado
                </DropdownMenuItem>
              )}
              {(o.status === 'enviado' || o.status === 'rascunho') && (
                <DropdownMenuItem onClick={onAprovar} className="text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar → Converter
                </DropdownMenuItem>
              )}
              {(o.status === 'enviado' || o.status === 'rascunho') && (
                <DropdownMenuItem onClick={() => onAtualizarStatus(o.id, 'recusado')} className="text-red-500">
                  <XCircle className="h-4 w-4 mr-2" /> Recusar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExcluir} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrcamentosPanel() {
  const { orcamentos, loading, criarOrcamento, atualizarStatus, converterEmVenda, excluirOrcamento } = useOrcamentos()
  const { toast } = useToast()

  const [novoOpen,        setNovoOpen]        = useState(false)
  const [filtroStatus,    setFiltroStatus]    = useState<StatusOrcamento | 'todos'>('todos')
  const [busca,           setBusca]           = useState('')
  const [dataInicio,      setDataInicio]      = useState('')
  const [dataFim,         setDataFim]         = useState('')

  const [detalhesOrc,     setDetalhesOrc]     = useState<Orcamento | null>(null)
  const [pdfOrc,          setPdfOrc]          = useState<Orcamento | null>(null)
  const [aprovarOrc,      setAprovarOrc]      = useState<Orcamento | null>(null)
  const [marcarConcluida, setMarcarConcluida] = useState(false)
  const [convertendo,     setConvertendo]     = useState(false)

  const [hovKpi,  setHovKpi]  = useState<number | null>(null)
  const [hovNovo, setHovNovo] = useState(false)

  // ── Filtros ──────────────────────────────────────────────────────────────

  const lista = useMemo(() => {
    const orcs = orcamentos as Orcamento[]
    return orcs.filter(o => {
      if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (!o.customer_name?.toLowerCase().includes(q) && !o.numero?.toLowerCase().includes(q)) return false
      }
      if (dataInicio && o.created_at < new Date(dataInicio).toISOString()) return false
      if (dataFim    && o.created_at > new Date(dataFim + 'T23:59:59').toISOString()) return false
      return true
    })
  }, [orcamentos, filtroStatus, busca, dataInicio, dataFim])

  // ── Resumo ───────────────────────────────────────────────────────────────

  const resumo = useMemo(() => {
    const orcs = orcamentos as Orcamento[]
    const ativos   = orcs.filter(o => o.status === 'rascunho' || o.status === 'enviado')
    const aprovMes = (() => {
      const ini = startOfMonth(new Date()).toISOString()
      const fim = endOfMonth(new Date()).toISOString()
      return orcs.filter(o => o.status === 'aprovado' && o.created_at >= ini && o.created_at <= fim)
    })()
    const totalAtivos = ativos.reduce((acc, o) => acc + (o.total ?? 0), 0)
    const taxa = orcs.length > 0 ? (orcs.filter(o => o.status === 'aprovado' || o.status === 'convertido').length / orcs.length) * 100 : 0
    return { ativos: ativos.length, totalAtivos, aprovMes: aprovMes.length, taxa }
  }, [orcamentos])

  // ── Ações ────────────────────────────────────────────────────────────────

  const handleConverter = async () => {
    if (!aprovarOrc) return
    setConvertendo(true)
    const { data: venda, error } = await converterEmVenda(aprovarOrc.id)
    setConvertendo(false)
    setAprovarOrc(null)
    if (error) {
      toast({ title: 'Erro ao converter', description: String(error), variant: 'destructive' })
    } else {
      toast({ title: 'Venda criada com sucesso!', description: `Orçamento ${aprovarOrc.numero} convertido.` })
    }
  }

  const handleExcluir = async (o: Orcamento) => {
    if (!confirm(`Excluir o orçamento ${o.numero}? Esta ação não pode ser desfeita.`)) return
    await excluirOrcamento(o.id)
    toast({ title: 'Orçamento excluído' })
  }

  // ── KPI cards config ─────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: 'Orçamentos Ativos',
      value: String(resumo.ativos),
      sub: 'Rascunho + Enviado',
      Icon: FileText,
      iconBg: 'rgba(142,95,207,0.12)',
      iconColor: '#8E5FCF',
      valueColor: '#1F2937',
      borderColor: '#8E5FCF',
    },
    {
      label: 'Valor em Aberto',
      value: fmtBRL(resumo.totalAtivos),
      sub: 'Orçamentos ativos',
      Icon: DollarSign,
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#3B82F6',
      valueColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    {
      label: 'Aprovados este mês',
      value: String(resumo.aprovMes),
      sub: format(new Date(), 'MMMM/yyyy', { locale: ptBR }),
      Icon: CheckCircle,
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#10B981',
      valueColor: '#10B981',
      borderColor: '#10B981',
    },
    {
      label: 'Taxa de Conversão',
      value: `${resumo.taxa.toFixed(1)}%`,
      sub: 'Aprovados / Total',
      Icon: TrendingUp,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      valueColor: '#F59E0B',
      borderColor: '#F59E0B',
    },
  ]

  // ── Input focus helpers ───────────────────────────────────────────────────

  const onFocusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #8E5FCF'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.15)'
  }
  const onBlurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(142,95,207,0.2)'
    e.currentTarget.style.boxShadow = 'none'
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: 12, padding: '10px 14px',
    fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#1F2937',
    outline: 'none', transition: 'all 0.2s ease',
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: 28, display: 'flex',
        justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px' }}>
            Oasis › Orçamentos
          </p>
          <h1 style={{
            fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
            background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 4px',
          }}>
            Orçamentos
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', margin: 0 }}>
            Propostas comerciais e conversão em vendas
          </p>
        </div>
        <button
          onClick={() => setNovoOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
            color: 'white', borderRadius: 12, padding: '10px 20px',
            border: 'none', fontFamily: 'Gilroy', fontWeight: 600,
            fontSize: '0.9rem', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(142,95,207,0.35)',
            transform: hovNovo ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={() => setHovNovo(true)}
          onMouseLeave={() => setHovNovo(false)}
        >
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(142,95,207,0.12)',
              borderTop: `3px solid ${card.borderColor}`,
              borderRadius: 20, padding: 24,
              transform: hovKpi === idx ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hovKpi === idx ? '0 12px 32px rgba(71,17,143,0.1)' : '0 2px 8px rgba(71,17,143,0.04)',
              transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              cursor: 'default',
            }}
            onMouseEnter={() => setHovKpi(idx)}
            onMouseLeave={() => setHovKpi(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, margin: 0 }}>
                {card.label}
              </p>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: card.iconBg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.Icon size={18} color={card.iconColor} />
              </div>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'Gilroy', color: card.valueColor, margin: '0 0 4px' }}>
              {card.value}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0 }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(142,95,207,0.12)',
        borderRadius: 16, padding: '16px 20px',
        marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center',
      }}>
        {/* Pills de status */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {(['todos', ...TODOS_STATUS] as const).map(s => {
            const active = filtroStatus === s
            return (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                style={{
                  background: active ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent',
                  color: active ? 'white' : '#6B7280',
                  border: active ? 'none' : '1px solid rgba(142,95,207,0.2)',
                  borderRadius: 20, padding: '6px 16px',
                  fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: active ? '0 4px 12px rgba(142,95,207,0.3)' : 'none',
                }}
              >
                {s === 'todos' ? 'Todos' : STATUS_CONFIG[s].label}
              </button>
            )
          })}
        </div>

        {/* Busca */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente ou nº…"
            style={{ ...inputStyle, paddingLeft: 36, width: 210 }}
            onFocus={onFocusInput}
            onBlur={onBlurInput}
          />
        </div>

        {/* Date pickers */}
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
          style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
        <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>até</span>
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
          style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />

        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
          {lista.length} orçamento{lista.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
          Carregando…
        </div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ScrollText size={36} color="#8E5FCF" />
          </div>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', color: '#1F2937', margin: '0 0 8px' }}>
            Nenhum orçamento criado
          </p>
          <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.9rem', margin: '0 0 24px' }}>
            Crie propostas comerciais e converta em vendas
          </p>
          <button
            onClick={() => setNovoOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
              color: 'white', borderRadius: 12, padding: '12px 24px',
              border: 'none', fontFamily: 'Gilroy', fontWeight: 600,
              fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(142,95,207,0.35)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <Plus size={16} /> Criar primeiro orçamento
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {lista.map(o => (
            <OrcamentoCard
              key={o.id}
              o={o}
              onDetalhes={() => setDetalhesOrc(o)}
              onPDF={() => setPdfOrc(o)}
              onAprovar={() => setAprovarOrc(o)}
              onAtualizarStatus={atualizarStatus}
              onExcluir={() => handleExcluir(o)}
            />
          ))}
        </div>
      )}

      {/* ── Modal Novo Orçamento ───────────────────────────────────────── */}
      <NovoOrcamentoDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        onSalvo={() => {}}
        criarOrcamento={criarOrcamento}
      />

      {/* ── Modal Aprovar / Converter ──────────────────────────────────── */}
      <Dialog open={!!aprovarOrc} onOpenChange={v => { if (!v) setAprovarOrc(null) }}>
        <DialogContent style={{
          padding: 0, overflow: 'hidden', maxWidth: 440,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(142,95,207,0.15)',
          borderRadius: 24,
          boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
        }}>
          {/* Header */}
          <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '20px 24px' }}>
            <h2 style={{
              fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              Aprovar e Converter em Venda
            </h2>
          </div>

          {/* Body */}
          {aprovarOrc && (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Card resumo */}
              <div style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: 16, padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px' }}>
                      {aprovarOrc.numero}
                    </p>
                    <p style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Gilroy', color: '#1F2937', margin: 0 }}>
                      {aprovarOrc.customer_name || '—'}
                    </p>
                  </div>
                  <BadgeStatus status={aprovarOrc.status} />
                </div>
                <div style={{ borderTop: '1px solid rgba(16,185,129,0.1)', paddingTop: 12 }}>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', margin: '0 0 4px' }}>
                    {aprovarOrc.orcamento_itens?.length ?? 0} iten{(aprovarOrc.orcamento_itens?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981', fontFamily: 'Gilroy', margin: 0 }}>
                    {fmtBRL(aprovarOrc.total)}
                  </p>
                </div>
              </div>

              {/* Checkbox */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', userSelect: 'none' as const,
                background: 'rgba(142,95,207,0.04)',
                border: '1px solid rgba(142,95,207,0.12)',
                borderRadius: 10, padding: '10px 14px',
              }}>
                <input
                  type="checkbox"
                  checked={marcarConcluida}
                  onChange={e => setMarcarConcluida(e.target.checked)}
                  style={{ accentColor: '#8E5FCF', width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#374151' }}>
                  Marcar venda como concluída imediatamente
                </span>
              </label>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '16px 24px', display: 'flex', gap: 10 }}>
            <button
              onClick={() => setAprovarOrc(null)}
              disabled={convertendo}
              style={{
                flex: 1, background: 'rgba(107,114,128,0.08)', color: '#6B7280',
                border: '1px solid rgba(107,114,128,0.15)',
                borderRadius: 10, padding: '10px 16px',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConverter}
              disabled={convertendo}
              style={{
                flex: 2, background: 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 16px',
                fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem',
                cursor: convertendo ? 'not-allowed' : 'pointer',
                opacity: convertendo ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <ShoppingCart size={16} />
              {convertendo ? 'Convertendo…' : 'Confirmar — Converter em Venda'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sheet Detalhes ─────────────────────────────────────────────── */}
      <Sheet open={!!detalhesOrc} onOpenChange={v => { if (!v) setDetalhesOrc(null) }}>
        <SheetContent
          className="p-0 overflow-hidden flex flex-col"
          style={{
            width: 520, maxWidth: '95vw',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(30px)',
            borderLeft: '1px solid rgba(142,95,207,0.15)',
          }}
        >
          {detalhesOrc && (
            <>
              {/* Header */}
              <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '24px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' as const }}>
                  <span style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#9CA3AF', letterSpacing: '0.05em' }}>
                    {detalhesOrc.numero}
                  </span>
                  <BadgeStatus status={detalhesOrc.status} />
                </div>
                <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.25rem', color: '#1F2937', margin: '0 0 16px' }}>
                  {detalhesOrc.customer_name || 'Sem cliente'}
                </p>
                <button
                  onClick={() => { setPdfOrc(detalhesOrc); setDetalhesOrc(null) }}
                  style={{
                    background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
                    border: '1px solid rgba(142,95,207,0.2)',
                    borderRadius: 8, padding: '7px 14px',
                    fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <FileText size={13} /> Gerar PDF
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Informações */}
                <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Informações
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px' }}>Cliente</p>
                    <p style={{ fontWeight: 600, fontFamily: 'Gilroy', color: '#1F2937', margin: 0, fontSize: '0.875rem' }}>
                      {detalhesOrc.customer_name || '—'}
                    </p>
                    {detalhesOrc.customer_phone && (
                      <p style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy', margin: '2px 0 0' }}>{detalhesOrc.customer_phone}</p>
                    )}
                    {detalhesOrc.customer_email && (
                      <p style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy', margin: '2px 0 0' }}>{detalhesOrc.customer_email}</p>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px' }}>Emitido em</p>
                    <p style={{ fontWeight: 600, fontFamily: 'Gilroy', color: '#1F2937', margin: 0, fontSize: '0.875rem' }}>
                      {fmtData(detalhesOrc.created_at)}
                    </p>
                    {detalhesOrc.validade && (
                      <>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '8px 0 4px' }}>Válido até</p>
                        <p style={{ fontWeight: 600, fontFamily: 'Gilroy', color: getValidadeColor(detalhesOrc.validade, detalhesOrc.status), margin: 0, fontSize: '0.875rem' }}>
                          {fmtData(detalhesOrc.validade)}
                        </p>
                      </>
                    )}
                  </div>
                  {detalhesOrc.payment_terms && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px' }}>Condição de pagamento</p>
                      <p style={{ fontWeight: 600, fontFamily: 'Gilroy', color: '#1F2937', margin: 0, fontSize: '0.875rem' }}>
                        {detalhesOrc.payment_terms}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabela de itens */}
                <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Itens
                </p>
                <div style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(142,95,207,0.1)',
                  borderRadius: 12, overflow: 'hidden', marginBottom: 20,
                }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.05))' }}>
                        {['Produto', 'Qtd', 'Unit.', 'Total'].map((h, i) => (
                          <th key={h} style={{
                            textAlign: i === 0 ? 'left' : 'right',
                            padding: '10px 14px', fontFamily: 'Gilroy',
                            fontWeight: 600, color: '#8E5FCF', fontSize: '0.72rem',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(detalhesOrc.orcamento_itens ?? []).map((item, idx) => (
                        <tr key={item.id} style={{
                          borderTop: '1px solid rgba(142,95,207,0.06)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(142,95,207,0.02)',
                        }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'Gilroy', color: '#374151' }}>
                            {item.product_name}
                            {item.variacao && <span style={{ color: '#9CA3AF', marginLeft: 4 }}>({item.variacao})</span>}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Gilroy', color: '#6B7280' }}>{item.quantidade}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Gilroy', color: '#6B7280' }}>{fmtBRL(item.unit_price)}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Gilroy', fontWeight: 600, color: '#1F2937' }}>{fmtBRL(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totais */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 32, fontSize: '0.85rem' }}>
                    <span style={{ color: '#9CA3AF', fontFamily: 'Gilroy' }}>Subtotal</span>
                    <span style={{ fontFamily: 'Gilroy', color: '#374151', minWidth: 110, textAlign: 'right' }}>{fmtBRL(detalhesOrc.subtotal)}</span>
                  </div>
                  {(detalhesOrc.desconto ?? 0) > 0 && (
                    <div style={{ display: 'flex', gap: 32, fontSize: '0.85rem' }}>
                      <span style={{ color: '#EF4444', fontFamily: 'Gilroy' }}>Desconto</span>
                      <span style={{ fontFamily: 'Gilroy', color: '#EF4444', minWidth: 110, textAlign: 'right' }}>
                        - {fmtBRL(detalhesOrc.desconto!)}
                      </span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', gap: 32, fontSize: '0.95rem', fontWeight: 700,
                    borderTop: '1px solid rgba(142,95,207,0.1)', paddingTop: 8, marginTop: 4,
                  }}>
                    <span style={{ fontFamily: 'Gilroy', color: '#1F2937' }}>TOTAL</span>
                    <span style={{ fontFamily: 'Gilroy', color: '#8E5FCF', minWidth: 110, textAlign: 'right' }}>{fmtBRL(detalhesOrc.total)}</span>
                  </div>
                </div>

                {detalhesOrc.observacoes && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase', margin: '0 0 8px' }}>
                      Observações
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#6B7280', fontFamily: 'Gilroy', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {detalhesOrc.observacoes}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer por status */}
              <div style={{
                borderTop: '1px solid rgba(142,95,207,0.1)',
                padding: '16px 24px', display: 'flex', gap: 10, flexShrink: 0,
              }}>
                {detalhesOrc.status === 'rascunho' && (
                  <button
                    onClick={() => { atualizarStatus(detalhesOrc.id, 'enviado'); setDetalhesOrc(null) }}
                    style={{
                      flex: 1, background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                      color: 'white', border: 'none', borderRadius: 10,
                      padding: '12px 16px', fontFamily: 'Gilroy', fontWeight: 700,
                      fontSize: '0.875rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Send size={15} /> Marcar como Enviado
                  </button>
                )}
                {detalhesOrc.status === 'enviado' && (
                  <>
                    <button
                      onClick={() => { atualizarStatus(detalhesOrc.id, 'recusado'); setDetalhesOrc(null) }}
                      style={{
                        flex: 1, background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
                        padding: '12px 16px', fontFamily: 'Gilroy', fontWeight: 600,
                        fontSize: '0.875rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <XCircle size={15} /> Recusar
                    </button>
                    <button
                      onClick={() => { setAprovarOrc(detalhesOrc); setDetalhesOrc(null) }}
                      style={{
                        flex: 1, background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: 'white', border: 'none', borderRadius: 10,
                        padding: '12px 16px', fontFamily: 'Gilroy', fontWeight: 700,
                        fontSize: '0.875rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <CheckCircle2 size={15} /> Aprovar
                    </button>
                  </>
                )}
                {detalhesOrc.status === 'aprovado' && (
                  <button
                    onClick={() => { setAprovarOrc(detalhesOrc); setDetalhesOrc(null) }}
                    style={{
                      flex: 1, background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                      color: 'white', border: 'none', borderRadius: 10,
                      padding: '12px 16px', fontFamily: 'Gilroy', fontWeight: 700,
                      fontSize: '0.875rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <ShoppingCart size={15} /> Converter em Venda
                  </button>
                )}
                {(detalhesOrc.status === 'recusado' || detalhesOrc.status === 'expirado' || detalhesOrc.status === 'convertido') && (
                  <button
                    onClick={() => setDetalhesOrc(null)}
                    style={{
                      flex: 1, background: 'rgba(107,114,128,0.08)', color: '#6B7280',
                      border: '1px solid rgba(107,114,128,0.15)', borderRadius: 10,
                      padding: '12px 16px', fontFamily: 'Gilroy', fontWeight: 600,
                      fontSize: '0.875rem', cursor: 'pointer',
                    }}
                  >
                    Fechar
                  </button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Modal PDF ──────────────────────────────────────────────────── */}
      <Dialog open={!!pdfOrc} onOpenChange={v => { if (!v) setPdfOrc(null) }}>
        <DialogContent style={{
          maxWidth: 768, maxHeight: '92vh', overflow: 'auto',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(142,95,207,0.15)',
          borderRadius: 20,
          padding: 0,
        }}>
          <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '16px 24px' }}>
            <h2 style={{
              fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              Pré-visualização PDF
            </h2>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {pdfOrc && <PDFOrcamento orcamento={pdfOrc} onClose={() => setPdfOrc(null)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
