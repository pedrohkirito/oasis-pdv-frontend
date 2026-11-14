import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import { Plus, Trash2, Store, User, Package, Target, Check } from 'lucide-react'
import { useMetas } from '@/hooks/useMetas'
import { BarraMeta } from '@/components/metas/BarraMeta'
import { RankingVendedoras } from '@/components/metas/RankingVendedoras'
import { useEmpresa } from '@/hooks/useEmpresa'
import { supabase } from '@/integrations/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { parseMaskedValue, formatMaskedValue } from '@/utils/currencyMask'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const LABEL_PERIODO: Record<string, string> = {
  diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal',
}
const LABEL_TIPO: Record<string, string> = {
  loja: 'Meta da Loja', vendedora: 'Meta por Vendedora', categoria: 'Meta por Categoria',
}

const STATUS_ICON: Record<string, string> = {
  atingida: '✅', quase: '⚠️', andamento: '🔵', inicio: '🔴',
}

function statusMeta(pct: number) {
  if (pct >= 100) return 'atingida'
  if (pct >= 80)  return 'quase'
  if (pct >= 40)  return 'andamento'
  return 'inicio'
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const glassCard = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
}

// ─── Barra de progresso Oasis ─────────────────────────────────────────────────

function BarraProgresso({ pct }: { pct: number }) {
  const cor    = pct >= 100 ? '#10B981' : pct >= 80 ? '#3B82F6' : pct >= 50 ? '#F59E0B' : '#EF4444'
  const corFim = pct >= 100 ? '#059669' : pct >= 80 ? '#1D4ED8' : pct >= 50 ? '#D97706' : '#B91C1C'
  return (
    <div style={{ height: '12px', borderRadius: '99px', background: 'rgba(142,95,207,0.1)', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${Math.min(pct, 100)}%`,
        background: `linear-gradient(90deg, ${cor}, ${corFim})`,
        borderRadius: '99px',
        transition: 'width 1.2s ease-out',
        boxShadow: `0 0 10px ${cor}60`,
      }} />
    </div>
  )
}

function BadgeStatus({ pct }: { pct: number }) {
  const cfg = pct >= 100
    ? { bg: 'rgba(16,185,129,0.1)',   color: '#10B981', border: 'rgba(16,185,129,0.2)',   label: '✅ Meta atingida!' }
    : pct >= 80
    ? { bg: 'rgba(59,130,246,0.1)',   color: '#3B82F6', border: 'rgba(59,130,246,0.2)',   label: '🔥 Quase lá!' }
    : pct >= 50
    ? { bg: 'rgba(245,158,11,0.1)',   color: '#F59E0B', border: 'rgba(245,158,11,0.2)',   label: '📈 Em progresso' }
    : { bg: 'rgba(239,68,68,0.1)',    color: '#EF4444', border: 'rgba(239,68,68,0.2)',    label: '⚠️ Abaixo da meta' }
  return (
    <span style={{ display: 'inline-block', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '6px 14px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem' }}>
      {cfg.label}
    </span>
  )
}

// ─── Card de período ──────────────────────────────────────────────────────────

function CardPeriodo({ titulo, borderColor, progresso, onDefinir }: {
  titulo: string
  borderColor: string
  progresso: any
  onDefinir: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        borderTop: `3px solid ${borderColor}`,
        padding: '24px',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        animation: progresso && progresso.percentual >= 100 ? 'metaAtingida 1.5s ease 3' : undefined,
      }}
    >
      <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#1F2937', marginBottom: '16px' }}>{titulo}</p>
      {progresso ? (
        <div>
          <BarraProgresso pct={progresso.percentual} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#8E5FCF' }}>
              {fmtBRL(progresso.realizado)}
            </span>
            <span style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#9CA3AF' }}>
              de {fmtBRL(progresso.meta.valor)}
            </span>
          </div>
          <BadgeStatus pct={progresso.percentual} />
          <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF', marginTop: '8px' }}>
            {progresso.percentual.toFixed(0)}% da meta realizado
          </p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '2px dashed rgba(142,95,207,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={onDefinir}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.06)'; e.currentTarget.style.borderColor = '#8E5FCF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.3)'; }}
          >
            <Plus size={18} style={{ color: '#8E5FCF' }} />
          </div>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '8px' }}>Sem meta configurada</p>
          <button
            onClick={onDefinir}
            style={{ padding: '6px 16px', borderRadius: '10px', border: '1px solid rgba(142,95,207,0.25)', background: 'rgba(142,95,207,0.06)', color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.06)'; }}
          >
            Definir meta
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Modal Nova Meta ──────────────────────────────────────────────────────────

function ModalNovaMeta({ open, onOpenChange, onSalvo }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSalvo: () => void
}) {
  const { criarMeta, gerarDatas } = useMetas()
  const { empresaId } = useEmpresa()
  const { toast } = useToast()

  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [tipo,  setTipo]  = useState<'loja' | 'vendedora' | 'categoria' | ''>('')
  const [periodo, setPeriodo]   = useState('mensal')
  const [valor,   setValor]     = useState('')
  const [quantidade, setQtd]    = useState('')
  const [usuarioId,   setUsuId] = useState('')
  const [usuarioNome, setUsuNome] = useState('')
  const [categoria,   setCateg] = useState('')
  const [usuarios,    setUsuarios] = useState<{ id: string; nome: string }[]>([])
  const [categorias,  setCategorias] = useState<string[]>([])
  const [salvando,    setSalvando]   = useState(false)

  useEffect(() => {
    if (!open || !empresaId) return
    supabase.functions.invoke('list-users', { method: 'POST', body: { empresa_id: empresaId } })
      .then(({ data, error }) => {
        if (error || !data?.users) return
        const lista = (data.users as { id: string; nome: string | null; email: string }[])
          .map(u => ({ id: u.id, nome: u.nome || u.email }))
        setUsuarios(lista)
      })
    supabase.from('produtos').select('categoria').eq('empresa_id', empresaId).eq('ativo', true)
      .then(({ data }) => {
        const cats = [...new Set((data || []).map((p: any) => p.categoria).filter(Boolean))] as string[]
        setCategorias(cats)
      })
  }, [open, empresaId])

  const resetar = () => { setPasso(1); setTipo(''); setPeriodo('mensal'); setValor(''); setQtd(''); setUsuId(''); setUsuNome(''); setCateg('') }

  const datas = gerarDatas(periodo)

  const confirmar = async () => {
    if (!tipo || !valor) return
    setSalvando(true)
    const meta: any = {
      tipo,
      periodo,
      valor: parseMaskedValue(valor),
      quantidade: quantidade ? parseInt(quantidade) : null,
      data_inicio: datas.inicio,
      data_fim: datas.fim,
    }
    if (tipo === 'vendedora') { meta.usuario_id = usuarioId; meta.usuario_nome = usuarioNome }
    if (tipo === 'categoria') { meta.categoria = categoria }

    const { error } = await criarMeta(meta)
    setSalvando(false)
    if (!error) {
      toast({ title: 'Meta criada com sucesso!' })
      onSalvo()
      resetar()
      onOpenChange(false)
    } else {
      toast({ title: 'Erro ao criar meta', description: (error as any)?.message || 'Tente novamente', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetar(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg" style={{ borderRadius: '24px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)', boxShadow: '0 25px 80px rgba(71,17,143,0.2)', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '24px 24px 20px' }}>
          <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Nova Meta — Passo {passo} de 3
          </h2>
        </div>

        {/* ── Passo 1 — Tipo ── */}
        {passo === 1 && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'loja',      Icon: Store,   label: 'Meta da Loja',      desc: 'Faturamento geral da loja' },
              { key: 'vendedora', Icon: User,    label: 'Por Vendedora',      desc: 'Meta individual por usuário' },
              { key: 'categoria', Icon: Package, label: 'Por Categoria',      desc: 'Meta de categoria de produto' },
            ].map(({ key, Icon, label, desc }) => (
              <button
                key={key}
                onClick={() => setTipo(key as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', borderRadius: '16px', textAlign: 'left',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  background: tipo === key ? 'rgba(142,95,207,0.06)' : 'rgba(255,255,255,0.8)',
                  border: tipo === key ? '2px solid #8E5FCF' : '1px solid rgba(142,95,207,0.15)',
                  boxShadow: tipo === key ? '0 0 0 3px rgba(142,95,207,0.15)' : 'none',
                }}
                onMouseEnter={e => { if (tipo !== key) { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.background = 'rgba(142,95,207,0.03)'; } }}
                onMouseLeave={e => { if (tipo !== key) { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; } }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tipo === key ? 'rgba(142,95,207,0.12)' : 'rgba(142,95,207,0.06)', flexShrink: 0 }}>
                  <Icon size={20} style={{ color: tipo === key ? '#8E5FCF' : '#9CA3AF' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: tipo === key ? '#8E5FCF' : '#1F2937', marginBottom: '2px' }}>{label}</p>
                  <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>{desc}</p>
                </div>
                {tipo === key && <Check size={16} style={{ color: '#8E5FCF', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        )}

        {/* ── Passo 2 — Detalhes ── */}
        {passo === 2 && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tipo === 'vendedora' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>Vendedora</Label>
                <Select value={usuarioId} onValueChange={v => {
                  setUsuId(v)
                  setUsuNome(usuarios.find(u => u.id === v)?.nome || '')
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tipo === 'categoria' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151' }}>Categoria</Label>
                <Select value={categoria} onValueChange={setCateg}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Período pills */}
            <div>
              <Label style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '8px' }}>Período</Label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['diario', 'semanal', 'mensal'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '10px',
                      fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem',
                      cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                      background: periodo === p ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'rgba(142,95,207,0.06)',
                      color: periodo === p ? 'white' : '#6B7280',
                      boxShadow: periodo === p ? '0 4px 12px rgba(142,95,207,0.35)' : 'none',
                    }}
                  >
                    {LABEL_PERIODO[p]}
                  </button>
                ))}
              </div>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF', marginTop: '6px' }}>
                {datas.inicio} → {datas.fim}
              </p>
            </div>

            {/* Valor em destaque */}
            <div>
              <Label style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '8px' }}>Valor da meta (R$)</Label>
              <input
                type="text"
                inputMode="numeric"
                value={formatMaskedValue(parseMaskedValue(valor))}
                onChange={e => setValor(e.target.value.replace(/\D/g, ''))}
                placeholder="0,00"
                style={{ width: '100%', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#8E5FCF', background: 'rgba(142,95,207,0.04)', border: '1.5px solid rgba(142,95,207,0.2)', borderRadius: '12px', padding: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <Label style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '6px' }}>Quantidade de vendas (opcional)</Label>
              <Input type="number" min="0" value={quantidade} onChange={e => setQtd(e.target.value)} placeholder="Ex: 50" />
            </div>
          </div>
        )}

        {/* ── Passo 3 — Confirmação ── */}
        {passo === 3 && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ background: 'rgba(142,95,207,0.06)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Tipo', valor: LABEL_TIPO[tipo] },
                { label: 'Período', valor: LABEL_PERIODO[periodo] },
                { label: 'Datas', valor: `${datas.inicio} → ${datas.fim}` },
                ...(tipo === 'vendedora' && usuarioNome ? [{ label: 'Vendedora', valor: usuarioNome }] : []),
                ...(tipo === 'categoria' && categoria ? [{ label: 'Categoria', valor: categoria }] : []),
                ...(quantidade ? [{ label: 'Qtd. vendas', valor: quantidade }] : []),
              ].map(({ label, valor: val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>{label}</span>
                  <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#1F2937' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(142,95,207,0.12)' }}>
                <span style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>Valor</span>
                <span style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.25rem', color: '#8E5FCF' }}>{fmtBRL(parseMaskedValue(valor))}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer com step dots */}
        <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: s === passo ? '20px' : '8px', height: '8px', borderRadius: '99px', background: s === passo ? '#8E5FCF' : s < passo ? 'rgba(142,95,207,0.4)' : 'rgba(142,95,207,0.15)', transition: 'all 0.3s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {passo > 1 && (
              <button
                onClick={() => setPasso(p => (p - 1) as any)}
                style={{ padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => { resetar(); onOpenChange(false) }}
              style={{ padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            {passo < 3 && (
              <button
                onClick={() => setPasso(p => (p + 1) as any)}
                disabled={passo === 1 ? !tipo : !valor}
                style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: (passo === 1 ? !tipo : !valor) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', opacity: (passo === 1 ? !tipo : !valor) ? 0.6 : 1 }}
              >
                Próximo
              </button>
            )}
            {passo === 3 && (
              <button
                onClick={confirmar}
                disabled={salvando}
                style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: salvando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', opacity: salvando ? 0.75 : 1 }}
              >
                {salvando ? 'Salvando…' : 'Criar Meta'}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

const Metas = () => {
  const { metas, loading, buscarProgressoMeta, excluirMeta, gerarDatas } = useMetas()
  const { empresaId } = useEmpresa()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [novaOpen, setNovaOpen]       = useState(false)
  const [progressos, setProgressos]   = useState<any[]>([])
  const [dadosDiarios, setDadosDiarios] = useState<any[]>([])
  const [tabAtual, setTabAtual]       = useState('visao-geral')

  // Carrega progresso de todas as metas ativas
  useEffect(() => {
    if (!metas.length) {
      setProgressos([])
      return
    }
    Promise.all((metas as any[]).map(m => buscarProgressoMeta(m)))
      .then(setProgressos)
  }, [metas])

  // Gráfico mensal: realizado dia a dia vs meta proporcional
  useEffect(() => {
    if (!empresaId) return
    const ini = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const fim = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const metaMensal = (metas as any[]).find(m => m.tipo === 'loja' && m.periodo === 'mensal')

    supabase.from('vendas').select('valor, created_at')
      .eq('empresa_id', empresaId)
      .gte('created_at', ini + 'T00:00:00')
      .lte('created_at', fim + 'T23:59:59')
      .then(({ data }) => {
        const dias = eachDayOfInterval({ start: startOfMonth(new Date()), end: new Date() })
        const diasNoMes = endOfMonth(new Date()).getDate()
        let acumulado = 0
        const grafico = dias.map(dia => {
          const dStr = format(dia, 'yyyy-MM-dd')
          const vendasDia = (data || []).filter((v: any) => v.created_at?.startsWith(dStr))
          acumulado += vendasDia.reduce((acc: number, v: any) => acc + (v.valor || 0), 0)
          const metaProporcional = metaMensal
            ? (metaMensal.valor / diasNoMes) * (dia.getDate())
            : null
          return {
            dia: format(dia, 'dd/MM'),
            realizado: acumulado,
            metaProporcional,
          }
        })
        setDadosDiarios(grafico)
      })
  }, [empresaId, metas])

  // Agrupa progresso por tipo/período
  const metaLoja    = progressos.filter(p => p.meta.tipo === 'loja')
  const metaVend    = progressos.filter(p => p.meta.tipo === 'vendedora')
  const metaCateg   = progressos.filter(p => p.meta.tipo === 'categoria')

  const metaDiaria  = metaLoja.find(p => p.meta.periodo === 'diario')
  const metaSemanal = metaLoja.find(p => p.meta.periodo === 'semanal')
  const metaMensal  = metaLoja.find(p => p.meta.periodo === 'mensal')

  // Histórico
  const historico = useMemo(() => progressos.map(p => ({
    periodo: `${p.meta.data_inicio} → ${p.meta.data_fim}`,
    tipo: LABEL_TIPO[p.meta.tipo],
    meta: p.meta.valor,
    realizado: p.realizado,
    pct: p.percentual,
    status: statusMeta(p.percentual),
  })), [progressos])

  const [confirmarExcluirId, setConfirmarExcluirId] = useState<string | null>(null)
  const handleExcluir = (id: string) => setConfirmarExcluirId(id)
  const confirmarExclusao = async () => {
    if (!confirmarExcluirId) return
    await excluirMeta(confirmarExcluirId)
    setConfirmarExcluirId(null)
    toast({ title: 'Meta removida' })
  }


  const tooltipStyle = {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontFamily: 'Gilroy',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
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
            @keyframes metaAtingida {
              0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
              70%  { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
              100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
            }
            @keyframes oasis-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Oasis › Metas de Vendas
              </p>
              <h1 style={{ fontSize: '2rem', fontFamily: 'Gilroy', fontWeight: 700, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                Metas de Vendas
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
                Configure e acompanhe as metas da sua loja
              </p>
            </div>
            <button
              onClick={() => setNovaOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.35)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(142,95,207,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(142,95,207,0.35)'; }}
            >
              <Plus size={16} /> Nova Meta
            </button>
          </div>

          {/* Tabs */}
          <Tabs value={tabAtual} onValueChange={setTabAtual}>
            {/* Custom pill tabs */}
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '16px', padding: '6px', gap: '4px' }}>
              {[
                { value: 'visao-geral', label: '🎯 Visão Geral' },
                { value: 'configurar',  label: '⚙️ Configurar' },
                { value: 'historico',   label: '📋 Histórico' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setTabAtual(tab.value)}
                  style={{
                    padding: '10px 20px', borderRadius: '12px', border: 'none',
                    fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    background: tabAtual === tab.value ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent',
                    color: tabAtual === tab.value ? 'white' : '#6B7280',
                    boxShadow: tabAtual === tab.value ? '0 4px 15px rgba(142,95,207,0.4)' : 'none',
                    transform: tabAtual === tab.value ? 'translateY(-1px)' : 'none',
                  }}
                  onMouseEnter={e => { if (tabAtual !== tab.value) { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; e.currentTarget.style.color = '#8E5FCF'; } }}
                  onMouseLeave={e => { if (tabAtual !== tab.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; } }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Hidden TabsList */}
            <TabsList className="hidden">
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="configurar">Configurar</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* ── ABA VISÃO GERAL ──────────────────────────────────────── */}
            <TabsContent value="visao-geral" className="mt-6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '48px', fontFamily: 'Gilroy', color: '#9CA3AF' }}>Carregando…</div>
                ) : (progressos.length === 0 && !loading) ? (
                  <div style={{ textAlign: 'center', padding: '64px 24px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '2px dashed rgba(142,95,207,0.2)', borderRadius: '24px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Target size={36} style={{ color: '#8E5FCF' }} />
                    </div>
                    <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', color: '#1F2937', marginBottom: '8px' }}>Nenhuma meta configurada</h3>
                    <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '24px' }}>Defina metas para acompanhar o desempenho da sua equipe</p>
                    <button
                      onClick={() => setNovaOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '11px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)' }}
                    >
                      <Plus size={16} /> Criar primeira meta
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Cards de período */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const cores = ['#8E5FCF', '#3B82F6', '#10B981']
                        const tituloLojaPeriodo: Record<string, string> = { diario: 'Meta do Dia', semanal: 'Esta Semana', mensal: 'Este Mês' }
                        const ativas = [...progressos].sort((a, b) => {
                          const ordemTipo: Record<string, number> = { loja: 0, vendedora: 1, categoria: 2 }
                          const ordemPer: Record<string, number> = { diario: 0, semanal: 1, mensal: 2 }
                          const t = (ordemTipo[a.meta.tipo] ?? 9) - (ordemTipo[b.meta.tipo] ?? 9)
                          if (t !== 0) return t
                          return (ordemPer[a.meta.periodo] ?? 9) - (ordemPer[b.meta.periodo] ?? 9)
                        }).slice(0, 3)
                        const slots: (any | null)[] = [ativas[0] ?? null, ativas[1] ?? null, ativas[2] ?? null]
                        return slots.map((p, i) => {
                          let titulo = 'Sem meta configurada'
                          if (p) {
                            if (p.meta.tipo === 'loja') titulo = tituloLojaPeriodo[p.meta.periodo] ?? 'Meta da Loja'
                            else if (p.meta.tipo === 'vendedora') titulo = `${p.meta.usuario_nome ?? 'Vendedora'} · ${LABEL_PERIODO[p.meta.periodo as keyof typeof LABEL_PERIODO] ?? p.meta.periodo}`
                            else if (p.meta.tipo === 'categoria') titulo = `${p.meta.categoria ?? 'Categoria'} · ${LABEL_PERIODO[p.meta.periodo as keyof typeof LABEL_PERIODO] ?? p.meta.periodo}`
                          }
                          return (
                            <CardPeriodo
                              key={p?.meta.id ?? `vazio-${i}`}
                              titulo={titulo}
                              borderColor={cores[i]}
                              progresso={p}
                              onDefinir={() => setNovaOpen(true)}
                            />
                          )
                        })
                      })()}
                    </div>

                    {/* Gráfico mensal */}
                    {dadosDiarios.length > 0 && (
                      <div style={{ ...glassCard, padding: '24px' }}>
                        <div style={{ marginBottom: '16px' }}>
                          <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>
                            Realizado vs Meta — {format(new Date(), 'MMMM/yyyy', { locale: ptBR })}
                          </h3>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={dadosDiarios} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                              <linearGradient id="gradRealizado" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#8E5FCF" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#8E5FCF" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} interval={4} />
                            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Gilroy' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
                            <Area type="monotone" dataKey="realizado" name="Realizado" stroke="#8E5FCF" strokeWidth={2.5} fill="url(#gradRealizado)" dot={false} />
                            {dadosDiarios[0]?.metaProporcional != null && (
                              <Line type="monotone" dataKey="metaProporcional" name="Meta proporcional" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Ranking */}
                    <div style={{ ...glassCard, padding: '0', overflow: 'hidden' }}>
                      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Ranking de Vendedoras</h3>
                        <span style={{ background: 'rgba(142,95,207,0.1)', color: '#8E5FCF', border: '1px solid rgba(142,95,207,0.2)', borderRadius: '20px', padding: '4px 12px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem' }}>
                          Mês atual
                        </span>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <RankingVendedoras />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ── ABA CONFIGURAR ──────────────────────────────────────── */}
            <TabsContent value="configurar" className="mt-6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Meta da Loja */}
                <div>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Meta da Loja</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['diario', 'semanal', 'mensal'] as const).map(per => {
                      const p = progressos.find(x => x.meta.tipo === 'loja' && x.meta.periodo === per)
                      return (
                        <div key={per} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '16px', padding: '20px', transition: 'all 0.2s' }}>
                          <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{LABEL_PERIODO[per]}</p>
                          {p ? (
                            <>
                              <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.5rem', color: '#8E5FCF', marginBottom: '4px' }}>{fmtBRL(p.meta.valor)}</p>
                              <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '12px' }}>{p.percentual.toFixed(0)}% realizado</p>
                              <button
                                onClick={() => handleExcluir(p.meta.id)}
                                style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
                              >
                                Remover
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setNovaOpen(true)}
                              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px dashed rgba(142,95,207,0.3)', background: 'transparent', color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.04)'; e.currentTarget.style.borderColor = '#8E5FCF'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.3)'; }}
                            >
                              + Definir meta
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Meta por Vendedora */}
                {metaVend.length > 0 && (
                  <div>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Metas por Vendedora</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {metaVend.map(p => (
                        <div key={p.meta.id} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: 'white' }}>
                              {(p.meta.usuario_nome || 'V')[0].toUpperCase()}
                            </span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', marginBottom: '2px' }}>{p.meta.usuario_nome || 'Vendedora'}</p>
                            <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>{LABEL_PERIODO[p.meta.periodo]} · {fmtBRL(p.meta.valor)}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '0.9rem', color: p.percentual >= 100 ? '#10B981' : p.percentual >= 50 ? '#F59E0B' : '#EF4444' }}>
                              {p.percentual.toFixed(0)}%
                            </span>
                            <button
                              onClick={() => handleExcluir(p.meta.id)}
                              style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = 'white'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#EF4444'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta por Categoria */}
                {metaCateg.length > 0 && (
                  <div>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Metas por Categoria</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {metaCateg.map(p => (
                        <div key={p.meta.id} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Package size={18} style={{ color: '#8E5FCF' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#1F2937', marginBottom: '2px' }}>{p.meta.categoria}</p>
                            <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>{LABEL_PERIODO[p.meta.periodo]} · {fmtBRL(p.meta.valor)}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '0.9rem', color: p.percentual >= 100 ? '#10B981' : p.percentual >= 50 ? '#F59E0B' : '#EF4444' }}>
                              {p.percentual.toFixed(0)}%
                            </span>
                            <button
                              onClick={() => handleExcluir(p.meta.id)}
                              style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = 'white'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = '#EF4444'; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setNovaOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', alignSelf: 'flex-start' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
                >
                  <Plus size={15} /> Adicionar meta
                </button>
              </div>
            </TabsContent>

            {/* ── ABA HISTÓRICO ────────────────────────────────────────── */}
            <TabsContent value="historico" className="mt-6">
              <div style={{ ...glassCard, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Gilroy' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))' }}>
                      {['Período', 'Tipo', 'Meta', 'Realizado', '%', 'Status'].map((h, i) => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: i >= 2 ? 'right' : 'left', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(142,95,207,0.1)', ...(i === 5 ? { textAlign: 'center' } : {}) }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '48px', fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.875rem' }}>
                          Nenhum histórico disponível
                        </td>
                      </tr>
                    ) : historico.map((h, i) => {
                      const bgRow = h.status === 'atingida' ? 'rgba(16,185,129,0.03)' : 'transparent'
                      const statusCfg = h.status === 'atingida'
                        ? { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: '✅ Atingida' }
                        : h.status === 'quase'
                        ? { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: '⚠️ Quase' }
                        : { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: '📉 Não atingida' }
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(142,95,207,0.06)', background: bgRow, transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.03)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = bgRow; }}
                        >
                          <td style={{ padding: '14px 16px', fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280' }}>{h.periodo}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{h.tipo}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#374151' }}>{fmtBRL(h.meta)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', color: '#1F2937' }}>{fmtBRL(h.realizado)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: h.pct >= 100 ? '#10B981' : h.pct >= 80 ? '#F59E0B' : '#EF4444' }}>
                                {h.pct.toFixed(0)}%
                              </span>
                              <div style={{ width: '60px', height: '4px', borderRadius: '99px', background: 'rgba(142,95,207,0.1)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(h.pct, 100)}%`, background: h.pct >= 100 ? '#10B981' : h.pct >= 80 ? '#F59E0B' : '#EF4444', borderRadius: '99px' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ background: statusCfg.bg, color: statusCfg.color, borderRadius: '20px', padding: '4px 10px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem' }}>
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>

      <ModalNovaMeta open={novaOpen} onOpenChange={setNovaOpen} onSalvo={() => {}} />

      <AlertDialog open={!!confirmarExcluirId} onOpenChange={(o) => { if (!o) setConfirmarExcluirId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-background text-destructive border border-destructive hover:bg-destructive/10"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Metas
