import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ContaCombobox } from './ContaCombobox'
import type { ContaPlano } from '@/hooks/usePlanoContas'
import {
  paraCentavos, deCentavos, fmtBRL, type ItemNovoLancamento,
} from '@/hooks/useLancamentosContabeis'

interface Linha {
  key: number
  conta_id: string
  kind: 'debito' | 'credito'
  valor: string
}

let contadorLinhas = 0
const novaLinha = (kind: 'debito' | 'credito'): Linha => ({
  key: ++contadorLinhas, conta_id: '', kind, valor: '',
})

export function NovoLancamentoDialog({
  open, onClose, contas, onSalvar,
}: {
  open: boolean
  onClose: () => void
  contas: ContaPlano[]
  onSalvar: (dados: { data: string; historico: string; itens: ItemNovoLancamento[] }) => Promise<{ error: string | null }>
}) {
  const { toast } = useToast()
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [historico, setHistorico] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha('debito'), novaLinha('credito')])
  const [salvando, setSalvando] = useState(false)

  const contasAnaliticas = useMemo(
    () => contas.filter(c => c.active && !c.sintetica).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [contas],
  )

  const atualizar = (key: number, patch: Partial<Linha>) =>
    setLinhas(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)))

  const totalDebito = linhas.filter(l => l.kind === 'debito').reduce((s, l) => s + paraCentavos(l.valor), 0)
  const totalCredito = linhas.filter(l => l.kind === 'credito').reduce((s, l) => s + paraCentavos(l.valor), 0)
  const diferenca = totalDebito - totalCredito

  const linhasValidas = linhas.filter(l => l.conta_id && paraCentavos(l.valor) > 0)
  const balanceado = diferenca === 0 && totalDebito > 0
  const podeSalvar = balanceado && linhasValidas.length >= 2 && linhasValidas.length === linhas.length && historico.trim() !== '' && !salvando

  const reset = () => {
    setData(format(new Date(), 'yyyy-MM-dd'))
    setHistorico('')
    setLinhas([novaLinha('debito'), novaLinha('credito')])
  }

  const fechar = () => { reset(); onClose() }

  const salvar = async () => {
    setSalvando(true)
    const { error } = await onSalvar({
      data,
      historico: historico.trim(),
      itens: linhas.map(l => ({ conta_id: l.conta_id, kind: l.kind, valor: deCentavos(paraCentavos(l.valor)) })),
    })
    setSalvando(false)
    if (error) {
      toast({ title: 'Não foi possível salvar o lançamento', description: error, variant: 'destructive' })
      return
    }
    toast({ title: 'Lançamento criado' })
    fechar()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && fechar()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Novo lançamento manual</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <Label>Histórico</Label>
            <Input value={historico} onChange={e => setHistorico(e.target.value)} placeholder="Ex: Aporte do sócio em dinheiro" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_130px_130px_36px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Conta</span><span>Tipo</span><span className="text-right">Valor (R$)</span><span />
          </div>
          {linhas.map(l => (
            <div key={l.key} className="grid grid-cols-[1fr_130px_130px_36px] gap-2 items-center">
              <ContaCombobox contas={contasAnaliticas} value={l.conta_id} onChange={id => atualizar(l.key, { conta_id: id })} />
              <Select value={l.kind} onValueChange={v => atualizar(l.key, { kind: v as Linha['kind'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                className="text-right"
                placeholder="0,00"
                value={l.valor}
                onChange={e => atualizar(l.key, { valor: e.target.value })}
              />
              <Button
                type="button" variant="ghost" size="icon" className="h-9 w-9"
                disabled={linhas.length <= 2}
                onClick={() => setLinhas(ls => ls.filter(x => x.key !== l.key))}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5"
              onClick={() => setLinhas(ls => [...ls, novaLinha(diferenca > 0 ? 'credito' : 'debito')])}>
              <Plus size={14} /> Adicionar linha
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span>Débitos: <strong className="font-mono">{fmtBRL(deCentavos(totalDebito))}</strong></span>
          <span>Créditos: <strong className="font-mono">{fmtBRL(deCentavos(totalCredito))}</strong></span>
          <span className="flex items-center gap-2">
            Diferença: <strong className="font-mono">{fmtBRL(deCentavos(Math.abs(diferenca)))}</strong>
            {balanceado
              ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Balanceado</Badge>
              : <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Não balanceado</Badge>}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button onClick={salvar} disabled={!podeSalvar}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
