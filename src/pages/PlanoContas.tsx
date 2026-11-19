import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Folder, FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import { usePlanoContas, sugerirProximoCodigo, type ContaPlano } from '@/hooks/usePlanoContas'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<ContaPlano['kind'], string> = {
  active: 'Ativo',
  passivo: 'Passivo',
  patrimonio_liquido: 'Patrimônio Líquido',
  receita: 'Receita',
  custo: 'Custo',
  despesa: 'Despesa',
}

const TIPO_BADGE_CLASS: Record<ContaPlano['kind'], string> = {
  active: 'border-blue-200 bg-blue-50 text-blue-700',
  passivo: 'border-amber-200 bg-amber-50 text-amber-700',
  patrimonio_liquido: 'border-brand/30 bg-brand/10 text-brand-dark',
  receita: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  custo: 'border-rose-200 bg-rose-50 text-rose-700',
  despesa: 'border-red-200 bg-red-50 text-red-700',
}

const INDENT_CLASS = ['pl-0', 'pl-6', 'pl-12', 'pl-[4.5rem]']

// ─── Árvore ───────────────────────────────────────────────────────────────────

function useArvore(contas: ContaPlano[]) {
  return useMemo(() => {
    const porPai = new Map<string | null, ContaPlano[]>()
    for (const c of contas) {
      const chave = c.parent_account_id
      if (!porPai.has(chave)) porPai.set(chave, [])
      porPai.get(chave)!.push(c)
    }
    for (const lista of porPai.values()) {
      lista.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    }
    return porPai
  }, [contas])
}

function ContaRow({
  conta, depth, porPai, onEditar, onExcluir,
}: {
  conta: ContaPlano
  depth: number
  porPai: Map<string | null, ContaPlano[]>
  onEditar: (c: ContaPlano) => void
  onExcluir: (c: ContaPlano) => void
}) {
  const [aberto, setAberto] = useState(true)
  const filhos = porPai.get(conta.id) ?? []
  const temFilhos = filhos.length > 0
  const indent = INDENT_CLASS[Math.min(depth, INDENT_CLASS.length - 1)]

  const linha = (
    <div className={`flex items-center justify-between gap-3 py-2 ${indent} border-b border-border/60 group`}>
      <div className="flex items-center gap-2 min-w-0">
        {conta.sintetica && temFilhos ? (
          <CollapsibleTrigger asChild>
            <button className="text-muted-foreground hover:text-brand shrink-0">
              {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </CollapsibleTrigger>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}

        {conta.sintetica
          ? <Folder size={15} className="text-brand shrink-0" />
          : <FileText size={15} className="text-muted-foreground shrink-0" />}

        <span className="font-mono text-xs text-muted-foreground shrink-0 w-16">{conta.code}</span>
        <span className={`truncate text-sm ${conta.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
          {conta.name}
        </span>
        {!conta.active && <Badge variant="outline" className="shrink-0 text-xs">Inativa</Badge>}
        {conta.padrao && <Badge variant="outline" className="shrink-0 text-xs border-brand/30 text-brand">Padrão</Badge>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={`text-xs ${TIPO_BADGE_CLASS[conta.kind]}`}>
          {TIPO_LABEL[conta.kind]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <Pencil size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditar(conta)}>
              <Pencil size={13} className="mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExcluir(conta)} className="text-destructive">
              <Trash2 size={13} className="mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (!temFilhos) return linha

  return (
    <Collapsible open={aberto} onOpenChange={setAberto}>
      {linha}
      <CollapsibleContent>
        {filhos.map(filho => (
          <ContaRow
            key={filho.id}
            conta={filho}
            depth={depth + 1}
            porPai={porPai}
            onEditar={onEditar}
            onExcluir={onExcluir}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Modal Nova Conta ─────────────────────────────────────────────────────────

function ModalNovaConta({
  open, onClose, contas, onCriar,
}: {
  open: boolean
  onClose: () => void
  contas: ContaPlano[]
  onCriar: (dados: { code: string; name: string; kind: string; natureza: string; parent_account_id: string; sintetica: boolean }) => Promise<{ error: string | null }>
}) {
  const { toast } = useToast()
  const [paiId, setPaiId] = useState('')
  const [code, setCodigo] = useState('')
  const [name, setNome] = useState('')
  const [sintetica, setSintetica] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const sinteticasAtivas = contas.filter(c => c.sintetica && c.active)
  const pai = contas.find(c => c.id === paiId)

  const selecionarPai = (id: string) => {
    setPaiId(id)
    setCodigo(sugerirProximoCodigo(contas, id))
  }

  const handleClose = () => {
    setPaiId('')
    setCodigo('')
    setNome('')
    setSintetica(false)
    onClose()
  }

  const handleCriar = async () => {
    if (!pai || !code || !name) {
      toast({ title: 'Preencha conta pai, código e name', variant: 'destructive' })
      return
    }
    if (contas.some(c => c.code === code)) {
      toast({ title: 'Código já existe', description: `Já existe uma conta com o código ${code}.`, variant: 'destructive' })
      return
    }

    setSalvando(true)
    const { error } = await onCriar({
      code, name, kind: pai.kind, natureza: pai.natureza, parent_account_id: pai.id, sintetica,
    })
    setSalvando(false)

    if (error) {
      toast({ title: 'Erro ao criar conta', description: error, variant: 'destructive' })
      return
    }
    toast({ title: 'Conta criada com sucesso' })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Conta pai</Label>
            <Select value={paiId} onValueChange={selecionarPai}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta pai" /></SelectTrigger>
              <SelectContent>
                {sinteticasAtivas.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pai && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={TIPO_BADGE_CLASS[pai.kind]}>{TIPO_LABEL[pai.kind]}</Badge>
              <span>Tipo e natureza herdados da conta pai.</span>
            </div>
          )}

          <div>
            <Label>Código</Label>
            <Input value={code} onChange={e => setCodigo(e.target.value)} placeholder="Ex: 1.1.05" />
          </div>

          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setNome(e.target.value)} placeholder="Ex: Caixa Loja 2" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={sintetica} onCheckedChange={setSintetica} />
            <Label className="!mb-0">É uma conta sintética (grupo, não recebe lançamento)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={salvando}>
            {salvando ? 'Criando…' : 'Criar Conta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Editar Conta ───────────────────────────────────────────────────────

function ModalEditarConta({
  conta, onClose, onSalvar,
}: {
  conta: ContaPlano | null
  onClose: () => void
  onSalvar: (id: string, updates: { name?: string; active?: boolean }) => Promise<{ error: string | null }>
}) {
  const { toast } = useToast()
  const [name, setNome] = useState(conta?.name ?? '')
  const [active, setAtivo] = useState(conta?.active ?? true)
  const [salvando, setSalvando] = useState(false)

  if (!conta) return null

  const handleSalvar = async () => {
    if (!name) {
      toast({ title: 'O name não pode ficar vazio', variant: 'destructive' })
      return
    }
    setSalvando(true)
    const updates = conta.padrao ? { name } : { name, active }
    const { error } = await onSalvar(conta.id, updates)
    setSalvando(false)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error, variant: 'destructive' })
      return
    }
    toast({ title: 'Conta atualizada' })
    onClose()
  }

  return (
    <Dialog open={!!conta} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conta — {conta.code}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setNome(e.target.value)} />
          </div>

          {conta.padrao ? (
            <p className="text-xs text-muted-foreground">
              Esta é uma conta padrão do sistema — só o name pode ser alterado.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setAtivo} />
              <Label className="!mb-0">Conta ativa</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PlanoContas() {
  const { contas, loading, criarConta, atualizarConta, excluirConta } = usePlanoContas()
  const { toast } = useToast()

  const [filtroTipo, setFiltroTipo] = useState<'todos' | ContaPlano['kind']>('todos')
  const [modalNova, setModalNova] = useState(false)
  const [editando, setEditando] = useState<ContaPlano | null>(null)
  const [excluindo, setExcluindo] = useState<ContaPlano | null>(null)

  const contasFiltradas = filtroTipo === 'todos'
    ? contas
    : contas.filter(c => c.kind === filtroTipo)

  const porPai = useArvore(contasFiltradas)
  const raizes = porPai.get(null) ?? []

  const handleExcluir = async () => {
    if (!excluindo) return
    const { error } = await excluirConta(excluindo.id)
    if (error) {
      toast({ title: 'Não foi possível excluir', description: error, variant: 'destructive' })
    } else {
      toast({ title: 'Conta excluída' })
    }
    setExcluindo(null)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Oasis › Financeiro › Plano de Contas</p>
          <h1 className="text-2xl font-bold text-brand-dark">Plano de Contas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estrutura contábil da empresa — base para os lançamentos em partida dobrada.
          </p>
        </div>
        <Button onClick={() => setModalNova(true)} className="gap-2 shrink-0">
          <Plus size={16} /> Nova Conta
        </Button>
      </div>

      {/* Filtro por kind */}
      <div className="mb-4 flex items-center gap-3">
        <Label className="!mb-0 text-xs text-muted-foreground">Filtrar por kind</Label>
        <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as typeof filtroTipo)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABEL).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Árvore */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando plano de contas…</p>
          ) : raizes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma conta encontrada.</p>
          ) : (
            <div>
              {raizes.map(raiz => (
                <ContaRow
                  key={raiz.id}
                  conta={raiz}
                  depth={0}
                  porPai={porPai}
                  onEditar={setEditando}
                  onExcluir={setExcluindo}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModalNovaConta
        open={modalNova}
        onClose={() => setModalNova(false)}
        contas={contas}
        onCriar={criarConta}
      />

      <ModalEditarConta
        conta={editando}
        onClose={() => setEditando(null)}
        onSalvar={atualizarConta}
      />

      <AlertDialog open={!!excluindo} onOpenChange={open => !open && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{excluindo?.name}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>Não, manter</Button>
            <Button variant="destructive" onClick={handleExcluir}>Sim, excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
