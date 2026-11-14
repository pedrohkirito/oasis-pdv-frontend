import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, subDays } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ContaCombobox } from './ContaCombobox'
import type { ContaPlano } from '@/hooks/usePlanoContas'
import {
  paraCentavos, deCentavos, fmtBRL,
  type SaldoPatrimonial, type ItemNovoLancamento,
} from '@/hooks/useLancamentosContabeis'

type Funcoes = {
  saldosPatrimoniais: (data: string) => Promise<{ data: SaldoPatrimonial[]; error: string | null }>
  primeiraVenda: () => Promise<string | null>
  criar: (p: {
    data: string; historico: string; origem: 'abertura'; itens: ItemNovoLancamento[]
  }) => Promise<{ id: string | null; error: string | null }>
}

const GRUPOS: { prefixo: string; titulo: string }[] = [
  { prefixo: '1', titulo: 'Ativo' },
  { prefixo: '2', titulo: 'Passivo' },
  { prefixo: '3', titulo: 'Patrimônio Líquido' },
]

export function SaldosAberturaWizard({
  open, onClose, contas, funcoes, onConcluido,
}: {
  open: boolean
  onClose: () => void
  contas: ContaPlano[]
  funcoes: Funcoes
  onConcluido: () => void
}) {
  const { toast } = useToast()
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [dataAbertura, setDataAbertura] = useState('')
  const [saldos, setSaldos] = useState<SaldoPatrimonial[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [contrapartidaId, setContrapartidaId] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  const contasAnaliticas = useMemo(
    () => contas.filter(c => c.ativo && !c.sintetica).sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true })),
    [contas],
  )

  // Data sugerida: um dia antes da primeira venda da empresa.
  useEffect(() => {
    if (!open) return
    let cancelado = false
    funcoes.primeiraVenda().then(d => {
      if (cancelado || !d) return
      setDataAbertura(format(subDays(parseISO(d), 1), 'yyyy-MM-dd'))
    })
    return () => { cancelado = true }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Contrapartida padrão: Capital Social (3.1), senão a primeira analítica de PL.
  useEffect(() => {
    if (contrapartidaId || contasAnaliticas.length === 0) return
    const padrao = contasAnaliticas.find(c => c.codigo === '3.1')
      ?? contasAnaliticas.find(c => c.tipo === 'patrimonio_liquido')
    if (padrao) setContrapartidaId(padrao.id)
  }, [contasAnaliticas, contrapartidaId])

  const fechar = () => {
    setPasso(1); setSaldos([]); setValores({}); setConcluido(false); setContrapartidaId('')
    onClose()
  }

  const irParaPasso2 = async () => {
    setCarregando(true)
    const { data, error } = await funcoes.saldosPatrimoniais(dataAbertura)
    setCarregando(false)
    if (error) {
      toast({ title: 'Erro ao carregar saldos', description: error, variant: 'destructive' })
      return
    }
    setSaldos(data)
    setPasso(2)
  }

  // Itens informados (valor > 0), no sentido natural de cada conta.
  const itensInformados: ItemNovoLancamento[] = saldos
    .map(s => ({ s, c: paraCentavos(valores[s.conta_id] ?? '') }))
    .filter(x => x.c > 0)
    .map(({ s, c }) => ({
      conta_id: s.conta_id,
      tipo: (s.natureza === 'devedora' ? 'debito' : 'credito') as 'debito' | 'credito',
      valor: deCentavos(c),
    }))

  const somaCent = (tipo: 'debito' | 'credito') =>
    itensInformados.filter(i => i.tipo === tipo).reduce((s, i) => s + Math.round(i.valor * 100), 0)

  const diferenca = somaCent('debito') - somaCent('credito')
  const itensFinais: ItemNovoLancamento[] = [...itensInformados]
  if (diferenca !== 0 && contrapartidaId) {
    itensFinais.push({
      conta_id: contrapartidaId,
      tipo: diferenca > 0 ? 'credito' : 'debito',
      valor: deCentavos(Math.abs(diferenca)),
    })
  }
  const totalDebito = itensFinais.filter(i => i.tipo === 'debito').reduce((s, i) => s + Math.round(i.valor * 100), 0)
  const totalCredito = itensFinais.filter(i => i.tipo === 'credito').reduce((s, i) => s + Math.round(i.valor * 100), 0)
  const contaPor = (id: string) => contas.find(c => c.id === id)

  const confirmar = async () => {
    setSalvando(true)
    const { error } = await funcoes.criar({
      data: dataAbertura,
      historico: `Saldos de abertura em ${format(parseISO(dataAbertura), 'dd/MM/yyyy')}`,
      origem: 'abertura',
      itens: itensFinais,
    })
    setSalvando(false)
    if (error) {
      toast({ title: 'Não foi possível lançar os saldos', description: error, variant: 'destructive' })
      return
    }
    setConcluido(true)
    onConcluido()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && fechar()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saldos de abertura</DialogTitle>
          <DialogDescription>Passo {concluido ? 3 : passo} de 3</DialogDescription>
        </DialogHeader>

        {concluido ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="text-emerald-600" size={40} />
            <p className="font-semibold">Saldos de abertura lançados.</p>
            <Button asChild><Link to="/balancete" onClick={fechar}>Ver balancete</Link></Button>
          </div>
        ) : passo === 1 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Informe quanto cada conta tinha na data de abertura. Lançamentos feitos depois dela continuam somando.
            </p>
            <div className="max-w-xs">
              <Label>Data de abertura</Label>
              <Input type="date" value={dataAbertura} onChange={e => setDataAbertura(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Sugestão: um dia antes da primeira venda.</p>
            </div>
          </div>
        ) : passo === 2 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Caixa, Bancos, Estoques, Imobilizado e Intangível são <strong>ativos</strong>; Fornecedores,
              Empréstimos e Aquisição de Negócio a Pagar são <strong>passivos</strong>. Preencha só as contas
              que tinham saldo (valor positivo); em branco = nada a lançar.
            </p>
            {GRUPOS.map(g => {
              const doGrupo = saldos.filter(s => s.codigo.startsWith(g.prefixo))
              if (doGrupo.length === 0) return null
              return (
                <div key={g.prefixo}>
                  <h4 className="text-sm font-semibold mb-1">{g.titulo}</h4>
                  <div className="grid grid-cols-[1fr_130px_150px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b">
                    <span>Conta</span><span className="text-right">Saldo na data</span><span className="text-right">Saldo de abertura</span>
                  </div>
                  {doGrupo.map(s => (
                    <div key={s.conta_id} className="grid grid-cols-[1fr_130px_150px] gap-2 items-center py-1.5 border-b border-border/60">
                      <span className="text-sm truncate">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{s.codigo}</span>{s.nome}
                      </span>
                      <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(s.saldo)}</span>
                      <Input
                        inputMode="decimal" className="h-8 text-right" placeholder="0,00"
                        value={valores[s.conta_id] ?? ''}
                        onChange={e => setValores(v => ({ ...v, [s.conta_id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Conta de contrapartida (fecha a diferença)</Label>
              <ContaCombobox contas={contasAnaliticas} value={contrapartidaId} onChange={setContrapartidaId} />
              <p className="text-xs text-muted-foreground mt-1">
                Padrão: Capital Social. A diferença entre ativos e passivos informados é lançada nesta conta.
              </p>
            </div>

            <div className="rounded-lg border">
              <div className="grid grid-cols-[1fr_70px_130px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
                <span>Conta</span><span>D/C</span><span className="text-right">Valor</span>
              </div>
              {itensFinais.map((i, k) => {
                const c = contaPor(i.conta_id)
                return (
                  <div key={k} className="grid grid-cols-[1fr_70px_130px] gap-2 px-3 py-1.5 text-sm border-b border-border/60 last:border-0">
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{c?.codigo}</span>{c?.nome}
                    </span>
                    <span>{i.tipo === 'debito' ? 'D' : 'C'}</span>
                    <span className="text-right font-mono tabular-nums">{fmtBRL(i.valor)}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold border-t bg-muted/40">
                <span>Débitos {fmtBRL(deCentavos(totalDebito))} · Créditos {fmtBRL(deCentavos(totalCredito))}</span>
                {totalDebito === totalCredito
                  ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Balanceado</Badge>
                  : <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Divergente</Badge>}
              </div>
            </div>
          </div>
        )}

        {!concluido && (
          <DialogFooter>
            {passo > 1 && (
              <Button variant="outline" onClick={() => setPasso(p => (p - 1) as 1 | 2 | 3)}>Voltar</Button>
            )}
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            {passo === 1 && (
              <Button onClick={irParaPasso2} disabled={!dataAbertura || carregando}>
                {carregando ? 'Carregando…' : 'Continuar'}
              </Button>
            )}
            {passo === 2 && (
              <Button onClick={() => setPasso(3)} disabled={itensInformados.length === 0}>Continuar</Button>
            )}
            {passo === 3 && (
              <Button
                onClick={confirmar}
                disabled={salvando || itensFinais.length < 2 || totalDebito !== totalCredito}
              >
                {salvando ? 'Lançando…' : 'Confirmar lançamento'}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
