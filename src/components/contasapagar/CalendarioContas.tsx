import React, { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, isBefore, startOfDay,
  addMonths, subMonths, addDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DndContext, DragEndEvent, useDraggable, useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Tables } from '@/integrations/supabase/types'

type ContaPagar = Tables<'contas_pagar'>

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusInfo(conta: ContaPagar): { cor: string; label: string } {
  const hoje = startOfDay(new Date())
  const dataVenc = startOfDay(new Date(conta.data_vencimento + 'T00:00:00'))
  if (conta.status === 'pago') return { cor: '#10B981', label: 'Pago' }
  if (conta.status === 'cancelado') return { cor: '#9CA3AF', label: 'Cancelado' }
  if (isBefore(dataVenc, hoje)) return { cor: '#EF4444', label: 'Vencida' }
  if (dataVenc.getTime() === hoje.getTime()) return { cor: '#F59E0B', label: 'Vence hoje' }
  return { cor: '#8E5FCF', label: 'A vencer' }
}

function fmtCurto(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
  return `R$ ${Math.round(v)}`
}

function trunc(s: string, max = 15): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

// ── DraggableContaCard ────────────────────────────────────────────────────────

function DraggableContaCard({
  conta,
  onPagar,
}: {
  conta: ContaPagar
  onPagar: (c: ContaPagar) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: conta.id, data: { conta } })
  const { cor } = getStatusInfo(conta)
  const altoValor = Number(conta.valor) > 5000

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    borderLeft: `3px solid ${cor}`,
    outline: altoValor ? `1px solid ${cor}` : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={600}>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`group relative rounded px-1.5 py-1 text-[10px] cursor-grab active:cursor-grabbing bg-card mb-0.5 select-none border-y border-r border-border/40 transition-opacity
              ${altoValor ? 'animate-pulse' : ''}
            `}
          >
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                <span style={{ color: cor }} className="shrink-0 text-[8px]">●</span>
                <span className="truncate font-medium leading-tight">{trunc(conta.descricao)}</span>
              </div>
              <span className="shrink-0 font-semibold text-[9px] ml-1">{fmtCurto(Number(conta.valor))}</span>
            </div>
            {conta.status !== 'pago' && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onPagar(conta) }}
                className="hidden group-hover:flex absolute right-1 top-1/2 -translate-y-1/2 text-[8px] bg-primary text-white py-0.5 px-1.5 rounded z-10 items-center"
              >
                Pagar
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs max-w-[200px] space-y-0.5">
          <p className="font-semibold">{conta.descricao}</p>
          {conta.fornecedor_nome && conta.fornecedor_nome !== conta.descricao &&
            conta.fornecedor_nome !== conta.categoria && (
            <p className="text-muted-foreground">{conta.fornecedor_nome}</p>
          )}
          {conta.categoria && <p className="text-muted-foreground">{conta.categoria}</p>}
          <p className="font-bold mt-1">
            {Number(conta.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p>Vencimento: {format(new Date(conta.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</p>
          {(conta as any).metodo_pagamento && (
            <p>Pagamento: {(conta as any).metodo_pagamento}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ── DroppableDayCell ──────────────────────────────────────────────────────────

function DroppableDayCell({
  dateStr,
  dayNum,
  isCurrentMonth,
  isWeekend,
  contas,
  onPagar,
  onNovaConta,
  formatCurrency,
}: {
  dateStr: string
  dayNum: number
  isCurrentMonth: boolean
  isWeekend: boolean
  contas: ContaPagar[]
  onPagar: (c: ContaPagar) => void
  onNovaConta: (data: string) => void
  formatCurrency: (v: number) => string
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dateStr })
  const [popOpen, setPopOpen] = useState(false)

  const hoje = startOfDay(new Date())
  const cellDate = startOfDay(new Date(dateStr + 'T00:00:00'))
  const isPast = isBefore(cellDate, hoje) && !isToday(cellDate)
  const isTodayCell = isToday(cellDate)

  const visible = contas.slice(0, 3)
  const hidden = contas.slice(3)
  const total = contas.reduce((s, c) => s + Number(c.valor), 0)

  const hasVencida = contas.some(c => getStatusInfo(c).label === 'Vencida')
  const hasHoje = contas.some(c => getStatusInfo(c).label === 'Vence hoje')
  const totalColor = hasVencida
    ? 'text-red-600'
    : hasHoje
    ? 'text-amber-600'
    : 'text-muted-foreground'

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[90px] p-1 rounded border transition-colors relative
        ${!isCurrentMonth ? 'opacity-40 bg-muted/20' : ''}
        ${isPast && isCurrentMonth ? 'bg-muted/10' : ''}
        ${isWeekend && isCurrentMonth && !isPast ? 'bg-muted/5' : ''}
        ${!isWeekend && isCurrentMonth && !isPast ? 'bg-background' : ''}
        ${isTodayCell ? 'ring-2 ring-primary/50 border-primary/30' : 'border-border/30'}
        ${isOver ? 'bg-primary/5 ring-1 ring-primary border-primary/50' : ''}
      `}
    >
      {/* Day number */}
      <button
        onClick={() => isCurrentMonth && contas.length > 0 && setPopOpen(true)}
        className={`text-[11px] font-semibold w-5 h-5 rounded-full flex items-center justify-center mb-0.5 shrink-0
          ${isTodayCell
            ? 'bg-primary text-white'
            : isCurrentMonth
            ? 'text-foreground hover:bg-muted cursor-pointer'
            : 'text-muted-foreground cursor-default'}
        `}
      >
        {dayNum}
      </button>

      {/* Conta cards */}
      {visible.map(c => (
        <DraggableContaCard key={c.id} conta={c} onPagar={onPagar} />
      ))}

      {/* "+X mais" */}
      {hidden.length > 0 && (
        <button
          onClick={() => setPopOpen(true)}
          className="text-[9px] text-primary hover:underline w-full text-left px-1 mt-0.5"
        >
          +{hidden.length} mais…
        </button>
      )}

      {/* Total do dia */}
      {contas.length > 0 && (
        <p className={`text-[9px] font-medium px-1 mt-0.5 ${totalColor}`}>
          {formatCurrency(total)}
        </p>
      )}

      {/* Quick add on empty current days */}
      {isCurrentMonth && contas.length === 0 && !isPast && (
        <button
          onClick={() => onNovaConta(dateStr)}
          className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center text-muted-foreground/40 hover:text-primary/40 transition-opacity"
        >
          <Plus size={16} />
        </button>
      )}

      {/* Day popup */}
      <Popover open={popOpen} onOpenChange={setPopOpen}>
        <PopoverTrigger className="absolute inset-0 pointer-events-none" />
        <PopoverContent className="w-80 p-0" align="center" side="right">
          <div className="p-3 border-b flex items-center justify-between">
            <p className="font-semibold text-sm">
              Contas — {format(new Date(dateStr + 'T00:00:00'), "d 'de' MMMM", { locale: ptBR })}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => { setPopOpen(false); onNovaConta(dateStr) }}
            >
              <Plus size={11} /> Nova conta
            </Button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {contas.map(c => {
              const { cor, label } = getStatusInfo(c)
              return (
                <div key={c.id} className="p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.descricao}</p>
                    {c.fornecedor_nome && c.fornecedor_nome !== c.descricao &&
                      c.fornecedor_nome !== c.categoria && (
                      <p className="text-xs text-muted-foreground truncate">{c.fornecedor_nome}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {c.categoria && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.categoria}</span>
                      )}
                      <span className="text-[10px] font-medium" style={{ color: cor }}>{label}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-sm font-bold">
                      {Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {c.status !== 'pago' && (
                      <Button
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => { setPopOpen(false); onPagar(c) }}
                      >
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="p-3 border-t flex justify-between text-sm font-semibold">
            <span>Total do dia</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function HeatmapMes({
  contasPorDia,
  dias,
}: {
  contasPorDia: Record<string, ContaPagar[]>
  dias: string[]
}) {
  const values = dias.map(d =>
    (contasPorDia[d] || []).reduce((s, c) => s + Number(c.valor), 0)
  )
  const maxVal = Math.max(...values, 1)

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Intensidade de gastos</p>
      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((d, i) => {
          const v = values[i]
          const intensity = v / maxVal
          const bg =
            intensity === 0
              ? 'rgba(142,95,207,0.05)'
              : `rgba(142,95,207,${0.1 + intensity * 0.85})`
          return (
            <TooltipProvider key={d}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className="w-4 h-4 rounded-sm cursor-default"
                    style={{ background: bg }}
                  />
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p>{format(new Date(d + 'T00:00:00'), 'dd/MM', { locale: ptBR })}</p>
                  {v > 0 && (
                    <p>{v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  )}
                  {v === 0 && <p className="text-muted-foreground">Sem contas</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

// ── SidebarCalendario ─────────────────────────────────────────────────────────

function SidebarCalendario({
  mesAtual,
  contasDoMes,
  onPagar,
  formatCurrency,
}: {
  mesAtual: Date
  contasDoMes: ContaPagar[]
  onPagar: (c: ContaPagar) => void
  formatCurrency: (v: number) => string
}) {
  const hoje = startOfDay(new Date())
  const em7Dias = addDays(hoje, 7)

  const totalMes = contasDoMes.reduce((s, c) => s + Number(c.valor), 0)
  const pago = contasDoMes
    .filter(c => c.status === 'pago')
    .reduce((s, c) => s + Number(c.valor), 0)
  const pendente = contasDoMes
    .filter(c => c.status === 'pendente')
    .reduce((s, c) => s + Number(c.valor), 0)
  const vencido = contasDoMes
    .filter(c => c.status === 'vencido')
    .reduce((s, c) => s + Number(c.valor), 0)
  const pct = totalMes > 0 ? Math.round((pago / totalMes) * 100) : 0

  const proximos7 = contasDoMes
    .filter(c => c.status !== 'pago' && c.status !== 'cancelado')
    .filter(c => {
      const d = startOfDay(new Date(c.data_vencimento + 'T00:00:00'))
      return d >= hoje && d <= em7Dias
    })
    .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, 5)

  const vencidas = contasDoMes.filter(c => c.status === 'vencido')

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(mesAtual),
    end: endOfMonth(mesAtual),
  }).map(d => format(d, 'yyyy-MM-dd'))

  const contasPorDiaMap = contasDoMes.reduce((acc, c) => {
    const d = c.data_vencimento
    if (!acc[d]) acc[d] = []
    acc[d].push(c)
    return acc
  }, {} as Record<string, ContaPagar[]>)

  const mesLabel = format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR }).replace(
    /^\w/, x => x.toUpperCase()
  )

  return (
    <div className="w-64 shrink-0 space-y-4 hidden lg:block">
      {/* Resumo do mês */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-sm">{mesLabel}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total a pagar</span>
              <span className="font-bold">{formatCurrency(totalMes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Já pago</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(pago)} ({pct}%)
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Pendente</span>
              <span className="font-semibold text-amber-600">{formatCurrency(pendente)}</span>
            </div>
            {vencido > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Vencido</span>
                <span className="font-semibold text-red-600">{formatCurrency(vencido)}</span>
              </div>
            )}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Próximos 7 dias */}
      {proximos7.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Próximos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {proximos7.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.descricao}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(c.data_vencimento + 'T00:00:00'), 'dd/MM')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-bold">{fmtCurto(Number(c.valor))}</span>
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-1.5"
                    onClick={() => onPagar(c)}
                  >
                    Pagar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Contas vencidas */}
      {vencidas.length > 0 && (
        <Card className="border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-600 mb-2">
              {vencidas.length} conta{vencidas.length > 1 ? 's' : ''} em atraso —{' '}
              {formatCurrency(vencidas.reduce((s, c) => s + Number(c.valor), 0))} total
            </p>
            <div className="space-y-1.5">
              {vencidas.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{c.descricao}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-6 text-[10px] px-1.5 ml-2"
                    onClick={() => onPagar(c)}
                  >
                    Pagar
                  </Button>
                </div>
              ))}
              {vencidas.length > 3 && (
                <p className="text-xs text-muted-foreground">+{vencidas.length - 3} mais</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      <Card>
        <CardContent className="p-4">
          <HeatmapMes contasPorDia={contasPorDiaMap} dias={diasDoMes} />
        </CardContent>
      </Card>
    </div>
  )
}

// ── CalendarioContas ──────────────────────────────────────────────────────────

export function CalendarioContas({
  contas,
  formatCurrency,
  onPagar,
  onNovaConta,
  onMoverConta,
  categoriasUnicas,
}: {
  contas: ContaPagar[]
  formatCurrency: (v: number) => string
  onPagar: (c: ContaPagar) => void
  onNovaConta: (data: string) => void
  onMoverConta: (contaId: string, novaData: string) => Promise<void>
  categoriasUnicas: string[]
}) {
  const [mesAtual, setMesAtual] = useState(new Date())
  const [filtroStatus, setFiltroStatus] = useState<
    'todos' | 'vencido' | 'hoje' | 'pendente' | 'pago'
  >('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [pendingMove, setPendingMove] = useState<{
    contaId: string
    novaData: string
    nomeData: string
  } | null>(null)

  const mesLabel = format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR }).replace(
    /^\w/, x => x.toUpperCase()
  )

  // Build calendar grid days
  const primeiroDia = startOfMonth(mesAtual)
  const ultimoDia = endOfMonth(mesAtual)
  const inicioPad = getDay(primeiroDia) // 0 = domingo

  const todosDias: { date: Date; isCurrentMonth: boolean }[] = []

  // Days from previous month to fill first row
  for (let i = inicioPad; i > 0; i--) {
    todosDias.push({ date: addDays(primeiroDia, -i), isCurrentMonth: false })
  }
  // Days of this month
  eachDayOfInterval({ start: primeiroDia, end: ultimoDia }).forEach(d => {
    todosDias.push({ date: d, isCurrentMonth: true })
  })
  // Pad to complete last row
  while (todosDias.length % 7 !== 0) {
    const last = todosDias[todosDias.length - 1].date
    todosDias.push({ date: addDays(last, 1), isCurrentMonth: false })
  }

  // Filter contas to this month
  const contasDoMes = useMemo(
    () =>
      contas.filter(c => isSameMonth(new Date(c.data_vencimento + 'T00:00:00'), mesAtual)),
    [contas, mesAtual]
  )

  // Apply calendar-specific filters
  const contasFiltradas = useMemo(() => {
    const hoje = startOfDay(new Date())
    return contasDoMes.filter(c => {
      if (filtroCategoria !== 'todos' && c.categoria !== filtroCategoria) return false
      if (filtroStatus === 'todos') return true
      if (filtroStatus === 'pago') return c.status === 'pago'
      if (filtroStatus === 'vencido') return c.status === 'vencido'
      if (filtroStatus === 'hoje') {
        const d = startOfDay(new Date(c.data_vencimento + 'T00:00:00'))
        return d.getTime() === hoje.getTime()
      }
      if (filtroStatus === 'pendente') return c.status === 'pendente'
      return true
    })
  }, [contasDoMes, filtroStatus, filtroCategoria])

  // Group by day
  const contasPorDia = useMemo(
    () =>
      contasFiltradas.reduce((acc, c) => {
        const d = c.data_vencimento
        if (!acc[d]) acc[d] = []
        acc[d].push(c)
        return acc
      }, {} as Record<string, ContaPagar[]>),
    [contasFiltradas]
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const contaId = active.id as string
    const novaData = over.id as string
    const conta = contas.find(c => c.id === contaId)
    if (!conta || conta.data_vencimento === novaData) return
    // Only allow drops on valid date strings
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return
    setPendingMove({
      contaId,
      novaData,
      nomeData: format(new Date(novaData + 'T00:00:00'), "dd/MM/yyyy"),
    })
  }

  return (
    <div className="space-y-4">
      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMesAtual(m => subMonths(m, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <h2 className="text-lg font-semibold min-w-44 text-center">{mesLabel}</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMesAtual(m => addMonths(m, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setMesAtual(new Date())}
        >
          Hoje
        </Button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {[
          { cor: '#EF4444', label: 'Vencida' },
          { cor: '#F59E0B', label: 'Vence hoje' },
          { cor: '#8E5FCF', label: 'A vencer' },
          { cor: '#10B981', label: 'Paga' },
        ].map(({ cor, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span style={{ color: cor }}>●</span> {label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded border-2 border-primary animate-pulse" />
          Alto valor
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'todos', label: 'Todas' },
            { key: 'vencido', label: 'Vencidas' },
            { key: 'hoje', label: 'Hoje' },
            { key: 'pendente', label: 'A vencer' },
            { key: 'pago', label: 'Pagas' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroStatus(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
              ${filtroStatus === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {label}
          </button>
        ))}
        {categoriasUnicas.length > 0 && (
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas categorias</SelectItem>
              {categoriasUnicas.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid + Sidebar */}
      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          <DndContext onDragEnd={handleDragEnd}>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div
                  key={d}
                  className="text-center text-[11px] font-medium text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {todosDias.map(({ date, isCurrentMonth }, i) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const isWeekend = getDay(date) === 0 || getDay(date) === 6
                const contasDia = isCurrentMonth
                  ? contasPorDia[dateStr] || []
                  : []
                return (
                  <DroppableDayCell
                    key={`${dateStr}-${i}`}
                    dateStr={dateStr}
                    dayNum={date.getDate()}
                    isCurrentMonth={isCurrentMonth}
                    isWeekend={isWeekend}
                    contas={contasDia}
                    onPagar={onPagar}
                    onNovaConta={onNovaConta}
                    formatCurrency={formatCurrency}
                  />
                )
              })}
            </div>
          </DndContext>
        </div>

        {/* Sidebar */}
        <SidebarCalendario
          mesAtual={mesAtual}
          contasDoMes={contasDoMes}
          onPagar={onPagar}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Confirm drag move dialog */}
      <AlertDialog
        open={!!pendingMove}
        onOpenChange={open => { if (!open) setPendingMove(null) }}
      >
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Mover vencimento</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar a data de vencimento para{' '}
              <span className="font-semibold">{pendingMove?.nomeData}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMove(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingMove) {
                  await onMoverConta(pendingMove.contaId, pendingMove.novaData)
                  setPendingMove(null)
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
