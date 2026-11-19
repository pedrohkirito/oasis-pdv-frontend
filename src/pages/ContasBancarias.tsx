import React, { useState, useRef } from 'react'
import { ResumoCategoriasCard } from '@/components/bancario/ResumoCategoriasCard'
import { useContasBancarias } from '@/hooks/useContasBancarias'
import { parseOFX } from '@/utils/ofxParser'
import { PluggyConnect } from '@/components/bancario/PluggyConnect'
import { usePluggy } from '@/hooks/usePluggy'
import { useEmpresa } from '@/hooks/useEmpresa'
import { format, startOfMonth, endOfMonth, formatDistanceToNow, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, ResponsiveContainer } from 'recharts'
import {
  Wallet, TrendingUp, TrendingDown, Building2, CreditCard,
  Smartphone, Banknote, PiggyBank, MoreVertical, Plus,
  Upload, ArrowLeftRight, Landmark, ChevronDown, RefreshCw, Loader2, Clock, Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const TIPO_ICONE: Record<string, React.ReactNode> = {
  corrente: <Building2 size={20} />,
  poupanca: <PiggyBank size={20} />,
  cartao_credito: <CreditCard size={20} />,
  carteira_digital: <Smartphone size={20} />,
  caixa: <Banknote size={20} />,
  investimento: <TrendingUp size={20} />,
  outro: <Wallet size={20} />,
}

const TIPO_LABEL: Record<string, string> = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
  cartao_credito: 'Cartão de Crédito',
  carteira_digital: 'Carteira Digital',
  caixa: 'Caixa',
  investimento: 'Investimento',
  outro: 'Outro',
}

const CORES = ['#8E5FCF', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899']

// ─── Shared style ─────────────────────────────────────────────────────────────

const glassCard = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: '20px',
  padding: '24px',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
}

// ─── Card resumo KPI ──────────────────────────────────────────────────────────

function CardResumo({
  titulo, valor, icone, gradiente, negativo, borderColor,
}: {
  titulo: string
  valor: number
  icone: React.ReactNode
  gradiente: string
  negativo?: boolean
  borderColor?: string
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...glassCard,
        borderTop: `3px solid ${borderColor || '#8E5FCF'}`,
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>{titulo}</p>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.75rem', color: negativo ? '#EF4444' : '#1F2937', lineHeight: 1.2 }}>
            {fmtBRL(valor)}
          </p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: gradiente, flexShrink: 0 }}>
          {icone}
        </div>
      </div>
    </div>
  )
}

// ─── Card de conta ────────────────────────────────────────────────────────────

function ContaCard({
  conta,
  onExtrato,
  onImportar,
  onTransferir,
  onDesativar,
  onConectarPluggy,
  onSincronizar,
  sincronizando,
  miniMovs,
}: {
  conta: any
  onExtrato: () => void
  onImportar: () => void
  onTransferir: () => void
  onDesativar: () => void
  onConectarPluggy: (itemId: string) => void
  onSincronizar?: () => void
  sincronizando?: boolean
  miniMovs?: { dia: string; credito: number; debito: number }[]
}) {
  const saldoNegativo = conta.saldo_atual < 0
  const temPluggy = !!conta.pluggy_account_id
  const corConta = conta.cor || '#8E5FCF'
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(142,95,207,0.12)',
        borderRadius: '24px',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: hovered ? '0 20px 60px rgba(71,17,143,0.15)' : '0 4px 20px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
      }}
    >
      {/* Faixa colorida topo */}
      <div style={{ height: '6px', background: corConta }} />

      {/* Corpo */}
      <div style={{ padding: '20px' }}>
        {/* Linha 1: ícone + badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: `linear-gradient(135deg, ${corConta}dd, ${corConta}99)`, flexShrink: 0 }}>
            {TIPO_ICONE[conta.kind] ?? <Wallet size={20} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            {conta.padrao && (
              <span style={{ background: 'rgba(142,95,207,0.1)', color: '#8E5FCF', border: '1px solid rgba(142,95,207,0.2)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                Padrão
              </span>
            )}
            {temPluggy ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                <span className="oasis-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Tempo real
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(107,114,128,0.1)', color: '#6B7280', borderRadius: '20px', padding: '3px 10px', fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9CA3AF', display: 'inline-block' }} />
                Manual
              </span>
            )}
          </div>
        </div>

        {/* Nome */}
        <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', marginBottom: '4px' }}>{conta.name}</p>

        {/* Banco/kind */}
        <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', marginBottom: '16px' }}>
          {TIPO_LABEL[conta.kind]}
          {conta.banco && <> · {conta.banco}</>}
          {conta.agencia && <> · Ag: {conta.agencia}</>}
          {conta.numero_conta && <> C: {conta.numero_conta}{conta.digito ? `-${conta.digito}` : ''}</>}
        </p>

        {/* Saldo */}
        <div>
          <p style={{ fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {conta.kind === 'cartao_credito' ? 'Fatura atual' : 'Saldo atual'}
          </p>
          <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.5rem', color: saldoNegativo ? '#EF4444' : '#1F2937', lineHeight: 1.2 }}>
            {fmtBRL(conta.saldo_atual || 0)}
          </p>
          {conta.kind === 'cartao_credito' && conta.limite_credito && (
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginTop: '4px' }}>
              Limite: {fmtBRL(conta.limite_credito)}
            </p>
          )}
        </div>

        {/* Mini gráfico 7 dias */}
        {miniMovs && miniMovs.length > 0 && (
          <div style={{ height: '48px', marginTop: '12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniMovs} barGap={1} barSize={6}>
                <Bar dataKey="credito" fill="#10B981" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="debito" fill="#EF4444" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Última sincronização */}
        {temPluggy && conta.ultima_sincronizacao && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginTop: '6px' }}>
            <Clock size={10} />
            Atualizado {formatDistanceToNow(new Date(conta.ultima_sincronizacao), { addSuffix: true, locale: ptBR })}
          </p>
        )}

        {/* Conectado via Open Finance */}
        {conta.pluggy_item_id && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 600, marginTop: '8px' }}>
            ✅ Conectado via Open Finance
          </p>
        )}

        {/* Conectar via Open Finance se não conectado */}
        {!conta.pluggy_item_id && (
          <div style={{ marginTop: '12px' }}>
            <PluggyConnect
              onSuccess={onConectarPluggy}
              onError={err => console.error('Pluggy error:', err)}
            />
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: '1px solid rgba(142,95,207,0.08)', padding: '12px 20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={onExtrato}
          style={{ flex: 1, padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#8E5FCF'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; e.currentTarget.style.color = '#8E5FCF'; }}
        >
          Extrato
        </button>
        <button
          onClick={onImportar}
          style={{ flex: 1, padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#8E5FCF'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; e.currentTarget.style.color = '#8E5FCF'; }}
        >
          Conciliar
        </button>
        {conta.pluggy_item_id && (
          <button
            onClick={onSincronizar}
            disabled={sincronizando}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: sincronizando ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: sincronizando ? 0.7 : 1 }}
            onMouseEnter={e => { if (!sincronizando) { e.currentTarget.style.background = '#10B981'; e.currentTarget.style.color = 'white'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = '#10B981'; }}
          >
            {sincronizando
              ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
              : <RefreshCw size={11} />
            }
            Sync
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#8E5FCF'; e.currentTarget.style.background = 'rgba(142,95,207,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent'; }}
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExtrato}>Ver extrato</DropdownMenuItem>
            <DropdownMenuItem onClick={onImportar}>Importar OFX</DropdownMenuItem>
            <DropdownMenuItem onClick={onTransferir}>Transferir</DropdownMenuItem>
            {conta.pluggy_account_id && (
              <DropdownMenuItem onClick={onSincronizar} className="gap-2">
                <RefreshCw size={14} /> Sincronizar agora
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDesativar} className="text-destructive">
              Desativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── Modal Nova Conta ─────────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { key: 'corrente', label: 'Conta Corrente', icone: <Building2 size={22} /> },
  { key: 'poupanca', label: 'Poupança', icone: <PiggyBank size={22} /> },
  { key: 'cartao_credito', label: 'Cartão de Crédito', icone: <CreditCard size={22} /> },
  { key: 'carteira_digital', label: 'Carteira Digital', icone: <Smartphone size={22} /> },
  { key: 'caixa', label: 'Caixa', icone: <Banknote size={22} /> },
  { key: 'investimento', label: 'Investimento', icone: <TrendingUp size={22} /> },
]

const CARTEIRAS_DIGITAIS = [
  { code: '260', name: 'Nubank' },
  { code: '380', name: 'PicPay' },
  { code: '999', name: 'Mercado Pago' },
  { code: '000', name: 'PayPal' },
  { code: 'out', name: 'Outro' },
]

function ModalNovaConta({
  open,
  onClose,
  onCriar,
  BANCOS,
}: {
  open: boolean
  onClose: () => void
  onCriar: (dados: any) => Promise<void>
  BANCOS: { code: string; name: string }[]
}) {
  const [passo, setPasso] = useState(1)
  const [kind, setTipo] = useState('')
  const [form, setForm] = useState<any>({
    banco: '', agencia: '', numero_conta: '', digito: '',
    saldo_inicial: '', saldo_atual: '', data_inicio: format(new Date(), 'yyyy-MM-dd'),
    padrao: false, limite_credito: '', dia_fechamento: '', dia_vencimento: '',
    name: '', cor: CORES[0],
  })
  const [salvando, setSalvando] = useState(false)

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }))

  const handleCriar = async () => {
    setSalvando(true)
    const banco = BANCOS.find(b => b.code === form.banco)
    await onCriar({
      kind,
      name: form.name || TIPO_LABEL[kind],
      banco_nome: banco?.name || form.banco,
      banco_codigo: form.banco,
      agencia: form.agencia,
      numero_conta: form.numero_conta,
      digito: form.digito,
      saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      saldo_atual: parseFloat(form.saldo_atual || form.saldo_inicial) || 0,
      data_inicio: form.data_inicio,
      padrao: form.padrao,
      cor: form.cor,
    })
    setSalvando(false)
    onClose()
    setPasso(1)
    setTipo('')
    setForm({ banco: '', agencia: '', numero_conta: '', digito: '', saldo_inicial: '',
      saldo_atual: '', data_inicio: format(new Date(), 'yyyy-MM-dd'), padrao: false,
      limite_credito: '', dia_fechamento: '', dia_vencimento: '', name: '', cor: CORES[0] })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{ borderRadius: '24px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)', boxShadow: '0 25px 80px rgba(71,17,143,0.2)', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '24px 24px 20px' }}>
          <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            {passo === 1 && 'Nova Conta — Tipo'}
            {passo === 2 && 'Nova Conta — Dados'}
            {passo === 3 && 'Nova Conta — Personalização'}
          </h2>
        </div>

        {/* Passo 1 — Tipo */}
        {passo === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '20px 24px' }}>
            {TIPO_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setTipo(opt.key); setPasso(2) }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  padding: '20px 12px', borderRadius: '16px', cursor: 'pointer',
                  transition: 'all 0.2s ease', textAlign: 'center',
                  background: kind === opt.key ? 'rgba(142,95,207,0.06)' : 'rgba(255,255,255,0.8)',
                  border: kind === opt.key ? '2px solid #8E5FCF' : '1px solid rgba(142,95,207,0.15)',
                  boxShadow: kind === opt.key ? '0 0 0 3px rgba(142,95,207,0.15)' : 'none',
                }}
                onMouseEnter={e => { if (kind !== opt.key) { e.currentTarget.style.border = '1px solid rgba(142,95,207,0.4)'; e.currentTarget.style.background = 'rgba(142,95,207,0.03)'; } }}
                onMouseLeave={e => { if (kind !== opt.key) { e.currentTarget.style.border = '1px solid rgba(142,95,207,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; } }}
              >
                <span style={{ color: '#8E5FCF' }}>{opt.icone}</span>
                <span style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#374151', lineHeight: 1.3 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Passo 2 — Dados por kind */}
        {passo === 2 && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(kind === 'corrente' || kind === 'poupanca') && (
              <>
                <div>
                  <Label>Banco</Label>
                  <Select value={form.banco} onValueChange={v => set('banco', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map(b => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.code} — {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>Agência</Label>
                    <Input placeholder="0001" value={form.agencia} onChange={e => set('branch', e.target.value)} />
                  </div>
                  <div>
                    <Label>Número da Conta</Label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Input placeholder="12345" value={form.numero_conta} onChange={e => set('numero_conta', e.target.value)} />
                      <Input placeholder="0" style={{ width: '56px' }} value={form.digito} onChange={e => set('account_digit', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Saldo inicial (R$)</Label>
                  <Input type="number" placeholder="0,00" value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)} />
                </div>
                <div>
                  <Label>Data de início</Label>
                  <Input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Switch checked={form.padrao} onCheckedChange={v => set('padrao', v)} />
                  <Label>Conta padrão</Label>
                </div>
              </>
            )}

            {kind === 'cartao_credito' && (
              <>
                <div>
                  <Label>Banco / Operadora</Label>
                  <Select value={form.banco} onValueChange={v => set('banco', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map(b => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.code} — {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Limite do cartão (R$)</Label>
                  <Input type="number" placeholder="5000" value={form.limite_credito} onChange={e => set('limite_credito', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <Label>Dia de fechamento</Label>
                    <Input type="number" min={1} max={31} placeholder="5" value={form.dia_fechamento} onChange={e => set('dia_fechamento', e.target.value)} />
                  </div>
                  <div>
                    <Label>Dia de vencimento</Label>
                    <Input type="number" min={1} max={31} placeholder="12" value={form.dia_vencimento} onChange={e => set('dia_vencimento', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Fatura atual (R$)</Label>
                  <Input type="number" placeholder="0,00" value={form.saldo_atual} onChange={e => set('saldo_atual', e.target.value)} />
                </div>
              </>
            )}

            {kind === 'carteira_digital' && (
              <>
                <div>
                  <Label>Carteira</Label>
                  <Select value={form.banco} onValueChange={v => set('banco', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CARTEIRAS_DIGITAIS.map(b => (
                        <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Saldo inicial (R$)</Label>
                  <Input type="number" placeholder="0,00" value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)} />
                </div>
              </>
            )}

            {kind === 'caixa' && (
              <>
                <div>
                  <Label>Nome do caixa</Label>
                  <Input placeholder="Ex: Caixa Loja" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <Label>Saldo inicial (R$)</Label>
                  <Input type="number" placeholder="0,00" value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)} />
                </div>
              </>
            )}

            {kind === 'investimento' && (
              <>
                <div>
                  <Label>Banco / Corretora</Label>
                  <Select value={form.banco} onValueChange={v => set('banco', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BANCOS.map(b => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.code} — {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Saldo atual (R$)</Label>
                  <Input type="number" placeholder="0,00" value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Passo 3 — Personalização */}
        {passo === 3 && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <Label>Nome da conta</Label>
              <Input
                placeholder={TIPO_LABEL[kind]}
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <Label style={{ display: 'block', marginBottom: '10px' }}>Cor</Label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {CORES.map(cor => (
                  <button
                    key={cor}
                    onClick={() => set('color', cor)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: cor, border: 'none', cursor: 'pointer',
                      outline: form.cor === cor ? `3px solid ${cor}` : 'none',
                      outlineOffset: 3, transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ height: '4px', background: form.cor }} />
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', background: form.cor }}>
                    {TIPO_ICONE[kind]}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#1F2937' }}>{form.name || TIPO_LABEL[kind]}</p>
                    <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#6B7280' }}>{TIPO_LABEL[kind]}</p>
                  </div>
                </div>
                <p style={{ fontFamily: 'Gilroy', fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '2px' }}>Saldo atual</p>
                <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.25rem', color: '#1F2937' }}>{fmtBRL(parseFloat(form.saldo_inicial) || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer com indicador de passos */}
        <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: s === passo ? '20px' : '8px', height: '8px', borderRadius: '99px', background: s === passo ? '#8E5FCF' : s < passo ? 'rgba(142,95,207,0.4)' : 'rgba(142,95,207,0.15)', transition: 'all 0.3s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {passo > 1 ? (
              <button
                onClick={() => setPasso(p => p - 1)}
                style={{ padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Voltar
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{ padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Cancelar
              </button>
            )}
            {passo === 2 && (
              <button
                onClick={() => setPasso(3)}
                style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)' }}
              >
                Continuar
              </button>
            )}
            {passo === 3 && (
              <button
                onClick={handleCriar}
                disabled={salvando}
                style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: salvando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', opacity: salvando ? 0.75 : 1 }}
              >
                {salvando ? 'Criando…' : 'Criar Conta'}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Importar OFX ───────────────────────────────────────────────────────

function ModalImportarOFX({
  open,
  onClose,
  conta,
  onImportar,
}: {
  open: boolean
  onClose: () => void
  conta: any
  onImportar: (contaId: string, arquivo: File) => Promise<any>
}) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [importando, setImportando] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleArquivo = async (file: File) => {
    setArquivo(file)
    setResultado(null)
    const conteudo = await file.text()
    const transacoes = parseOFX(conteudo)

    if (transacoes.length === 0) {
      setPreview({ erro: 'Nenhuma transação encontrada no arquivo.' })
      return
    }

    const datas = transacoes.map(t => t.data_movimentacao).sort()
    const creditos = transacoes.filter(t => t.kind === 'credito').reduce((s, t) => s + t.valor, 0)
    const debitos = transacoes.filter(t => t.kind === 'debito').reduce((s, t) => s + t.valor, 0)

    setPreview({
      total: transacoes.length,
      dataInicio: datas[0],
      dataFim: datas[datas.length - 1],
      creditos,
      debitos,
    })
  }

  const handleImportar = async () => {
    if (!arquivo || !conta) return
    setImportando(true)
    const res = await onImportar(conta.id, arquivo)
    setResultado(res)
    setImportando(false)
  }

  const handleClose = () => {
    setArquivo(null)
    setPreview(null)
    setResultado(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" style={{ borderRadius: '24px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)', boxShadow: '0 25px 80px rgba(71,17,143,0.2)', padding: 0, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '24px 24px 20px' }}>
          <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Importar Extrato OFX
          </h2>
          <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
            Exporte o extrato OFX do seu banco e importe aqui para conciliação automática.
          </p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Accordion type="single" collapsible style={{ fontSize: '0.875rem' }}>
            <AccordionItem value="instrucoes" style={{ borderColor: 'rgba(142,95,207,0.12)' }}>
              <AccordionTrigger style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280', padding: '8px 0' }}>
                Como exportar por banco
              </AccordionTrigger>
              <AccordionContent>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    ['Itaú', 'Meu Banco → Extrato → Exportar OFX'],
                    ['Bradesco', 'Internet Banking → Extrato → OFX'],
                    ['Santander', 'NetBanking → Extrato → Baixar OFX'],
                    ['Nubank', 'App → Perfil → Exportar dados'],
                  ].map(([banco, instrucao]) => (
                    <li key={banco} style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280' }}>
                      <strong style={{ color: '#374151' }}>{banco}:</strong> {instrucao}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Upload */}
          {!resultado && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) handleArquivo(f)
              }}
              style={{
                background: dragOver ? 'rgba(142,95,207,0.08)' : 'rgba(142,95,207,0.04)',
                border: `2px dashed ${dragOver ? '#8E5FCF' : 'rgba(142,95,207,0.3)'}`,
                borderRadius: '16px', padding: '40px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Upload size={22} style={{ color: 'white' }} />
              </div>
              <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#374151', marginBottom: '4px' }}>
                Arraste o arquivo OFX aqui
              </p>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#9CA3AF' }}>
                ou clique para selecionar · .ofx, .OFX
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".ofx,.OFX"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleArquivo(f)
                }}
              />
            </div>
          )}

          {/* Preview */}
          {preview && !preview.erro && !resultado && (
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.9rem', color: '#10B981', marginBottom: '6px' }}>
                {preview.total} transações encontradas
              </p>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280', marginBottom: '8px' }}>
                Período: {preview.dataInicio} a {preview.dataFim}
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#10B981' }}>
                  Créditos: {fmtBRL(preview.creditos)}
                </span>
                <span style={{ fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', color: '#EF4444' }}>
                  Débitos: {fmtBRL(preview.debitos)}
                </span>
              </div>
            </div>
          )}

          {preview?.erro && (
            <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#EF4444' }}>{preview.erro}</p>
          )}

          {/* Resultado */}
          {resultado && (
            <div style={{ background: resultado.error ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${resultado.error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '12px', padding: '16px' }}>
              {resultado.error ? (
                <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#EF4444' }}>{String(resultado.error)}</p>
              ) : (
                <>
                  {resultado.importadas > 0 && (
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', color: '#10B981' }}>
                      ✅ {resultado.importadas} transações importadas com sucesso
                    </p>
                  )}
                  {resultado.importadas === 0 && (
                    <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#6B7280' }}>{resultado.mensagem}</p>
                  )}
                </>
              )}
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
          {preview && !preview.erro && !resultado && (
            <button
              onClick={handleImportar}
              disabled={importando}
              style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: importando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', opacity: importando ? 0.75 : 1 }}
            >
              {importando ? 'Importando…' : 'Importar'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Transferência ──────────────────────────────────────────────────────

function ModalTransferencia({
  open,
  onClose,
  contas,
  contaOrigemId,
  onTransferir,
}: {
  open: boolean
  onClose: () => void
  contas: any[]
  contaOrigemId?: string
  onTransferir: (origem: string, destino: string, valor: number, desc: string, data: string) => Promise<any>
}) {
  const [origem, setOrigem] = useState(contaOrigemId || '')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [salvando, setSalvando] = useState(false)

  const handleTransferir = async () => {
    if (!origem || !destino || !valor) return
    setSalvando(true)
    await onTransferir(origem, destino, parseFloat(valor), descricao, data)
    setSalvando(false)
    onClose()
  }

  const contaOrigemObj = contas.find(c => c.id === origem)
  const contaDestinoObj = contas.find(c => c.id === destino)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" style={{ borderRadius: '24px', border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)', boxShadow: '0 25px 80px rgba(71,17,143,0.2)', padding: 0, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '24px 24px 20px' }}>
          <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Transferência entre Contas
          </h2>
        </div>

        {/* Mini preview origem → destino */}
        {(contaOrigemObj || contaDestinoObj) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 24px 0' }}>
            {contaOrigemObj && (
              <div style={{ flex: 1, background: 'rgba(142,95,207,0.06)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem', color: '#1F2937' }}>{contaOrigemObj.name}</p>
                <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF' }}>{fmtBRL(contaOrigemObj.saldo_atual || 0)}</p>
              </div>
            )}
            {(contaOrigemObj || contaDestinoObj) && (
              <div style={{ color: '#8E5FCF', fontWeight: 700, fontSize: '1.2rem' }}>→</div>
            )}
            {contaDestinoObj && (
              <div style={{ flex: 1, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.8rem', color: '#1F2937' }}>{contaDestinoObj.name}</p>
                <p style={{ fontFamily: 'Gilroy', fontSize: '0.75rem', color: '#9CA3AF' }}>{fmtBRL(contaDestinoObj.saldo_atual || 0)}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <Label>Conta origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contas.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conta destino</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contas.filter(c => c.id !== origem).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
          </div>
          {valor && (
            <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(142,95,207,0.06)', borderRadius: '10px' }}>
              <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.25rem', color: '#8E5FCF' }}>{fmtBRL(parseFloat(valor) || 0)}</p>
            </div>
          )}
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input placeholder="Transferência entre contas" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.25)', background: 'rgba(255,255,255,0.8)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleTransferir}
            disabled={salvando || !origem || !destino || !valor}
            style={{ padding: '9px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: (salvando || !origem || !destino || !valor) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', opacity: (salvando || !origem || !destino || !valor) ? 0.65 : 1 }}
          >
            {salvando ? 'Transferindo…' : 'Transferir'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ContasBancarias() {
  const {
    contas, loading, BANCOS,
    criarConta, atualizarConta, atualizarSaldo, excluirConta, importarOFX, transferirEntreContas,
    buscarMovimentacoes, buscarContas,
  } = useContasBancarias()

  const { importarTransacoesPluggy, sincronizarTransacoes, importando } = usePluggy()
  const { companyId } = useEmpresa()
  const { toast } = useToast()
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null)
  const [sincronizandoTodas, setSincronizandoTodas] = useState(false)

  const [modalNova, setModalNova] = useState(false)
  const [modalOFX, setModalOFX] = useState<any>(null)
  const [modalTransf, setModalTransf] = useState<{ open: boolean; contaOrigemId?: string }>({ open: false })

  // Resumo do mês
  const hoje = new Date()
  const iniMes = format(startOfMonth(hoje), 'yyyy-MM-dd')
  const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd')

  const saldoTotal = contas
    .filter(c => c.kind !== 'cartao_credito')
    .reduce((s, c) => s + (c.saldo_atual || 0), 0)

  // Entradas e saídas são calculadas via movimentações — aqui usamos saldo_inicial como fallback
  const [entradasMes, setEntradasMes] = React.useState(0)
  const [saidasMes, setSaidasMes] = React.useState(0)
  const [miniMovsPorConta, setMiniMovsPorConta] = React.useState<
    Record<string, { dia: string; credito: number; debito: number }[]>
  >({})

  React.useEffect(() => {
    const calcularFluxo = async () => {
      let creditos = 0
      let debitos = 0
      const sete = format(subDays(hoje, 6), 'yyyy-MM-dd')
      const novosMini: typeof miniMovsPorConta = {}

      for (const conta of contas) {
        const movs = await buscarMovimentacoes(conta.id, iniMes, fimMes)
        creditos += movs.filter((m: any) => m.kind === 'credito').reduce((s: number, m: any) => s + m.valor, 0)
        debitos += movs.filter((m: any) => m.kind === 'debito').reduce((s: number, m: any) => s + m.valor, 0)

        // Mini gráfico: últimos 7 dias agrupados por dia
        const ultimos7 = movs.filter((m: any) => m.data_movimentacao >= sete)
        const porDia: Record<string, { credito: number; debito: number }> = {}
        for (let i = 6; i >= 0; i--) {
          const d = format(subDays(hoje, i), 'yyyy-MM-dd')
          porDia[d] = { credito: 0, debito: 0 }
        }
        for (const m of ultimos7 as any[]) {
          const d = m.data_movimentacao?.split('T')[0] || m.data_movimentacao
          if (porDia[d]) {
            if (m.kind === 'credito') porDia[d].credito += m.valor
            else porDia[d].debito += m.valor
          }
        }
        novosMini[conta.id] = Object.entries(porDia).map(([dia, v]) => ({ dia, ...v }))
      }
      setEntradasMes(creditos)
      setSaidasMes(debitos)
      setMiniMovsPorConta(novosMini)
    }
    if (contas.length > 0) calcularFluxo()
  }, [contas])

  const handleCriarConta = async (dados: any) => {
    const { error } = await criarConta(dados)
    if (error) {
      toast({ title: 'Erro ao criar conta', description: String(error.message), variant: 'destructive' })
    } else {
      toast({ title: 'Conta criada com sucesso!' })
    }
  }

  const handleImportar = async (contaId: string, arquivo: File) => {
    return await importarOFX(contaId, arquivo)
  }

  const handleTransferir = async (
    origem: string, destino: string, valor: number, desc: string, data: string
  ) => {
    const { error } = await transferirEntreContas(origem, destino, valor, desc, data)
    if (error) {
      toast({ title: 'Erro na transferência', variant: 'destructive' })
    } else {
      toast({ title: 'Transferência realizada!' })
    }
  }

  const handleDesativar = async (id: string) => {
    await excluirConta(id)
    toast({ title: 'Conta desativada' })
  }

  const handleSincronizarTodas = async () => {
    const contasPluggy = contas.filter(c => c.pluggy_item_id)
    if (!contasPluggy.length || !companyId) return
    setSincronizandoTodas(true)
    let total = 0
    for (const conta of contasPluggy) {
      const result = await sincronizarTransacoes(conta.pluggy_item_id, conta.id, companyId)
      if (!result.error) total += result.importadas || 0
    }
    buscarContas()
    toast({ title: total > 0 ? `${total} novas transações sincronizadas!` : 'Tudo atualizado!' })
    setSincronizandoTodas(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: '-200px', left: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-150px', right: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="p-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Keyframes pulse */}
          <style>{`
            @keyframes oasis-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.85); } }
            .oasis-dot { animation: oasis-pulse 2s ease-in-out infinite; }
          `}</style>

          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Oasis › Contas Bancárias
              </p>
              <h1 style={{ fontSize: '2rem', fontFamily: 'Gilroy', fontWeight: 700, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                Contas Bancárias
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
                Gerencie suas contas, cartões e carteiras
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {contas.some(c => c.pluggy_item_id) && (
                <button
                  onClick={handleSincronizarTodas}
                  disabled={sincronizandoTodas}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: sincronizandoTodas ? 'not-allowed' : 'pointer', opacity: sincronizandoTodas ? 0.7 : 1, transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (!sincronizandoTodas) { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.5)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.3)'; }}
                >
                  {sincronizandoTodas
                    ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <RefreshCw size={15} />
                  }
                  Sincronizar todas
                </button>
              )}
              <button
                onClick={() => setModalNova(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(142,95,207,0.55)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(142,95,207,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Plus size={16} /> Nova Conta
              </button>
            </div>
          </div>

          {/* Cards KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardResumo
              titulo="Saldo Total"
              valor={saldoTotal}
              icone={<Wallet size={20} />}
              gradiente="linear-gradient(135deg, #10B981, #059669)"
              borderColor="#10B981"
            />
            <CardResumo
              titulo="Entradas do Mês"
              valor={entradasMes}
              icone={<TrendingUp size={20} />}
              gradiente="linear-gradient(135deg, #3B82F6, #1D4ED8)"
              borderColor="#3B82F6"
            />
            <CardResumo
              titulo="Saídas do Mês"
              valor={saidasMes}
              icone={<TrendingDown size={20} />}
              gradiente="linear-gradient(135deg, #EF4444, #B91C1C)"
              negativo
              borderColor="#EF4444"
            />
          </div>

          {/* Grid de contas */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.875rem' }}>
              Carregando contas…
            </div>
          ) : contas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '2px dashed rgba(142,95,207,0.25)', borderRadius: '24px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Landmark size={36} style={{ color: '#8E5FCF' }} />
              </div>
              <h3 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', color: '#1F2937', marginBottom: '8px' }}>
                Nenhuma conta cadastrada
              </h3>
              <p style={{ fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '24px', maxWidth: '320px', margin: '0 auto 24px' }}>
                Adicione sua primeira conta bancária ou conecte via Open Finance
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setModalNova(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)' }}
                >
                  <Plus size={16} /> Adicionar conta
                </button>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: '1.5px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  <Link2 size={16} /> Conectar banco
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {contas.map(conta => (
                <ContaCard
                  key={conta.id}
                  conta={conta}
                  onExtrato={() => buscarMovimentacoes(conta.id)}
                  onImportar={() => setModalOFX(conta)}
                  onTransferir={() => setModalTransf({ open: true, contaOrigemId: conta.id })}
                  onDesativar={() => handleDesativar(conta.id)}
                  onConectarPluggy={async (itemId) => {
                    await atualizarConta(conta.id, { pluggy_item_id: itemId })
                    toast({ title: 'Banco conectado! Importando transações…' })

                    if (companyId) {
                      const result = await importarTransacoesPluggy(itemId, conta.id, companyId)
                      if (result.saldo !== null) {
                        await atualizarSaldo(conta.id, result.saldo)
                      }
                      if (result.error) {
                        toast({ title: 'Erro ao importar', description: result.error, variant: 'destructive' })
                      } else {
                        toast({ title: `${result.importadas} transações importadas automaticamente!` })
                      }
                      buscarContas()
                    }
                  }}
                  onSincronizar={async () => {
                    if (!companyId || !conta.pluggy_item_id) return
                    setSincronizandoId(conta.id)
                    const result = await sincronizarTransacoes(conta.pluggy_item_id, conta.id, companyId)
                    if (result.saldo !== null) {
                      await atualizarSaldo(conta.id, result.saldo)
                    }
                    if (result.error) {
                      toast({ title: 'Erro ao sincronizar', description: result.error, variant: 'destructive' })
                    } else if (result.importadas > 0) {
                      toast({ title: `${result.importadas} novas transações sincronizadas!` })
                    } else {
                      toast({ title: 'Tudo atualizado! Nenhuma transação nova.' })
                    }
                    setSincronizandoId(null)
                    buscarContas()
                  }}
                  sincronizando={sincronizandoId === conta.id}
                  miniMovs={miniMovsPorConta[conta.id]}
                />
              ))}
            </div>
          )}

          {/* Breakdown de gastos por categoria */}
          <ResumoCategoriasCard companyId={companyId} />

        </div>
      </div>

      {/* Modais */}
      <ModalNovaConta
        open={modalNova}
        onClose={() => setModalNova(false)}
        onCriar={handleCriarConta}
        BANCOS={BANCOS}
      />

      {modalOFX && (
        <ModalImportarOFX
          open={!!modalOFX}
          onClose={() => setModalOFX(null)}
          conta={modalOFX}
          onImportar={handleImportar}
        />
      )}

      <ModalTransferencia
        open={modalTransf.open}
        onClose={() => setModalTransf({ open: false })}
        contas={contas}
        contaOrigemId={modalTransf.contaOrigemId}
        onTransferir={handleTransferir}
      />
    </div>
  )
}
