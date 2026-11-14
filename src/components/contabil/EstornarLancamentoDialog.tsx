import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { fmtBRL, type LancamentoContabil } from '@/hooks/useLancamentosContabeis'

export function EstornarLancamentoDialog({
  lancamento, onClose, onEstornar,
}: {
  lancamento: LancamentoContabil | null
  onClose: () => void
  onEstornar: (id: string, motivo: string) => Promise<{ error: string | null }>
}) {
  const { toast } = useToast()
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  if (!lancamento) return null

  const fechar = () => { setMotivo(''); onClose() }

  const confirmar = async () => {
    setSalvando(true)
    const { error } = await onEstornar(lancamento.id, motivo.trim())
    setSalvando(false)
    if (error) {
      toast({ title: 'Não foi possível estornar', description: error, variant: 'destructive' })
      return
    }
    toast({ title: 'Lançamento estornado' })
    fechar()
  }

  return (
    <Dialog open={!!lancamento} onOpenChange={o => !o && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Estornar lançamento</DialogTitle>
          <DialogDescription>
            "{lancamento.historico}" — {fmtBRL(lancamento.total)}. Será criado um novo lançamento com
            débitos e créditos invertidos; o original é mantido.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label>Motivo do estorno *</Label>
          <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: valor lançado em conta errada" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={salvando || motivo.trim() === ''}>
            {salvando ? 'Estornando…' : 'Estornar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
