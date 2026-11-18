import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Loader2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VendedorInfo {
  id: string;
  nome: string;
}

interface MetaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  vendedores: VendedorInfo[];
  onSaved: () => void;
}

const MetaConfigDialog: React.FC<MetaConfigDialogProps> = ({
  open, onOpenChange, empresaId, vendedores, onSaved,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [selectedMes, setSelectedMes] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [valorMeta, setValorMeta] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate next 3 months + current month
  const meses = Array.from({ length: 4 }, (_, i) => {
    const d = addMonths(startOfMonth(new Date()), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, "MMMM 'de' yyyy", { locale: ptBR }) };
  });

  // Load existing meta when vendor/month changes
  useEffect(() => {
    if (selectedVendedor && selectedMes && open) {
      loadMeta();
    }
  }, [selectedVendedor, selectedMes, open]);

  const loadMeta = async () => {
    setLoading(true);
    const { data } = await api
      .from('metas_vendedor')
      .select('valor_meta')
      .eq('empresa_id', empresaId)
      .eq('vendedor_id', selectedVendedor)
      .eq('mes_referencia', selectedMes)
      .maybeSingle();

    setValorMeta(data ? String(data.valor_meta) : '');
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedVendedor || !user) return;
    const valor = parseFloat(valorMeta.replace(',', '.'));
    if (isNaN(valor) || valor < 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { error } = await api
      .from('metas_vendedor')
      .upsert(
        {
          empresa_id: empresaId,
          vendedor_id: selectedVendedor,
          mes_referencia: selectedMes,
          valor_meta: valor,
          criado_por: user.id,
        } as any,
        { onConflict: 'empresa_id,vendedor_id,mes_referencia' }
      );

    if (error) {
      toast({ title: 'Erro ao salvar meta', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Meta salva com sucesso!' });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Configurar Meta Mensal
          </DialogTitle>
          <DialogDescription>
            Defina a meta de vendas mensal para cada vendedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Vendedor</Label>
            <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mês de referência</Label>
            <Select value={selectedMes} onValueChange={setSelectedMes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map(m => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor da Meta (R$)</Label>
            <Input
              type="text"
              placeholder="Ex: 40000"
              value={valorMeta}
              onChange={(e) => setValorMeta(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedVendedor}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MetaConfigDialog;
