import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CreditCard, Truck, ClipboardList, Percent, MessageSquare, ChevronDown } from 'lucide-react';
import { useEmpresa } from '@/hooks/useEmpresa';

interface VendaDetailProps {
  vendaId: string;
  produtos: string;
  metodoPagamento: string;
  parcelas: number | null;
  valor: number;
  valorBruto: number | null;
  desconto: number | null;
  valorFinal: number | null;
  observacoes: string | null;
  bandeira: string | null;
  valorLiquido: number | null;
  isAdmin: boolean;
}

interface ItemVendaDetail {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produto_nome: string;
  desconto?: number;
  desconto_tipo?: 'percentual' | 'valor';
  observacao?: string;
}

interface OperacaoDetail {
  id: string;
  tipo: string;
  status: string;
  data_prevista: string | null;
  data_entrega: string | null;
  data_montagem: string | null;
  observacoes: string | null;
}

interface ComissaoDetail {
  id: string;
  percentual: number;
  valor_base: number;
  valor_comissao: number;
  vendedor_id: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const statusLabels: Record<string, string> = {
  venda_confirmada: 'Venda Confirmada',
  pedido_enviado: 'Pedido Enviado',
  produto_recebido: 'Produto Recebido',
  entrega_agendada: 'Entrega Agendada',
  entregue: 'Entregue',
  montagem_agendada: 'Montagem Agendada',
  montagem_concluida: 'Montagem Concluída',
  finalizado: 'Finalizado',
};

const tipoLabels: Record<string, string> = {
  entrega: 'Entrega',
  entrega_montagem: 'Entrega + Montagem',
  montagem: 'Montagem',
};

export const VendaDetailAccordion: React.FC<VendaDetailProps> = ({
  vendaId,
  metodoPagamento,
  parcelas,
  valor,
  valorBruto,
  desconto,
  valorFinal,
  observacoes,
  bandeira,
  valorLiquido,
  isAdmin,
}) => {
  const { empresaId } = useEmpresa();
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ItemVendaDetail[]>([]);
  const [obsAberta, setObsAberta] = useState<Record<string, boolean>>({});
  const [operacao, setOperacao] = useState<OperacaoDetail | null>(null);
  const [comissao, setComissao] = useState<ComissaoDetail | null>(null);
  const [mesFechado, setMesFechado] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);

      if (!empresaId) return;

      // Fetch all in parallel - all queries filter by empresa context
      const [itensRes, operacaoRes, comissaoRes] = await Promise.all([
        supabase
          .from('itens_venda')
          .select('produto_id, quantidade, preco_unitario, subtotal, desconto, desconto_tipo, observacao')
          .eq('venda_id', vendaId),
        supabase
          .from('operacoes')
          .select('id, tipo, status, data_prevista, data_entrega, data_montagem, observacoes')
          .eq('venda_id', vendaId)
          .eq('empresa_id', empresaId)
          .maybeSingle(),
        supabase
          .from('comissoes')
          .select('id, percentual, valor_base, valor_comissao, vendedor_id')
          .eq('venda_id', vendaId)
          .eq('empresa_id', empresaId)
          .maybeSingle(),
      ]);

      // If the extended columns don't exist yet, fall back to the basic query
      let itensData: any[] = itensRes.data || [];
      if (itensRes.error && (itensRes.error.code === '42703' || itensRes.error.message?.includes('column'))) {
        const fallback = await supabase
          .from('itens_venda')
          .select('produto_id, quantidade, preco_unitario, subtotal')
          .eq('venda_id', vendaId);
        itensData = (fallback.data as any[]) || [];
      }

      // Resolve product names
      if (itensData && itensData.length > 0) {
        const produtoIds = itensData.map((i: any) => i.produto_id);
        const { data: produtosData } = await supabase
          .from('produtos')
          .select('id, nome')
          .in('id', produtoIds);

        const produtoMap = new Map(produtosData?.map((p) => [p.id, p.nome]) || []);
        setItens(
          itensData.map((item: any) => ({
            ...item,
            preco_unitario: Number(item.preco_unitario),
            subtotal: Number(item.subtotal),
            desconto: item.desconto != null ? Number(item.desconto) : 0,
            desconto_tipo: (item.desconto_tipo as 'percentual' | 'valor') || 'percentual',
            observacao: item.observacao || '',
            produto_nome: produtoMap.get(item.produto_id) || 'Produto não encontrado',
          }))
        );
      }

      if (operacaoRes.data) setOperacao(operacaoRes.data as OperacaoDetail);
      if (comissaoRes.data) setComissao(comissaoRes.data as ComissaoDetail);

      // Check if month is closed for commission status
      if (comissaoRes.data && empresaId) {
        // We'll derive from fechamento_comissao
        const { data: vendaData } = await supabase
          .from('vendas')
          .select('data_venda')
          .eq('id', vendaId)
          .single();
        if (vendaData) {
          const mes = vendaData.data_venda.substring(0, 7);
          const { data: fechamento } = await supabase
            .from('fechamento_comissao')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('mes_referencia', mes)
            .eq('status', 'fechado')
            .maybeSingle();
          setMesFechado(!!fechamento);
        }
      }

      setLoading(false);
    };

    fetchDetails();
  }, [vendaId, empresaId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  const valorParcelaCalc = parcelas && parcelas > 1 ? (valorFinal || valor) / parcelas : null;

  return (
    <div className="px-4 pb-4 pt-1 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
      {/* Produtos */}
      {itens.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Produtos</h4>
          </div>
          <div className="rounded-lg border divide-y">
            {itens.map((item) => {
              // DB stores subtotal = discounted amount, desconto = discount in R$ (pre-computed)
              const descontoR$ = item.desconto || 0;
              const temDesconto = descontoR$ > 0;
              const precoOriginal = item.subtotal + descontoR$; // gross
              const precoFinal = item.subtotal;                  // after discount
              // Badge label: re-derive % from stored R$ value if tipo === 'percentual'
              const badgeLabel = temDesconto
                ? item.desconto_tipo === 'percentual'
                  ? `-${precoOriginal > 0 ? ((descontoR$ / precoOriginal) * 100).toFixed(1).replace(/\.0$/, '') : 0}%`
                  : `-${formatCurrency(descontoR$)}`
                : '';
              const temObs = !!item.observacao;
              const obsKey = item.produto_id;
              return (
                <div key={item.produto_id}>
                  <div className="flex items-start justify-between p-3 text-sm">
                    {/* Left: name + badge + qty×price */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{item.produto_nome}</p>
                        {temDesconto && (
                          <Badge variant="outline" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10B981', borderRadius: '20px', fontSize: '0.68rem', fontFamily: 'Gilroy', fontWeight: 700, padding: '0 6px' }}>
                            {badgeLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantidade}x {formatCurrency(item.preco_unitario)}
                      </p>
                    </div>
                    {/* Right: original (struck) + final (green), or just final */}
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <div className="text-right">
                        {temDesconto ? (
                          <>
                            <p className="text-xs text-muted-foreground line-through leading-tight">
                              {formatCurrency(precoOriginal)}
                            </p>
                            <p className="font-bold leading-tight" style={{ color: '#10B981' }}>
                              {formatCurrency(precoFinal)}
                            </p>
                          </>
                        ) : (
                          <span className="font-semibold">{formatCurrency(precoFinal)}</span>
                        )}
                      </div>
                      {temObs && (
                        <button
                          onClick={() => setObsAberta(prev => ({ ...prev, [obsKey]: !prev[obsKey] }))}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Ver observação"
                        >
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-200"
                            style={{ transform: obsAberta[obsKey] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  {temObs && obsAberta[obsKey] && (
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t flex items-center gap-1" style={{ fontStyle: 'italic' }}>
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <span className="leading-none">{item.observacao}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {(valorBruto || desconto) && (
              <>
                {valorBruto != null && (
                  <div className="flex justify-between p-3 text-sm bg-muted/30">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(valorBruto)}</span>
                  </div>
                )}
                {desconto != null && desconto > 0 && (
                  <div className="flex justify-between p-3 text-sm text-destructive">
                    <span>Desconto</span>
                    <span>- {formatCurrency(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between p-3 text-sm font-bold bg-primary/5">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(valorFinal || valor)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pagamento */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Pagamento</h4>
        </div>
        <div className="rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Forma</p>
            <p className="font-medium">{metodoPagamento}{bandeira ? ` · ${bandeira}` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Parcelas</p>
            <p className="font-medium">{parcelas || 1}x</p>
          </div>
          {valorParcelaCalc && (
            <div>
              <p className="text-xs text-muted-foreground">Valor/Parcela</p>
              <p className="font-medium">{formatCurrency(valorParcelaCalc)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-primary">{formatCurrency(valorFinal || valor)}</p>
          </div>
          {valorLiquido != null && (
            <div className="col-span-full border-t pt-2 mt-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Valor Líquido (após taxas)</p>
                <p className="font-bold text-primary">{formatCurrency(valorLiquido)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operação */}
      {operacao && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Operação</h4>
          </div>
          <div className="rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">{tipoLabels[operacao.tipo] || operacao.tipo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className="text-xs mt-0.5">
                {statusLabels[operacao.status] || operacao.status}
              </Badge>
            </div>
            {operacao.data_prevista && (
              <div>
                <p className="text-xs text-muted-foreground">Data Prevista</p>
                <p className="font-medium">
                  {new Date(operacao.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {operacao.data_entrega && (
              <div>
                <p className="text-xs text-muted-foreground">Data Entrega</p>
                <p className="font-medium">
                  {new Date(operacao.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {operacao.data_montagem && (
              <div>
                <p className="text-xs text-muted-foreground">Data Montagem</p>
                <p className="font-medium">
                  {new Date(operacao.data_montagem + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {operacao.observacoes && (
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="text-sm">{operacao.observacoes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comissão */}
      {comissao && isAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Comissão</h4>
          </div>
          <div className="rounded-lg border p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Percentual</p>
              <p className="font-medium">{Number(comissao.percentual).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Base de Cálculo</p>
              <p className="font-medium">{formatCurrency(Number(comissao.valor_base))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="font-bold text-primary">{formatCurrency(Number(comissao.valor_comissao))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={mesFechado ? 'default' : 'outline'} className="text-xs mt-0.5">
                {mesFechado ? 'Fechada' : 'Aberta'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Observações */}
      {observacoes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Observações</h4>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{observacoes}</p>
          </div>
        </div>
      )}
    </div>
  );
};
