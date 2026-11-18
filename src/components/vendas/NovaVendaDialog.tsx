import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Check, User, Package, CalendarIcon, ClipboardList, ShoppingCart, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { resolveClienteId } from '@/lib/clienteResolver';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { KANBAN_COLUMNS } from '@/hooks/useOperacoes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  preco: number;
  estoque: number | null;
  ativo: boolean | null;
  categoria: string | null;
  tem_variacoes: boolean | null;
}

interface ProdutoVariacaoSimples {
  id: string;
  atributos: Record<string, string>;
  preco: number | null;
  estoque: number;
  sku: string | null;
}

interface ItemVenda {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  variacao_id?: string;
  variacao_label?: string;
  desconto: number;
  desconto_tipo: 'percentual' | 'valor';
  observacao: string;
  obs_aberta: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface NovaVendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendaSalva?: () => void;
  /** When true, date is locked to today and cannot be changed */
  dataFixaHoje?: boolean;
}

const FURNITURE_CATEGORIES = ['Móveis', 'Berço', 'Cama', 'Cômoda', 'moveis', 'móveis'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// ─── Component ────────────────────────────────────────────────────────────────

export function NovaVendaDialog({ open, onOpenChange, onVendaSalva, dataFixaHoje = false }: NovaVendaDialogProps) {
  const { user } = useAuth();
  const { empresaId } = useEmpresa();
  const { toast } = useToast();

  // Data
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string; email: string }[]>([]);
  const [taxasPagamento, setTaxasPagamento] = useState<{ metodo: string; parcelas: number; bandeira: string; taxa: number; tipo_taxa: string }[]>([]);

  // Form state
  const [novaVenda, setNovaVenda] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    metodo_pagamento: '',
    parcelas: 1,
    bandeira: '',
    observacoes: '',
    vendedor: '',
    desconto: 0,
  });
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor');
  const [dataVenda, setDataVenda] = useState<Date>(new Date());
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [produtoPopoverOpen, setProdutoPopoverOpen] = useState(false);
  const [quantidadeProduto, setQuantidadeProduto] = useState<number>(1);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seletor de variação
  const [variacaoDialogOpen, setVariacaoDialogOpen] = useState(false);
  const [produtoComVariacao, setProdutoComVariacao] = useState<Produto | null>(null);
  const [variacoes, setVariacoes] = useState<ProdutoVariacaoSimples[]>([]);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<ProdutoVariacaoSimples | null>(null);

  // Operação automática para móveis
  const [operacaoStatus, setOperacaoStatus] = useState<string>('venda_confirmada');
  const [operacaoTipo, setOperacaoTipo] = useState<string>('entrega');

  const temItensNoCarrinho = itensVenda.length > 0;
  const temMoveis = useMemo(() => {
    return itensVenda.some(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      return produto?.categoria && FURNITURE_CATEGORIES.some(fc => 
        produto.categoria!.toLowerCase() === fc.toLowerCase()
      );
    });
  }, [itensVenda, produtos]);

  const subtotalBruto = useMemo(() =>
    itensVenda.reduce((sum, item) => sum + item.subtotal, 0),
  [itensVenda]);

  const descontoItensTotal = useMemo(() =>
    itensVenda.reduce((sum, item) => {
      const d = item.desconto_tipo === 'percentual'
        ? item.subtotal * (Math.min(item.desconto, 100) / 100)
        : Math.min(item.desconto, item.subtotal);
      return sum + d;
    }, 0),
  [itensVenda]);

  const valorTotalItens = useMemo(() => subtotalBruto - descontoItensTotal, [subtotalBruto, descontoItensTotal]);

  const descontoGeralEmReais = useMemo(() => {
    const input = novaVenda.desconto || 0;
    return descontoTipo === 'percentual' ? valorTotalItens * input / 100 : input;
  }, [novaVenda.desconto, descontoTipo, valorTotalItens]);

  const valorFinalCalc = useMemo(() => valorTotalItens - descontoGeralEmReais, [valorTotalItens, descontoGeralEmReais]);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!empresaId) return;

    // Fetch all products with pagination to bypass 1000-row limit
    let allProducts: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await api
        .from('produtos')
        .select('id, nome, codigo, preco, estoque, ativo, categoria, tem_variacoes')
        .eq('ativo', true)
        .eq('empresa_id', empresaId)
        .order('nome')
        .range(from, from + pageSize - 1);
      allProducts = allProducts.concat(data || []);
      hasMore = (data?.length || 0) === pageSize;
      from += pageSize;
    }
    setProdutos(allProducts as Produto[]);

    const { data: cliData } = await api
      .from('clientes')
      .select('id, nome, telefone, email')
      .eq('ativo', true)
      .eq('empresa_id', empresaId)
      .order('nome');
    setClientes((cliData ?? []) as Cliente[]);

    // Fetch taxas de pagamento
    const { data: taxasData } = await api
      .from('taxas_pagamento')
      .select('metodo_pagamento, taxa_percentual, parcelas, bandeira, tipo_taxa')
      .eq('empresa_id', empresaId);
    if (taxasData) {
      setTaxasPagamento(
        (taxasData as any[]).map(t => ({ metodo: t.metodo_pagamento, parcelas: Number(t.parcelas), bandeira: t.bandeira || '', taxa: Number(t.taxa_percentual), tipo_taxa: t.tipo_taxa || 'percentual' }))
      );
    }

    // Fetch vendedores
    try {
      const { data, error } = await api.functions.invoke('list-users', {
        method: 'POST',
        body: { empresa_id: empresaId },
      });
      if (!error && data?.users) {
        const lista = (data.users as { id: string; nome: string | null; email: string }[])
          .map(u => ({ id: u.id, nome: u.nome || u.email, email: u.email }));
        setVendedores(lista);
      }
    } catch (err) {
      console.error('Erro ao buscar vendedores:', err);
    }
  }, [empresaId]);

  useEffect(() => {
    if (open && empresaId) fetchData();
  }, [open, empresaId, fetchData]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdicionarItem = async () => {
    if (!produtoSelecionado || quantidadeProduto <= 0) {
      toast({ title: 'Selecione um produto e quantidade válida', variant: 'destructive' });
      return;
    }
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    // Se produto tem variações, abre o seletor de variação
    if (produto.tem_variacoes) {
      const { data } = await api
        .from('produto_variacoes')
        .select('id, atributos, preco, estoque, sku')
        .eq('produto_id', produto.id)
        .eq('ativo', true)
        .order('created_at');
      setProdutoComVariacao(produto);
      setVariacoes((data as ProdutoVariacaoSimples[]) || []);
      setVariacaoSelecionada(null);
      setVariacaoDialogOpen(true);
      return;
    }

    if (produto.estoque !== null && quantidadeProduto > produto.estoque) {
      toast({ title: 'Estoque insuficiente', description: `Disponível: ${produto.estoque} unidades`, variant: 'destructive' });
      return;
    }

    const itemExistente = itensVenda.find(i => i.produto_id === produtoSelecionado && !i.variacao_id);
    if (itemExistente) {
      const novaQuantidade = itemExistente.quantidade + quantidadeProduto;
      if (produto.estoque !== null && novaQuantidade > produto.estoque) {
        toast({ title: 'Estoque insuficiente', description: `Disponível: ${produto.estoque} unidades`, variant: 'destructive' });
        return;
      }
      setItensVenda(itensVenda.map(i =>
        i.produto_id === produtoSelecionado && !i.variacao_id
          ? { ...i, quantidade: novaQuantidade, subtotal: novaQuantidade * i.preco_unitario }
          : i
      ));
    } else {
      setItensVenda([...itensVenda, {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: quantidadeProduto,
        preco_unitario: Number(produto.preco),
        subtotal: quantidadeProduto * Number(produto.preco),
        desconto: 0,
        desconto_tipo: 'percentual',
        observacao: '',
        obs_aberta: false,
      }]);
    }
    setProdutoSelecionado('');
    setQuantidadeProduto(1);
  };

  const handleAdicionarItemComVariacao = () => {
    if (!produtoComVariacao || !variacaoSelecionada) return;
    const precoFinal = variacaoSelecionada.preco ?? produtoComVariacao.preco;
    const label = Object.values(variacaoSelecionada.atributos).join(' / ');
    const chaveCarrinho = `${produtoComVariacao.id}__${variacaoSelecionada.id}`;

    const itemExistente = itensVenda.find(i => i.variacao_id === variacaoSelecionada.id);
    if (itemExistente) {
      const novaQtd = itemExistente.quantidade + quantidadeProduto;
      if (novaQtd > variacaoSelecionada.estoque) {
        toast({ title: 'Estoque insuficiente', description: `Disponível: ${variacaoSelecionada.estoque} unidades`, variant: 'destructive' });
        return;
      }
      setItensVenda(itensVenda.map(i =>
        i.variacao_id === variacaoSelecionada.id
          ? { ...i, quantidade: novaQtd, subtotal: novaQtd * i.preco_unitario }
          : i
      ));
    } else {
      setItensVenda([...itensVenda, {
        produto_id: produtoComVariacao.id,
        produto_nome: `${produtoComVariacao.nome} — ${label}`,
        quantidade: quantidadeProduto,
        preco_unitario: precoFinal,
        subtotal: quantidadeProduto * precoFinal,
        variacao_id: variacaoSelecionada.id,
        variacao_label: label,
        desconto: 0,
        desconto_tipo: 'percentual',
        observacao: '',
        obs_aberta: false,
      }]);
    }
    setVariacaoDialogOpen(false);
    setProdutoComVariacao(null);
    setVariacaoSelecionada(null);
    setProdutoSelecionado('');
    setQuantidadeProduto(1);
  };

  const handleRemoverItem = (produtoId: string) => {
    setItensVenda(itensVenda.filter(i => i.produto_id !== produtoId));
  };

  const updateItemField = (itemKey: string, updates: Partial<ItemVenda>) => {
    setItensVenda(prev => prev.map(i =>
      (i.variacao_id || i.produto_id) === itemKey ? { ...i, ...updates } : i
    ));
  };

  const resetForm = () => {
    setNovaVenda({ cliente_nome: '', cliente_telefone: '', cliente_email: '', metodo_pagamento: '', parcelas: 1, bandeira: '', observacoes: '', vendedor: '', desconto: 0 });
    setDescontoTipo('valor');
    setItensVenda([]);
    setDataVenda(new Date());
    setOperacaoStatus('');
    setOperacaoTipo('entrega');
    setProdutoSelecionado('');
    setQuantidadeProduto(1);
  };

  const handleSalvar = async () => {
    if (!novaVenda.cliente_nome || itensVenda.length === 0 || !novaVenda.metodo_pagamento || !user) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios e adicione pelo menos um produto', variant: 'destructive' });
      return;
    }

    if (novaVenda.vendedor) {
      const vendedorValido = vendedores.some(v => v.nome === novaVenda.vendedor);
      if (!vendedorValido) {
        toast({ title: 'Vendedor inválido para a empresa selecionada.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);

    const produtosDescricao = itensVenda.map(i => `${i.quantidade}x ${i.produto_nome}`).join(', ');
    const descontoGeralInput = novaVenda.desconto || 0;
    const descontoGeral = descontoTipo === 'percentual' ? (valorTotalItens * descontoGeralInput / 100) : descontoGeralInput;
    const desconto = descontoItensTotal + descontoGeral;
    const valorFinal = valorTotalItens - descontoGeral;

    // Calculate valor líquido based on fees
    const calcValorLiquido = () => {
      if (!novaVenda.metodo_pagamento) return null;
      const parcelas = novaVenda.metodo_pagamento === 'Cartão de Crédito' ? novaVenda.parcelas : 0;
      const bandeira = novaVenda.bandeira || '';
      const findTaxa = (p: number, b: string) => taxasPagamento.find(t => t.metodo === novaVenda.metodo_pagamento && t.parcelas === p && t.bandeira === b);
      const matched = findTaxa(parcelas, bandeira) ?? findTaxa(0, bandeira) ?? findTaxa(parcelas, '') ?? findTaxa(0, '');
      const taxaVal = matched?.taxa || 0;
      if (taxaVal <= 0) return null;
      return matched?.tipo_taxa === 'fixo'
        ? valorFinal - taxaVal
        : valorFinal - (valorFinal * taxaVal / 100);
    };
    const valorLiquido = calcValorLiquido();

    // Resolve cliente_id com fallback CPF → nome+telefone → nome
    const clienteByName = clientes.find(c => c.nome === novaVenda.cliente_nome);
    const cpfHint = (novaVenda as any).cliente_cpf || (clienteByName as any)?.cpf || null;
    const clienteIdResolvido = resolveClienteId(clientes as any, {
      nome: novaVenda.cliente_nome,
      cpf: cpfHint,
      telefone: novaVenda.cliente_telefone,
    });
    const clienteMatchVenda = clienteIdResolvido
      ? clientes.find(c => c.id === clienteIdResolvido)
      : clienteByName;

    const { data: rpcResult, error: vendaError } = await api.rpc('criar_venda_completa', {
      p_venda: {
        user_id: user.id,
        empresa_id: empresaId,
        cliente_id: clienteIdResolvido,
        cliente_nome: novaVenda.cliente_nome,
        cliente_telefone: novaVenda.cliente_telefone || null,
        cliente_email: novaVenda.cliente_email || null,
        produtos: produtosDescricao,
        valor: valorFinal,
        valor_bruto: subtotalBruto,
        desconto: desconto,
        valor_final: valorFinal,
        vendedor_id: vendedores.find(v => v.nome === novaVenda.vendedor)?.id || user.id,
        metodo_pagamento: novaVenda.metodo_pagamento,
        parcelas: novaVenda.metodo_pagamento === 'Cartão de Crédito' ? novaVenda.parcelas : 1,
        data_venda: format(dataVenda, 'yyyy-MM-dd'),
        observacoes: novaVenda.observacoes || null,
        vendedor: novaVenda.vendedor || null,
        bandeira: novaVenda.bandeira || '',
        valor_liquido: valorLiquido,
      },
      p_itens: itensVenda.map(item => {
        const discValorItem = item.desconto_tipo === 'percentual'
          ? item.subtotal * (item.desconto / 100)
          : Math.min(item.desconto, item.subtotal);
        return {
          produto_id: item.produto_id,
          variacao_id: item.variacao_id || null,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal - discValorItem,
          desconto: item.desconto > 0 ? discValorItem : 0,
          desconto_tipo: item.desconto > 0 ? item.desconto_tipo : null,
          observacao: item.observacao || null,
        };
      }),
    } as any);

    if (vendaError) {
      console.error('[NovaVenda] Erro ao criar venda:', vendaError);
      toast({ title: 'Erro', description: vendaError.message || 'Erro ao cadastrar venda', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const vendaId = (rpcResult as any)?.id;

    // Criar operação automaticamente se etapa selecionada E houver pelo menos 1 móvel
    if (operacaoStatus && user && temMoveis) {
      const DEFAULT_CHECKLIST = [
        'Pedido enviado ao fornecedor',
        'Produto recebido',
        'Cliente contatado',
        'Data confirmada',
        'Entregue',
        'Montagem concluída',
      ];

      const { data: opData, error: opError } = await api
        .from('operacoes')
        .insert({
          empresa_id: empresaId,
          user_id: user.id,
          venda_id: vendaId,
          cliente_nome: novaVenda.cliente_nome,
          cliente_telefone: novaVenda.cliente_telefone || null,
          cliente_email: novaVenda.cliente_email || null,
          produtos: produtosDescricao,
          tipo: operacaoTipo,
          status: operacaoStatus,
          status_pagamento: 'pendente',
        } as any)
        .select()
        .single();

      if (!opError && opData) {
        const tarefas = DEFAULT_CHECKLIST.map((titulo, i) => ({
          operacao_id: opData.id,
          titulo,
          ordem: i,
        }));
        await api.from('operacao_tarefas').insert(tarefas as any);
        await api.from('operacao_historico').insert({
          operacao_id: opData.id,
          tipo: 'status_change',
          descricao: 'Operação criada automaticamente a partir da venda',
          status_novo: operacaoStatus,
          user_id: user.id,
        } as any);
      }
    }

    // Auto-generate Pedido de Entrega for all sales
    if (user) {
      const clienteMatch = clienteMatchVenda;
      let enderecoEntrega: string | null = null;
      let clienteCpf: string | null = null;

      if (clienteMatch) {
        const { data: clienteCompleto } = await api
          .from('clientes')
          .select('endereco, cidade, estado, cep, cpf')
          .eq('id', clienteMatch.id)
          .single();
        if (clienteCompleto) {
          const parts = [clienteCompleto.endereco, clienteCompleto.cidade, clienteCompleto.estado, clienteCompleto.cep].filter(Boolean);
          enderecoEntrega = parts.length > 0 ? parts.join(', ') : null;
          clienteCpf = clienteCompleto.cpf || null;
        }
      }

      const { data: pedidoData, error: pedidoError } = await api
        .from('pedidos_entrega')
        .insert({
          venda_id: vendaId,
          empresa_id: empresaId,
          user_id: user.id,
          cliente_id: clienteMatch?.id || clienteIdResolvido || null,
          cliente_nome: novaVenda.cliente_nome,
          cliente_telefone: novaVenda.cliente_telefone || null,
          cliente_email: novaVenda.cliente_email || null,
          cliente_cpf: clienteCpf,
          endereco_entrega: enderecoEntrega,
          forma_pagamento: novaVenda.metodo_pagamento,
          observacoes: novaVenda.observacoes || null,
          vendedor: novaVenda.vendedor || null,
          status: 'pendente',
        } as any)
        .select()
        .single();

      if (pedidoData && !pedidoError) {
        await api.from('pedido_entrega_historico').insert({
          pedido_id: pedidoData.id,
          user_id: user.id,
          status_novo: 'pendente',
          descricao: 'Pedido de entrega gerado automaticamente a partir da venda',
        } as any);
      }
    }

    resetForm();
    onOpenChange(false);
    setSaving(false);
    onVendaSalva?.();
    toast({
      title: 'Sucesso!',
      description: 'Venda cadastrada e pedido de entrega gerado!',
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent
        className="overflow-hidden"
        style={{ width: '95vw', maxWidth: '760px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader style={{ padding: '20px 24px 16px', flexShrink: 0, borderBottom: '1px solid rgba(142,95,207,0.08)' }}>
          <DialogTitle>Cadastrar Venda</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 24px 0' }}>
          {/* Cliente */}
          <div className="grid gap-2">
            <Label>Nome do Cliente *</Label>
            <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={clientePopoverOpen} className="justify-between w-full font-normal">
                  {novaVenda.cliente_nome || "Selecione ou digite o nome do cliente..."}
                  <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 z-[200]" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." onValueChange={value => {
                    if (!clientes.find(c => c.nome.toLowerCase() === value.toLowerCase())) {
                      setNovaVenda({ ...novaVenda, cliente_nome: value, cliente_telefone: '', cliente_email: '' });
                    }
                  }} />
                  <CommandList>
                    <CommandEmpty>
                      <span className="text-muted-foreground">Nenhum cliente encontrado.</span>
                      <br />
                      <span className="text-xs text-muted-foreground">Digite o nome para cadastrar manualmente.</span>
                    </CommandEmpty>
                    <CommandGroup heading="Clientes Cadastrados">
                      {clientes.map(cliente => (
                        <CommandItem key={cliente.id} value={cliente.nome} onSelect={() => {
                          setNovaVenda({ ...novaVenda, cliente_nome: cliente.nome, cliente_telefone: cliente.telefone || '', cliente_email: cliente.email || '' });
                          setClientePopoverOpen(false);
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", novaVenda.cliente_nome === cliente.nome ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span>{cliente.nome}</span>
                            {cliente.telefone && <span className="text-xs text-muted-foreground">{cliente.telefone}</span>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Telefone / Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vd_cliente_telefone">Telefone</Label>
              <Input id="vd_cliente_telefone" placeholder="(00) 00000-0000" value={novaVenda.cliente_telefone} onChange={e => setNovaVenda({ ...novaVenda, cliente_telefone: e.target.value })} className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vd_cliente_email">E-mail</Label>
              <Input id="vd_cliente_email" type="email" placeholder="email@exemplo.com" value={novaVenda.cliente_email} onChange={e => setNovaVenda({ ...novaVenda, cliente_email: e.target.value })} className="h-11" />
            </div>
          </div>

          {/* Produtos */}
          <div className="space-y-3">
            <Label>Produtos *</Label>
            <div className="flex gap-2">
              <Popover open={produtoPopoverOpen} onOpenChange={setProdutoPopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={produtoPopoverOpen} className="flex-1 justify-between font-normal">
                    {produtoSelecionado
                      ? (() => {
                          const p = produtos.find(prod => prod.id === produtoSelecionado);
                          return p ? `${p.codigo ? `[${p.codigo}] ` : ''}${p.nome}` : "Selecione um produto...";
                        })()
                      : "Buscar por código ou nome..."}
                    <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-[200]" align="start">
                  <Command filter={(value, search) => {
                    const s = search.toLowerCase().trim();
                    if (!s) return 1;
                    const v = value.toLowerCase();
                    const codePart = v.split(' ')[0];
                    if (codePart && codePart === s) return 1;
                    if (v.includes(s)) return 1;
                    return 0;
                  }}>
                    <CommandInput placeholder="Digite código ou nome do produto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup heading="Produtos com Estoque">
                        {produtos.filter(p => p.tem_variacoes || (p.estoque ?? 0) > 0).map(p => (
                          <CommandItem
                            key={p.id}
                            value={`${p.codigo || ''} ${p.nome}`}
                            onSelect={() => {
                              setProdutoSelecionado(p.id);
                              setProdutoPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", produtoSelecionado === p.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2">
                                {p.codigo && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.codigo}</span>}
                                <span>{p.nome}</span>
                              </div>
                              <span className="text-muted-foreground text-xs">
                                {formatCurrency(Number(p.preco))} • {p.tem_variacoes ? 'Variações' : `Est: ${p.estoque ?? 0}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input type="number" min="1" placeholder="Qtd" className="w-20" value={quantidadeProduto} onChange={e => setQuantidadeProduto(parseInt(e.target.value) || 1)} />
              <Button type="button" size="icon" onClick={handleAdicionarItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de itens */}
            {itensVenda.length > 0 && (
              <div className="border rounded-lg overflow-hidden" style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden' }}>
                {itensVenda.map(item => {
                  const itemKey = item.variacao_id || item.produto_id;
                  const discValor = item.desconto_tipo === 'percentual'
                    ? item.subtotal * (item.desconto / 100)
                    : Math.min(item.desconto, item.subtotal);
                  const totalItemFinal = Math.max(0, item.subtotal - discValor);
                  const temDesconto = item.desconto > 0;
                  const invalido = item.desconto_tipo === 'percentual'
                    ? item.desconto > 100
                    : item.desconto > item.subtotal;
                  return (
                    <div key={itemKey} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center p-3 gap-3">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.produto_nome}</p>
                          <p className="text-xs text-muted-foreground">{item.quantidade}× {formatCurrency(item.preco_unitario)}</p>
                        </div>
                        {/* Per-item discount */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(142,95,207,0.3)' }}>
                            <button type="button" onClick={() => updateItemField(itemKey, { desconto_tipo: 'percentual' })}
                              style={{ padding: '3px 7px', fontSize: '0.68rem', fontFamily: 'Gilroy', fontWeight: 700,
                                background: item.desconto_tipo === 'percentual' ? '#8E5FCF' : 'transparent',
                                color: item.desconto_tipo === 'percentual' ? 'white' : '#8E5FCF',
                                border: 'none', cursor: 'pointer', lineHeight: 1 }}>%</button>
                            <button type="button" onClick={() => updateItemField(itemKey, { desconto_tipo: 'valor' })}
                              style={{ padding: '3px 7px', fontSize: '0.68rem', fontFamily: 'Gilroy', fontWeight: 700,
                                background: item.desconto_tipo === 'valor' ? '#8E5FCF' : 'transparent',
                                color: item.desconto_tipo === 'valor' ? 'white' : '#8E5FCF',
                                border: 'none', cursor: 'pointer', lineHeight: 1 }}>R$</button>
                          </div>
                          <input
                            type="number" min={0} step={0.01}
                            max={item.desconto_tipo === 'percentual' ? 100 : item.subtotal}
                            value={item.desconto || ''}
                            onChange={e => {
                              const raw = parseFloat(e.target.value) || 0;
                              const max = item.desconto_tipo === 'percentual' ? 100 : item.subtotal;
                              updateItemField(itemKey, { desconto: Math.min(raw, max) });
                            }}
                            placeholder="0"
                            style={{ width: '72px', textAlign: 'center', background: 'rgba(255,255,255,0.8)',
                              border: invalido ? '1px solid #EF4444' : '1px solid rgba(142,95,207,0.2)',
                              borderRadius: '8px', padding: '5px 6px', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </div>
                        {/* Value display */}
                        <div style={{ minWidth: '90px', textAlign: 'right', flexShrink: 0 }}>
                          {temDesconto && !invalido ? (
                            <div>
                              <span style={{ textDecoration: 'line-through', color: '#9CA3AF', fontSize: '0.75rem' }}>{formatCurrency(item.subtotal)}</span>
                              <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.88rem', marginLeft: '4px' }}>{formatCurrency(totalItemFinal)}</span>
                              <div style={{ marginTop: '1px' }}>
                                <span style={{ fontSize: '0.68rem', color: '#10B981', background: 'rgba(16,185,129,0.1)',
                                  borderRadius: '20px', padding: '1px 7px', fontFamily: 'Gilroy', fontWeight: 700 }}>
                                  -{item.desconto_tipo === 'percentual' ? `${item.desconto}%` : formatCurrency(discValor)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                          )}
                        </div>
                        {/* Obs button */}
                        <button type="button" title="Adicionar observação"
                          onClick={() => updateItemField(itemKey, { obs_aberta: !item.obs_aberta })}
                          style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer',
                            color: item.observacao ? '#8E5FCF' : '#9CA3AF', position: 'relative', flexShrink: 0 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8E5FCF'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = item.observacao ? '#8E5FCF' : '#9CA3AF'; }}>
                          <MessageSquare style={{ width: '14px', height: '14px' }} />
                          {item.observacao && (
                            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '5px', height: '5px',
                              borderRadius: '50%', background: '#8E5FCF', display: 'block' }} />
                          )}
                        </button>
                        {/* Remove */}
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => handleRemoverItem(item.produto_id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Obs textarea */}
                      {item.obs_aberta && (
                        <div style={{ padding: '0 12px 10px 12px' }}>
                          <input
                            type="text"
                            value={item.observacao}
                            onChange={e => updateItemField(itemKey, { observacao: e.target.value })}
                            placeholder="Observação sobre este item..."
                            style={{ width: '100%', background: 'rgba(142,95,207,0.04)',
                              border: '1px solid rgba(142,95,207,0.15)', borderRadius: '8px',
                              padding: '8px 12px', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none',
                              boxSizing: 'border-box' as const }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Totalizador */}
                <div style={{ padding: '16px', background: 'rgba(142,95,207,0.03)', borderTop: '1px solid rgba(142,95,207,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>Subtotal</span>
                    <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>{formatCurrency(subtotalBruto)}</span>
                  </div>
                  {descontoItensTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#10B981' }}>(-) Desc. itens</span>
                      <span style={{ fontSize: '0.82rem', color: '#10B981' }}>- {formatCurrency(descontoItensTotal)}</span>
                    </div>
                  )}
                  {/* Desconto geral */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>Desc. geral:</span>
                      <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(142,95,207,0.3)' }}>
                        <button type="button" onClick={() => setDescontoTipo('percentual')}
                          style={{ padding: '2px 6px', fontSize: '0.65rem', fontFamily: 'Gilroy', fontWeight: 700,
                            background: descontoTipo === 'percentual' ? '#8E5FCF' : 'transparent',
                            color: descontoTipo === 'percentual' ? 'white' : '#8E5FCF',
                            border: 'none', cursor: 'pointer', lineHeight: 1 }}>%</button>
                        <button type="button" onClick={() => setDescontoTipo('valor')}
                          style={{ padding: '2px 6px', fontSize: '0.65rem', fontFamily: 'Gilroy', fontWeight: 700,
                            background: descontoTipo === 'valor' ? '#8E5FCF' : 'transparent',
                            color: descontoTipo === 'valor' ? 'white' : '#8E5FCF',
                            border: 'none', cursor: 'pointer', lineHeight: 1 }}>R$</button>
                      </div>
                      <input
                        type="number" min={0} step={0.01}
                        value={novaVenda.desconto || ''}
                        onChange={e => setNovaVenda({ ...novaVenda, desconto: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        style={{ width: '68px', textAlign: 'center', background: 'rgba(255,255,255,0.8)',
                          border: '1px solid rgba(142,95,207,0.2)', borderRadius: '8px',
                          padding: '4px 6px', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none' }}
                      />
                    </div>
                    {descontoGeralEmReais > 0 && (
                      <span style={{ fontSize: '0.82rem', color: '#10B981' }}>- {formatCurrency(descontoGeralEmReais)}</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(142,95,207,0.12)', margin: '8px 0 6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937' }}>TOTAL</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'Gilroy',
                      background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {formatCurrency(valorFinalCalc)}
                    </span>
                  </div>
                </div>
                {novaVenda.metodo_pagamento && (() => {
                  const totalFinal = valorFinalCalc;
                  const parcelas = novaVenda.metodo_pagamento === 'Cartão de Crédito' ? novaVenda.parcelas : 0;
                   const bandeira = novaVenda.bandeira || '';
                   const findTaxa = (p: number, b: string) => taxasPagamento.find(t => t.metodo === novaVenda.metodo_pagamento && t.parcelas === p && t.bandeira === b);
                   const matched = findTaxa(parcelas, bandeira) ?? findTaxa(0, bandeira) ?? findTaxa(parcelas, '') ?? findTaxa(0, '');
                   const taxa = matched?.taxa || 0;
                   if (taxa <= 0) return null;
                   const isFixo = matched?.tipo_taxa === 'fixo';
                   const valorTaxa = isFixo ? taxa : totalFinal * taxa / 100;
                   const valorLiquido = totalFinal - valorTaxa;
                   return (
                     <div className="flex items-center justify-between p-3 bg-muted/30 border-t border-border">
                       <div>
                         <span className="font-medium text-sm">Valor Líquido</span>
                         <span className="text-xs text-muted-foreground ml-1">
                           ({isFixo ? `taxa R$ ${taxa.toFixed(2)}` : `taxa ${taxa}%`}{bandeira ? ` · ${bandeira}` : ''}{parcelas > 1 ? ` · ${parcelas}x` : ''}: -{formatCurrency(valorTaxa)})
                         </span>
                       </div>
                       <span className="text-lg font-bold text-primary">
                         {formatCurrency(valorLiquido)}
                       </span>
                     </div>
                   );
                })()}
              </div>
            )}
          </div>

          {/* Data + Método pagamento */}
          <div className="grid grid-cols-2 gap-4" style={{ gap: '16px' }}>
            <div className="grid gap-2">
              <Label>Data da Venda *</Label>
              {dataFixaHoje ? (
                <Button variant="outline" className="justify-start text-left font-normal cursor-default" disabled>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dataVenda, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataVenda} onSelect={date => date && setDataVenda(date)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Método de Pagamento *</Label>
              <Select value={novaVenda.metodo_pagamento} onValueChange={value => setNovaVenda({ ...novaVenda, metodo_pagamento: value })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bandeira + Parcelas para cartões */}
          {(novaVenda.metodo_pagamento === 'Cartão de Crédito' || novaVenda.metodo_pagamento === 'Cartão de Débito') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Bandeira</Label>
                <Select value={novaVenda.bandeira} onValueChange={value => setNovaVenda({ ...novaVenda, bandeira: value })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione a bandeira" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MasterCard">MasterCard</SelectItem>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Amex">Amex</SelectItem>
                    <SelectItem value="Elo">Elo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {novaVenda.metodo_pagamento === 'Cartão de Crédito' && (
                <div className="grid gap-2">
                  <Label>Parcelas</Label>
                  <Select value={String(novaVenda.parcelas)} onValueChange={value => setNovaVenda({ ...novaVenda, parcelas: parseInt(value) })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Parcelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x de {formatCurrency(valorTotalItens / n)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Vendedor */}
          <div className="grid gap-2">
            <Label>Vendedor</Label>
            <Select value={novaVenda.vendedor} onValueChange={value => setNovaVenda({ ...novaVenda, vendedor: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.length === 0 ? (
                  <SelectItem value="_none" disabled>Nenhum vendedor cadastrado</SelectItem>
                ) : (
                  vendedores.map(v => (
                    <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="grid gap-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Observações sobre a venda..."
            value={novaVenda.observacoes}
            onChange={e => setNovaVenda({ ...novaVenda, observacoes: e.target.value })}
            rows={3}
            style={{ minHeight: '100px', resize: 'vertical', padding: '12px 16px' }}
          />
          </div>

          {/* Seção de Operação - aparece quando há itens no carrinho */}
          {temMoveis && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Gerar Operação de Entrega</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione a etapa inicial para criar uma operação automaticamente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Etapa do Kanban</Label>
                <Select value={operacaoStatus} onValueChange={setOperacaoStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNS.map(col => (
                      <SelectItem key={col.id} value={col.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${col.color}`} />
                          {col.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo de Serviço</Label>
                <Select value={operacaoTipo} onValueChange={setOperacaoTipo}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrega">Entrega</SelectItem>
                    <SelectItem value="entrega_montagem">Entrega + Montagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="flex justify-end gap-3" style={{
          position: 'sticky',
          bottom: 0,
          padding: '20px 24px',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(142,95,207,0.1)',
          flexShrink: 0,
          zIndex: 10,
        }}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Seletor de variação ─────────────────────────────────────────────── */}
    <Dialog open={variacaoDialogOpen} onOpenChange={setVariacaoDialogOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            Selecione a variação — {produtoComVariacao?.nome}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {variacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este produto não tem variações cadastradas ainda.
            </p>
          ) : (
            <div className="grid gap-2">
              {variacoes.map(v => {
                const label = Object.values(v.atributos).join(' / ');
                const semEstoque = v.estoque === 0;
                const selecionado = variacaoSelecionada?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={semEstoque}
                    onClick={() => setVariacaoSelecionada(v)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg border text-sm transition-all ${
                      selecionado
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : semEstoque
                        ? 'border-border bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-primary/50 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(v.atributos).map(([k, val]) => (
                          <span key={k} className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
                            {val}
                          </span>
                        ))}
                      </div>
                      {v.sku && <span className="text-xs text-muted-foreground font-mono">{v.sku}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="font-semibold">
                        {formatCurrency(v.preco ?? produtoComVariacao?.preco ?? 0)}
                      </span>
                      {semEstoque ? (
                        <span className="text-xs text-red-500">Sem estoque</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{v.estoque} em estoque</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => setVariacaoDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdicionarItemComVariacao} disabled={!variacaoSelecionada}>
            Adicionar ao carrinho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
