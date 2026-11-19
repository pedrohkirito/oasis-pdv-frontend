import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NovaVendaDialog } from '@/components/vendas/NovaVendaDialog';
import { Calendar } from '@/components/ui/calendar';
import { DateRangeShortcuts } from '@/components/ui/date-range-shortcuts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Search, CalendarIcon, Trash2, Edit, ShoppingCart, CreditCard, Banknote, QrCode, Package, X, Check, User, FileText, Loader2, CheckCircle, XCircle, AlertCircle, RotateCcw, Download, FileCode, Ban, Send, Clock, ClipboardList, Truck, RefreshCw, Eye, MessageSquare } from 'lucide-react';
import { PedidoEntregaDialog } from '@/components/pedido-entrega/PedidoEntregaDialog';
import { PedidoEntregaStatusDialog } from '@/components/pedido-entrega/PedidoEntregaStatusDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { api } from '@/lib/api';
import { resolveClienteId } from '@/lib/clienteResolver';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useImpressora } from '@/hooks/useImpressora';
import { KANBAN_COLUMNS, KanbanStatus } from '@/hooks/useOperacoes';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, Wrench, Repeat } from 'lucide-react';
import { PERIODOS_PADRAO, RecorrenciaTipo, isServico, labelRecorrencia, sufixoRecorrencia } from '@/lib/servicos';
import { VendaDetailAccordion } from '@/components/vendas/VendaDetailAccordion';
interface Venda {
  id: string;
  user_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  produtos: string;
  valor: number;
  desconto: number | null;
  desconto_geral: number | null;
  desconto_geral_tipo: string | null;
  valor_bruto: number | null;
  valor_final: number | null;
  metodo_pagamento: string;
  parcelas: number | null;
  data_venda: string;
  observacoes: string | null;
  vendedor: string | null;
  vendedor_id: string | null;
  bandeira: string | null;
  valor_liquido: number | null;
  created_at: string;
  updated_at: string;
}
const vendedorColors: Record<string, string> = {
  'Nice': '#ec4899',
  // pink
  'Lourdes': '#8b5cf6' // violet
};
interface Produto {
  id: string;
  name: string;
  code: string | null;
  preco: number;
  estoque: number | null;
  active: boolean | null;
  categoria: string | null;
  tipo?: string;
  recorrente?: boolean;
  recorrencia_tipo?: string | null;
}
interface ItemVenda {
  produto_id: string;
  variacao_id?: string | null;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  desconto: number;
  desconto_tipo: 'percentual' | 'amount';
  observacao: string;
  obs_aberta: boolean;
  recorrencia_periodos?: number | null;
}
interface Cliente {
  id: string;
  name: string;
  telefone: string | null;
  email: string | null;
}
const metodoColors: Record<string, string> = {
  'Dinheiro': '#10b981',
  'PIX': '#06b6d4',
  'Cartão de Crédito': '#8b5cf6',
  'Cartão de Débito': '#3b82f6',
  'Boleto': '#f59e0b'
};
const getMetodoColor = (metodo: string): string => {
  return metodoColors[metodo] || '#6b7280';
};
const getMetodoIcon = (metodo: string) => {
  switch (metodo) {
    case 'Dinheiro':
      return <Banknote className="h-4 w-4" />;
    case 'PIX':
      return <QrCode className="h-4 w-4" />;
    case 'Cartão de Crédito':
    case 'Cartão de Débito':
      return <CreditCard className="h-4 w-4" />;
    default:
      return <ShoppingCart className="h-4 w-4" />;
  }
};
interface VendasProps {
  autoOpenNova?: boolean;
}

const Vendas = ({ autoOpenNova = false }: VendasProps) => {
  const {
    toast
  } = useToast();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'manager' || role === 'seller';
  const { companyId, empresaAtiva } = useEmpresa();
  const { imprimirCupomSimples, imprimirDANFE, abrirGaveta, config: impressoraConfig } = useImpressora();
  const navigate = useNavigate();
  const location = useLocation();
const [dialogOpen, setDialogOpen] = useState(autoOpenNova);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: new Date()
  });
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [filterMetodo, setFilterMetodo] = useState<string>('todos');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [emitindoNfce, setEmitindoNfce] = useState<string | null>(null);
  const [transmitindoNfce, setTransmitindoNfce] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingXml, setDownloadingXml] = useState<string | null>(null);
  const [cancelandoNfce, setCancelandoNfce] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [vendasComNfce, setVendasComNfce] = useState<Map<string, { status: string; numero: number | null; nuvem_fiscal_id: string | null; pdf_url: string | null; xml_url: string | null }>>(new Map());
  const [vendasComOperacao, setVendasComOperacao] = useState<Map<string, string>>(new Map());
  const [operacaoManualDialogOpen, setOperacaoManualDialogOpen] = useState(false);
  const [vendaParaOperacao, setVendaParaOperacao] = useState<Venda | null>(null);
  const [operacaoManualStatus, setOperacaoManualStatus] = useState<string>('');
  const [operacaoManualTipo, setOperacaoManualTipo] = useState<string>('entrega');
  const [criandoOperacao, setCriandoOperacao] = useState(false);
  // Dialogs de confirmação para ações na lista de vendas
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'nfc' | 'operacao' | 'excluir' | null>(null);
  const [confirmVenda, setConfirmVenda] = useState<Venda | null>(null);
  // Pedidos de Entrega
  const [vendasComPedido, setVendasComPedido] = useState<Set<string>>(new Set());
  const [pedidoDialogOpen, setPedidoDialogOpen] = useState(false);
  const [pedidoStatusDialogOpen, setPedidoStatusDialogOpen] = useState(false);
  const [vendaParaPedido, setVendaParaPedido] = useState<string | null>(null);
  // Cliente dropdown state
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);
  const [editClientePopoverOpen, setEditClientePopoverOpen] = useState(false);
  const [expandedVendaId, setExpandedVendaId] = useState<string | null>(null);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);

  // Items selecionados para nova venda
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [produtoPopoverOpen, setProdutoPopoverOpen] = useState(false);
  const [quantidadeProduto, setQuantidadeProduto] = useState<number>(1);

  // Items selecionados para edição
  const [editItensVenda, setEditItensVenda] = useState<ItemVenda[]>([]);
  const [editProdutoSelecionado, setEditProdutoSelecionado] = useState<string>('');
  const [editQuantidadeProduto, setEditQuantidadeProduto] = useState<number>(1);

  const updateEditItemField = (productId: string, updates: Partial<ItemVenda>) => {
    setEditItensVenda(prev => prev.map(i => i.produto_id === productId ? { ...i, ...updates } : i));
  };
  const [novaVenda, setNovaVenda] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    metodo_pagamento: '',
    parcelas: 1,
    observacoes: '',
    vendedor: '',
    desconto: 0
  });
  const [descontoTipo, setDescontoTipo] = useState<'amount' | 'percentual'>('amount');
  const [soldOn, setDataVenda] = useState<Date>(new Date());
  
  // Operação automática
  const [operacaoStatus, setOperacaoStatus] = useState<string>('');
  const [operacaoTipo, setOperacaoTipo] = useState<string>('entrega');
  
  const temItensNoCarrinho = itensVenda.length > 0;
  const FURNITURE_CATEGORIES = ['Móveis', 'Berço', 'Cama', 'Cômoda'];
  const temMoveis = useMemo(() => {
    return itensVenda.some(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      return produto?.categoria && FURNITURE_CATEGORIES.some(fc => 
        produto.categoria!.toLowerCase() === fc.toLowerCase()
      );
    });
  }, [itensVenda, produtos]);
  const [editVenda, setEditVenda] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    metodo_pagamento: '',
    parcelas: 1,
    observacoes: '',
    vendedor: '',
    desconto: 0
  });
  const [editDescontoTipo, setEditDescontoTipo] = useState<'amount' | 'percentual'>('amount');
  const [editDataVenda, setEditDataVenda] = useState<Date>();
  const [mesesFechados, setMesesFechados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);
  useEffect(() => {
    if (user && companyId) {
      fetchVendas();
      fetchProdutos();
      fetchClientes();
      fetchNotasFiscais();
      fetchVendasComOperacao();
      fetchMesesFechados();
      fetchVendasComPedido();
      fetchVendedores();
    }
  }, [user, companyId, role]);

  // Auto-expand venda from navigation state (e.g. from Operacoes Kanban)
  useEffect(() => {
    const state = location.state as { openVendaId?: string } | null;
    if (state?.openVendaId && vendas.length > 0) {
      const venda = vendas.find(v => v.id === state.openVendaId);
      if (venda) {
        setExpandedVendaId(venda.id);
        // Scroll to the venda row
        setTimeout(() => {
          const el = document.getElementById(`venda-row-${venda.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, vendas]);

  const fetchVendedores = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await api.functions.invoke('list-users', {
        method: 'POST',
        body: { company_id: companyId }
      });
      if (!error && data?.users) {
        const lista = (data.users as { id: string; name: string | null; email: string }[])
          .map(u => ({ id: u.id, name: u.name || u.email, email: u.email }));
        setVendedores(lista);
      }
    } catch (err) {
      console.error('Erro ao buscar vendedores:', err);
    }
  };

  const fetchMesesFechados = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('commission_closing')
      .select('reference_month')
      .eq('company_id', companyId)
      .eq('status', 'fechado');
    if (data) {
      setMesesFechados(new Set(data.map((d: any) => d.mes_referencia)));
    }
  };

  const isMesFechado = (soldOn: string) => {
    const mes = soldOn.substring(0, 7);
    return mesesFechados.has(mes);
  };

  const fetchNotasFiscais = async () => {
    if (!companyId) return;
    const { data, error } = await api
      .from('fiscal_document')
      .select('venda_id, status, numero, nuvem_fiscal_id, pdf_url, xml_url')
      .eq('company_id', companyId)
      .not('sale_id', 'is', null);
    
    if (!error && data) {
      const map = new Map<string, { status: string; numero: number | null; nuvem_fiscal_id: string | null; pdf_url: string | null; xml_url: string | null }>();
      data.forEach(nf => {
        if (nf.venda_id) {
          // Prioriza nota autorizada sobre outras
          const existing = map.get(nf.venda_id);
          if (!existing || nf.status === 'autorizada') {
            map.set(nf.venda_id, { status: nf.status, numero: nf.numero, nuvem_fiscal_id: nf.nuvem_fiscal_id, pdf_url: nf.pdf_url, xml_url: nf.xml_url });
          }
        }
      });
      setVendasComNfce(map);
    }
  };

  const fetchVendasComOperacao = async () => {
    if (!companyId) return;
    const { data, error } = await api
      .from('operation')
      .select('id, venda_id')
      .eq('company_id', companyId)
      .not('sale_id', 'is', null);
    if (!error && data) {
      const map = new Map<string, string>();
      data.forEach(o => { if (o.venda_id) map.set(o.venda_id, o.id); });
      setVendasComOperacao(map);
    }
  };

  const fetchVendasComPedido = async () => {
    if (!companyId) return;
    const { data, error } = await api
      .from('delivery_order')
      .select('sale_id')
      .eq('company_id', companyId)
      .not('sale_id', 'is', null);
    if (!error && data) {
      setVendasComPedido(new Set(data.map((p: any) => p.venda_id).filter(Boolean)));
    }
  };

  const handleCriarOperacaoManual = async () => {
    if (!vendaParaOperacao || !operacaoManualStatus || !user || !companyId) return;
    setCriandoOperacao(true);

    const DEFAULT_CHECKLIST = [
      'Pedido enviado ao fornecedor',
      'Produto recebido',
      'Cliente contatado',
      'Data confirmada',
      'Entregue',
      'Montagem concluída',
    ];

    const { data: opData, error: opError } = await api
      .from('operation')
      .insert({
        company_id: companyId,
        user_id: user.id,
        venda_id: vendaParaOperacao.id,
        cliente_nome: vendaParaOperacao.cliente_nome,
        cliente_telefone: vendaParaOperacao.cliente_telefone || null,
        cliente_email: vendaParaOperacao.cliente_email || null,
        produtos: vendaParaOperacao.produtos,
        kind: operacaoManualTipo,
        status: operacaoManualStatus,
        status_pagamento: 'pendente',
      } as any)
      .select()
      .single();

    if (opError) {
      toast({ title: 'Erro ao criar operação', description: opError.message, variant: 'destructive' });
      setCriandoOperacao(false);
      return;
    }

    if (opData) {
      const tarefas = DEFAULT_CHECKLIST.map((titulo, i) => ({
        operacao_id: opData.id,
        titulo,
        ordem: i,
      }));
      await api.from('operation_task').insert(tarefas as any);
      await api.from('operation_event').insert({
        operacao_id: opData.id,
        kind: 'status_change',
        descricao: 'Operação criada manualmente a partir da venda',
        status_novo: operacaoManualStatus,
        user_id: user.id,
      } as any);
    }

    setCriandoOperacao(false);
    setOperacaoManualDialogOpen(false);
    setVendaParaOperacao(null);
    setOperacaoManualStatus('');
    setOperacaoManualTipo('entrega');
    fetchVendasComOperacao();
    toast({ title: 'Operação criada com sucesso!' });
  };

  const handleDownloadPdf = async (saleId: string) => {
    const nfce = vendasComNfce.get(saleId);
    if (!nfce?.pdf_url) {
      toast({
        title: "Erro",
        description: "Link do PDF não disponível.",
        variant: "destructive",
      });
      return;
    }

    // Abre o link do PDF diretamente da Becoming
    window.open(nfce.pdf_url, '_blank');
    toast({
      title: "Download iniciado",
      description: "O PDF da NFC-e foi aberto em uma nova aba.",
    });
  };

  const handleDownloadXml = async (saleId: string) => {
    const nfce = vendasComNfce.get(saleId);
    if (!nfce?.xml_url) {
      toast({
        title: "Erro",
        description: "Link do XML não disponível.",
        variant: "destructive",
      });
      return;
    }

    // Abre o link do XML diretamente da Becoming
    window.open(nfce.xml_url, '_blank');
    toast({
      title: "Download iniciado",
      description: "O XML da NFC-e foi aberto em uma nova aba.",
    });
  };

  const handleCancelarNfce = async () => {
    if (!vendaParaCancelar || !motivoCancelamento.trim()) {
      toast({
        title: "Erro",
        description: "Informe o motivo do cancelamento (mínimo 15 caracteres).",
        variant: "destructive",
      });
      return;
    }

    if (motivoCancelamento.trim().length < 15) {
      toast({
        title: "Erro",
        description: "O motivo deve ter no mínimo 15 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // Busca a nota fresca direto do banco em vez de confiar no Map em cache
    // (vendasComNfce pode estar desatualizado se a nota foi emitida/reemitida
    // por outro fluxo/aba que não atualizou este estado local).
    const { data: notaAtual, error: notaErr } = await api
      .from('fiscal_document')
      .select('nuvem_fiscal_id, numero, status')
      .eq('sale_id', vendaParaCancelar)
      .eq('status', 'autorizada')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Cancelamento - nota do banco:', JSON.stringify(notaAtual), 'erro:', notaErr);

    if (!notaAtual?.nuvem_fiscal_id) {
      toast({
        title: "Erro",
        description: "Nota autorizada não encontrada para esta venda",
        variant: "destructive",
      });
      return;
    }

    setCancelandoNfce(vendaParaCancelar);
    setCancelDialogOpen(false);

    try {
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: {
          action: 'cancelar',
          data: {
            nuvem_fiscal_id: notaAtual.nuvem_fiscal_id,
            justificativa: motivoCancelamento.trim()
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "NFC-e cancelada",
          description: `NFC-e #${notaAtual.numero} cancelada com sucesso.`,
        });
        fetchNotasFiscais();
      } else {
        throw new Error(data?.error || 'Erro ao cancelar NFC-e');
      }
    } catch (error: any) {
      console.error('Erro ao cancelar NFC-e:', error);
      toast({
        title: "Erro ao cancelar NFC-e",
        description: error.message || "Não foi possível cancelar a NFC-e.",
        variant: "destructive",
      });
    } finally {
      setCancelandoNfce(null);
      setVendaParaCancelar(null);
      setMotivoCancelamento('');
    }
  };

  const openCancelDialog = (saleId: string) => {
    setVendaParaCancelar(saleId);
    setMotivoCancelamento('');
    setCancelDialogOpen(true);
  };
  const fetchClientes = async () => {
    if (!companyId) return;
    const {
      data,
      error
    } = await api.from('customer').select('id, name, telefone, email').eq('active', true).eq('company_id', companyId).order('name', {
      ascending: true
    });
    if (!error) {
      setClientes(data || []);
    }
  };
  const fetchVendas = async () => {
    if (!companyId) return;
    setLoading(true);
    let query = api.from('sale').select('*').eq('company_id', companyId);
    if (role === 'seller' && user) {
      query = query.eq('seller_id', user.id);
    }
    const { data, error } = await query.order('sold_on', { ascending: false });
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas",
        variant: "destructive"
      });
    } else {
      setVendas(data || []);
    }
    setLoading(false);
  };
  const fetchProdutos = async () => {
    if (!companyId) return;
    const {
      data,
      error
    } = await api.from('product').select('id, name, code, price, stock, active, category, kind, recurring, recurrence_kind').eq('active', true).eq('company_id', companyId).order('name', {
      ascending: true
    });
    if (!error) {
      setProdutos(data || []);
    }
  };

  // Calcular valor total dos itens
  const valorTotalItens = useMemo(() => {
    return itensVenda.reduce((sum, item) => sum + item.subtotal, 0);
  }, [itensVenda]);
  const editSubtotalBruto = useMemo(() =>
    editItensVenda.reduce((sum, item) => sum + item.subtotal, 0),
  [editItensVenda]);

  const editDescontoItensTotal = useMemo(() =>
    editItensVenda.reduce((sum, item) => {
      const d = item.desconto_tipo === 'percentual'
        ? item.subtotal * (Math.min(item.desconto, 100) / 100)
        : Math.min(item.desconto, item.subtotal);
      return sum + d;
    }, 0),
  [editItensVenda]);

  const editValorTotalItens = useMemo(() =>
    editSubtotalBruto - editDescontoItensTotal,
  [editSubtotalBruto, editDescontoItensTotal]);

  // Adicionar item à venda
  const handleAdicionarItem = () => {
    if (!produtoSelecionado || quantidadeProduto <= 0) {
      toast({
        title: "Erro",
        description: "Selecione um produto e quantidade válida",
        variant: "destructive"
      });
      return;
    }
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    // Verificar estoque
    if (produto.estoque !== null && quantidadeProduto > produto.estoque) {
      toast({
        title: "Estoque insuficiente",
        description: `Disponível: ${produto.estoque} unidades`,
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe o item
    const itemExistente = itensVenda.find(i => i.produto_id === produtoSelecionado);
    if (itemExistente) {
      const novaQuantidade = itemExistente.quantidade + quantidadeProduto;
      if (produto.estoque !== null && novaQuantidade > produto.estoque) {
        toast({
          title: "Estoque insuficiente",
          description: `Disponível: ${produto.estoque} unidades`,
          variant: "destructive"
        });
        return;
      }
      setItensVenda(itensVenda.map(i => i.produto_id === produtoSelecionado ? {
        ...i,
        quantidade: novaQuantidade,
        subtotal: novaQuantidade * i.preco_unitario
      } : i));
    } else {
      setItensVenda([...itensVenda, {
        produto_id: produto.id,
        produto_nome: produto.name,
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

  // Remover item da venda
  const handleRemoverItem = (productId: string) => {
    setItensVenda(itensVenda.filter(i => i.produto_id !== productId));
  };

  // Adicionar item à edição
  const handleAdicionarItemEdit = () => {
    if (!editProdutoSelecionado || editQuantidadeProduto <= 0) {
      toast({
        title: "Erro",
        description: "Selecione um produto e quantidade válida",
        variant: "destructive"
      });
      return;
    }
    const produto = produtos.find(p => p.id === editProdutoSelecionado);
    if (!produto) return;
    const itemExistente = editItensVenda.find(i => i.produto_id === editProdutoSelecionado);
    if (itemExistente) {
      setEditItensVenda(editItensVenda.map(i => i.produto_id === editProdutoSelecionado ? {
        ...i,
        quantidade: i.quantidade + editQuantidadeProduto,
        subtotal: (i.quantidade + editQuantidadeProduto) * i.preco_unitario
      } : i));
    } else {
      setEditItensVenda([...editItensVenda, {
        produto_id: produto.id,
        produto_nome: produto.name,
        quantidade: editQuantidadeProduto,
        preco_unitario: Number(produto.preco),
        subtotal: editQuantidadeProduto * Number(produto.preco),
        desconto: 0,
        desconto_tipo: 'percentual',
        observacao: '',
        obs_aberta: false,
        recorrencia_periodos: isServico(produto) && produto.recorrente
          ? PERIODOS_PADRAO[produto.recorrencia_tipo as RecorrenciaTipo] ?? 1
          : null,
      }]);
    }
    setEditProdutoSelecionado('');
    setEditQuantidadeProduto(1);
  };
  const handleRemoverItemEdit = (productId: string) => {
    setEditItensVenda(editItensVenda.filter(i => i.produto_id !== productId));
  };
  const handleSalvar = async () => {
    if (!novaVenda.cliente_nome || itensVenda.length === 0 || !novaVenda.metodo_pagamento || !user) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos um produto",
        variant: "destructive"
      });
      return;
    }

    // Validar se o vendedor selecionado pertence à empresa ativa
    if (novaVenda.vendedor) {
      const vendedorValido = vendedores.some(v => v.name === novaVenda.vendedor);
      if (!vendedorValido) {
        toast({
          title: "Vendedor inválido para a empresa selecionada.",
          description: "Selecione um vendedor vinculado à empresa ativa.",
          variant: "destructive"
        });
        return;
      }
    }

    // Criar descrição dos produtos
    const produtosDescricao = itensVenda.map(i => `${i.quantidade}x ${i.produto_nome}`).join(', ');

    // Inserir venda
    const valorBruto = valorTotalItens;
    const descontoInput = novaVenda.desconto || 0;
    const desconto = descontoTipo === 'percentual' ? (valorBruto * descontoInput / 100) : descontoInput;
    const finalAmount = valorBruto - desconto;

    const {
      data: vendaData,
      error: vendaError
     } = await api.from('sale').insert({
      user_id: user.id,
      company_id: companyId,
      cliente_id: resolveClienteId(clientes as any, { name: novaVenda.cliente_nome, cpf: (novaVenda as any).cliente_cpf, telefone: novaVenda.cliente_telefone }),
      cliente_nome: novaVenda.cliente_nome,
      cliente_telefone: novaVenda.cliente_telefone || null,
      cliente_email: novaVenda.cliente_email || null,
      produtos: produtosDescricao,
      valor: finalAmount,
      valor_bruto: valorBruto,
      desconto: desconto,
      valor_final: finalAmount,
      vendedor_id: vendedores.find(v => v.name === novaVenda.vendedor)?.id || user.id,
      metodo_pagamento: novaVenda.metodo_pagamento,
      parcelas: novaVenda.metodo_pagamento === 'Cartão de Crédito' ? novaVenda.parcelas : 1,
      data_venda: format(soldOn, 'yyyy-MM-dd'),
      observacoes: novaVenda.observacoes || null,
      vendedor: novaVenda.vendedor || null
    } as any).select().single();
    if (vendaError) {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar venda",
        variant: "destructive"
      });
      return;
    }

    // Inserir itens da venda (trigger vai decrementar estoque)
    const itensParaInserir = itensVenda.map(item => ({
      venda_id: vendaData.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal
    }));
    const {
      error: itensError
    } = await api.from('sale_item').insert(itensParaInserir);
    if (itensError) {
      toast({
        title: "Aviso",
        description: "Venda criada, mas houve erro ao vincular itens",
        variant: "destructive"
      });
    }

    // Criar operação automaticamente se etapa selecionada
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
        .from('operation')
        .insert({
          company_id: companyId,
          user_id: user.id,
          venda_id: vendaData.id,
          cliente_nome: novaVenda.cliente_nome,
          cliente_telefone: novaVenda.cliente_telefone || null,
          cliente_email: novaVenda.cliente_email || null,
          produtos: produtosDescricao,
          kind: operacaoTipo,
          status: operacaoStatus,
          status_pagamento: 'pendente',
        } as any)
        .select()
        .single();

      if (!opError && opData) {
        // Create default checklist
        const tarefas = DEFAULT_CHECKLIST.map((titulo, i) => ({
          operacao_id: opData.id,
          titulo,
          ordem: i,
        }));
        await api.from('operation_task').insert(tarefas as any);

        // Add history entry
        await api.from('operation_event').insert({
          operacao_id: opData.id,
          kind: 'status_change',
          descricao: `Operação criada automaticamente a partir da venda`,
          status_novo: operacaoStatus,
          user_id: user.id,
        } as any);
      }
    }

    // Auto-generate Pedido de Entrega for all sales
    if (user) {
      // Find client info from clientes table to get address
      const clienteMatch = clientes.find(c => c.name === novaVenda.cliente_nome);
      let enderecoEntrega: string | null = null;
      let clienteCpf: string | null = null;

      if (clienteMatch) {
        // Fetch full client data with address
        const { data: clienteCompleto } = await api
          .from('customer')
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
        .from('delivery_order')
        .insert({
          venda_id: vendaData.id,
          company_id: companyId,
          user_id: user.id,
          cliente_id: resolveClienteId(clientes as any, { name: novaVenda.cliente_nome, cpf: clienteCpf, telefone: novaVenda.cliente_telefone }),
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
        await api.from('delivery_order_event').insert({
          pedido_id: pedidoData.id,
          user_id: user.id,
          status_novo: 'pendente',
          descricao: 'Pedido de entrega gerado automaticamente a partir da venda',
        } as any);
      }
    }

    setNovaVenda({
      cliente_nome: '',
      cliente_telefone: '',
      cliente_email: '',
      metodo_pagamento: '',
      parcelas: 1,
      observacoes: '',
      vendedor: '',
      desconto: 0
    });
    setDescontoTipo('amount');
    setItensVenda([]);
    setDataVenda(new Date());
    setOperacaoStatus('');
    setOperacaoTipo('entrega');
    setDialogOpen(false);
    fetchVendas();
    fetchProdutos();
    fetchVendasComOperacao();
    fetchVendasComPedido();
    toast({
      title: "Sucesso!",
      description: "Venda cadastrada e pedido de entrega gerado!"
    });

    // Impressão automática — não bloqueia a finalização da venda
    if (impressoraConfig.imprimirAposVenda && !impressoraConfig.imprimirAposNFCe) {
      const dadosEmpresa = { name: empresaAtiva?.name ?? 'Empresa' };
      const dadosVenda = {
        numero: vendaData?.id?.slice(-8).toUpperCase() ?? '',
        data: format(soldOn, 'dd/MM/yyyy'),
        itens: itensVenda,
        subtotal: valorTotalItens,
        desconto: novaVenda.desconto || 0,
        total: valorTotalItens - (novaVenda.desconto || 0),
        formaPagamento: novaVenda.metodo_pagamento,
        operador: novaVenda.vendedor || undefined,
      };
      imprimirCupomSimples(dadosEmpresa, dadosVenda).catch(() => {
        toast({ title: 'Impressão falhou', description: 'Verifique a configuração da impressora.', variant: 'destructive' });
      });
    }
    if (impressoraConfig.abrirGavetaAposVenda) {
      abrirGaveta().catch(() => {});
    }
  };
  const handleEdit = async (venda: Venda) => {
    // Permission check
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Somente administradores podem editar vendas após o registro.",
        variant: "destructive"
      });
      return;
    }

    // Month closed check
    if (isMesFechado(venda.data_venda)) {
      toast({
        title: "Período fechado",
        description: "Este período já foi fechado. Reabra o mês para realizar alterações.",
        variant: "destructive"
      });
      return;
    }
    setEditingVenda(venda);
    setEditDescontoTipo('amount');
    const [y, m, d] = venda.data_venda.split('-').map(Number);
    setEditDataVenda(new Date(y, m - 1, d));

    // Carregar itens da venda (com fallback se colunas novas não existirem)
    let rawItens: any[] = [];
    const itensRes = await api
      .from('sale_item')
      .select('product_id, variant_id, quantity, unit_price, subtotal, discount, discount_kind, note, recurrence_periods')
      .eq('sale_id', venda.id);
    if (itensRes.error && (itensRes.error.code === '42703' || itensRes.error.message?.includes('column'))) {
      const fallback = await api
        .from('sale_item')
        .select('produto_id, quantidade, preco_unitario, subtotal')
        .eq('sale_id', venda.id);
      rawItens = fallback.data || [];
    } else {
      rawItens = itensRes.data || [];
    }

    // Desconto por item já salvo no banco (soma dos valores em R$)
    const loadedItemsDiscount = rawItens.reduce((sum: number, item: any) =>
      sum + (item.desconto != null ? Number(item.desconto) : 0), 0);
    // Desconto geral = total da venda menos o que já está nos itens
    const generalDesconto = Math.max(0, Number(venda.desconto || 0) - loadedItemsDiscount);

    setEditVenda({
      cliente_nome: venda.cliente_nome,
      cliente_telefone: venda.cliente_telefone || '',
      cliente_email: venda.cliente_email || '',
      metodo_pagamento: venda.metodo_pagamento,
      parcelas: venda.parcelas || 1,
      observacoes: venda.observacoes || '',
      vendedor: venda.vendedor || '',
      desconto: generalDesconto,
    });

    if (rawItens.length > 0) {
      const itensComNomes = rawItens.map((item: any) => {
        const produto = produtos.find(p => p.id === item.produto_id);
        return {
          produto_id: item.produto_id,
          variacao_id: item.variacao_id ?? null,
          produto_nome: produto?.name || 'Produto não encontrado',
          quantidade: item.quantidade,
          preco_unitario: Number(item.preco_unitario),
          subtotal: Number(item.subtotal),
          desconto: item.desconto != null ? Number(item.desconto) : 0,
          desconto_tipo: (item.desconto_tipo as 'percentual' | 'amount') || 'percentual',
          observacao: item.observacao || '',
          obs_aberta: false,
          recorrencia_periodos: item.recorrencia_periodos != null ? Number(item.recorrencia_periodos) : null,
        };
      });
      setEditItensVenda(itensComNomes);
    } else {
      setEditItensVenda([]);
    }
    setEditDialogOpen(true);
  };
  const handleSalvarEdicao = async () => {
    if (!editingVenda || !editVenda.cliente_nome || !editVenda.metodo_pagamento || !editDataVenda || !user) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    const produtosDescricao = editItensVenda.length > 0 ? editItensVenda.map(i => `${i.quantidade}x ${i.produto_nome}`).join(', ') : editingVenda.produtos;
    // valor_bruto = gross (before any discount); editValorTotalItens = after per-item discounts
    const editValorBruto = editItensVenda.length > 0 ? editSubtotalBruto : Number(editingVenda.valor);
    const editDescontoInput = editVenda.desconto || 0;
    const editDescontoGeral = editDescontoTipo === 'percentual' ? (editValorTotalItens * editDescontoInput / 100) : editDescontoInput;
    const editDesconto = (editItensVenda.length > 0 ? editDescontoItensTotal : 0) + editDescontoGeral;
    const editValorFinalCalc = editValorBruto - editDesconto;

    // Log changes
    const changes: { campo: string; anterior: string; novo: string }[] = [];
    if (editVenda.cliente_nome !== editingVenda.cliente_nome) changes.push({ campo: 'customer_name', anterior: editingVenda.cliente_nome, novo: editVenda.cliente_nome });
    if (editVenda.metodo_pagamento !== editingVenda.metodo_pagamento) changes.push({ campo: 'payment_method', anterior: editingVenda.metodo_pagamento, novo: editVenda.metodo_pagamento });
    if (format(editDataVenda, 'yyyy-MM-dd') !== editingVenda.data_venda) changes.push({ campo: 'sold_on', anterior: editingVenda.data_venda, novo: format(editDataVenda, 'yyyy-MM-dd') });
    if (editVenda.vendedor !== (editingVenda.vendedor || '')) changes.push({ campo: 'seller', anterior: editingVenda.vendedor || '', novo: editVenda.vendedor });
    const newValStr = editValorFinalCalc.toFixed(2);
    const oldValStr = Number(editingVenda.valor).toFixed(2);
    if (newValStr !== oldValStr) changes.push({ campo: 'amount', anterior: oldValStr, novo: newValStr });
    if (editVenda.observacoes !== (editingVenda.observacoes || '')) changes.push({ campo: 'notes', anterior: editingVenda.observacoes || '', novo: editVenda.observacoes });

    const { error } = await api.from('sale').update({
      cliente_id: resolveClienteId(clientes as any, { name: editVenda.cliente_nome, cpf: (editVenda as any).cliente_cpf, telefone: editVenda.cliente_telefone }),
      cliente_nome: editVenda.cliente_nome,
      cliente_telefone: editVenda.cliente_telefone || null,
      cliente_email: editVenda.cliente_email || null,
      produtos: produtosDescricao,
      valor: editValorFinalCalc,
      valor_bruto: editValorBruto,
      desconto: editDesconto,
      valor_final: editValorFinalCalc,
      metodo_pagamento: editVenda.metodo_pagamento,
      parcelas: editVenda.metodo_pagamento === 'Cartão de Crédito' ? editVenda.parcelas : 1,
      data_venda: format(editDataVenda, 'yyyy-MM-dd'),
      observacoes: editVenda.observacoes || null,
      vendedor: editVenda.vendedor || null,
      vendedor_id: vendedores.find(v => v.name === editVenda.vendedor)?.id || editingVenda.vendedor_id || null
    } as any).eq('id', editingVenda.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar venda",
        variant: "destructive"
      });
      return;
    }

    // Atualizar itens da venda: SEMPRE deletar os antigos e reinserir os novos
    // Isso garante que itens removidos pelo usuário saiam do pedido de entrega também
    const { error: deleteError } = await api
      .from('sale_item')
      .delete()
      .eq('sale_id', editingVenda.id);

    if (deleteError) {
      console.error('Erro ao deletar itens antigos:', deleteError);
      toast({
        title: "Aviso",
        description: "Venda atualizada, mas houve erro ao sincronizar os itens",
        variant: "destructive"
      });
    } else if (editItensVenda.length > 0) {
      const itensParaInserir = editItensVenda.map(item => {
        const discValor = item.desconto_tipo === 'percentual'
          ? item.subtotal * (Math.min(item.desconto, 100) / 100)
          : Math.min(item.desconto, item.subtotal);
        return {
          venda_id: editingVenda.id,
          produto_id: item.produto_id,
          variacao_id: item.variacao_id ?? null,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: Math.max(0, item.subtotal - discValor),
          desconto: item.desconto > 0 ? discValor : 0,
          desconto_tipo: item.desconto > 0 ? item.desconto_tipo : null,
          observacao: item.observacao || null,
          recorrencia_periodos: item.recorrencia_periodos ?? null,
        };
      });
      let { error: insertError } = await api
        .from('sale_item')
        .insert(itensParaInserir);
      // Fallback se colunas novas não existirem
      if (insertError && (insertError.code === '42703' || insertError.message?.includes('column'))) {
        const fallback = editItensVenda.map(item => ({
          venda_id: editingVenda.id,
          produto_id: item.produto_id,
          variacao_id: item.variacao_id ?? null,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          recorrencia_periodos: item.recorrencia_periodos ?? null,
        }));
        ({ error: insertError } = await api.from('sale_item').insert(fallback));
      }

      if (insertError) {
        console.error('Erro ao reinserir itens:', insertError);
        toast({
          title: "Aviso",
          description: "Venda atualizada, mas houve erro ao reinserir os itens",
          variant: "destructive"
        });
      }
    }

    // Save change log
    if (changes.length > 0) {
      const logEntries = changes.map(c => ({
        venda_id: editingVenda.id,
        user_id: user.id,
        campo_alterado: c.campo,
        valor_anterior: c.anterior,
        valor_novo: c.novo,
      }));
      await api.from('sale_change').insert(logEntries as any);
    }

    // Sincronizar o Pedido de Entrega com as alterações da venda
    const { data: pedidoExistente } = await api
      .from('delivery_order')
      .select('id')
      .eq('sale_id', editingVenda.id)
      .limit(1)
      .single();

    if (pedidoExistente) {
      // Sempre atualiza os dados do cliente e pagamento no pedido de entrega
      await api
        .from('delivery_order')
        .update({
          cliente_id: resolveClienteId(clientes as any, { name: editVenda.cliente_nome, cpf: (editVenda as any).cliente_cpf, telefone: editVenda.cliente_telefone }),
          cliente_nome: editVenda.cliente_nome,
          cliente_telefone: editVenda.cliente_telefone || null,
          cliente_email: editVenda.cliente_email || null,
          forma_pagamento: editVenda.metodo_pagamento,
          observacoes: editVenda.observacoes || null,
        } as any)
        .eq('id', pedidoExistente.id);
    }

    setEditDialogOpen(false);
    setEditingVenda(null);
    setEditItensVenda([]);
    fetchVendas();
    fetchProdutos(); // Atualizar estoque na tela
    toast({
      title: "Sucesso!",
      description: "Venda atualizada com sucesso"
    });
  };
  const handleDelete = async (id: string, soldOn: string) => {
    if (!isAdmin) {
      toast({ title: "Acesso negado", description: "Somente administradores podem excluir vendas.", variant: "destructive" });
      return;
    }
    if (isMesFechado(soldOn)) {
      toast({ title: "Período fechado", description: "Este período já foi fechado. Reabra o mês para realizar alterações.", variant: "destructive" });
      return;
    }
    try {
      // 1. Deletar histórico de operações vinculadas
      const { data: operacoesVinculadas } = await api
        .from('operation')
        .select('id')
        .eq('sale_id', id)
        .eq('company_id', companyId);

      if (operacoesVinculadas && operacoesVinculadas.length > 0) {
        const operacaoIds = operacoesVinculadas.map(o => o.id);
        await api.from('operation_event').delete().in('operation_id', operacaoIds);
        await api.from('operation_task').delete().in('operation_id', operacaoIds);
      }

      // 2. Deletar operações vinculadas
      await api.from('operation').delete().eq('sale_id', id);

      // 3. Deletar histórico de pedidos de entrega vinculados
      const { data: pedidosVinculados } = await api
        .from('delivery_order')
        .select('id')
        .eq('sale_id', id)
        .eq('company_id', companyId);

      if (pedidosVinculados && pedidosVinculados.length > 0) {
        const pedidoIds = pedidosVinculados.map(p => p.id);
        await api.from('delivery_order_event').delete().in('purchase_order_id', pedidoIds);
      }

      // 4. Deletar pedidos de entrega vinculados
      await api.from('delivery_order').delete().eq('sale_id', id);

      // 5. Deletar comissões vinculadas
      await api.from('commission').delete().eq('sale_id', id);

      // 6. Deletar alterações de venda
      await api.from('sale_change').delete().eq('sale_id', id);

      // 7. Deletar notas fiscais vinculadas
      await api.from('fiscal_document').delete().eq('sale_id', id);

      // 8. Deletar contas a receber geradas pela venda
      await api.from('receivable').delete().eq('sale_id', id);

      // 9. Deletar itens da venda (trigger restaura estoque)
      await api.from('sale_item').delete().eq('sale_id', id);

      // 10. Finalmente, deletar a venda
      const { error } = await api.from('sale').delete().eq('id', id);
      if (error) throw error;

      fetchVendas();
      fetchProdutos();
      toast({
        title: "Sucesso!",
        description: "Venda excluída com sucesso"
      });
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
      toast({
        title: "Erro",
        description: "Erro ao excluir venda. Verifique se não há registros vinculados.",
        variant: "destructive"
      });
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Confirmação para ações destrutivas/determinísticas na lista de vendas
  const openConfirmNfce = (venda: Venda) => {
    setConfirmVenda(venda);
    setConfirmAction('nfc');
    setConfirmDialogOpen(true);
  };

  const openConfirmOperacao = (venda: Venda) => {
    setConfirmVenda(venda);
    setConfirmAction('operacao');
    setConfirmDialogOpen(true);
  };

  const openConfirmExcluir = (venda: Venda) => {
    setConfirmVenda(venda);
    setConfirmAction('excluir');
    setConfirmDialogOpen(true);
  };

  const closeConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setConfirmAction(null);
    setConfirmVenda(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmVenda || !confirmAction) return;
    const venda = confirmVenda;
    closeConfirmDialog();
    if (confirmAction === 'nfc') {
      await handleEmitirNfce(venda);
    } else if (confirmAction === 'operacao') {
      setVendaParaOperacao(venda);
      setOperacaoManualStatus('');
      setOperacaoManualTipo('entrega');
      setOperacaoManualDialogOpen(true);
    } else if (confirmAction === 'excluir') {
      await handleDelete(venda.id, venda.data_venda);
    }
  };

  // Emitir NFC-e
  const handleEmitirNfce = async (venda: Venda) => {
    if (!user) return;
    
    setEmitindoNfce(venda.id);
    
    try {
      // Buscar configuração fiscal da empresa
      const { data: empresaFiscal, error: empresaError } = await api
        .from('company_fiscal_profile')
        .select('*')
        .single();

      if (empresaError || !empresaFiscal) {
        throw new Error('Configure os dados fiscais da empresa antes de emitir NFC-e');
      }

      // Buscar itens da venda com dados dos produtos
      const { data: itensData, error: itensError } = await api
        .from('sale_item')
        .select('produto_id, quantidade, preco_unitario, subtotal, desconto, desconto_tipo, observacao')
        .eq('sale_id', venda.id);
      
      if (itensError || !itensData || itensData.length === 0) {
        throw new Error('Não foi possível carregar os itens da venda');
      }

      // Buscar dados completos dos produtos
      const produtoIds = itensData.map(item => item.produto_id);
      const { data: produtosData, error: produtosError } = await api
        .from('product')
        .select('id, name, code, ncm, cfop, origem, commercial_unit, price, kind')
        .in('id', produtoIds);

      // NFC-e só cobre mercadorias: serviços (que exigiriam NFS-e) ficam fora da nota.
      if (produtosData && (produtosData as any[]).every((p: any) => isServico(p))) {
        throw new Error('Esta venda só tem serviços. A NFC-e cobre apenas produtos; serviços exigem NFS-e, que ainda não é emitida pelo sistema.');
      }

      if (produtosError || !produtosData) {
        throw new Error('Não foi possível carregar os dados dos produtos');
      }

      // Montar itens com dados fiscais, distribuindo o desconto geral da venda
      // proporcionalmente entre os itens (além do desconto próprio de cada item),
      // para que a soma dos valor_final_item bata exatamente com venda.valor_final
      // e a Becoming não precise "fechar a conta" com um pagamento extra.

      // 1. Subtotal bruto de cada item
      const itensComSubtotal = itensData.map(item => ({
        ...item,
        subtotalBruto: item.quantidade * Number(item.preco_unitario)
      }));

      // 2. Desconto próprio de cada item (em R$)
      const itensComDescItem = itensComSubtotal.map(item => {
        let descItem = 0;
        if (item.desconto && item.desconto > 0) {
          descItem = item.desconto_tipo === 'percentual'
            ? item.subtotalBruto * (item.desconto / 100)
            : Math.min(item.desconto, item.subtotalBruto);
        }
        return {
          ...item,
          descItemReais: descItem,
          subtotalAposItem: item.subtotalBruto - descItem
        };
      });

      // 3. Base para distribuir o desconto geral: soma dos subtotais já com desconto de item
      const baseDescGeral = itensComDescItem.reduce((acc, i) => acc + i.subtotalAposItem, 0);

      // 4. Valor do desconto geral em R$
      let descGeralReais = 0;
      if (venda.desconto_geral && venda.desconto_geral > 0) {
        descGeralReais = venda.desconto_geral_tipo === 'percentual'
          ? baseDescGeral * (venda.desconto_geral / 100)
          : Math.min(venda.desconto_geral, baseDescGeral);
      }

      // 5. Distribui o desconto geral proporcionalmente e monta o item final para a NFC-e
      let somaFinalConferencia = 0;

      const itens = itensComDescItem.map(item => {
        const produto = produtosData.find(p => p.id === item.produto_id);
        if (!produto) {
          throw new Error(`Produto não encontrado: ${item.produto_id}`);
        }
        if (!produto.ncm && !isServico(produto)) {
          throw new Error(`Produto "${produto.name}" não possui NCM cadastrado`);
        }

        const peso = baseDescGeral > 0 ? item.subtotalAposItem / baseDescGeral : 0;
        const fatiaDescGeral = descGeralReais * peso;

        let descTotalItem = item.descItemReais + fatiaDescGeral;
        let valorFinalItem = item.subtotalBruto - descTotalItem;

        valorFinalItem = Math.round(valorFinalItem * 100) / 100;
        descTotalItem = Math.round(descTotalItem * 100) / 100;

        somaFinalConferencia += valorFinalItem;

        const percentualDesc = item.subtotalBruto > 0
          ? (descTotalItem / item.subtotalBruto) * 100
          : 0;

        return {
          servico: isServico(produto),
          id: produto.id,
          produto_id: produto.id,
          code: produto.code || produto.id.substring(0, 8),
          name: produto.name,
          descricao: produto.name,
          ncm: produto.ncm,
          cfop: produto.cfop || '5102',
          unidade_comercial: produto.unidade_comercial || 'UN',
          quantidade: item.quantidade,
          preco_unitario: Number(item.preco_unitario),
          valor_unitario: Number(item.preco_unitario),
          subtotal: Number(item.subtotal),
          valor_total: Number(item.subtotal),
          origem: produto.origem || '0',
          desconto_percentual: Math.round(percentualDesc * 100) / 100,
          valor_final_item: valorFinalItem,
          observacao: item.observacao || null
        };
      });

      // 6. Ajuste de arredondamento: joga a diferença de centavos no último item,
      // garantindo que a soma dos valor_final_item bata exatamente com valor_final da venda.
      const valorFinalVenda = Math.round((venda.valor_final || venda.valor) * 100) / 100;
      const diferenca = Math.round((valorFinalVenda - somaFinalConferencia) * 100) / 100;

      if (Math.abs(diferenca) >= 0.01 && itens.length > 0) {
        const ultimo = itens[itens.length - 1];
        ultimo.valor_final_item = Math.round((ultimo.valor_final_item + diferenca) * 100) / 100;
        const subtotalUltimo = ultimo.quantidade * ultimo.preco_unitario;
        ultimo.desconto_percentual = subtotalUltimo > 0
          ? Math.round(((subtotalUltimo - ultimo.valor_final_item) / subtotalUltimo) * 10000) / 100
          : 0;
      }

      console.log('Conferência NFC-e:', {
        valorFinalVenda,
        somaItens: somaFinalConferencia,
        diferencaAjustada: diferenca,
        itens: itens.map(i => ({
          name: i.name,
          bruto: i.quantidade * i.preco_unitario,
          final: i.valor_final_item,
          descPct: i.desconto_percentual
        }))
      });

      // Buscar dados do cliente se não for consumidor final
      let cliente = null;
      if (venda.cliente_nome !== 'Consumidor') {
        const { data: clienteData } = await api
          .from('customer')
          .select('id, name, cpf, telefone, email, cep, endereco, bairro, complemento')
          .eq('name', venda.cliente_nome)
          .maybeSingle();

        if (clienteData) {
          cliente = {
            id: clienteData.id,
            name: clienteData.name,
            cpf: clienteData.cpf,
            cep: clienteData.cep,
            endereco: clienteData.endereco,
            bairro: clienteData.bairro,
            complemento: clienteData.complemento,
          };
        }
      }

      // Descontos e arredondamento foram distribuídos sobre todos os itens; agora
      // os serviços saem e o total da nota passa a ser só o dos produtos.
      const temServico = itens.some(i => i.servico);
      const itensNota = itens.filter(i => !i.servico).map(({ servico: _servico, ...item }) => item);
      const r2 = (v: number) => Math.round(v * 100) / 100;
      const totalNota = r2(itensNota.reduce((acc, i) => acc + i.valor_final_item, 0));
      const brutoNota = r2(itensNota.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0));
      const baseProdutos = itensComDescItem
        .filter(item => !isServico((produtosData as any[]).find((p: any) => p.id === item.produto_id)))
        .reduce((acc, i) => acc + i.subtotalAposItem, 0);
      const descGeralProdutos = baseDescGeral > 0 ? r2(descGeralReais * (baseProdutos / baseDescGeral)) : 0;

      const payloadEmissao = {
        empresaFiscal,
        venda: {
          id: venda.id,
          user_id: venda.user_id,
          cliente_nome: venda.cliente_nome,
          valor: temServico ? totalNota : Number(venda.valor),
          valor_bruto: temServico ? brutoNota : Number(venda.valor_bruto || venda.valor),
          valor_final: temServico ? totalNota : Number(venda.valor_final || venda.valor),
          metodo_pagamento: venda.metodo_pagamento,
          observacoes: venda.observacoes,
          // Venda mista: só a fatia do desconto geral que coube aos produtos, em R$.
          desconto_geral: temServico ? descGeralProdutos : (venda.desconto_geral || 0),
          desconto_geral_tipo: temServico ? 'valor' : (venda.desconto_geral_tipo || 'percentual'),
        },
        itens: itensNota,
        cliente,
      };

      console.log('Payload enviado à becoming-nfce:', JSON.stringify(payloadEmissao, null, 2));

      // Chamar Edge Function para emitir NFC-e
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: {
          action: 'emitir',
          data: payloadEmissao
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao emitir NFC-e');
      }

      if (data.error) {
        throw new Error(data.error || 'Erro ao emitir NFC-e');
      }

      toast({
        title: "NFC-e Emitida!",
        description: `Nota fiscal ${data.numero} emitida com sucesso via Becoming`
      });

      // Impressão automática DANFE — não bloqueia a emissão
      if (impressoraConfig.imprimirAposNFCe) {
        const dadosEmpresa = { name: empresaAtiva?.name ?? 'Empresa' };
        const itensImpressao = itensData.map(item => {
          const prod = produtosData.find(p => p.id === item.produto_id);
          return {
            produto_nome: prod?.name ?? 'Produto',
            quantidade: item.quantidade,
            preco_unitario: Number(item.preco_unitario),
            subtotal: Number(item.subtotal),
          };
        });
        const dadosVendaImpressao = {
          numero: venda.id.slice(-8).toUpperCase(),
          data: format(new Date(venda.data_venda), 'dd/MM/yyyy'),
          itens: itensImpressao,
          subtotal: Number(venda.valor_bruto ?? venda.valor),
          desconto: Number(venda.desconto ?? 0),
          total: Number(venda.valor_final ?? venda.valor),
          formaPagamento: venda.metodo_pagamento,
          operador: venda.vendedor || undefined,
        };
        const dadosNFCe = {
          numero: data.numero ?? '',
          serie: data.serie ?? '001',
          chaveAcesso: data.chave_acesso ?? data.chaveAcesso ?? '',
          dataEmissao: format(new Date(), 'dd/MM/yyyy HH:mm'),
          urlConsulta: data.url_consulta ?? data.urlConsulta,
          qrCode: data.qr_code ?? data.qrCode,
        };
        imprimirDANFE(dadosEmpresa, dadosVendaImpressao, dadosNFCe).catch(() => {
          toast({ title: 'Impressão DANFE falhou', description: 'Verifique a configuração da impressora.', variant: 'destructive' });
        });
      }
      if (impressoraConfig.abrirGavetaAposVenda) {
        abrirGaveta().catch(() => {});
      }

      // Atualizar lista de notas fiscais
      fetchNotasFiscais();

    } catch (error: any) {
      console.error('Erro ao emitir NFC-e:', error);
      toast({
        title: "Erro ao emitir NFC-e",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setEmitindoNfce(null);
    }
  };

  // Transmitir NFC-e pendente (específico para Becoming)
  const handleTransmitirNfce = async (saleId: string) => {
    // Busca a nota fresca direto do banco em vez de confiar no Map em cache
    // (mesma correção aplicada em handleCancelarNfce).
    const { data: notaAtual, error: notaErr } = await api
      .from('fiscal_document')
      .select('nuvem_fiscal_id')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Transmitir - nota do banco:', JSON.stringify(notaAtual), 'erro:', notaErr);

    if (!notaAtual?.nuvem_fiscal_id) {
      toast({
        title: "Erro",
        description: "ID da nota fiscal não encontrado.",
        variant: "destructive",
      });
      return;
    }

    // Extrair o id_nfce do nuvem_fiscal_id (formato: becoming_123)
    const match = notaAtual.nuvem_fiscal_id.match(/becoming_(\d+)/);
    if (!match) {
      toast({
        title: "Erro",
        description: "Esta nota não é do provedor Becoming.",
        variant: "destructive",
      });
      return;
    }

    const idNfce = parseInt(match[1]);
    setTransmitindoNfce(saleId);

    try {
      const { data, error } = await api.functions.invoke('becoming-nfce', {
        body: {
          action: 'transmitir',
          data: { id_nfce: idNfce, venda_id: saleId }
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: data.status === 'autorizada' ? "NFC-e Autorizada!" : "Transmissão enviada",
        description: data.message || `Status: ${data.status}`,
        variant: data.status === 'autorizada' ? 'default' : 'destructive',
      });

      // Atualizar lista de notas fiscais
      fetchNotasFiscais();
    } catch (error: any) {
      console.error('Erro ao transmitir NFC-e:', error);
      toast({
        title: "Erro ao transmitir NFC-e",
        description: error.message || 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setTransmitindoNfce(null);
    }
  };

  const filteredVendas = vendas.filter(venda => {
    const matchSearch = venda.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || venda.produtos.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMetodo = filterMetodo === 'todos' || venda.metodo_pagamento === filterMetodo;
    let matchDateRange = true;
    if (dateRange.from && dateRange.to) {
      const soldOn = new Date(venda.data_venda + 'T00:00:00');
      matchDateRange = isWithinInterval(soldOn, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    } else if (dateRange.from) {
      const soldOn = new Date(venda.data_venda + 'T00:00:00');
      matchDateRange = soldOn >= startOfDay(dateRange.from);
    }
    return matchSearch && matchMetodo && matchDateRange;
  });
  const totalVendas = filteredVendas.reduce((sum, v) => sum + Number(v.valor), 0);

  // Dados para gráfico por método de pagamento
  const dadosPorMetodo = useMemo(() => {
    const metodos: Record<string, number> = {};
    vendas.forEach(venda => {
      metodos[venda.metodo_pagamento] = (metodos[venda.metodo_pagamento] || 0) + Number(venda.valor);
    });
    return Object.entries(metodos).map(([name, value]) => ({
      name,
      value,
      color: getMetodoColor(name)
    })).sort((a, b) => b.value - a.value);
  }, [vendas]);
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  return (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
    position: 'relative',
  }}>
    {/* Orb roxo */}
    <div style={{
      position: 'fixed', top: '-200px', left: '-200px',
      width: '600px', height: '600px', borderRadius: '50%',
      background: '#8E5FCF', opacity: 0.06,
      filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
    }} />
    {/* Orb amarelo */}
    <div style={{
      position: 'fixed', bottom: '-150px', right: '-150px',
      width: '400px', height: '400px', borderRadius: '50%',
      background: '#FAF66B', opacity: 0.04,
      filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
    }} />
      <div className="p-8 space-y-6" style={{ position: 'relative', zIndex: 1 }}>
        {/* Oasis Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginBottom: '6px' }}>
              Oasis › Vendas
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.2,
            }}>
              Vendas
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: '4px' }}>
              Histórico e gestão de vendas
            </p>
          </div>
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setDialogOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                color: 'white', borderRadius: '12px',
                padding: '10px 20px', border: 'none',
                fontFamily: 'Gilroy', fontWeight: 600,
                boxShadow: '0 4px 15px rgba(142,95,207,0.35)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'transform 0.2s ease', fontSize: '0.875rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Plus className="h-4 w-4" />
              Nova Venda
            </button>
            <NovaVendaDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onVendaSalva={() => {
                fetchVendas();
                fetchProdutos();
                fetchVendasComOperacao();
                fetchVendasComPedido();
              }}
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(142,95,207,0.12)',
          borderRadius: '16px',
          padding: '16px 20px',
        }}>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
              <input
                placeholder="Buscar por cliente ou produto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(142,95,207,0.2)',
                  borderRadius: '12px',
                  padding: '10px 14px 10px 38px',
                  fontFamily: 'Gilroy',
                  fontSize: '0.875rem',
                  outline: 'none',
                  color: '#1F2937',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8E5FCF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(142,95,207,0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <Select value={filterMetodo} onValueChange={setFilterMetodo}>
              <SelectTrigger className="w-[180px]">
                <CreditCard className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Pagamento</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange.from ? dateRange.to ? <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </> : format(dateRange.from, "dd/MM/yyyy") : <span className="text-muted-foreground">Selecione o período</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DateRangeShortcuts onSelect={(range) => {
                  setDateRange(range);
                  setDateRangeOpen(false);
                }} />
                <Calendar
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange({ from: range?.from, to: range?.to });
                    if (range?.from && range?.to) setDateRangeOpen(false);
                  }}
                  locale={ptBR}
                  className="pointer-events-auto"
                  numberOfMonths={2}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => {
                      setDateRange({ from: undefined, to: undefined });
                      setDateRangeOpen(false);
                    }}>
                      Limpar filtro
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Cards KPI */}
        <motion.div
          className="grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[
            {
              label: 'Total de Vendas',
              value: formatCurrency(totalVendas),
              sub: 'no período selecionado',
              accentGradient: 'linear-gradient(90deg, #8E5FCF, #B987FF)',
              valueColor: '#8E5FCF',
            },
            {
              label: 'Quantidade',
              value: `${filteredVendas.length} vendas`,
              sub: 'registradas',
              accentGradient: 'linear-gradient(90deg, #3B82F6, #93C5FD)',
              valueColor: '#3B82F6',
            },
            {
              label: 'Ticket Médio',
              value: filteredVendas.length > 0 ? formatCurrency(totalVendas / filteredVendas.length) : formatCurrency(0),
              sub: 'por venda',
              accentGradient: 'linear-gradient(90deg, #10B981, #6EE7B7)',
              valueColor: '#10B981',
            },
          ].map((card, idx) => (
            <motion.div key={idx} variants={staggerItem}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(142,95,207,0.12)',
                  borderRadius: '20px',
                  boxShadow: hoveredKpi === idx
                    ? '0 16px 48px rgba(71,17,143,0.14)'
                    : '0 8px 32px rgba(71,17,143,0.08)',
                  padding: '24px',
                  transform: hoveredKpi === idx ? 'translateY(-4px)' : 'translateY(0)',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={() => setHoveredKpi(idx)}
                onMouseLeave={() => setHoveredKpi(null)}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: card.accentGradient, borderRadius: '20px 20px 0 0' }} />
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy', marginTop: '8px', lineHeight: 1.2 }}>
                  {card.value}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginTop: '6px' }}>
                  {card.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>


        {/* Lista de Vendas */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(142,95,207,0.12)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(142,95,207,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937' }}>
              Vendas
            </h2>
            <span style={{
              background: 'rgba(142,95,207,0.08)',
              border: '1px solid rgba(142,95,207,0.2)',
              color: '#8E5FCF',
              borderRadius: '20px', padding: '4px 12px',
              fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem',
            }}>
              {filteredVendas.length} vendas
            </span>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {loading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : <div className="space-y-2">
                {filteredVendas.map(venda => {
                  const isExpanded = expandedVendaId === venda.id;
                  return (
                    <div key={venda.id} id={`venda-row-${venda.id}`} style={{
                      borderRadius: '12px',
                      border: isExpanded ? '1px solid rgba(142,95,207,0.25)' : '1px solid rgba(142,95,207,0.08)',
                      background: isExpanded ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s ease',
                    }}>
                      <div 
                        className="group flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => setExpandedVendaId(isExpanded ? null : venda.id)}
                      >
                        <div className="flex items-center gap-4">
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0", isExpanded && "rotate-180")} />
                          <div>
                            <p className="font-medium">{venda.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(venda.data_venda + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                              {venda.cliente_telefone && <span className="ml-2">• {venda.cliente_telefone}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {venda.vendedor && <Badge variant="outline" style={{
                            backgroundColor: `${vendedorColors[venda.vendedor] || '#6b7280'}20`,
                            borderColor: vendedorColors[venda.vendedor] || '#6b7280',
                            color: vendedorColors[venda.vendedor] || '#6b7280'
                          }}>
                            {venda.vendedor}
                          </Badge>}
                          <Badge variant="outline" style={{
                            backgroundColor: `${getMetodoColor(venda.metodo_pagamento)}20`,
                            borderColor: getMetodoColor(venda.metodo_pagamento),
                            color: getMetodoColor(venda.metodo_pagamento)
                          }} className="flex items-center gap-1">
                            {getMetodoIcon(venda.metodo_pagamento)}
                            {venda.metodo_pagamento}
                            {venda.bandeira && <span>· {venda.bandeira}</span>}
                            {venda.metodo_pagamento === 'Cartão de Crédito' && venda.parcelas && venda.parcelas > 1 && <span className="ml-1">({venda.parcelas}x)</span>}
                          </Badge>
                          {/* Desconto badge */}
                          {venda.desconto != null && Number(venda.desconto) > 0 && (
                            <Badge variant="outline" style={{
                              backgroundColor: 'rgba(16,185,129,0.1)',
                              borderColor: 'rgba(16,185,129,0.3)',
                              color: '#10B981',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontFamily: 'Gilroy',
                              fontWeight: 700,
                            }}>
                              -{(() => {
                                const d = Number(venda.desconto);
                                const vf = Number(venda.valor_final ?? venda.valor);
                                const base = vf + d;
                                if (base > 0) {
                                  const pct = (d / base) * 100;
                                  return pct % 1 === 0 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
                                }
                                return formatCurrency(d);
                              })()}
                            </Badge>
                          )}
                          {/* Indicador NFC-e */}
                          {vendasComNfce.has(venda.id) && (() => {
                            const nfce = vendasComNfce.get(venda.id)!;
                            const isAutorizada = nfce.status === 'autorizada';
                            const isCancelada = nfce.status === 'cancelada';
                            const isRejeitada = nfce.status === 'rejeitada';
                            return (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "flex items-center gap-1",
                                  isAutorizada && "bg-emerald-500/20 border-emerald-500 text-emerald-600",
                                  isCancelada && "bg-destructive/20 border-destructive text-destructive",
                                  isRejeitada && "bg-amber-500/20 border-amber-500 text-amber-600"
                                )}
                              >
                                {isAutorizada && <CheckCircle className="h-3 w-3" />}
                                {isCancelada && <XCircle className="h-3 w-3" />}
                                {isRejeitada && <AlertCircle className="h-3 w-3" />}
                                NFC-e {nfce.numero ? `#${nfce.numero}` : nfce.status}
                              </Badge>
                            );
                          })()}
                          {vendasComOperacao.has(venda.id) && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-primary/10 border-primary/30 text-primary cursor-pointer hover:bg-primary/20 transition-colors flex items-center gap-1"
                              onClick={() => navigate('/operacoes')}
                              title="Ver operação vinculada"
                            >
                              <ClipboardList className="h-3 w-3" />
                              Operação
                            </Badge>
                          )}
                          {vendasComPedido.has(venda.id) && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-orange-500/10 border-orange-500/30 text-orange-600 cursor-pointer hover:bg-orange-500/20 transition-colors flex items-center gap-1"
                              onClick={() => {
                                setVendaParaPedido(venda.id);
                                setPedidoDialogOpen(true);
                              }}
                              title="Ver pedido de entrega"
                            >
                              <Truck className="h-3 w-3" />
                              Pedido
                            </Badge>
                          )}
                          <div className="text-right min-w-[100px]">
                            {(() => {
                              const temDesc = venda.desconto != null && Number(venda.desconto) > 0;
                              const finalAmount = Number(venda.valor_final ?? venda.valor);
                              const valorOriginal = temDesc ? finalAmount + Number(venda.desconto) : null;
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', flexWrap: 'wrap' }}>
                                  {temDesc && (
                                    <span style={{ fontSize: '0.76rem', color: '#9CA3AF', textDecoration: 'line-through', fontFamily: 'Gilroy' }}>
                                      {formatCurrency(valorOriginal!)}
                                    </span>
                                  )}
                                  <span className="font-bold text-foreground">
                                    {formatCurrency(finalAmount)}
                                  </span>
                                </div>
                              );
                            })()}
                            {venda.valor_liquido != null && (
                              <p className="text-[10px] text-muted-foreground">
                                Líq. {formatCurrency(Number(venda.valor_liquido))}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {/* Botões download PDF/XML e cancelar - só mostra se tiver nota autorizada */}
                            {vendasComNfce.get(venda.id)?.status === 'autorizada' && (
                              <>
                                {vendasComNfce.get(venda.id)?.pdf_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-blue-600" 
                                    onClick={() => handleDownloadPdf(venda.id)} 
                                    title="Baixar PDF NFC-e"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {vendasComNfce.get(venda.id)?.xml_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-emerald-600" 
                                    onClick={() => handleDownloadXml(venda.id)} 
                                    title="Baixar XML NFC-e"
                                  >
                                    <FileCode className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive" 
                                  onClick={() => openCancelDialog(venda.id)} 
                                  disabled={cancelandoNfce === venda.id}
                                  title="Cancelar NFC-e"
                                >
                                  {cancelandoNfce === venda.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Ban className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            {/* Botão transmitir NFC-e pendente */}
                            {vendasComNfce.get(venda.id)?.status === 'pendente' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600"
                                onClick={() => handleTransmitirNfce(venda.id)} 
                                disabled={transmitindoNfce === venda.id}
                                title="Transmitir NFC-e (pendente)"
                              >
                                {transmitindoNfce === venda.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {/* Botão emitir NFC-e */}
                            {(!vendasComNfce.has(venda.id) || vendasComNfce.get(venda.id)?.status === 'rejeitada' || vendasComNfce.get(venda.id)?.status === 'cancelada') && (() => {
                              const nfceStatus = vendasComNfce.get(venda.id);
                              const isRejeitada = nfceStatus?.status === 'rejeitada';
                              const isCancelada = nfceStatus?.status === 'cancelada';
                              return (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn(
                                    "h-8 w-8",
                                    isRejeitada ? "text-amber-600" : isCancelada ? "text-muted-foreground" : "text-emerald-600"
                                  )}
                                  onClick={() => openConfirmNfce(venda)} 
                                  disabled={emitindoNfce === venda.id}
                                  title={isRejeitada ? "Reenviar NFC-e (rejeitada)" : isCancelada ? "Nova NFC-e" : "Emitir NFC-e"}
                                >
                                  {emitindoNfce === venda.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isRejeitada ? (
                                    <RotateCcw className="h-4 w-4" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                </Button>
                              );
                            })()}
                            {!vendasComOperacao.has(venda.id) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-indigo-600"
                                onClick={() => openConfirmOperacao(venda)}
                                title="Criar Operação"
                              >
                                <ClipboardList className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Pedido de Entrega buttons */}
                            {vendasComPedido.has(venda.id) && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-orange-600"
                                  onClick={() => {
                                    setVendaParaPedido(venda.id);
                                    setPedidoDialogOpen(true);
                                  }}
                                  title="Visualizar Pedido de Entrega"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-teal-600"
                                  onClick={() => {
                                    setVendaParaPedido(venda.id);
                                    setPedidoStatusDialogOpen(true);
                                  }}
                                  title="Atualizar Status do Pedido"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(venda)} title="Editar">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openConfirmExcluir(venda)} title="Excluir">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Accordion Detail Panel - Lazy loaded */}
                      {isExpanded && (
                        <div className="border-t">
                          <VendaDetailAccordion
                            saleId={venda.id}
                            produtos={venda.produtos}
                            paymentMethod={venda.metodo_pagamento}
                            parcelas={venda.parcelas}
                            valor={Number(venda.valor)}
                            valorBruto={venda.valor_bruto ? Number(venda.valor_bruto) : null}
                            desconto={venda.desconto ? Number(venda.desconto) : null}
                            finalAmount={venda.valor_final ? Number(venda.valor_final) : null}
                            observacoes={venda.observacoes}
                            bandeira={venda.bandeira}
                            valorLiquido={venda.valor_liquido != null ? Number(venda.valor_liquido) : null}
                            isAdmin={isAdmin}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredVendas.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '24px',
                      background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '16px',
                    }}>
                      <ShoppingCart className="h-9 w-9" style={{ color: '#8E5FCF' }} />
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', marginBottom: '6px' }}>
                      Nenhuma venda encontrada
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                      Registre sua primeira venda clicando em "+ Nova Venda"
                    </p>
                  </div>
                )}
              </div>}
          </div>
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '760px' }} onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome do Cliente *</Label>
              <Popover open={editClientePopoverOpen} onOpenChange={setEditClientePopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={editClientePopoverOpen} className="justify-between w-full font-normal">
                    {editVenda.cliente_nome || "Selecione ou digite o name do cliente..."}
                    <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 z-[200]" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." onValueChange={value => {
                      if (!clientes.find(c => c.name.toLowerCase() === value.toLowerCase())) {
                        setEditVenda({
                          ...editVenda,
                          cliente_nome: value,
                          cliente_telefone: '',
                          cliente_email: ''
                        });
                      }
                    }} />
                    <CommandList>
                      <CommandEmpty>
                        <span className="text-muted-foreground">Nenhum cliente encontrado.</span>
                        <br />
                        <span className="text-xs text-muted-foreground">Digite o name para editar manualmente.</span>
                      </CommandEmpty>
                      <CommandGroup heading="Clientes Cadastrados">
                        {clientes.map(cliente => <CommandItem key={cliente.id} value={cliente.name} onSelect={() => {
                          setEditVenda({
                            ...editVenda,
                            cliente_nome: cliente.name,
                            cliente_telefone: cliente.telefone || '',
                            cliente_email: cliente.email || ''
                          });
                          setEditClientePopoverOpen(false);
                        }}>
                            <Check className={cn("mr-2 h-4 w-4", editVenda.cliente_nome === cliente.name ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{cliente.name}</span>
                              {cliente.telefone && <span className="text-xs text-muted-foreground">{cliente.telefone}</span>}
                            </div>
                          </CommandItem>)}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-cliente_telefone">Telefone</Label>
                <Input id="edit-cliente_telefone" placeholder="(00) 00000-0000" value={editVenda.cliente_telefone} onChange={e => setEditVenda({
                  ...editVenda,
                  cliente_telefone: e.target.value
                })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cliente_email">E-mail</Label>
                <Input id="edit-cliente_email" type="email" placeholder="email@exemplo.com" value={editVenda.cliente_email} onChange={e => setEditVenda({
                  ...editVenda,
                  cliente_email: e.target.value
                })} />
              </div>
            </div>

            {/* Seleção de Produtos para Edição */}
            <div className="space-y-3">
              <Label>Produtos</Label>
              <div className="flex gap-2">
                <Select value={editProdutoSelecionado} onValueChange={setEditProdutoSelecionado}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map(p => <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{p.name}{isServico(p) ? ' · Serviço' : ''}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatCurrency(Number(p.preco))}{sufixoRecorrencia(p)}
                          </span>
                        </div>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="1" placeholder="Qtd" className="w-20" value={editQuantidadeProduto} onChange={e => setEditQuantidadeProduto(parseInt(e.target.value) || 1)} />
                <Button type="button" size="icon" onClick={handleAdicionarItemEdit}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {editItensVenda.length > 0 && (
                <div className="border rounded-lg overflow-hidden" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {editItensVenda.map(item => {
                    const discValor = item.desconto_tipo === 'percentual'
                      ? item.subtotal * (item.desconto / 100)
                      : Math.min(item.desconto, item.subtotal);
                    const totalItemFinal = Math.max(0, item.subtotal - discValor);
                    const temDesconto = item.desconto > 0;
                    const invalido = item.desconto_tipo === 'percentual'
                      ? item.desconto > 100
                      : item.desconto > item.subtotal;
                    return (
                      <div key={item.produto_id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        {/* Main item row */}
                        <div className="flex items-center gap-2 p-3">
                          {(() => {
                            const prod = produtos.find(p => p.id === item.produto_id);
                            return isServico(prod)
                              ? <Wrench className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              : <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
                          })()}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="font-medium text-sm truncate">{item.produto_nome}</p>
                            <p className="text-xs text-muted-foreground">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                            {(() => {
                              const prod = produtos.find(p => p.id === item.produto_id);
                              if (!isServico(prod) || !prod?.recorrente) return null;
                              return (
                                <label className="flex items-center gap-1.5 text-xs text-sky-700 mt-1">
                                  <Repeat className="h-3 w-3" />
                                  Cobrar por
                                  <input
                                    type="number" min={1} max={120}
                                    value={item.recorrencia_periodos ?? 1}
                                    onChange={e => updateEditItemField(item.produto_id, { recorrencia_periodos: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)) })}
                                    style={{ width: '52px', border: '1px solid rgba(14,165,233,0.4)', borderRadius: '6px', padding: '1px 4px', textAlign: 'center' }}
                                  />
                                  períodos ({labelRecorrencia(prod.recorrencia_tipo).toLowerCase()})
                                </label>
                              );
                            })()}
                          </div>
                          {/* Discount toggle + input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(142,95,207,0.3)' }}>
                              <button type="button" onClick={() => updateEditItemField(item.produto_id, { desconto_tipo: 'percentual' })}
                                style={{ padding: '3px 7px', fontSize: '0.68rem', fontFamily: 'Gilroy', fontWeight: 700,
                                  background: item.desconto_tipo === 'percentual' ? '#8E5FCF' : 'transparent',
                                  color: item.desconto_tipo === 'percentual' ? 'white' : '#8E5FCF',
                                  border: 'none', cursor: 'pointer', lineHeight: 1 }}>%</button>
                              <button type="button" onClick={() => updateEditItemField(item.produto_id, { desconto_tipo: 'amount' })}
                                style={{ padding: '3px 7px', fontSize: '0.68rem', fontFamily: 'Gilroy', fontWeight: 700,
                                  background: item.desconto_tipo === 'amount' ? '#8E5FCF' : 'transparent',
                                  color: item.desconto_tipo === 'amount' ? 'white' : '#8E5FCF',
                                  border: 'none', cursor: 'pointer', lineHeight: 1 }}>R$</button>
                            </div>
                            <input
                              type="number" min={0} step={0.01}
                              max={item.desconto_tipo === 'percentual' ? 100 : item.subtotal}
                              value={item.desconto || ''}
                              onChange={e => {
                                const raw = parseFloat(e.target.value) || 0;
                                const max = item.desconto_tipo === 'percentual' ? 100 : item.subtotal;
                                updateEditItemField(item.produto_id, { desconto: Math.min(raw, max) });
                              }}
                              placeholder="0"
                              style={{ width: '68px', textAlign: 'center', background: 'rgba(255,255,255,0.8)',
                                border: invalido ? '1px solid #EF4444' : '1px solid rgba(142,95,207,0.2)',
                                borderRadius: '8px', padding: '5px 6px', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none' }}
                            />
                          </div>
                          {/* Price display */}
                          <div style={{ minWidth: '80px', textAlign: 'right', flexShrink: 0 }}>
                            {temDesconto && !invalido ? (
                              <div>
                                <span style={{ textDecoration: 'line-through', color: '#9CA3AF', fontSize: '0.72rem' }}>{formatCurrency(item.subtotal)}</span>
                                <div style={{ color: '#10B981', fontWeight: 700, fontSize: '0.85rem' }}>{formatCurrency(totalItemFinal)}</div>
                              </div>
                            ) : (
                              <span className="font-medium text-sm">{formatCurrency(item.subtotal)}</span>
                            )}
                          </div>
                          {/* Obs toggle */}
                          <button type="button"
                            onClick={() => updateEditItemField(item.produto_id, { obs_aberta: !item.obs_aberta })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                              color: item.observacao ? '#8E5FCF' : '#9CA3AF' }}
                            title="Observação do item">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0"
                            onClick={() => handleRemoverItemEdit(item.produto_id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Observation textarea */}
                        {item.obs_aberta && (
                          <div style={{ padding: '0 12px 10px', background: 'rgba(142,95,207,0.02)' }}>
                            <textarea
                              value={item.observacao}
                              onChange={e => updateEditItemField(item.produto_id, { observacao: e.target.value })}
                              placeholder="Observação deste item..."
                              style={{ width: '100%', minHeight: '60px', resize: 'vertical', padding: '8px 10px',
                                background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(142,95,207,0.2)',
                                borderRadius: '8px', fontFamily: 'Gilroy', fontSize: '0.8rem', outline: 'none',
                                color: '#374151' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Totals */}
                  <div style={{ background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    {editDescontoItensTotal > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Subtotal bruto</span>
                        <span>{formatCurrency(editSubtotalBruto)}</span>
                      </div>
                    )}
                    {editDescontoItensTotal > 0 && (
                      <div className="flex items-center justify-between px-3 py-1 text-sm text-destructive">
                        <span>(-) Desc. por item</span>
                        <span>- {formatCurrency(editDescontoItensTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="font-medium text-sm">Subtotal</span>
                      <span className="text-lg font-bold">{formatCurrency(editValorTotalItens)}</span>
                    </div>
                  </div>
                  {editVenda.desconto > 0 && (
                    <div className="flex items-center justify-between p-3 text-destructive border-t">
                      <span className="font-medium text-sm">(-) Desc. geral {editDescontoTipo === 'percentual' ? `(${editVenda.desconto}%)` : ''}</span>
                      <span className="font-bold">- {formatCurrency(editDescontoTipo === 'percentual' ? (editValorTotalItens * editVenda.desconto / 100) : editVenda.desconto)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-primary/10 border-t">
                    <span className="font-medium text-sm">Total Final</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(editValorTotalItens - (editDescontoTipo === 'percentual' ? (editValorTotalItens * (editVenda.desconto || 0) / 100) : (editVenda.desconto || 0)))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Desconto</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn("cursor-pointer px-2 py-0.5 rounded", editDescontoTipo === 'amount' ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => setEditDescontoTipo('amount')}>R$</span>
                  <span className={cn("cursor-pointer px-2 py-0.5 rounded", editDescontoTipo === 'percentual' ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => setEditDescontoTipo('percentual')}>%</span>
                </div>
              </div>
              <Input 
                type="text" 
                inputMode="numeric"
                placeholder="0,00" 
                value={editVenda.desconto ? editVenda.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} 
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const num = parseInt(digits || '0', 10) / 100;
                  setEditVenda({ ...editVenda, desconto: num });
                }} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data da Venda *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !editDataVenda && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDataVenda ? format(editDataVenda, "dd/MM/yyyy", {
                        locale: ptBR
                      }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editDataVenda} onSelect={setEditDataVenda} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Método de Pagamento *</Label>
                <Select value={editVenda.metodo_pagamento} onValueChange={value => setEditVenda({
                  ...editVenda,
                  metodo_pagamento: value
                })}>
                  <SelectTrigger>
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
            {editVenda.metodo_pagamento === 'Cartão de Crédito' && <div className="grid gap-2">
                <Label>Número de Parcelas</Label>
                <Select value={String(editVenda.parcelas)} onValueChange={value => setEditVenda({
                ...editVenda,
                parcelas: parseInt(value)
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Parcelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <SelectItem key={n} value={String(n)}>{n}x de {formatCurrency(editValorTotalItens / n)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}
            <div className="grid gap-2">
              <Label>Vendedor</Label>
              <Select value={editVenda.vendedor} onValueChange={value => setEditVenda({
                ...editVenda,
                vendedor: value
              })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhum vendedor cadastrado</SelectItem>
                  ) : (
                    vendedores.map(v => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Textarea id="edit-observacoes" placeholder="Observações adicionais..." value={editVenda.observacoes} onChange={e => setEditVenda({
                ...editVenda,
                observacoes: e.target.value
              })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cancelamento de NFC-e */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar NFC-e</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Informe o motivo do cancelamento (mínimo 15 caracteres).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motivo-cancelamento">Motivo do Cancelamento *</Label>
            <Textarea
              id="motivo-cancelamento"
              placeholder="Informe o motivo do cancelamento..."
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              className="mt-2"
              minLength={15}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {motivoCancelamento.length}/15 caracteres mínimos
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setVendaParaCancelar(null);
              setMotivoCancelamento('');
            }}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelarNfce}
              disabled={motivoCancelamento.trim().length < 15}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação para Ações na Lista de Vendas */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'nfc' && 'Confirmar emissão de NFC-e'}
              {confirmAction === 'operacao' && 'Confirmar criação de operação'}
              {confirmAction === 'excluir' && 'Confirmar exclusão de venda'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'nfc' && (
                <>Deseja realmente emitir a NFC-e para a venda de <strong>{confirmVenda?.cliente_nome}</strong> no valor de <strong>{confirmVenda ? formatCurrency(Number(confirmVenda.valor)) : ''}</strong>?</>
              )}
              {confirmAction === 'operacao' && (
                <>Deseja realmente criar uma operação para a venda de <strong>{confirmVenda?.cliente_nome}</strong>?</>
              )}
              {confirmAction === 'excluir' && (
                <>Deseja realmente excluir a venda de <strong>{confirmVenda?.cliente_nome}</strong>? Esta ação não poderá ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={closeConfirmDialog}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className="border border-input bg-background text-brand hover:bg-accent hover:text-accent-foreground">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Criar Operação Manual */}
      <Dialog open={operacaoManualDialogOpen} onOpenChange={(open) => {
        setOperacaoManualDialogOpen(open);
        if (!open) {
          setVendaParaOperacao(null);
          setOperacaoManualStatus('');
          setOperacaoManualTipo('entrega');
        }
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Criar Operação
            </DialogTitle>
          </DialogHeader>
          {vendaParaOperacao && (
            <div className="grid gap-4 py-2">
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="font-medium">{vendaParaOperacao.cliente_nome}</p>
                <p className="text-sm text-muted-foreground">{vendaParaOperacao.produtos}</p>
                <p className="text-sm font-semibold mt-1">
                  {formatCurrency(Number(vendaParaOperacao.valor))}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Etapa do Kanban *</Label>
                  <Select value={operacaoManualStatus} onValueChange={setOperacaoManualStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {KANBAN_COLUMNS.map(col => (
                        <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de Serviço</Label>
                  <Select value={operacaoManualTipo} onValueChange={setOperacaoManualTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrega">Entrega</SelectItem>
                      <SelectItem value="entrega_montagem">Entrega + Montagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOperacaoManualDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCriarOperacaoManual} 
                  disabled={!operacaoManualStatus || criandoOperacao}
                >
                  {criandoOperacao ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                  Criar Operação
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pedido de Entrega Dialogs */}
      <PedidoEntregaDialog
        open={pedidoDialogOpen}
        onOpenChange={setPedidoDialogOpen}
        saleId={vendaParaPedido}
      />
      <PedidoEntregaStatusDialog
        open={pedidoStatusDialogOpen}
        onOpenChange={setPedidoStatusDialogOpen}
        saleId={vendaParaPedido}
        onStatusUpdated={fetchVendasComPedido}
      />
    </div>
  );
};
export default Vendas;