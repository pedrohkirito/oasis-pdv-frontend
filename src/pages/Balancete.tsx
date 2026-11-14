import { useState, useMemo, useEffect } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Download, ChevronDown, ChevronRight, Folder, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useBalancete, type LinhaBalancete } from '@/hooks/useBalancete'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const TIPO_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_liquido: 'Patrimônio Líquido',
  receita: 'Receita',
  custo: 'Custo',
  despesa: 'Despesa',
}

const codigoPai = (codigo: string): string | null => {
  const idx = codigo.lastIndexOf('.')
  return idx === -1 ? null : codigo.slice(0, idx)
}

const INDENT_CLASS = ['pl-0', 'pl-6', 'pl-12', 'pl-[4.5rem]']

function useArvoreBalancete(linhas: LinhaBalancete[]) {
  return useMemo(() => {
    const porPai = new Map<string | null, LinhaBalancete[]>()
    for (const l of linhas) {
      const pai = codigoPai(l.codigo)
      if (!porPai.has(pai)) porPai.set(pai, [])
      porPai.get(pai)!.push(l)
    }
    for (const lista of porPai.values()) {
      lista.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    }
    return porPai
  }, [linhas])
}

// ─── Linha da árvore ──────────────────────────────────────────────────────

function LinhaRow({
  linha, depth, porPai,
}: {
  linha: LinhaBalancete
  depth: number
  porPai: Map<string | null, LinhaBalancete[]>
}) {
  const [aberto, setAberto] = useState(true)
  const filhos = porPai.get(linha.codigo) ?? []
  const temFilhos = filhos.length > 0
  const indent = INDENT_CLASS[Math.min(depth, INDENT_CLASS.length - 1)]

  const corpo = (
    <div className={`grid grid-cols-[1fr_120px_120px_120px] items-center gap-3 py-2 ${indent} border-b border-border/60`}>
      <div className="flex items-center gap-2 min-w-0">
        {linha.sintetica && temFilhos ? (
          <CollapsibleTrigger asChild>
            <button className="text-muted-foreground hover:text-brand shrink-0">
              {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </CollapsibleTrigger>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        {linha.sintetica
          ? <Folder size={15} className="text-brand shrink-0" />
          : <FileText size={15} className="text-muted-foreground shrink-0" />}
        <span className="font-mono text-xs text-muted-foreground shrink-0 w-16">{linha.codigo}</span>
        <span className={`truncate text-sm ${linha.sintetica ? 'font-semibold text-foreground' : 'text-foreground'}`}>
          {linha.nome}
        </span>
      </div>
      <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(linha.total_debito)}</span>
      <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(linha.total_credito)}</span>
      <span className={`text-right text-sm font-mono tabular-nums font-semibold ${linha.saldo < 0 ? 'text-red-600' : 'text-foreground'}`}>
        {fmtBRL(linha.saldo)}
      </span>
    </div>
  )

  if (!temFilhos) return corpo

  return (
    <Collapsible open={aberto} onOpenChange={setAberto}>
      {corpo}
      <CollapsibleContent>
        {filhos.map(filho => (
          <LinhaRow key={filho.conta_id} linha={filho} depth={depth + 1} porPai={porPai} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────

export default function Balancete() {
  const { linhas, loading, buscarBalancete } = useBalancete()

  const hoje = new Date()
  const [dataIni, setDataIni] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'))
  const [dataFim, setDataFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'))
  const [erro, setErro] = useState<string | null>(null)

  const carregar = async () => {
    const { error } = await buscarBalancete(dataIni, dataFim)
    setErro(error)
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const porPai = useArvoreBalancete(linhas)
  const raizes = porPai.get(null) ?? []

  const totalDebito = raizes.reduce((s, r) => s + r.total_debito, 0)
  const totalCredito = raizes.reduce((s, r) => s + r.total_credito, 0)
  const balanceado = Math.abs(totalDebito - totalCredito) < 0.01

  const exportarCSV = () => {
    const linhasCSV = [
      ['Código', 'Conta', 'Tipo', 'Débito', 'Crédito', 'Saldo'],
      ...linhas
        .slice()
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
        .map(l => [l.codigo, l.nome, TIPO_LABEL[l.tipo] ?? l.tipo, l.total_debito, l.total_credito, l.saldo]),
    ]
    const csv = linhasCSV.map(r => r.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Balancete_${dataIni}_a_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Oasis › Financeiro › Balancete</p>
          <h1 className="text-2xl font-bold text-brand-dark">Balancete</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Totais de débito, crédito e saldo por conta no período.
          </p>
        </div>
        <Button onClick={exportarCSV} variant="outline" className="gap-2 shrink-0">
          <Download size={16} /> Exportar CSV
        </Button>
      </div>

      {/* Filtro de período */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
        </div>
        <Button onClick={carregar} disabled={loading}>
          {loading ? 'Carregando…' : 'Aplicar'}
        </Button>

        <div className="ml-auto">
          {!loading && (
            balanceado ? (
              <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={13} /> Balanceado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-red-200 bg-red-50 text-red-700">
                <AlertTriangle size={13} /> Divergente
              </Badge>
            )
          )}
        </div>
      </div>

      {erro && (
        <p className="text-sm text-destructive mb-4">{erro}</p>
      )}

      {/* Tabela hierárquica */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 pb-2 border-b-2 border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Conta</span>
            <span className="text-right">Débito</span>
            <span className="text-right">Crédito</span>
            <span className="text-right">Saldo</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando balancete…</p>
          ) : raizes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma conta encontrada.</p>
          ) : (
            <div>
              {raizes.map(raiz => (
                <LinhaRow key={raiz.conta_id} linha={raiz} depth={0} porPai={porPai} />
              ))}

              {/* Total geral */}
              <div className="grid grid-cols-[1fr_120px_120px_120px] items-center gap-3 pt-3 mt-2 border-t-2 border-border font-bold">
                <span className="text-sm">Total geral</span>
                <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(totalDebito)}</span>
                <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(totalCredito)}</span>
                <span className="text-right text-sm font-mono tabular-nums">{fmtBRL(totalDebito - totalCredito)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
