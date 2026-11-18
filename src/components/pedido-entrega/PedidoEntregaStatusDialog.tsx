import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, History } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_separacao', label: 'Em Separação' },
  { value: 'em_transporte', label: 'Em Transporte' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

interface Historico {
  id: string;
  status_anterior: string | null;
  status_novo: string;
  descricao: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string | null;
  onStatusUpdated?: () => void;
}

export const PedidoEntregaStatusDialog: React.FC<Props> = ({ open, onOpenChange, vendaId, onStatusUpdated }) => {
  const { user } = useAuth();
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && vendaId && empresaId) {
      fetchPedido();
    }
  }, [open, vendaId, empresaId]);

  const fetchPedido = async () => {
    if (!vendaId || !empresaId) return;
    setLoading(true);

    const { data: pedido } = await api
      .from('pedidos_entrega')
      .select('id, status')
      .eq('venda_id', vendaId)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pedido) {
      setPedidoId(pedido.id);
      setCurrentStatus(pedido.status);
      setNewStatus(pedido.status);

      const { data: hist } = await api
        .from('pedido_entrega_historico')
        .select('*')
        .eq('pedido_id', pedido.id)
        .order('created_at', { ascending: false });

      setHistorico((hist as Historico[]) || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async () => {
    if (!pedidoId || !user || newStatus === currentStatus) return;
    setSaving(true);

    const { error: updateErr } = await api
      .from('pedidos_entrega')
      .update({ status: newStatus })
      .eq('id', pedidoId);

    if (updateErr) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
      setSaving(false);
      return;
    }

    await api.from('pedido_entrega_historico').insert({
      pedido_id: pedidoId,
      user_id: user.id,
      status_anterior: currentStatus,
      status_novo: newStatus,
      descricao: `Status alterado de "${STATUS_OPTIONS.find(s => s.value === currentStatus)?.label}" para "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`,
    } as any);

    setCurrentStatus(newStatus);
    toast({ title: 'Status atualizado!' });
    setSaving(false);
    fetchPedido();
    onStatusUpdated?.();
  };

  const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atualizar Status do Pedido</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !pedidoId ? (
          <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Status Atual</Label>
              <Badge variant="outline" className="w-fit">{statusLabel(currentStatus)}</Badge>
            </div>

            <div className="grid gap-2">
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpdateStatus}
              disabled={saving || newStatus === currentStatus}
              className="w-full"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar Status
            </Button>

            {/* History */}
            {historico.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <History className="h-4 w-4" />
                  Histórico de Alterações
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {historico.map(h => (
                    <div key={h.id} className="text-xs border rounded p-2 bg-muted/30">
                      <p className="font-medium">{h.descricao}</p>
                      <p className="text-muted-foreground mt-1">
                        {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
