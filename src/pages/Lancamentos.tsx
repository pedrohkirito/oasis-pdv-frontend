import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, Plus, Undo2, Info, Wand2 } from 'lucide-react'
import { usePlanoContas } from '@/hooks/usePlanoContas'
import { useUserRole } from '@/hooks/useUserRole'
import {
  useLancamentosContabeis, ORIGENS_MANUAIS, ORIGEM_LABEL, fmtBRL,
  type LancamentoContabil,
} from '@/hooks/useLancamentosContabeis'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { NovoLancamentoDialog } from '@/components/contabil/NovoLancamentoDialog'
import { EstornarLancamentoDialog } from '@/components/contabil/EstornarLancamentoDialog'
import { SaldosAberturaWizard } from '@/components/contabil/SaldosAberturaWizard'

const LIMITE = 200

const ORIGEM_BADGE: Record<string, string> = {
  manual: 'border-brand/30 bg-brand/10 text-brand-dark',
  abertura: 'border-blue-200 bg-blue-50 text-blue-700',
  ajuste: 'border-amber-200 bg-amber-50 text-amber-700',
  estorno: 'border-red-200 bg-red-50 text-red-700',
}

export default function Lancamentos() {
  const { toast } = useToast()
  const { role } = useUserRole()
  const isAdmin = role === 'admin'
  const { contas } = usePlanoContas()
  const lanc = useLancamentosContabeis()

  const hoje = new Date()
  const [dataIni, setDataIni] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'))
  const [dataFim, setDataFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'))
  const [origem, setOrigem] = useState('todas')
  const [offset, setOffset] = useState(0)
  const [linhas, setLinhas] = useState<LancamentoContabil[]>([])
  const [loading, setLoading] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const [modalNovo, setModalNovo] = useState(false)
  const [modalAbertura, setModalAbertura] = useState(false)
  const [estornando, setEstornando] = useState<LancamentoContabil | null>(null)

  const carregar = useCallback(async (novoOffset = offset) => {
    setLoading(true)
    const { data, error } = await lanc.listar({
      dataIni, dataFim, origem: origem === 'todas' ? null : origem, limite: LIMITE, offset: novoOffset,
    })
    setLoading(false)
    if (error === 'Sem empresa selecionada') return
    if (error) {
      toast({ title: 'Erro ao carregar lançamentos', description: error, variant: 'destructive' })
      return
    }
    setLinhas(data)
  }, [lanc.listar, dataIni, dataFim, origem, offset, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregar(0); setOffset(0) }, [lanc.listar]) // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltros = () => { setOffset(0); carregar(0) }
  const irPara = (novo: number) => { setOffset(novo); carregar(novo) }

  const totalRegistros = linhas[0]?.total_registros ?? 0

  const alternar = (id: string) =>
    setExpandidos(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Oasis › Financeiro › Lançamentos</p>
          <h1 className="text-2xl font-bold text-brand-dark">Lançamentos contábeis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lançamentos automáticos e manuais em partida dobrada.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isAdmin && (
            <Button variant="outline" className="gap-2" onClick={() => setModalAbertura(true)}>
              <Wand2 size={16} /> Saldos de abertura
            </Button>
          )}
          <Button className="gap-2" onClick={() => setModalNovo(true)}>
            <Plus size={16} /> Novo lançamento
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Origem</Label>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {Object.entries(ORIGEM_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={aplicarFiltros} disabled={loading}>{loading ? 'Carregando…' : 'Aplicar'}</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-[24px_100px_1fr_130px_130px_110px] gap-3 pb-2 border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span /><span>Data</span><span>Histórico</span><span>Origem</span><span className="text-right">Valor</span><span />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando lançamentos…</p>
          ) : linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum lançamento no período.</p>
          ) : (
            linhas.map(l => {
              const aberto = expandidos.has(l.id)
              const manual = ORIGENS_MANUAIS.includes(l.origem)
              return (
                <div key={l.id} className="border-b border-border/60">
                  <div className="grid grid-cols-[24px_100px_1fr_130px_130px_110px] gap-3 items-center py-2">
                    <button className="text-muted-foreground hover:text-brand" onClick={() => alternar(l.id)}>
                      {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span className="text-sm tabular-nums">{format(parseISO(l.posted_on), 'dd/MM/yyyy')}</span>
                    <span className="text-sm truncate" title={l.historico}>{l.historico}</span>
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-xs ${ORIGEM_BADGE[l.origem] ?? ''}`}>
                        {ORIGEM_LABEL[l.origem] ?? l.origem}
                      </Badge>
                      {l.estornado && (
                        <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">Estornado</Badge>
                      )}
                    </span>
                    <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(l.total)}</span>
                    <span className="flex justify-end">
                      {manual && !l.estornado && isAdmin && (
                        <Button variant="ghost" size="sm" className="gap-1.5 h-7" onClick={() => setEstornando(l)}>
                          <Undo2 size={13} /> Estornar
                        </Button>
                      )}
                      {!manual && l.origem !== 'estorno' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground cursor-help p-1"><Info size={14} /></span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Lançamentos automáticos são estornados pela operação de origem.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </div>

                  {aberto && (
                    <div className="mb-2 ml-[36px] rounded-md bg-muted/40 px-3 py-2">
                      {l.itens.map((i, k) => (
                        <div key={k} className="grid grid-cols-[1fr_40px_130px] gap-3 py-0.5 text-sm">
                          <span className="truncate">
                            <span className="font-mono text-xs text-muted-foreground mr-2">{i.code}</span>{i.name}
                          </span>
                          <span>{i.kind === 'debito' ? 'D' : 'C'}</span>
                          <span className="text-right font-mono tabular-nums">{fmtBRL(i.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {totalRegistros > 0 && (
            <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
              <span>
                {offset + 1}–{Math.min(offset + LIMITE, totalRegistros)} de {totalRegistros}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0 || loading}
                  onClick={() => irPara(Math.max(0, offset - LIMITE))}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={offset + LIMITE >= totalRegistros || loading}
                  onClick={() => irPara(offset + LIMITE)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NovoLancamentoDialog
        open={modalNovo}
        onClose={() => setModalNovo(false)}
        contas={contas}
        onSalvar={async ({ data, historico, itens }) => {
          const { error } = await lanc.criar({ data, historico, origem: 'manual', itens })
          if (!error) carregar(offset)
          return { error }
        }}
      />

      <EstornarLancamentoDialog
        lancamento={estornando}
        onClose={() => setEstornando(null)}
        onEstornar={async (id, motivo) => {
          const { error } = await lanc.estornar(id, motivo)
          if (!error) carregar(offset)
          return { error }
        }}
      />

      {isAdmin && (
        <SaldosAberturaWizard
          open={modalAbertura}
          onClose={() => setModalAbertura(false)}
          contas={contas}
          funcoes={{
            saldosPatrimoniais: lanc.saldosPatrimoniais,
            primeiraVenda: lanc.primeiraVenda,
            criar: p => lanc.criar(p),
          }}
          onConcluido={() => carregar(offset)}
        />
      )}
    </div>
  )
}
