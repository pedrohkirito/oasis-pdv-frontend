import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Venda {
  id: string;
  sold_on: string;
  valor: number;
  final_amount: number | null;
  desconto: number | null;
  payment_method: string | null;
  produtos: string | null;
  itens_venda: {
    id: string;
    quantidade: number;
    unit_price: number;
    subtotal: number;
    produtos: { name: string } | null;
  }[];
}

interface ClienteComprasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  clienteNome: string;
}

export function ClienteComprasDialog({ open, onOpenChange, customerId, clienteNome }: ClienteComprasDialogProps) {
  const { companyId } = useEmpresa();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clienteNome && companyId) {
      fetchVendas();
    }
  }, [open, clienteNome, companyId]);

  const fetchVendas = async () => {
    setLoading(true);
    const { data, error } = await (api as any)
      .from('sale')
      .select(`
        id, sold_on, valor, final_amount, desconto, payment_method, produtos,
        itens_venda (
          id, quantidade, unit_price, subtotal,
          produtos:product_id ( name )
        )
      `)
      .eq('company_id', companyId!)
      .eq('customer_name', clienteNome)
      .order('sold_on', { ascending: false });

    if (!error && data) {
      setVendas(data as Venda[]);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalGasto = vendas.reduce((acc, v) => acc + (v.final_amount ?? v.valor), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Compras de {clienteNome}
          </DialogTitle>
          {vendas.length > 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              {vendas.length} compra{vendas.length !== 1 ? 's' : ''} · Total: {formatCurrency(totalGasto)}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : vendas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma compra registrada</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {vendas.map((venda) => (
                <div key={venda.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {format(new Date(venda.sold_on), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(venda.final_amount ?? venda.valor)}
                      </span>
                    </div>
                  </div>

                  {venda.payment_method && (
                    <p className="text-xs text-muted-foreground">
                      Pagamento: {venda.payment_method}
                    </p>
                  )}

                  {venda.produtos && (!venda.itens_venda || venda.itens_venda.length === 0) && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      {venda.produtos}
                    </p>
                  )}

                  {venda.itens_venda && venda.itens_venda.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      {venda.itens_venda.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {item.quantidade}x {(item.produtos as any)?.name || 'Produto'}
                          </span>
                          <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {venda.desconto != null && venda.desconto > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Desconto: {formatCurrency(venda.desconto)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
