import React, { useState, useEffect, useRef } from 'react'
import { useContasBancarias } from '@/hooks/useContasBancarias'
import { api } from '@/lib/api'
import { useEmpresa } from '@/hooks/useEmpresa'
import { format, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  GitMerge, Upload, CheckCircle2, Clock, EyeOff, AlertTriangle,
  Search, Sparkles,
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Movimentacao {
  id: string
  kind: 'credito' | 'debito'
  valor: number
  descricao: string
  moved_on: string
  reconciliation_status: 'pendente' | 'conciliado' | 'ignorado'
  payable_id?: string
  receivable_id?: string
  sale_id?: string
  sugestao_automatica?: boolean
  categoria?: string
  observacoes?: string
}

interface Sugestao {
  kind: 'conta_pagar' | 'conta_receber' | 'venda'
  id: string
  descricao: string
  valor: number
  data: string
  score: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (d: string) =>
  format(parseISO(d), 'dd/MM', { locale: ptBR })

function corBorda(status: string, kind: string) {
  if (status === 'conciliado') return '#8E5FCF'
  if (status === 'ignorado') return '#9CA3AF'
  return kind === 'credito' ? '#10B981' : '#EF4444'
}

function similaridade(a: string, b: string): number {
  const sa = a.toLowerCase()
  const sb = b.toLowerCase()
  const palavras = sa.split(/\s+/)
  const matches = palavras.filter(p => p.length > 3 && sb.includes(p))
  return matches.length / Math.max(palavras.length, 1)
}

const COR_CAT_INLINE: Record<string, { background: string; color: string }> = {
  'Venda':                  { background: 'rgba(16,185,129,0.1)',  color: '#10B981' },
  'Receita':                { background: 'rgba(16,185,129,0.1)',  color: '#10B981' },
  'Transferência recebida': { background: 'rgba(59,130,246,0.1)',  color: '#3B82F6' },
  'Transferência enviada':  { background: 'rgba(142,95,207,0.1)',  color: '#8E5FCF' },
  'Fornecedores':           { background: 'rgba(249,115,22,0.1)',  color: '#F97316' },
  'Aluguel':                { background: 'rgba(245,158,11,0.1)',  color: '#F59E0B' },
  'Folha de pagamento':     { background: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
  'Impostos e taxas':       { background: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
  'Energia elétrica':       { background: 'rgba(245,158,11,0.1)',  color: '#F59E0B' },
  'Telecomunicações':       { background: 'rgba(99,102,241,0.1)',  color: '#6366F1' },
  'Tarifas bancárias':      { background: 'rgba(107,114,128,0.1)', color: '#6B7280' },
  'Outros':                 { background: 'rgba(107,114,128,0.1)', color: '#6B7280' },
}

// ─── Shared style ─────────────────────────────────────────────────────────────

const glassCard = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
}

// ─── Card status ──────────────────────────────────────────────────────────────

function CardStatus({
  label, valor, icone, cor, badge,
}: {
  label: string
  valor: number
  icone: React.ReactNode
  cor: string
  badge?: React.ReactNode
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        borderTop: `3px solid ${cor}`,
        padding: '20px',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cor}18`, flexShrink: 0 }}>
          <span style={{ color: cor }}>{icone}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.75rem', color: cor, lineHeight: 1.1 }}>{valor}</p>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 500, fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{label}</p>
        </div>
        {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
      </div>
    </div>
  )
}

// ─── Item de movimentação ─────────────────────────────────────────────────────

function ItemMovimentacao({
  mov,
  selecionado,
  onClick,
  onIgnorar,
}: {
  mov: Movimentacao
  selecionado: boolean
  onClick: () => void
  onIgnorar: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const conciliado = mov.reconciliation_status === 'conciliado'
  const ignorado = mov.reconciliation_status === 'ignorado'
  const corEsq = corBorda(mov.reconciliation_status, mov.kind)
  const catStyle = mov.categoria ? (COR_CAT_INLINE[mov.categoria] ?? { background: 'rgba(107,114,128,0.1)', color: '#6B7280' }) : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(142,95,207,0.06)',
        borderLeft: `4px solid ${selecionado ? '#8E5FCF' : hovered && !conciliado ? '#8E5FCF' : corEsq}`,
        background: selecionado ? 'rgba(142,95,207,0.08)' : hovered && !conciliado ? 'rgba(142,95,207,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: ignorado ? 0.4 : conciliado ? 0.65 : 1,
      }}
    >
      {/* Linha 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>
            {fmtData(mov.moved_on)}
          </p>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mov.descricao || '(sem descrição)'}
          </p>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px', alignItems: 'center' }}>
            {mov.categoria && catStyle && (
              <span style={{ ...catStyle, borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                {mov.categoria}
              </span>
            )}
            {mov.reconciliation_status === 'conciliado' && (
              <span style={{ background: 'rgba(142,95,207,0.1)', color: '#8E5FCF', border: '1px solid rgba(142,95,207,0.2)', borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                Conciliado
              </span>
            )}
            {mov.reconciliation_status === 'ignorado' && (
              <span style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280', borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                Ignorado
              </span>
            )}
          </div>
        </div>
        {/* Valor + kind */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '2px' }}>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: mov.kind === 'credito' ? '#10B981' : '#EF4444' }}>
            {mov.kind === 'credito' ? '+' : '-'}{fmtBRL(mov.valor)}
          </p>
          <p style={{ fontFamily: 'Gilroy', fontSize: '0.7rem', color: '#9CA3AF', letterSpacing: '0.05em' }}>
            {mov.kind === 'credito' ? 'CRÉDITO' : 'DÉBITO'}
          </p>
        </div>
      </div>

      {/* Linha 2 — observações */}
      {mov.observacoes && (
        <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', marginTop: '6px' }}>
          {mov.observacoes}
        </p>
      )}

      {/* Linha 3 — sugestão automática */}
      {mov.sugestao_automatica && mov.reconciliation_status === 'pendente' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(142,95,207,0.08)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: '8px', padding: '4px 10px', marginTop: '8px' }}>
          <Sparkles size={11} style={{ color: '#8E5FCF' }} />
          <span style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#8E5FCF' }}>Sugestão automática</span>
        </div>
      )}

      {/* Linha 4 — ações hover */}
      {hovered && mov.reconciliation_status === 'pendente' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            onClick={e => { e.stopPropagation(); onClick() }}
            style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
          >
            Conciliar
          </button>
          <button
            onClick={e => { e.stopPropagation(); onIgnorar() }}
            style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(107,114,128,0.2)', background: 'rgba(107,114,128,0.1)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
          >
            Ignorar
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClick() }}
            style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
          >
            Criar lançamento
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Painel de sugestões ──────────────────────────────────────────────────────

function PainelSugestoes({
  movSelecionada,
  sugestoes,
  loadingSugestoes,
  onConciliar,
  onIgnorar,
  onImportarOFX,
}: {
  movSelecionada: Movimentacao | null
  sugestoes: Sugestao[]
  loadingSugestoes: boolean
  onConciliar: (kind: Sugestao['kind'], id: string) => void
  onIgnorar: () => void
  onImportarOFX: () => void
}) {
  if (!movSelecionada) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
        <GitMerge size={48} style={{ color: '#8E5FCF', opacity: 0.25, marginBottom: '16px' }} />
        <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.9rem', color: '#374151', marginBottom: '6px' }}>Selecione uma movimentação</p>
        <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>Clique em um item do extrato para ver sugestões</p>
      </div>
    )
  }

  const labelTipo = (t: Sugestao['kind']) => {
    if (t === 'conta_pagar') return 'Contas a Pagar Sugeridas'
    if (t === 'conta_receber') return 'Contas a Receber Sugeridas'
    return 'Vendas Sugeridas'
  }

  const corTipo = (t: Sugestao['kind']) => {
    if (t === 'conta_pagar') return { text: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)' }
    if (t === 'conta_receber') return { text: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)' }
    return { text: '#8E5FCF', bg: 'rgba(142,95,207,0.06)', border: 'rgba(142,95,207,0.15)' }
  }

  const grupos = ['conta_pagar', 'conta_receber', 'venda'] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Resumo da movimentação */}
      <div style={{ background: 'rgba(142,95,207,0.06)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '12px', padding: '14px' }}>
        <p style={{ fontFamily: 'Gilroy', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Movimentação selecionada</p>
        <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', marginBottom: '4px' }}>{movSelecionada.descricao || '(sem descrição)'}</p>
        <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.25rem', color: movSelecionada.kind === 'credito' ? '#10B981' : '#EF4444', marginBottom: '2px' }}>
          {movSelecionada.kind === 'credito' ? '+' : '-'}{fmtBRL(movSelecionada.valor)}
        </p>
        <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>{fmtData(movSelecionada.moved_on)}</p>
      </div>

      {loadingSugestoes && (
        <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>Buscando sugestões…</p>
      )}

      {!loadingSugestoes && sugestoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '4px' }}>Nenhuma sugestão encontrada</p>
          <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '14px' }}>Nenhum lançamento com valor e data próximos</p>
        </div>
      )}

      {!loadingSugestoes && grupos.map(grupo => {
        const itens = sugestoes.filter(s => s.kind === grupo)
        if (itens.length === 0) return null
        const cores = corTipo(grupo)
        return (
          <div key={grupo}>
            <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              {labelTipo(grupo)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {itens.map((s) => {
                const pct = Math.min(Math.round(s.score * 50 + 40), 99)
                const matchColor = pct >= 80 ? '#10B981' : '#F59E0B'
                return (
                  <SugestaoCard
                    key={s.id}
                    s={s}
                    pct={pct}
                    matchColor={matchColor}
                    cores={cores}
                    onConciliar={() => onConciliar(s.kind, s.id)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Ações manuais */}
      <div style={{ background: 'rgba(142,95,207,0.04)', borderRadius: '12px', padding: '16px', marginTop: '4px' }}>
        <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Conciliação manual</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Criar conta a pagar', action: onImportarOFX },
            { label: 'Criar conta a receber', action: onImportarOFX },
            { label: 'Ignorar movimentação', action: onIgnorar },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SugestaoCard({ s, pct, matchColor, cores, onConciliar }: {
  s: Sugestao
  pct: number
  matchColor: string
  cores: { text: string; bg: string; border: string }
  onConciliar: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? cores.bg : 'rgba(255,255,255,0.8)',
        border: `1px solid ${hovered ? cores.text : 'rgba(142,95,207,0.12)'}`,
        borderRadius: '12px',
        padding: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 15px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#1F2937', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.descricao}</p>
        <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: cores.text, flexShrink: 0 }}>{fmtBRL(s.valor)}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF' }}>{fmtData(s.data)}</p>
        <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.7rem', color: matchColor, background: `${matchColor}18`, borderRadius: '20px', padding: '2px 10px' }}>
          {pct}% match
        </span>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onConciliar() }}
        style={{ width: '100%', padding: '8px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 3px 10px rgba(142,95,207,0.35)' }}
      >
        Conciliar este
      </button>
    </div>
  )
}

// ─── Modal OFX ────────────────────────────────────────────────────────────────

function ModalOFX({
  open,
  onClose,
  contaId,
  onImportar,
}: {
  open: boolean
  onClose: () => void
  contaId: string
  onImportar: (id: string, f: File) => Promise<any>
}) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [carregando, setCarregando] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleImportar = async () => {
    if (!arquivo) return
    setCarregando(true)
    const res = await onImportar(contaId, arquivo)
    setResultado(res)
    setCarregando(false)
  }

  const handleClose = () => {
    setArquivo(null)
    setResultado(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm" style={{ borderRadius: '24px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)', boxShadow: '0 25px 80px rgba(71,17,143,0.2)', padding: 0, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '24px 24px 20px' }}>
          <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Importar Extrato OFX
          </h2>
          <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
            Exporte o extrato OFX do seu banco e importe aqui para conciliação.
          </p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!resultado && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) setArquivo(f)
              }}
              style={{
                background: dragOver ? 'rgba(142,95,207,0.08)' : 'rgba(142,95,207,0.04)',
                border: `2px dashed ${dragOver ? '#8E5FCF' : 'rgba(142,95,207,0.3)'}`,
                borderRadius: '16px', padding: '36px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Upload size={22} style={{ color: 'white' }} />
              </div>
              {arquivo ? (
                <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#8E5FCF' }}>{arquivo.name}</p>
              ) : (
                <>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#374151', marginBottom: '4px' }}>Arraste o arquivo OFX aqui</p>
                  <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>ou clique para selecionar · .ofx</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".ofx,.OFX" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setArquivo(f) }} />
            </div>
          )}

          {resultado && (
            <div style={{ background: resultado.error ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${resultado.error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '12px', padding: '16px' }}>
              {resultado.error
                ? <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#EF4444' }}>{String(resultado.error)}</p>
                : resultado.importadas > 0
                  ? <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#10B981' }}>✅ {resultado.importadas} transações importadas</p>
                  : <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#6B7280' }}>{resultado.mensagem}</p>
              }
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={handleClose}
            style={{ padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            {resultado ? 'Fechar' : 'Cancelar'}
          </button>
          {arquivo && !resultado && (
            <button
              onClick={handleImportar}
              disabled={carregando}
              style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: carregando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', opacity: carregando ? 0.75 : 1 }}
            >
              {carregando ? 'Importando…' : 'Importar'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Conciliacao() {
  const { companyId } = useEmpresa()
  const { contas, buscarMovimentacoes, conciliarMovimentacao, importarOFX } = useContasBancarias()
  const { toast } = useToast()

  const hoje = new Date()
  const [contaId, setContaId] = useState('')
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'))
  const [dataFim, setDataFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'))
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'conciliado' | 'ignorado'>('todos')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'credito' | 'debito'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [busca, setBusca] = useState('')
  const [movSelecionada, setMovSelecionada] = useState<Movimentacao | null>(null)
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [loadingSugestoes, setLoadingSugestoes] = useState(false)
  const [modalOFX, setModalOFX] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // Seleciona a primeira conta quando carregar
  useEffect(() => {
    if (contas.length > 0 && !contaId) {
      setContaId(contas[0].id)
    }
  }, [contas])

  // Busca movimentações quando muda conta ou período
  useEffect(() => {
    if (!contaId || !companyId) return
    const carregar = async () => {
      setCarregando(true)
      const data = await buscarMovimentacoes(contaId, dataInicio, dataFim)
      const movs = data as unknown as Movimentacao[]

      // Pré-computa sugestão automática para pendentes (±2% valor, ±5 dias)
      const pendentes = movs.filter(m => m.reconciliation_status === 'pendente')
      if (pendentes.length > 0) {
        const [{ data: cp }, { data: cr }] = await Promise.all([
          (api.from('payable').select('id, valor, due_on')
            .eq('company_id', companyId).in('status', ['pendente', 'vencido']) as any),
          (api.from('receivable').select('id, valor, due_on')
            .eq('company_id', companyId).eq('status', 'pendente') as any),
        ])

        for (const mov of pendentes) {
          const base = parseISO(mov.moved_on)
          const vMin = mov.valor * 0.98
          const vMax = mov.valor * 1.02
          if (mov.kind === 'debito') {
            mov.sugestao_automatica = (cp || []).some((item: any) => {
              const v = Number(item.valor)
              return v >= vMin && v <= vMax &&
                Math.abs(differenceInDays(parseISO(item.due_on), base)) <= 5
            })
          } else {
            mov.sugestao_automatica = (cr || []).some((item: any) => {
              const v = Number(item.valor)
              return v >= vMin && v <= vMax &&
                Math.abs(differenceInDays(parseISO(item.due_on), base)) <= 5
            })
          }
        }
      }

      setMovimentacoes(movs)
      setMovSelecionada(null)
      setSugestoes([])
      setCarregando(false)
    }
    carregar()
  }, [contaId, dataInicio, dataFim, companyId])

  // Busca sugestões quando seleciona uma movimentação
  useEffect(() => {
    if (!movSelecionada || movSelecionada.reconciliation_status !== 'pendente') {
      setSugestoes([])
      return
    }
    buscarSugestoes(movSelecionada)
  }, [movSelecionada])

  const buscarSugestoes = async (mov: Movimentacao) => {
    if (!companyId) return
    setLoadingSugestoes(true)
    const resultado: Sugestao[] = []
    const valorMin = mov.valor * 0.99
    const valorMax = mov.valor * 1.01
    const dataBase = parseISO(mov.moved_on)

    // Busca contas a pagar (débitos)
    if (mov.kind === 'debito') {
      const { data: cp } = await (api
        .from('payable')
        .select('id, descricao, valor, due_on')
        .eq('company_id', companyId)
        .gte('amount', valorMin)
        .lte('amount', valorMax) as any)

      for (const item of (cp || [])) {
        const diffDias = Math.abs(differenceInDays(parseISO(item.due_on), dataBase))
        if (diffDias <= 7) {
          resultado.push({
            kind: 'conta_pagar',
            id: item.id,
            descricao: item.descricao || 'Conta a pagar',
            valor: item.valor,
            data: item.due_on,
            score: similaridade(mov.descricao || '', item.descricao || '') + (1 - diffDias / 7),
          })
        }
      }
    }

    // Busca contas a receber (créditos)
    if (mov.kind === 'credito') {
      const { data: cr } = await (api
        .from('receivable')
        .select('id, descricao, valor, due_on')
        .eq('company_id', companyId)
        .gte('amount', valorMin)
        .lte('amount', valorMax) as any)

      for (const item of (cr || [])) {
        const diffDias = Math.abs(differenceInDays(parseISO(item.due_on), dataBase))
        if (diffDias <= 7) {
          resultado.push({
            kind: 'conta_receber',
            id: item.id,
            descricao: item.descricao || 'Conta a receber',
            valor: item.valor,
            data: item.due_on,
            score: similaridade(mov.descricao || '', item.descricao || '') + (1 - diffDias / 7),
          })
        }
      }

      // Busca vendas (créditos)
      const { data: vendas } = await (api
        .from('sale')
        .select('id, valor, created_at')
        .eq('company_id', companyId)
        .gte('amount', valorMin)
        .lte('amount', valorMax) as any)

      for (const item of (vendas || [])) {
        const soldOn = item.created_at?.split('T')[0] || item.created_at
        const diffDias = Math.abs(differenceInDays(parseISO(soldOn), dataBase))
        if (diffDias <= 7) {
          resultado.push({
            kind: 'venda',
            id: item.id,
            descricao: `Venda #${item.id.slice(0, 8)}`,
            valor: item.valor,
            data: soldOn,
            score: 1 - diffDias / 7,
          })
        }
      }
    }

    resultado.sort((a, b) => b.score - a.score)
    setSugestoes(resultado.slice(0, 5))
    setLoadingSugestoes(false)
  }

  const handleConciliar = async (kind: Sugestao['kind'], referenciaId: string) => {
    if (!movSelecionada) return
    await conciliarMovimentacao(movSelecionada.id, kind, referenciaId)
    setMovimentacoes(prev =>
      prev.map(m => m.id === movSelecionada.id
        ? { ...m, reconciliation_status: 'conciliado' }
        : m
      )
    )
    setMovSelecionada(null)
    setSugestoes([])
    toast({ title: 'Movimentação conciliada!' })
  }

  const handleIgnorar = async (movId?: string) => {
    const id = movId || movSelecionada?.id
    if (!id) return
    await conciliarMovimentacao(id, 'ignorar')
    setMovimentacoes(prev =>
      prev.map(m => m.id === id ? { ...m, reconciliation_status: 'ignorado' } : m)
    )
    if (movSelecionada?.id === id) {
      setMovSelecionada(null)
      setSugestoes([])
    }
    toast({ title: 'Movimentação ignorada' })
  }

  const handleImportarOFX = async (id: string, arquivo: File) => {
    const res = await importarOFX(id, arquivo)
    if (!res.error && res.importadas > 0) {
      const data = await buscarMovimentacoes(contaId, dataInicio, dataFim)
      setMovimentacoes(data as unknown as Movimentacao[])
    }
    return res
  }

  // Categorias disponíveis para o filtro
  const categoriasDisponiveis = Array.from(
    new Set(movimentacoes.map(m => m.categoria).filter(Boolean))
  ) as string[]

  // Movimentações filtradas — itens com sugestão automática primeiro
  const movFiltradas = movimentacoes
    .filter(m => {
      if (filtroStatus !== 'todos' && m.reconciliation_status !== filtroStatus) return false
      if (filtroTipo !== 'todos' && m.kind !== filtroTipo) return false
      if (filtroCategoria !== 'todos' && m.categoria !== filtroCategoria) return false
      if (busca && !m.descricao?.toLowerCase().includes(busca.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (a.sugestao_automatica && !b.sugestao_automatica) return -1
      if (!a.sugestao_automatica && b.sugestao_automatica) return 1
      return 0
    })

  // Contadores
  const pendentes = movimentacoes.filter(m => m.reconciliation_status === 'pendente').length
  const conciliados = movimentacoes.filter(m => m.reconciliation_status === 'conciliado').length
  const ignorados = movimentacoes.filter(m => m.reconciliation_status === 'ignorado').length

  // Saldos para resumo
  const contaSelecionada = contas.find(c => c.id === contaId)
  const saldoExtrato = movimentacoes
    .filter(m => m.reconciliation_status !== 'ignorado')
    .reduce((s, m) => s + (m.kind === 'credito' ? m.valor : -m.valor), 0)
  const saldoSistema = contaSelecionada?.current_balance || 0
  const diferenca = saldoExtrato - saldoSistema

  const inputStyle = {
    background: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: '10px',
    fontFamily: 'Gilroy',
    fontSize: '0.875rem',
    color: '#374151',
    padding: '8px 12px',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: '-200px', left: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-150px', right: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Keyframes */}
          <style>{`
            @keyframes oasis-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
            .oasis-dot { animation: oasis-pulse 2s ease-in-out infinite; }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Oasis › Conciliação Bancária
              </p>
              <h1 style={{ fontSize: '2rem', fontFamily: 'Gilroy', fontWeight: 700, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                Conciliação Bancária
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
                Cruze seu extrato com os lançamentos
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger style={{ ...inputStyle, minWidth: '200px', height: 'auto' }}>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                style={{ ...inputStyle, width: '144px' }}
              />
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                style={{ ...inputStyle, width: '144px' }}
              />
              <button
                onClick={() => setModalOFX(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
              >
                <Upload size={15} /> Importar OFX
              </button>
            </div>
          </div>

          {/* Cards de status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <CardStatus label="aguardando conciliação" valor={pendentes} icone={<Clock size={20} />} cor="#F59E0B" />
            <CardStatus label="conciliados" valor={conciliados} icone={<CheckCircle2 size={20} />} cor="#10B981" />
            <CardStatus label="ignorados" valor={ignorados} icone={<EyeOff size={20} />} cor="#6B7280" />
            <CardStatus
              label="divergência no saldo"
              valor={Math.abs(diferenca) > 0.01 ? 1 : 0}
              icone={<AlertTriangle size={20} />}
              cor={Math.abs(diferenca) > 0.01 ? '#EF4444' : '#10B981'}
            />
          </div>

          {/* Layout principal: 60 / 40 */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', alignItems: 'start' }}>

            {/* Coluna esquerda — Extrato */}
            <div style={{ ...glassCard, padding: 0, overflow: 'hidden' }}>
              {/* Header do container */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Extrato do Banco</h3>
                  <button
                    onClick={() => setModalOFX(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; }}
                  >
                    <Upload size={13} /> Importar OFX
                  </button>
                </div>

                {/* Pills de filtro status */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {(['todos', 'pendente', 'conciliado', 'ignorado'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFiltroStatus(s)}
                      style={{
                        padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem',
                        fontFamily: 'Gilroy', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s', border: 'none',
                        background: filtroStatus === s ? '#8E5FCF' : 'transparent',
                        color: filtroStatus === s ? 'white' : '#6B7280',
                        outline: filtroStatus === s ? 'none' : '1px solid rgba(142,95,207,0.2)',
                      }}
                    >
                      {s === 'todos' ? 'Todos' : s === 'pendente' ? 'Pendentes' : s === 'conciliado' ? 'Conciliados' : 'Ignorados'}
                    </button>
                  ))}
                </div>

                {/* Busca + filtros adicionais */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                      placeholder="Buscar descrição…"
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: '30px', width: '100%', boxSizing: 'border-box', height: '34px' }}
                    />
                  </div>
                  <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as any)}>
                    <SelectTrigger style={{ ...inputStyle, width: '110px', height: '34px', fontSize: '0.8rem' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="credito">Créditos</SelectItem>
                      <SelectItem value="debito">Débitos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <SelectTrigger style={{ ...inputStyle, width: '150px', height: '34px', fontSize: '0.8rem' }}>
                      <SelectValue placeholder="Categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as categorias</SelectItem>
                      {categoriasDisponiveis.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lista */}
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
                {carregando ? (
                  <p style={{ textAlign: 'center', padding: '32px', fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#9CA3AF' }}>Carregando…</p>
                ) : movFiltradas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <GitMerge size={36} style={{ color: '#8E5FCF' }} />
                    </div>
                    <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', marginBottom: '8px' }}>Nenhuma movimentação encontrada</h3>
                    <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '20px' }}>
                      Importe um extrato OFX ou conecte seu banco via Open Finance
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setModalOFX(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                      >
                        <Upload size={14} /> Importar OFX
                      </button>
                      <button
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)' }}
                      >
                        Conectar banco
                      </button>
                    </div>
                  </div>
                ) : (
                  movFiltradas.map(mov => (
                    <ItemMovimentacao
                      key={mov.id}
                      mov={mov}
                      selecionado={movSelecionada?.id === mov.id}
                      onClick={() => setMovSelecionada(mov.id === movSelecionada?.id ? null : mov)}
                      onIgnorar={() => handleIgnorar(mov.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Coluna direita — Sugestões */}
            <div style={{ ...glassCard, padding: 0, overflow: 'hidden', position: 'sticky', top: '20px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)' }}>
                <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Sugestões de Conciliação</h3>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', padding: '16px 20px' }}>
                <PainelSugestoes
                  movSelecionada={movSelecionada}
                  sugestoes={sugestoes}
                  loadingSugestoes={loadingSugestoes}
                  onConciliar={handleConciliar}
                  onIgnorar={() => movSelecionada && handleIgnorar(movSelecionada.id)}
                  onImportarOFX={() => setModalOFX(true)}
                />
              </div>
            </div>
          </div>

          {/* Rodapé resumo */}
          <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '16px', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Saldo no extrato</p>
              <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '1rem', color: '#1F2937' }}>{fmtBRL(saldoExtrato)}</p>
            </div>
            <div style={{ color: '#9CA3AF', fontFamily: 'Gilroy', fontWeight: 500 }}>vs</div>
            <div>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Saldo no sistema</p>
              <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '1rem', color: '#1F2937' }}>{fmtBRL(saldoSistema)}</p>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>Diferença</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.25rem', color: Math.abs(diferenca) < 0.01 ? '#10B981' : '#EF4444' }}>
                  {fmtBRL(Math.abs(diferenca))}
                </p>
                <span style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: Math.abs(diferenca) < 0.01 ? '#10B981' : '#F59E0B', background: Math.abs(diferenca) < 0.01 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${Math.abs(diferenca) < 0.01 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: '20px', padding: '3px 10px' }}>
                  {Math.abs(diferenca) < 0.01 ? '✅ Conciliado' : '⚠️ Divergência'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal OFX */}
      {contaId && (
        <ModalOFX
          open={modalOFX}
          onClose={() => setModalOFX(false)}
          contaId={contaId}
          onImportar={handleImportarOFX}
        />
      )}
    </div>
  )
}
