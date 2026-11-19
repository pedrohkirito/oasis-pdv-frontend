import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarioContas } from '@/components/contasapagar/CalendarioContas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Plus, Search, CalendarIcon, Trash2, Edit, CheckCircle, Upload, Download, Tag, Copy, RefreshCw, Repeat, ArrowUpDown, Layers, CalendarPlus, CalendarOff, AlertCircle, Clock, Wallet, AlertTriangle } from 'lucide-react';
import { downloadICSFile, createCalendarEventFromConta, downloadMultipleICSFile } from '@/utils/calendarUtils';

import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { format, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths, differenceInDays } from 'date-fns';
import { ajustarParaProximoDiaUtil } from '@/utils/feriadosUtils';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import type { Tables } from '@/lib/database';
import { AlertasVencimento } from '@/components/AlertasVencimento';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
type ContaPagar = Tables<'contas_pagar'>;
type Fornecedor = Tables<'fornecedores'>;
type MetodoPagamento = Tables<'metodos_pagamento'>;

// Mapeamento de cores por categoria
const categoriaColors: Record<string, string> = {
  'Fornecedores': '#3b82f6',
  // blue
  'Aluguel': '#8b5cf6',
  // violet
  'Água': '#06b6d4',
  // cyan
  'Energia': '#f59e0b',
  // amber
  'Internet': '#6366f1',
  // indigo
  'Telefone': '#ec4899',
  // pink
  'Salários': '#10b981',
  // emerald
  'Impostos': '#ef4444',
  // red
  'Marketing': '#f97316',
  // orange
  'Manutenção': '#84cc16',
  // lime
  'Transporte': '#14b8a6',
  // teal
  'Seguros': '#a855f7',
  // purple
  'Outros': '#6b7280' // gray
};
const getCategoriaColor = (categoria: string | null): string => {
  if (!categoria) return categoriaColors['Outros'];
  return categoriaColors[categoria] || categoriaColors['Outros'];
};
const ContasAPagar = () => {
  const {
    toast
  } = useToast();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const { companyId } = useEmpresa();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<string>('vencimento_asc');
  const [agruparPorMes, setAgruparPorMes] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [editNovaCategoria, setEditNovaCategoria] = useState('');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [metodosPagamento, setMetodosPagamento] = useState<MetodoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [novaConta, setNovaConta] = useState({
    descricao: '',
    supplier_name: '',
    valor: 0,
    categoria: '',
    invoice_number: '',
    parcela: '',
    payment_method: '',
    payment_code: ''
  });
  const [numParcelasNovaConta, setNumParcelasNovaConta] = useState<number>(1);
  const [datasVencimentoParcelas, setDatasVencimentoParcelas] = useState<(Date | undefined)[]>([undefined]);
  const [valoresParcelas, setValoresParcelas] = useState<number[]>([0]);
  const [editConta, setEditConta] = useState({
    descricao: '',
    supplier_name: '',
    valor: 0,
    categoria: '',
    invoice_number: '',
    parcela: '',
    payment_method: '',
    payment_code: ''
  });
  const [editDataVencimento, setEditDataVencimento] = useState<Date>();
  const [duplicarDialogOpen, setDuplicarDialogOpen] = useState(false);
  const [contaParaDuplicar, setContaParaDuplicar] = useState<ContaPagar | null>(null);
  const [numParcelas, setNumParcelas] = useState(2);

  // Estados para contas recorrentes
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [mesesRecorrencia, setMesesRecorrencia] = useState(12);
  const [recorrentesSheetOpen, setRecorrentesSheetOpen] = useState(false);
  const [contasRecorrentes, setContasRecorrentes] = useState<ContaPagar[]>([]);
  const [confirmDesmarcarOpen, setConfirmDesmarcarOpen] = useState(false);
  const [contaParaDesmarcar, setContaParaDesmarcar] = useState<ContaPagar | null>(null);
  const [contasPendentesParaExcluir, setContasPendentesParaExcluir] = useState<ContaPagar[]>([]);
  const [quantidadeExcluir, setQuantidadeExcluir] = useState<number>(0);
  const [editarValorDialogOpen, setEditarValorDialogOpen] = useState(false);
  const [contaParaEditarValor, setContaParaEditarValor] = useState<ContaPagar | null>(null);
  const [novoValorRecorrente, setNovoValorRecorrente] = useState(0);
  const [estenderDialogOpen, setEstenderDialogOpen] = useState(false);
  const [contaParaEstender, setContaParaEstender] = useState<ContaPagar | null>(null);
  const [mesesParaEstender, setMesesParaEstender] = useState(6);
  const [modoCalendario, setModoCalendario] = useState(false);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  // Payment modal
  const [modalPagamento, setModalPagamento] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | null>(null);
  const [pagData, setPagData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pagJuros, setPagJuros] = useState(0);
  const [pagMulta, setPagMulta] = useState(0);
  const [pagDesconto, setPagDesconto] = useState(0);
  const [pagForma, setPagForma] = useState('');
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);
  useEffect(() => {
    if (user && companyId) {
      fetchContas();
      fetchFornecedores();
      fetchContasRecorrentes();
      fetchMetodosPagamento();
    }
  }, [user, companyId]);
  const fetchContas = async () => {
    if (!companyId) return;
    setLoading(true);
    const {
      data,
      error
    } = await api.from('payable').select('*').eq('company_id', companyId).order('due_on', {
      ascending: false
    });
    if (error) {
      handleApiError(error, "Erro ao carregar contas");
    } else {
      setContas(data || []);
    }
    setLoading(false);
  };
  const fetchFornecedores = async () => {
    if (!companyId) return;
    const {
      data,
      error
    } = await api.from('supplier').select('*').eq('active', true).eq('company_id', companyId).order('name', {
      ascending: true
    });
    if (!error) {
      setFornecedores(data || []);
    }
  };
  const fetchMetodosPagamento = async () => {
    if (!companyId) return;
    const { data, error } = await api
      .from('payment_method')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('name', { ascending: true });
    if (!error) {
      setMetodosPagamento(data || []);
    }
  };
  const fetchContasRecorrentes = async () => {
    if (!companyId) return;
    const {
      data,
      error
    } = await api.from('payable').select('*').eq('recorrente', true).eq('company_id', companyId).order('description', {
      ascending: true
    });
    if (!error) {
      setContasRecorrentes(data || []);
    }
  };
  const handleSalvar = async () => {
    const categoriaFinal = novaConta.categoria === '__nova__' ? novaCategoria : novaConta.categoria;
    const isFornecedorRequired = categoriaFinal === 'Fornecedores';

    // Validar se todas as datas de vencimento das parcelas foram preenchidas
    const todasDatasPreenchidas = datasVencimentoParcelas.slice(0, numParcelasNovaConta).every(data => data !== undefined);

    // Validar se todos os valores das parcelas foram preenchidos
    const todosValoresPreenchidos = valoresParcelas.slice(0, numParcelasNovaConta).every(valor => valor > 0);
    if (!novaConta.descricao || !categoriaFinal || !todasDatasPreenchidas || !todosValoresPreenchidos || !user || isFornecedorRequired && !novaConta.supplier_name) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios, incluindo valor e data de cada parcela",
        variant: "destructive"
      });
      return;
    }

    // Se for conta recorrente, criar a conta mãe primeiro e depois as provisionadas
    if (isRecorrente && numParcelasNovaConta === 1) {
      const dataVencimentoBase = datasVencimentoParcelas[0]!;
      const valorBase = valoresParcelas[0];

      // Criar a conta mãe (recorrente = true)
      const {
        data: contaMae,
        error: errorMae
       } = await api.from('payable').insert({
        user_id: user.id,
        company_id: companyId,
        descricao: novaConta.descricao,
        supplier_name: isFornecedorRequired ? novaConta.supplier_name : categoriaFinal,
        valor: valorBase,
        due_on: format(dataVencimentoBase, 'yyyy-MM-dd'),
        categoria: categoriaFinal,
        invoice_number: novaConta.invoice_number || null,
        payment_method: novaConta.payment_method || null,
        payment_code: novaConta.payment_code || null,
        parcela: null,
        status: 'pendente',
        recorrente: true,
        provisionada: false
      }).select().single();
      if (errorMae || !contaMae) {
        handleApiError(errorMae, "Erro ao cadastrar conta recorrente");
        return;
      }

      // Criar as contas provisionadas para os próximos meses
      const contasProvisionadas = [];
      for (let i = 1; i < mesesRecorrencia; i++) {
        const novaDataVencimento = addMonths(dataVencimentoBase, i);
        contasProvisionadas.push({
          user_id: user.id,
          company_id: companyId,
          descricao: novaConta.descricao,
          supplier_name: isFornecedorRequired ? novaConta.supplier_name : categoriaFinal,
          valor: valorBase,
          due_on: format(novaDataVencimento, 'yyyy-MM-dd'),
          categoria: categoriaFinal,
          invoice_number: null,
          parcela: null,
          status: 'pendente',
          recorrente: false,
          recurring_payable_id: contaMae.id,
          provisionada: true
        });
      }
      if (contasProvisionadas.length > 0) {
        const {
          error: errorProvisionadas
        } = await api.from('payable').insert(contasProvisionadas);
        if (errorProvisionadas) {
          toast({
            title: "Aviso",
            description: "Conta mãe criada, mas houve erro ao criar algumas contas provisionadas",
            variant: "destructive"
          });
        }
      }

      // Reset form
      setNovaConta({
        descricao: '',
        supplier_name: '',
        valor: 0,
        categoria: '',
        invoice_number: '',
        parcela: '',
        payment_method: '',
        payment_code: ''
      });
      setNumParcelasNovaConta(1);
      setDatasVencimentoParcelas([undefined]);
      setValoresParcelas([0]);
      setNovaCategoria('');
      setIsRecorrente(false);
      setMesesRecorrencia(12);
      setDialogOpen(false);
      fetchContas();
      fetchContasRecorrentes();
      toast({
        title: "Sucesso!",
        description: `Conta recorrente criada com ${mesesRecorrencia} meses provisionados`
      });
      return;
    }

    // Criar uma conta para cada parcela com valor individual (fluxo normal)
    const contasParaInserir = datasVencimentoParcelas.slice(0, numParcelasNovaConta).map((data, index) => ({
      user_id: user.id,
      company_id: companyId,
      descricao: novaConta.descricao,
      supplier_name: isFornecedorRequired ? novaConta.supplier_name : categoriaFinal,
      valor: valoresParcelas[index],
      due_on: format(data!, 'yyyy-MM-dd'),
      categoria: categoriaFinal,
      invoice_number: novaConta.invoice_number || null,
      payment_method: novaConta.payment_method || null,
      payment_code: novaConta.payment_code || null,
      parcela: `${index + 1}/${numParcelasNovaConta}`,
      status: 'pendente'
    }));
    const {
      error
    } = await api.from('payable').insert(contasParaInserir);
    if (error) {
      handleApiError(error, "Erro ao cadastrar conta");
    } else {
      setNovaConta({
        descricao: '',
        supplier_name: '',
        valor: 0,
        categoria: '',
        invoice_number: '',
        parcela: '',
        payment_method: '',
        payment_code: ''
      });
      setNumParcelasNovaConta(1);
      setDatasVencimentoParcelas([undefined]);
      setValoresParcelas([0]);
      setNovaCategoria('');
      setIsRecorrente(false);
      setDialogOpen(false);
      fetchContas();
      toast({
        title: "Sucesso!",
        description: numParcelasNovaConta > 1 ? `${numParcelasNovaConta} parcelas cadastradas com sucesso` : "Conta a pagar cadastrada com sucesso"
      });
    }
  };
  const handleDesmarcarRecorrente = (conta: ContaPagar) => {
    setContaParaDesmarcar(conta);
    // Buscar todas as contas pendentes vinculadas (filhas + mãe se pendente), ordenadas da mais recente para a mais antiga
    const filhasPendentes = contas.filter(c => c.recurring_payable_id === conta.id && c.status === 'pendente');
    const todasPendentes = conta.status === 'pendente' 
      ? [conta, ...filhasPendentes] 
      : filhasPendentes;
    // Ordenar da data mais futura para a mais antiga (excluir primeiro as últimas)
    const ordenadas = todasPendentes.sort((a, b) => new Date(b.due_on).getTime() - new Date(a.due_on).getTime());
    setContasPendentesParaExcluir(ordenadas);
    setQuantidadeExcluir(todasPendentes.length);
    setConfirmDesmarcarOpen(true);
  };
  const confirmarDesmarcarRecorrente = async () => {
    if (!contaParaDesmarcar || quantidadeExcluir === 0) return;

    // Pegar as contas a serem excluídas (as primeiras N da lista ordenada por data)
    const contasParaExcluir = contasPendentesParaExcluir.slice(0, quantidadeExcluir);
    const idsParaExcluir = contasParaExcluir.map(c => c.id);

    // Excluir as contas selecionadas
    const { error: errorExcluir } = await api
      .from('payable')
      .delete()
      .in('id', idsParaExcluir);

    if (errorExcluir) {
      handleApiError(errorExcluir, "Erro ao excluir contas");
      return;
    }

    // Se excluiu todas as pendentes, desmarcar como recorrente (se a mãe não foi excluída)
    const excluiuMae = idsParaExcluir.includes(contaParaDesmarcar.id);
    if (!excluiuMae && quantidadeExcluir === contasPendentesParaExcluir.length) {
      await api
        .from('payable')
        .update({ recorrente: false })
        .eq('id', contaParaDesmarcar.id);
    }
    
    setConfirmDesmarcarOpen(false);
    setContaParaDesmarcar(null);
    setContasPendentesParaExcluir([]);
    setQuantidadeExcluir(0);
    fetchContas();
    fetchContasRecorrentes();
    toast({
      title: "Sucesso!",
      description: `${quantidadeExcluir} conta(s) excluída(s)`
    });
  };
  const handleEditarValorRecorrente = (conta: ContaPagar) => {
    setContaParaEditarValor(conta);
    setNovoValorRecorrente(Number(conta.valor));
    setEditarValorDialogOpen(true);
  };
  const confirmarEditarValorRecorrente = async () => {
    if (!contaParaEditarValor || novoValorRecorrente <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    // 1. Atualizar o valor da conta mãe (recorrente)
    const {
      error: errorMae
    } = await api.from('payable').update({
      valor: novoValorRecorrente
    }).eq('id', contaParaEditarValor.id);
    if (errorMae) {
      handleApiError(errorMae, "Erro ao atualizar conta recorrente");
      return;
    }

    // 2. Atualizar todas as contas provisionadas pendentes vinculadas
    const {
      error: errorProvisionadas
    } = await api.from('payable').update({
      valor: novoValorRecorrente
    }).eq('recurring_payable_id', contaParaEditarValor.id).eq('status', 'pendente');
    if (errorProvisionadas) {
      toast({
        title: "Aviso",
        description: "Conta mãe atualizada, mas houve erro ao atualizar algumas provisionadas",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso!",
        description: "Valor atualizado em todas as contas pendentes da recorrência"
      });
    }
    setEditarValorDialogOpen(false);
    setContaParaEditarValor(null);
    fetchContas();
    fetchContasRecorrentes();
  };
  const handleEstenderRecorrencia = (conta: ContaPagar) => {
    setContaParaEstender(conta);
    setMesesParaEstender(6);
    setEstenderDialogOpen(true);
  };
  const confirmarEstenderRecorrencia = async () => {
    if (!contaParaEstender || !user || mesesParaEstender < 1) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos 1 mês para estender",
        variant: "destructive"
      });
      return;
    }

    // Buscar a última data de vencimento das contas vinculadas (incluindo a conta mãe)
    const contasVinculadas = contas.filter(c => c.recurring_payable_id === contaParaEstender.id || c.id === contaParaEstender.id);
    const datasVencimento = contasVinculadas.map(c => new Date(c.due_on + 'T00:00:00'));
    const ultimaData = new Date(Math.max(...datasVencimento.map(d => d.getTime())));

    // Criar novas contas provisionadas a partir da última data
    const novasContas = [];
    for (let i = 1; i <= mesesParaEstender; i++) {
      const novaDataVencimento = addMonths(ultimaData, i);
      novasContas.push({
        user_id: user.id,
        company_id: companyId,
        descricao: contaParaEstender.descricao,
        supplier_name: contaParaEstender.supplier_name,
        valor: Number(contaParaEstender.valor),
        due_on: format(novaDataVencimento, 'yyyy-MM-dd'),
        categoria: contaParaEstender.categoria,
        invoice_number: null,
        parcela: null,
        status: 'pendente',
        recorrente: false,
        recurring_payable_id: contaParaEstender.id,
        provisionada: true
      });
    }
    const {
      error
    } = await api.from('payable').insert(novasContas);
    if (error) {
      handleApiError(error, "Erro ao estender recorrência");
    } else {
      toast({
        title: "Sucesso!",
        description: `Recorrência estendida por mais ${mesesParaEstender} meses`
      });
    }
    setEstenderDialogOpen(false);
    setContaParaEstender(null);
    fetchContas();
    fetchContasRecorrentes();
  };

  // Calcular alertas de recorrências acabando
  const recorrenciasComAlerta = React.useMemo(() => {
    return contasRecorrentes.filter(conta => {
      const pendentes = contas.filter(c => (c.recurring_payable_id === conta.id || c.id === conta.id) && c.status === 'pendente').length;
      return pendentes <= 3 && pendentes > 0;
    });
  }, [contasRecorrentes, contas]);
  const handleMoverConta = async (contaId: string, novaData: string) => {
    const { error } = await api
      .from('payable')
      .update({ due_on: novaData })
      .eq('id', contaId);
    if (error) {
      toast({ title: 'Erro ao mover conta', variant: 'destructive' });
    } else {
      fetchContas();
      toast({ title: 'Vencimento atualizado!' });
    }
  };

  const handleNovaContaNaData = (data: string) => {
    const [year, month, day] = data.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    setDatasVencimentoParcelas([date]);
    setDialogOpen(true);
  };

  const handleDuplicar = (conta: ContaPagar) => {
    setContaParaDuplicar(conta);
    setNumParcelas(2);
  };
  const handleConfirmarDuplicacao = async () => {
    if (!contaParaDuplicar || !user || numParcelas < 2) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos 2 parcelas",
        variant: "destructive"
      });
      return;
    }

    // Parse da data base preservando o dia correto
    const [year, month, day] = contaParaDuplicar.due_on.split('-').map(Number);
    const diaOriginal = day;
    const contasParaInserir = [];
    for (let i = 0; i < numParcelas; i++) {
      // Criar data do próximo mês mantendo o dia original
      const novoMes = month - 1 + i; // month - 1 porque Date usa 0-indexed
      const novoAno = year + Math.floor(novoMes / 12);
      const mesAjustado = novoMes % 12;

      // Verificar último dia do mês destino para não exceder
      const ultimoDiaDoMes = new Date(novoAno, mesAjustado + 1, 0).getDate();
      const diaFinal = Math.min(diaOriginal, ultimoDiaDoMes);
      const novaData = new Date(novoAno, mesAjustado, diaFinal);
      contasParaInserir.push({
        user_id: user.id,
        company_id: companyId,
        descricao: contaParaDuplicar.descricao,
        supplier_name: contaParaDuplicar.supplier_name,
        valor: contaParaDuplicar.valor,
        due_on: format(novaData, 'yyyy-MM-dd'),
        categoria: contaParaDuplicar.categoria,
        invoice_number: (contaParaDuplicar as any).invoice_number || null,
        parcela: `${i + 1}/${numParcelas}`,
        status: 'pendente'
      });
    }
    const {
      error
    } = await api.from('payable').insert(contasParaInserir);
    if (error) {
      handleApiError(error, "Erro ao criar parcelas");
    } else {
      setDuplicarDialogOpen(false);
      setContaParaDuplicar(null);
      fetchContas();
      toast({
        title: "Sucesso!",
        description: `${numParcelas} parcelas criadas com sucesso`
      });
    }
  };
  const handleEdit = (conta: ContaPagar) => {
    setEditingConta(conta);
    setEditConta({
      descricao: conta.descricao,
      supplier_name: conta.supplier_name,
      valor: Number(conta.valor),
      categoria: conta.categoria || '',
      invoice_number: (conta as any).invoice_number || '',
      parcela: (conta as any).parcela || '',
      payment_method: (conta as any).payment_method || '',
      payment_code: (conta as any).payment_code || ''
    });
    setEditDataVencimento(parseDataString(conta.due_on));
    setEditDialogOpen(true);
  };
  const handleSalvarEdicao = async () => {
    const categoriaFinal = editConta.categoria === '__nova__' ? editNovaCategoria : editConta.categoria;
    const isFornecedorRequired = categoriaFinal === 'Fornecedores';
    if (!editingConta || !editConta.descricao || !categoriaFinal || !editConta.valor || !editDataVencimento || isFornecedorRequired && !editConta.supplier_name) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    const {
      error
    } = await api.from('payable').update({
      descricao: editConta.descricao,
      supplier_name: isFornecedorRequired ? editConta.supplier_name : categoriaFinal,
      valor: editConta.valor,
      due_on: format(editDataVencimento, 'yyyy-MM-dd'),
      categoria: categoriaFinal,
      invoice_number: editConta.invoice_number || null,
      parcela: editConta.parcela || null,
      payment_method: editConta.payment_method || null,
      payment_code: editConta.payment_code || null
    }).eq('id', editingConta.id);
    if (error) {
      handleApiError(error, "Erro ao atualizar conta");
    } else {
      setEditDialogOpen(false);
      setEditingConta(null);
      setEditNovaCategoria('');
      fetchContas();
      toast({
        title: "Sucesso!",
        description: "Conta atualizada com sucesso"
      });
    }
  };
  const handleMarcarPago = async (conta: ContaPagar) => {
    const {
      error
    } = await api.from('payable').update({
      status: 'pago',
      paid_on: format(new Date(), 'yyyy-MM-dd')
    }).eq('id', conta.id);
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao marcar como pago",
        variant: "destructive"
      });
    } else {
      fetchContas();
      toast({
        title: "Sucesso!",
        description: "Conta marcada como paga"
      });
    }
  };

  const abrirModalPagamento = (conta: ContaPagar) => {
    setContaSelecionada(conta);
    const hoje = format(new Date(), 'yyyy-MM-dd');
    setPagData(hoje);
    const venc = new Date(conta.due_on + 'T00:00:00');
    const pag  = new Date(hoje + 'T00:00:00');
    const dias = Math.max(0, differenceInDays(pag, venc));
    const base = Number((conta as any).original_amount ?? conta.valor);
    if (dias > 0) {
      setPagMulta(parseFloat((base * 0.02).toFixed(2)));
      setPagJuros(parseFloat((base * 0.01 * (dias / 30)).toFixed(2)));
    } else {
      setPagMulta(0);
      setPagJuros(0);
    }
    setPagDesconto(0);
    setPagForma('');
    setModalPagamento(true);
  };

  const confirmarPagamento = async () => {
    if (!contaSelecionada) return;
    const base = Number((contaSelecionada as any).original_amount ?? contaSelecionada.valor);
    const valorPago = base + pagJuros + pagMulta - pagDesconto;
    const { error } = await api.from('payable').update({
      status: 'pago',
      original_amount: base,
      interest_amount: pagJuros,
      penalty_amount: pagMulta,
      discount_amount: pagDesconto,
      paid_amount: valorPago,
      paid_on: pagData,
      settled_on: pagData,
      payment_form: pagForma || null,
      updated_at: new Date().toISOString(),
    } as any).eq('id', contaSelecionada.id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar pagamento', variant: 'destructive' });
    } else {
      setModalPagamento(false);
      setContaSelecionada(null);
      fetchContas();
      toast({ title: 'Sucesso!', description: 'Pagamento registrado com sucesso' });
    }
  };
  const handleDelete = async (id: string) => {
    const {
      error
    } = await api.from('payable').delete().eq('id', id);
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta",
        variant: "destructive"
      });
    } else {
      fetchContas();
      toast({
        title: "Sucesso",
        description: "Conta excluída"
      });
    }
  };
  const getStatusBadge = (status: string) => {
    const styles = {
      pago:     'bg-green-100 text-green-700 border-green-200',
      pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      vencido:  'bg-red-100 text-red-700 border-red-200',
    };
    const labels = {
      pago: 'Pago', pendente: 'Pendente', vencido: 'Vencido',
    };
    const s = status as keyof typeof styles;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[s] ?? 'bg-muted text-muted-foreground'}`}>
        {labels[s] ?? status}
      </span>
    );
  };
  // Função para fazer parse correto de data string yyyy-MM-dd evitando problemas de fuso horário
  const parseDataString = (dataString: string): Date => {
    const [year, month, day] = dataString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Obtém a data de vencimento ajustada para dia útil
  const getDataVencimentoAjustada = (dataVencimento: string): Date => {
    const dataOriginal = parseDataString(dataVencimento);
    return ajustarParaProximoDiaUtil(dataOriginal);
  };

  // Formata a data de vencimento com indicação se foi ajustada
  const formatDataVencimento = (dataVencimento: string): { data: string; dataOriginal: string; ajustada: boolean } => {
    const dataOriginal = parseDataString(dataVencimento);
    const dataAjustada = ajustarParaProximoDiaUtil(dataOriginal);
    const foiAjustada = dataOriginal.getTime() !== dataAjustada.getTime();
    return {
      data: format(dataAjustada, "dd/MM/yyyy", { locale: ptBR }),
      dataOriginal: format(dataOriginal, "dd/MM/yyyy", { locale: ptBR }),
      ajustada: foiAjustada
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const filteredContas = contas.filter(conta => {
    const matchSearch = conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || conta.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || conta.status === filterStatus;

    // Filtro por intervalo de datas
    let matchDateRange = true;
    if (dateRange.from && dateRange.to) {
      const dataVencimento = new Date(conta.due_on + 'T00:00:00');
      matchDateRange = isWithinInterval(dataVencimento, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to)
      });
    } else if (dateRange.from) {
      const dataVencimento = new Date(conta.due_on + 'T00:00:00');
      matchDateRange = dataVencimento >= startOfDay(dateRange.from);
    }

    // Filtro por categoria
    const matchCategoria = filterCategoria === 'todos' || conta.categoria === filterCategoria;
    return matchSearch && matchStatus && matchDateRange && matchCategoria;
  });

  // Ordenação das contas
  const sortedContas = [...filteredContas].sort((a, b) => {
    switch (ordenacao) {
      case 'vencimento_asc':
        return new Date(a.due_on).getTime() - new Date(b.due_on).getTime();
      case 'vencimento_desc':
        return new Date(b.due_on).getTime() - new Date(a.due_on).getTime();
      case 'valor_asc':
        return Number(a.valor) - Number(b.valor);
      case 'valor_desc':
        return Number(b.valor) - Number(a.valor);
      default:
        return new Date(a.due_on).getTime() - new Date(b.due_on).getTime();
    }
  });

  // Categorias únicas para o filtro
  const categoriasUnicas = [...new Set(contas.map(c => c.categoria).filter(Boolean))] as string[];
  const totalPendente = filteredContas.filter(c => c.status === 'pendente').reduce((sum, c) => sum + Number(c.valor), 0);
  const totalVencido = filteredContas.filter(c => c.status === 'vencido').reduce((sum, c) => sum + Number(c.valor), 0);
  const totalPago = filteredContas.filter(c => c.status === 'pago').reduce((sum, c) => sum + Number(c.valor), 0);
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  // ── ERP list helpers ─────────────────────────────────────────────────────

  const catBadgeStyle = (cat: string | null): { bg: string; color: string } => {
    const m: Record<string, { bg: string; color: string }> = {
      'Fornecedores': { bg: 'rgba(249,115,22,0.1)',  color: '#F97316' },
      'Aluguel':      { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B' },
      'Água':         { bg: 'rgba(6,182,212,0.1)',   color: '#06B6D4' },
      'Energia':      { bg: 'rgba(6,182,212,0.1)',   color: '#06B6D4' },
      'Internet':     { bg: 'rgba(99,102,241,0.1)',  color: '#6366F1' },
      'Telefone':     { bg: 'rgba(236,72,153,0.1)',  color: '#EC4899' },
      'Salários':     { bg: 'rgba(59,130,246,0.1)',  color: '#3B82F6' },
      'Impostos':     { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
      'Marketing':    { bg: 'rgba(249,115,22,0.1)',  color: '#F97316' },
      'Manutenção':   { bg: 'rgba(139,92,246,0.1)',  color: '#8B5CF6' },
      'Transporte':   { bg: 'rgba(20,184,166,0.1)',  color: '#14B8A6' },
      'Seguros':      { bg: 'rgba(168,85,247,0.1)',  color: '#A855F7' },
      'Equipamentos': { bg: 'rgba(234,179,8,0.1)',   color: '#EAB308' },
    };
    return m[cat ?? ''] ?? { bg: 'rgba(107,114,128,0.1)', color: '#6B7280' };
  };

  const groupLabelColor: Record<string, string> = {
    'VENCIDAS / PAGAS':  '#EF4444',
    'VENCE HOJE':        '#F59E0B',
    'AMANHÃ':            '#F59E0B',
    'ESTA SEMANA':       '#8E5FCF',
    'PRÓXIMOS 30 DIAS':  '#6B7280',
    'CANCELADAS':        '#9CA3AF',
  };

  const agruparContas = (lista: ContaPagar[]) => {
    const base = startOfDay(new Date());
    const grupos = new Map<string, ContaPagar[]>();
    const mesesOrdem: string[] = [];

    const getChave = (c: ContaPagar) => {
      if (c.status === 'cancelado') return 'CANCELADAS';
      const venc = startOfDay(new Date(c.due_on + 'T00:00:00'));
      const diff = differenceInDays(venc, base);
      if (diff < 0)   return 'VENCIDAS / PAGAS';
      if (diff === 0) return 'VENCE HOJE';
      if (diff === 1) return 'AMANHÃ';
      if (diff <= 7)  return 'ESTA SEMANA';
      if (diff <= 30) return 'PRÓXIMOS 30 DIAS';
      const mes = format(venc, "MMMM 'de' yyyy", { locale: ptBR });
      const label = mes.charAt(0).toUpperCase() + mes.slice(1);
      if (!mesesOrdem.includes(label)) mesesOrdem.push(label);
      return label;
    };

    for (const c of lista) {
      const k = getChave(c);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(c);
    }

    const ordemFixa = ['VENCIDAS / PAGAS', 'VENCE HOJE', 'AMANHÃ', 'ESTA SEMANA', 'PRÓXIMOS 30 DIAS'];
    const resultado: { label: string; contas: ContaPagar[]; total: number }[] = [];

    for (const k of ordemFixa) {
      if (grupos.has(k)) {
        const cs = grupos.get(k)!;
        resultado.push({ label: k, contas: cs, total: cs.reduce((s, c) => s + Number(c.valor), 0) });
        grupos.delete(k);
      }
    }
    for (const k of mesesOrdem) {
      if (grupos.has(k)) {
        const cs = grupos.get(k)!;
        resultado.push({ label: k, contas: cs, total: cs.reduce((s, c) => s + Number(c.valor), 0) });
        grupos.delete(k);
      }
    }
    if (grupos.has('CANCELADAS')) {
      const cs = grupos.get('CANCELADAS')!;
      resultado.push({ label: 'CANCELADAS', contas: cs, total: cs.reduce((s, c) => s + Number(c.valor), 0) });
    }
    return resultado;
  };
  const contasPendentesCount = filteredContas.filter(c => c.status === 'pendente').length;
  const contasVencidasCount = filteredContas.filter(c => c.status === 'vencido').length;
  const totalEmAberto = totalPendente + totalVencido;

  return (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative', overflow: 'hidden' }}>
    {/* Orbs */}
    <div style={{ position: 'fixed', top: '-200px', left: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
    <div style={{ position: 'fixed', bottom: '-150px', right: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

    <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="p-8 space-y-6">

        {/* Oasis Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Oasis › Contas a Pagar
            </p>
            <h1 style={{ fontSize: '2rem', fontFamily: 'Gilroy', fontWeight: 700, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              Contas a Pagar
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
              Controle de pagamentos e vencimentos
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)' }}>
              <button
                onClick={() => setModoCalendario(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: !modoCalendario ? '#8E5FCF' : 'transparent', color: !modoCalendario ? 'white' : '#6B7280' }}
              >
                ≡ Lista
              </button>
              <button
                onClick={() => setModoCalendario(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: modoCalendario ? '#8E5FCF' : 'transparent', color: modoCalendario ? 'white' : '#6B7280' }}
              >
                📅 Calendário
              </button>
            </div>
            {/* Nova Conta */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF 0%, #47118F 100%)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(142,95,207,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(142,95,207,0.4)'; }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  Nova Conta
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Conta a Pagar</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Input id="description" placeholder="Ex: Conta de luz" value={novaConta.descricao} onChange={e => setNovaConta({ ...novaConta, descricao: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={novaConta.categoria === '__nova__' ? '__nova__' : novaConta.categoria} onValueChange={value => {
                      if (value === '__nova__') { setNovaConta({ ...novaConta, categoria: '__nova__', supplier_name: '' }); setNovaCategoria(''); }
                      else { setNovaConta({ ...novaConta, categoria: value, supplier_name: value !== 'Fornecedores' ? '' : novaConta.supplier_name }); }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                        <SelectItem value="Aluguel">Aluguel</SelectItem>
                        <SelectItem value="Água">Água</SelectItem>
                        <SelectItem value="Energia">Energia</SelectItem>
                        <SelectItem value="Internet">Internet</SelectItem>
                        <SelectItem value="Telefone">Telefone</SelectItem>
                        <SelectItem value="Salários">Salários</SelectItem>
                        <SelectItem value="Impostos">Impostos</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Transporte">Transporte</SelectItem>
                        <SelectItem value="Seguros">Seguros</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                        <SelectItem value="__nova__">+ Nova categoria...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {novaConta.categoria === '__nova__' && <div className="grid gap-2"><Label htmlFor="nova-categoria">Nome da nova categoria *</Label><Input id="nova-categoria" placeholder="Digite o name da categoria" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} /></div>}
                  {novaConta.categoria === 'Fornecedores' && <div className="grid gap-2"><Label htmlFor="fornecedor">Fornecedor *</Label><Select value={novaConta.supplier_name} onValueChange={value => setNovaConta({ ...novaConta, supplier_name: value })}><SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger><SelectContent>{fornecedores.length === 0 ? <div className="py-2 px-2 text-sm text-muted-foreground text-center">Nenhum fornecedor cadastrado</div> : fornecedores.map(fornecedor => <SelectItem key={fornecedor.id} value={fornecedor.name}>{fornecedor.name}</SelectItem>)}<div className="border-t mt-1 pt-1"><button type="button" className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm flex items-center gap-2" onClick={() => navigate('/fornecedores')}><Plus className="h-4 w-4" />Cadastrar novo fornecedor</button></div></SelectContent></Select></div>}
                  <div className="grid gap-2">
                    <Label htmlFor="num_parcelas">Número de Parcelas *</Label>
                    <Input id="num_parcelas" type="number" min="1" max="48" placeholder="Ex: 1" value={numParcelasNovaConta} onChange={e => {
                      const num = Math.max(1, Math.min(48, parseInt(e.target.value) || 1));
                      setNumParcelasNovaConta(num);
                      setDatasVencimentoParcelas(prev => { const newDatas = [...prev]; while (newDatas.length < num) newDatas.push(undefined); return newDatas.slice(0, num); });
                      setValoresParcelas(prev => { const newValores = [...prev]; while (newValores.length < num) newValores.push(0); return newValores.slice(0, num); });
                    }} />
                  </div>
                  <div className="grid gap-4 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                    {Array.from({ length: numParcelasNovaConta }).map((_, index) => <div key={index} className="grid gap-3 p-3 bg-muted/30 rounded-lg">
                      <Label className="font-semibold text-primary">Parcela {index + 1}/{numParcelasNovaConta}</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2"><Label className="text-xs text-muted-foreground">Valor *</Label><Input type="text" inputMode="numeric" placeholder="0,00" value={valoresParcelas[index] ? valoresParcelas[index].toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} onChange={e => { const onlyNumbers = e.target.value.replace(/\D/g, ''); const numericValue = parseInt(onlyNumbers || '0', 10) / 100; setValoresParcelas(prev => { const newValores = [...prev]; newValores[index] = numericValue; return newValores; }); }} /></div>
                        <div className="grid gap-2"><Label className="text-xs text-muted-foreground">Data de Vencimento *</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("justify-start text-left font-normal h-10", !datasVencimentoParcelas[index] && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{datasVencimentoParcelas[index] ? format(datasVencimentoParcelas[index]!, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={datasVencimentoParcelas[index]} onSelect={date => { if (date) { setDatasVencimentoParcelas(prev => { const newDatas = [...prev]; newDatas[index] = date; return newDatas; }); } }} initialFocus className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>
                      </div>
                    </div>)}
                  </div>
                  {numParcelasNovaConta === 1 && <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"><div className="space-y-0.5"><Label htmlFor="recorrente" className="font-medium flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" />Conta Recorrente</Label><p className="text-xs text-muted-foreground">Provisionar automaticamente para os próximos meses</p></div><Switch id="recorrente" checked={isRecorrente} onCheckedChange={setIsRecorrente} /></div>}
                  {isRecorrente && numParcelasNovaConta === 1 && <div className="grid gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5"><Label htmlFor="meses_recorrencia">Provisionar para quantos meses?</Label><Input id="meses_recorrencia" type="number" min="2" max="60" placeholder="12" value={mesesRecorrencia} onChange={e => setMesesRecorrencia(Math.max(2, Math.min(60, parseInt(e.target.value) || 12)))} /><p className="text-xs text-muted-foreground">Serão criadas {mesesRecorrencia} contas com vencimento no mesmo dia de cada mês</p></div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label htmlFor="invoice_number">Nota Fiscal</Label><Input id="invoice_number" placeholder="Nº da nota fiscal" value={novaConta.invoice_number} onChange={e => setNovaConta({ ...novaConta, invoice_number: e.target.value })} /></div>
                    <div className="grid gap-2"><Label htmlFor="payment_method">Método de Pagamento</Label><Select value={novaConta.payment_method} onValueChange={value => setNovaConta({ ...novaConta, payment_method: value })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{metodosPagamento.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select></div>
                    {['boleto', 'pix'].includes(novaConta.payment_method.toLowerCase()) && <div className="grid gap-2 col-span-2"><Label htmlFor="payment_code">{novaConta.payment_method.toLowerCase() === 'boleto' ? 'Código de Barras' : 'Chave / Código PIX'}</Label><Textarea id="payment_code" placeholder={novaConta.payment_method.toLowerCase() === 'boleto' ? 'Cole o código de barras do boleto' : 'Cole a chave PIX ou código copia e cola'} value={novaConta.payment_code} onChange={e => setNovaConta({ ...novaConta, payment_code: e.target.value })} rows={2} /></div>}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSalvar}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <AlertasVencimento />

        {/* Filter Bar */}
        <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(142,95,207,0.12)', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Status pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['todos', 'pendente', 'vencido', 'pago'] as const).map(status => (
              <button key={status} onClick={() => setFilterStatus(status)} style={{ padding: '6px 16px', borderRadius: '20px', border: filterStatus === status ? 'none' : '1px solid rgba(142,95,207,0.2)', background: filterStatus === status ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent', color: filterStatus === status ? 'white' : '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: filterStatus === status ? '0 4px 12px rgba(142,95,207,0.3)' : 'none', transition: 'all 0.2s ease' }}>
                {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#9CA3AF' }} />
            <input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', paddingLeft: '34px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', borderRadius: '12px', border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#374151', outline: 'none', boxSizing: 'border-box' }} onFocus={e => { e.target.style.borderColor = '#8E5FCF'; e.target.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.15)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(142,95,207,0.2)'; e.target.style.boxShadow = 'none'; }} />
          </div>
          {/* Date Range */}
          <DateRangePicker
            value={dateRange.from || dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
            onChange={(range) => setDateRange({ from: range?.from, to: range?.to })}
            placeholder="Período"
            triggerClassName="h-9 text-xs"
          />
          {/* Categoria */}
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><Tag className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Categoria</SelectItem>{categoriasUnicas.sort().map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
          </Select>
          {/* Ordenação */}
          <Select value={ordenacao} onValueChange={setOrdenacao}>
            <SelectTrigger className="w-[150px] h-9 text-xs"><ArrowUpDown className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Ordenar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vencimento_asc">Vencimento ↓</SelectItem>
              <SelectItem value="vencimento_desc">Vencimento ↑</SelectItem>
              <SelectItem value="valor_desc">Maior valor</SelectItem>
              <SelectItem value="valor_asc">Menor valor</SelectItem>
            </SelectContent>
          </Select>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button onClick={() => { const contasPendentes = filteredContas.filter(c => c.status === 'pendente'); if (contasPendentes.length === 0) { toast({ title: "Nenhuma conta pendente", description: "Não há contas pendentes para exportar", variant: "destructive" }); return; } const events = contasPendentes.map(conta => createCalendarEventFromConta(conta)); downloadMultipleICSFile(events); toast({ title: "Exportado!", description: `${contasPendentes.length} conta(s) exportada(s) para o calendário` }); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}>
              <CalendarPlus style={{ width: '13px', height: '13px' }} />
              Exportar
            </button>
            <Sheet open={recorrentesSheetOpen} onOpenChange={setRecorrentesSheetOpen}>
              <SheetTrigger asChild>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: `1.5px solid ${recorrenciasComAlerta.length > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(142,95,207,0.2)'}`, background: 'rgba(255,255,255,0.6)', color: recorrenciasComAlerta.length > 0 ? '#F59E0B' : '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  <Repeat style={{ width: '13px', height: '13px' }} />
                  Recorrentes
                  {contasRecorrentes.length > 0 && <span style={{ marginLeft: '4px', background: 'rgba(142,95,207,0.15)', color: '#8E5FCF', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>{contasRecorrentes.length}</span>}
                  {recorrenciasComAlerta.length > 0 && <span style={{ marginLeft: '2px', background: '#F59E0B', color: 'white', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>{recorrenciasComAlerta.length}</span>}
                </button>
              </SheetTrigger>
              <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Gerenciar Contas Recorrentes</SheetTitle>
                </SheetHeader>
                
                {/* Alerta de recorrências acabando */}
                {recorrenciasComAlerta.length > 0 && <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-center gap-2 text-warning font-medium">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Atenção: {recorrenciasComAlerta.length} recorrência(s) acabando!</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Algumas contas recorrentes têm menos de 3 parcelas pendentes. Considere estender.
                    </p>
                  </div>}

                <div className="mt-6 space-y-4">
                  {contasRecorrentes.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                      <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma conta recorrente cadastrada</p>
                      <p className="text-sm mt-2">Marque "Conta Recorrente" ao criar uma nova conta</p>
                    </div> : contasRecorrentes.map(conta => {
                    const contasVinculadas = contas.filter(c => c.recurring_payable_id === conta.id);
                    const pendentes = contasVinculadas.filter(c => c.status === 'pendente').length;
                    const pagas = contasVinculadas.filter(c => c.status === 'pago').length;
                    const totalPendentesComMae = pendentes + (conta.status === 'pendente' ? 1 : 0);
                    const precisaEstender = totalPendentesComMae <= 3 && totalPendentesComMae > 0;
                    return <div key={conta.id} className={cn("liquid-glass p-4", precisaEstender && "border-warning/50")} style={precisaEstender ? { background: 'rgba(245,158,11,0.04)' } : undefined}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <RefreshCw className="h-4 w-4 text-primary" />
                                <p className="font-medium">{conta.descricao}</p>
                                {precisaEstender && <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                                    ⚠ Acabando
                                  </Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{conta.supplier_name}</p>
                              <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(Number(conta.valor))}/mês</p>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  Dia {new Date(conta.due_on + 'T00:00:00').getDate()}
                                </Badge>
                                <Badge variant="outline" style={{
                              backgroundColor: `${getCategoriaColor(conta.categoria)}20`,
                              borderColor: getCategoriaColor(conta.categoria),
                              color: getCategoriaColor(conta.categoria)
                            }} className="text-xs">
                                  {conta.categoria}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {totalPendentesComMae} pendentes • {pagas} pagas
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {precisaEstender && <Button variant="default" size="sm" className="bg-warning hover:bg-warning/90 text-warning-foreground" onClick={() => handleEstenderRecorrencia(conta)}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Estender
                                </Button>}
                              {!precisaEstender && <Button variant="outline" size="sm" onClick={() => handleEstenderRecorrencia(conta)}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Estender
                                </Button>}
                              <Button variant="outline" size="sm" onClick={() => handleEditarValorRecorrente(conta)}>
                                <Edit className="h-3 w-3 mr-1" />
                                Editar Valor
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDesmarcarRecorrente(conta)}>
                                Desmarcar
                              </Button>
                            </div>
                          </div>
                        </div>;
                  })}
                </div>
              </SheetContent>
            </Sheet>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}>
              <Upload style={{ width: '13px', height: '13px' }} />
              Importar
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}>
              <Download style={{ width: '13px', height: '13px' }} />
              Exportar
            </button>
            {/* END_ACTION_BUTTONS */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs px-2">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nova Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Conta a Pagar</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Input id="description" placeholder="Ex: Conta de luz" value={novaConta.descricao} onChange={e => setNovaConta({
                      ...novaConta,
                      descricao: e.target.value
                    })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={novaConta.categoria === '__nova__' ? '__nova__' : novaConta.categoria} onValueChange={value => {
                      if (value === '__nova__') {
                        setNovaConta({
                          ...novaConta,
                          categoria: '__nova__',
                          supplier_name: ''
                        });
                        setNovaCategoria('');
                      } else {
                        setNovaConta({
                          ...novaConta,
                          categoria: value,
                          supplier_name: value !== 'Fornecedores' ? '' : novaConta.supplier_name
                        });
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                        <SelectItem value="Aluguel">Aluguel</SelectItem>
                        <SelectItem value="Água">Água</SelectItem>
                        <SelectItem value="Energia">Energia</SelectItem>
                        <SelectItem value="Internet">Internet</SelectItem>
                        <SelectItem value="Telefone">Telefone</SelectItem>
                        <SelectItem value="Salários">Salários</SelectItem>
                        <SelectItem value="Impostos">Impostos</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Transporte">Transporte</SelectItem>
                        <SelectItem value="Seguros">Seguros</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                        <SelectItem value="__nova__">+ Nova categoria...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {novaConta.categoria === '__nova__' && <div className="grid gap-2">
                      <Label htmlFor="nova-categoria">Nome da nova categoria *</Label>
                      <Input id="nova-categoria" placeholder="Digite o name da categoria" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} />
                    </div>}
                  {novaConta.categoria === 'Fornecedores' && <div className="grid gap-2">
                      <Label htmlFor="fornecedor">Fornecedor *</Label>
                      <Select value={novaConta.supplier_name} onValueChange={value => setNovaConta({
                      ...novaConta,
                      supplier_name: value
                    })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.length === 0 ? <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                              Nenhum fornecedor cadastrado
                            </div> : fornecedores.map(fornecedor => <SelectItem key={fornecedor.id} value={fornecedor.name}>
                                {fornecedor.name}
                              </SelectItem>)}
                          <div className="border-t mt-1 pt-1">
                            <button type="button" className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm flex items-center gap-2" onClick={() => navigate('/fornecedores')}>
                              <Plus className="h-4 w-4" />
                              Cadastrar novo fornecedor
                            </button>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>}
                  <div className="grid gap-2">
                    <Label htmlFor="num_parcelas">Número de Parcelas *</Label>
                    <Input id="num_parcelas" type="number" min="1" max="48" placeholder="Ex: 1" value={numParcelasNovaConta} onChange={e => {
                      const num = Math.max(1, Math.min(48, parseInt(e.target.value) || 1));
                      setNumParcelasNovaConta(num);
                      // Ajustar arrays de datas e valores para o novo número de parcelas
                      setDatasVencimentoParcelas(prev => {
                        const newDatas = [...prev];
                        while (newDatas.length < num) {
                          newDatas.push(undefined);
                        }
                        return newDatas.slice(0, num);
                      });
                       setValoresParcelas(prev => {
                         const newValores = [...prev];
                         const valorBase = newValores[0] || 0;
                         while (newValores.length < num) {
                           newValores.push(valorBase);
                         }
                         return newValores.slice(0, num);
                       });
                     }} />
                   </div>
                   
                   {/* Campos dinâmicos de valor e data de vencimento por parcela */}
                   <div className="grid gap-4 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                     {Array.from({
                       length: numParcelasNovaConta
                     }).map((_, index) => <div key={index} className="grid gap-3 p-3 bg-muted/30 rounded-lg">
                         <Label className="font-semibold text-primary">Parcela {index + 1}/{numParcelasNovaConta}</Label>
                         <div className="grid grid-cols-2 gap-3">
                           <div className="grid gap-2">
                             <Label className="text-xs text-muted-foreground">Valor *</Label>
                             <Input type="text" inputMode="numeric" placeholder="0,00" value={valoresParcelas[index] ? valoresParcelas[index].toLocaleString('pt-BR', {
                             minimumFractionDigits: 2,
                             maximumFractionDigits: 2
                           }) : '0,00'} onChange={e => {
                             const onlyNumbers = e.target.value.replace(/\D/g, '');
                             const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                             setValoresParcelas(prev => {
                               const newValores = [...prev];
                               const valorAnterior = newValores[index] || 0;
                               newValores[index] = numericValue;
                               // Se for a parcela 1, propagar para as demais que ainda estão vazias ou iguais ao valor anterior
                               if (index === 0) {
                                 for (let i = 1; i < newValores.length; i++) {
                                   if (!newValores[i] || newValores[i] === valorAnterior) {
                                     newValores[i] = numericValue;
                                   }
                                 }
                               }
                               return newValores;
                             });
                           }} />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">Data de Vencimento *</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("justify-start text-left font-normal h-10", !datasVencimentoParcelas[index] && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {datasVencimentoParcelas[index] ? format(datasVencimentoParcelas[index]!, "dd/MM/yyyy", {
                                  locale: ptBR
                                }) : "Selecionar"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={datasVencimentoParcelas[index]} onSelect={date => {
                                if (date) {
                                  setDatasVencimentoParcelas(prev => {
                                    const newDatas = [...prev];
                                    newDatas[index] = date;
                                    return newDatas;
                                  });
                                }
                              }} initialFocus className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>)}
                  </div>

                  {/* Switch de Conta Recorrente */}
                  {numParcelasNovaConta === 1 && <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="recorrente" className="font-medium flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-primary" />
                          Conta Recorrente
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Provisionar automaticamente para os próximos meses
                        </p>
                      </div>
                      <Switch id="recorrente" checked={isRecorrente} onCheckedChange={setIsRecorrente} />
                    </div>}

                  {/* Campo de meses de recorrência */}
                  {isRecorrente && numParcelasNovaConta === 1 && <div className="grid gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <Label htmlFor="meses_recorrencia">Provisionar para quantos meses?</Label>
                      <Input id="meses_recorrencia" type="number" min="2" max="60" placeholder="12" value={mesesRecorrencia} onChange={e => setMesesRecorrencia(Math.max(2, Math.min(60, parseInt(e.target.value) || 12)))} />
                      <p className="text-xs text-muted-foreground">
                        Serão criadas {mesesRecorrencia} contas com vencimento no mesmo dia de cada mês
                      </p>
                    </div>}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="invoice_number">Nota Fiscal</Label>
                      <Input id="invoice_number" placeholder="Nº da nota fiscal" value={novaConta.invoice_number} onChange={e => setNovaConta({
                        ...novaConta,
                        invoice_number: e.target.value
                      })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="payment_method">Método de Pagamento</Label>
                      <Select value={novaConta.payment_method} onValueChange={value => setNovaConta({ ...novaConta, payment_method: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {metodosPagamento.map(m => (
                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {['boleto', 'pix'].includes(novaConta.payment_method.toLowerCase()) && (
                      <div className="grid gap-2 col-span-2">
                        <Label htmlFor="payment_code">
                          {novaConta.payment_method.toLowerCase() === 'boleto' ? 'Código de Barras' : 'Chave / Código PIX'}
                        </Label>
                        <Textarea
                          id="payment_code"
                          placeholder={novaConta.payment_method.toLowerCase() === 'boleto' ? 'Cole o código de barras do boleto' : 'Cole a chave PIX ou código copia e cola'}
                          value={novaConta.payment_code}
                          onChange={e => setNovaConta({ ...novaConta, payment_code: e.target.value })}
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSalvar}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'A Pagar', sub: `${contasPendentesCount} contas pendentes`, value: formatCurrency(totalPendente), icon: Clock, color: '#F59E0B', bg: 'linear-gradient(135deg, #F59E0B, #D97706)' },
            { label: 'Vencidas', sub: `${contasVencidasCount} contas vencidas`, value: formatCurrency(totalVencido), icon: AlertCircle, color: '#EF4444', bg: 'linear-gradient(135deg, #EF4444, #DC2626)' },
            { label: 'Pago', sub: 'Total pago', value: formatCurrency(totalPago), icon: CheckCircle, color: '#10B981', bg: 'linear-gradient(135deg, #10B981, #059669)' },
            { label: 'Total em Aberto', sub: 'Pendente + Vencido', value: formatCurrency(totalEmAberto), icon: Wallet, color: '#8E5FCF', bg: 'linear-gradient(135deg, #8E5FCF, #47118F)' },
          ].map((kpi, i) => {
            const KpiIcon = kpi.icon;
            const isHovered = hoveredKpi === i;
            return (
              <div key={i} onMouseEnter={() => setHoveredKpi(i)} onMouseLeave={() => setHoveredKpi(null)} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.8)', borderTop: `3px solid ${kpi.color}`, padding: '24px', boxShadow: isHovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)', transform: isHovered ? 'translateY(-4px)' : 'translateY(0)', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KpiIcon style={{ width: '20px', height: '20px', color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, margin: 0 }}>{kpi.label}</p>
                    <p style={{ fontSize: '1.5rem', fontFamily: 'Gilroy', fontWeight: 700, color: '#1F2937', margin: 0, lineHeight: 1.2 }}>{kpi.value}</p>
                    <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0, marginTop: '2px' }}>{kpi.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>



        {modoCalendario && (
          <CalendarioContas
            contas={filteredContas}
            formatCurrency={formatCurrency}
            onPagar={handleMarcarPago}
            onNovaConta={handleNovaContaNaData}
            onMoverConta={handleMoverConta}
            categoriasUnicas={categoriasUnicas}
          />
        )}

        {!modoCalendario && <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(142,95,207,0.12)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Contas a Pagar</h2>
                <Badge variant="outline">{sortedContas.length} contas</Badge>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span style={{ color: '#EF4444', fontFamily: 'Gilroy', fontWeight: 600 }}>Vencidas:</span>
                  <span style={{ color: '#EF4444', fontFamily: 'Gilroy', fontWeight: 700 }}>
                    {sortedContas.filter(c => c.status === 'vencido').reduce((acc, conta) => acc + Number(conta.valor), 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span style={{ color: '#F59E0B', fontFamily: 'Gilroy', fontWeight: 600 }}>Pendentes:</span>
                  <span style={{ color: '#F59E0B', fontFamily: 'Gilroy', fontWeight: 700 }}>
                    {sortedContas.filter(c => c.status === 'pendente').reduce((acc, conta) => acc + Number(conta.valor), 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span style={{ color: '#10B981', fontFamily: 'Gilroy', fontWeight: 600 }}>Pagas:</span>
                  <span style={{ color: '#10B981', fontFamily: 'Gilroy', fontWeight: 700 }}>
                    {sortedContas.filter(c => c.status === 'pago').reduce((acc, conta) => acc + Number(conta.valor), 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(142,95,207,0.08)', border: '1px solid rgba(142,95,207,0.2)' }}>
                  <span style={{ color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 600 }}>Total:</span>
                  <span style={{ color: '#8E5FCF', fontFamily: 'Gilroy', fontWeight: 700 }}>
                    {sortedContas.reduce((acc, conta) => acc + Number(conta.valor), 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {loading ? <TableSkeleton columns={5} rows={5} /> : (() => {
              const grupos = agruparContas(sortedContas);
              if (grupos.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(142,95,207,0.12), rgba(71,17,143,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle style={{ width: '32px', height: '32px', color: '#8E5FCF' }} />
                    </div>
                    <p style={{ fontFamily: 'Gilroy', fontWeight: 700, color: '#1F2937', margin: 0 }}>Nenhuma conta encontrada</p>
                    <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>Ajuste os filtros ou cadastre uma nova conta a pagar</p>
                  </div>
                );
              }
              return (
                <div>
                  {grupos.map(grupo => {
                    const grpColor = groupLabelColor[grupo.label] ?? '#6B7280';
                    return (
                      <div key={grupo.label}>

                        {/* ── Group separator ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 10px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Gilroy', textTransform: 'uppercase', letterSpacing: '0.1em', color: grpColor, whiteSpace: 'nowrap' }}>
                            {grupo.label}
                          </span>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(142,95,207,0.1)' }} />
                          <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontFamily: 'Gilroy', whiteSpace: 'nowrap' }}>
                            {formatCurrency(grupo.total)} · {grupo.contas.length} conta{grupo.contas.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* ── Cards ── */}
                        {grupo.contas.map(conta => {
                          const sColor = conta.status === 'vencido' ? '#EF4444' : conta.status === 'pago' ? '#10B981' : conta.status === 'cancelado' ? '#9CA3AF' : '#F59E0B';
                          const sBg    = conta.status === 'vencido' ? 'rgba(239,68,68,0.08)' : conta.status === 'pago' ? 'rgba(16,185,129,0.06)' : conta.status === 'cancelado' ? 'rgba(156,163,175,0.06)' : 'rgba(245,158,11,0.06)';
                          const hoje2  = startOfDay(new Date());
                          const vencDt = startOfDay(new Date(conta.due_on + 'T00:00:00'));
                          const diasAtraso = conta.status !== 'pago' ? Math.max(0, differenceInDays(hoje2, vencDt)) : 0;
                          const diasVencer = conta.status === 'pendente' ? Math.max(0, differenceInDays(vencDt, hoje2)) : 0;
                          const cs = catBadgeStyle(conta.categoria);

                          return (
                            <div key={conta.id}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(71,17,143,0.08)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(142,95,207,0.2)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(142,95,207,0.1)'; }}
                              style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.1)', borderLeft: `4px solid ${sColor}`, borderRadius: '16px', marginBottom: '8px', overflow: 'hidden', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', cursor: 'default', opacity: conta.status === 'pago' ? 0.85 : 1 }}>

                              {/* 1. Date block */}
                              <div style={{ width: '72px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', background: sBg, gap: '1px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Gilroy', lineHeight: 1, color: sColor }}>{format(parseDataString(conta.due_on), 'dd')}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'Gilroy', textTransform: 'uppercase', letterSpacing: '0.1em', color: sColor }}>{format(parseDataString(conta.due_on), 'MMM', { locale: ptBR })}</span>
                                <span style={{ fontSize: '0.6rem', color: '#9CA3AF', fontFamily: 'Gilroy', marginTop: '2px' }}>{format(parseDataString(conta.due_on), 'yyyy')}</span>
                              </div>

                              {/* Divider */}
                              <div style={{ width: '1px', background: 'rgba(142,95,207,0.08)', alignSelf: 'stretch', flexShrink: 0 }} />

                              {/* 2. Main info */}
                              <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937', fontSize: '0.95rem' }}>{conta.descricao}</span>
                                  {conta.parcela && !conta.parcela.endsWith('/1') && (
                                    <span style={{ background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', borderRadius: '20px', padding: '2px 8px', fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600 }}>{conta.parcela}</span>
                                  )}
                                  {conta.recorrente && (
                                    <span style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6', borderRadius: '20px', padding: '2px 8px', fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <RefreshCw style={{ width: '10px', height: '10px' }} />Recorrente
                                    </span>
                                  )}
                                  {conta.provisionada && (
                                    <span style={{ background: 'rgba(107,114,128,0.08)', color: '#6B7280', borderRadius: '20px', padding: '2px 8px', fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600 }}>Provisionada</span>
                                  )}
                                </div>
                                {conta.supplier_name !== conta.categoria && (
                                  <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy' }}>{conta.supplier_name}</span>
                                )}
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  {conta.invoice_number && (
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>NF: {conta.invoice_number}</span>
                                  )}
                                  {conta.status === 'pago' && conta.paid_on && (
                                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontFamily: 'Gilroy', fontWeight: 600 }}>
                                      Pago em: {format(parseDataString(conta.paid_on), 'dd/MM/yyyy', { locale: ptBR })}
                                    </span>
                                  )}
                                  {conta.status === 'vencido' && diasAtraso > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: '#EF4444', fontFamily: 'Gilroy', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <AlertTriangle style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                      {diasAtraso} dia{diasAtraso !== 1 ? 's' : ''} em atraso
                                    </span>
                                  )}
                                  {conta.status === 'pendente' && diasVencer > 0 && (
                                    <span style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: diasVencer > 7 ? '#10B981' : '#F59E0B' }}>
                                      Vence em {diasVencer} dia{diasVencer !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Divider */}
                              <div style={{ width: '1px', background: 'rgba(142,95,207,0.08)', alignSelf: 'stretch', flexShrink: 0 }} />

                              {/* 3. Category + status */}
                              <div style={{ width: '140px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 10px' }}>
                                {conta.categoria && (
                                  <span style={{ background: cs.bg, color: cs.color, borderRadius: '20px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Gilroy', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {conta.categoria}
                                  </span>
                                )}
                                <span style={{ background: `${sColor}18`, color: sColor, borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Gilroy', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {conta.status === 'vencido' ? (
                                    <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sColor, flexShrink: 0, animation: 'pulse 1.5s infinite' }} />Vencido</>
                                  ) : conta.status === 'pago' ? '✓ Pago'
                                    : conta.status === 'cancelado' ? 'Cancelado'
                                    : <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sColor, flexShrink: 0 }} />Pendente</>}
                                </span>
                              </div>

                              {/* Divider */}
                              <div style={{ width: '1px', background: 'rgba(142,95,207,0.08)', alignSelf: 'stretch', flexShrink: 0 }} />

                              {/* 4. Value */}
                              <div style={{ width: '130px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: '12px 16px' }}>
                                <span style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'Gilroy', color: conta.status === 'vencido' ? '#EF4444' : conta.status === 'pago' ? '#10B981' : '#1F2937' }}>
                                  {formatCurrency(Number(conta.valor))}
                                </span>
                              </div>

                              {/* Divider */}
                              <div style={{ width: '1px', background: 'rgba(142,95,207,0.08)', alignSelf: 'stretch', flexShrink: 0 }} />

                              {/* 5. Actions */}
                              <div style={{ width: '110px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 10px' }}>
                                {conta.status !== 'pago' && (
                                  <button
                                    onClick={() => abrirModalPagamento(conta)}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.3)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', borderRadius: '10px', padding: '7px 0', width: '88px', fontSize: '0.78rem', fontFamily: 'Gilroy', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    Pagar
                                  </button>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  {conta.status !== 'pago' && (
                                    <button title="Marcar como pago" onClick={() => abrirModalPagamento(conta)}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                      style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#10B981', transition: 'background 0.15s' }}>
                                      <CheckCircle style={{ width: '15px', height: '15px' }} />
                                    </button>
                                  )}
                                  <button title="Duplicar em parcelas" onClick={() => handleDuplicar(conta)}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(107,114,128,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#9CA3AF', transition: 'background 0.15s' }}>
                                    <Copy style={{ width: '15px', height: '15px' }} />
                                  </button>
                                  <button title="Editar" onClick={() => handleEdit(conta)}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#8E5FCF', transition: 'background 0.15s' }}>
                                    <Edit style={{ width: '15px', height: '15px' }} />
                                  </button>
                                  <button title="Excluir" onClick={() => handleDelete(conta.id)}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                    style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#EF4444', transition: 'background 0.15s' }}>
                                    <Trash2 style={{ width: '15px', height: '15px' }} />
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>}

      </div>
    </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-descricao">Descrição *</Label>
              <Input id="edit-descricao" placeholder="Ex: Conta de luz" value={editConta.descricao} onChange={e => setEditConta({
                ...editConta,
                descricao: e.target.value
              })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-categoria">Categoria *</Label>
              <Select value={editConta.categoria === '__nova__' ? '__nova__' : editConta.categoria} onValueChange={value => {
                if (value === '__nova__') {
                  setEditConta({
                    ...editConta,
                    categoria: '__nova__',
                    supplier_name: ''
                  });
                  setEditNovaCategoria('');
                } else {
                  setEditConta({
                    ...editConta,
                    categoria: value,
                    supplier_name: value !== 'Fornecedores' ? '' : editConta.supplier_name
                  });
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  <SelectItem value="Água">Água</SelectItem>
                  <SelectItem value="Energia">Energia</SelectItem>
                  <SelectItem value="Internet">Internet</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="Salários">Salários</SelectItem>
                  <SelectItem value="Impostos">Impostos</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Seguros">Seguros</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                  <SelectItem value="__nova__">+ Nova categoria...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editConta.categoria === '__nova__' && <div className="grid gap-2">
                <Label htmlFor="edit-nova-categoria">Nome da nova categoria *</Label>
                <Input id="edit-nova-categoria" placeholder="Digite o name da categoria" value={editNovaCategoria} onChange={e => setEditNovaCategoria(e.target.value)} />
              </div>}
            {editConta.categoria === 'Fornecedores' && <div className="grid gap-2">
                <Label htmlFor="edit-fornecedor">Fornecedor *</Label>
                <Select value={editConta.supplier_name} onValueChange={value => setEditConta({
                ...editConta,
                supplier_name: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.length === 0 ? <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                        Nenhum fornecedor cadastrado
                      </div> : fornecedores.map(fornecedor => <SelectItem key={fornecedor.id} value={fornecedor.name}>
                          {fornecedor.name}
                        </SelectItem>)}
                    <div className="border-t mt-1 pt-1">
                      <button type="button" className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm flex items-center gap-2" onClick={() => navigate('/fornecedores')}>
                        <Plus className="h-4 w-4" />
                        Cadastrar novo fornecedor
                      </button>
                    </div>
                  </SelectContent>
                </Select>
              </div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-valor">Valor *</Label>
                <Input id="edit-valor" type="text" inputMode="numeric" placeholder="0,00" value={editConta.valor ? editConta.valor.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) : '0,00'} onChange={e => {
                  const onlyNumbers = e.target.value.replace(/\D/g, '');
                  const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                  setEditConta({
                    ...editConta,
                    valor: numericValue
                  });
                }} />
              </div>
              <div className="grid gap-2">
                <Label>Data de Vencimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !editDataVencimento && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDataVencimento ? format(editDataVencimento, "dd/MM/yyyy", {
                        locale: ptBR
                      }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editDataVencimento} onSelect={date => date && setEditDataVencimento(date)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-invoice_number">Nota Fiscal</Label>
                <Input id="edit-invoice_number" placeholder="Nº da nota fiscal" value={editConta.invoice_number} onChange={e => setEditConta({
                  ...editConta,
                  invoice_number: e.target.value
                })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-parcela">Parcela</Label>
                <Input id="edit-parcela" placeholder="Ex: 1/7" value={editConta.parcela} onChange={e => setEditConta({
                  ...editConta,
                  parcela: e.target.value
                })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment_method">Método de Pagamento</Label>
              <Select value={editConta.payment_method} onValueChange={value => setEditConta({ ...editConta, payment_method: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {metodosPagamento.map(m => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {['boleto', 'pix'].includes(editConta.payment_method.toLowerCase()) && (
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="edit-payment_code">
                  {editConta.payment_method.toLowerCase() === 'boleto' ? 'Código de Barras' : 'Chave / Código PIX'}
                </Label>
                <Textarea
                  id="edit-payment_code"
                  placeholder={editConta.payment_method.toLowerCase() === 'boleto' ? 'Cole o código de barras do boleto' : 'Cole a chave PIX ou código copia e cola'}
                  value={editConta.payment_code}
                  onChange={e => setEditConta({ ...editConta, payment_code: e.target.value })}
                  rows={2}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Duplicação em Parcelas */}
      <Dialog open={duplicarDialogOpen} onOpenChange={setDuplicarDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicar em Parcelas</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {contaParaDuplicar && <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="font-medium">{contaParaDuplicar.descricao}</p>
                <p className="text-sm text-muted-foreground">{contaParaDuplicar.supplier_name}</p>
                <p className="text-sm font-semibold">{formatCurrency(Number(contaParaDuplicar.valor))}</p>
              </div>}
            <div className="grid gap-2">
              <Label htmlFor="num-parcelas">Número de Parcelas</Label>
              <Input id="num-parcelas" type="number" min={2} max={48} value={numParcelas} onChange={e => setNumParcelas(Math.max(2, parseInt(e.target.value) || 2))} />
              <p className="text-xs text-muted-foreground">
                Serão criadas {numParcelas} contas com vencimento mensal a partir de {contaParaDuplicar ? format(new Date(contaParaDuplicar.due_on + 'T00:00:00'), "dd/MM/yyyy", {
                  locale: ptBR
                }) : ''}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDuplicarDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarDuplicacao}>Criar {numParcelas} Parcelas</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação para Desmarcar Recorrente */}
      <AlertDialog open={confirmDesmarcarOpen} onOpenChange={(open) => {
        setConfirmDesmarcarOpen(open);
        if (!open) {
          setContaParaDesmarcar(null);
          setContasPendentesParaExcluir([]);
          setQuantidadeExcluir(0);
        }
      }}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Recorrente</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {contaParaDesmarcar && (
                  <div className="space-y-4">
                    <p>
                      Excluir contas de <strong>"{contaParaDesmarcar.descricao}"</strong>
                    </p>
                    
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-sm font-medium mb-2">
                        Total de contas pendentes: <span className="text-primary">{contasPendentesParaExcluir.length}</span>
                      </p>
                      
                      <div className="flex items-center gap-3">
                        <Label htmlFor="qtd-excluir" className="text-sm whitespace-nowrap">Excluir quantas:</Label>
                        <Input
                          id="qtd-excluir"
                          type="number"
                          min={1}
                          max={contasPendentesParaExcluir.length}
                          value={quantidadeExcluir}
                          onChange={(e) => setQuantidadeExcluir(Math.min(Math.max(1, parseInt(e.target.value) || 1), contasPendentesParaExcluir.length))}
                          className="w-20 h-8"
                        />
                        <span className="text-sm text-muted-foreground">de {contasPendentesParaExcluir.length}</span>
                      </div>
                    </div>

                    {contasPendentesParaExcluir.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        <div className="divide-y">
                          {contasPendentesParaExcluir.slice(0, quantidadeExcluir).map((conta, index) => (
                            <div key={conta.id} className="flex items-center justify-between px-3 py-2 text-sm bg-destructive/10">
                              <div className="flex items-center gap-2">
                                <Trash2 className="h-3 w-3 text-destructive" />
                                <span>{format(new Date(conta.due_on + 'T00:00:00'), "dd/MM/yyyy")}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(Number(conta.valor))}</span>
                            </div>
                          ))}
                          {contasPendentesParaExcluir.slice(quantidadeExcluir).map((conta) => (
                            <div key={conta.id} className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-muted-foreground" />
                                <span>{format(new Date(conta.due_on + 'T00:00:00'), "dd/MM/yyyy")}</span>
                              </div>
                              <span>{formatCurrency(Number(conta.valor))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-destructive font-medium">
                      Valor total a excluir: {formatCurrency(contasPendentesParaExcluir.slice(0, quantidadeExcluir).reduce((sum, c) => sum + Number(c.valor), 0))}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarDesmarcarRecorrente} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {quantidadeExcluir} conta(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Editar Valor da Recorrência */}
      <Dialog open={editarValorDialogOpen} onOpenChange={setEditarValorDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Valor da Recorrência</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {contaParaEditarValor && <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <p className="font-medium">{contaParaEditarValor.descricao}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{contaParaEditarValor.supplier_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Valor atual: <span className="font-semibold text-foreground">{formatCurrency(Number(contaParaEditarValor.valor))}</span>
                </p>
              </div>}
            <div className="grid gap-2">
              <Label htmlFor="novo-valor-recorrente">Novo Valor Mensal *</Label>
              <Input id="novo-valor-recorrente" type="text" inputMode="numeric" placeholder="0,00" value={novoValorRecorrente ? novoValorRecorrente.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) : '0,00'} onChange={e => {
                const onlyNumbers = e.target.value.replace(/\D/g, '');
                const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                setNovoValorRecorrente(numericValue);
              }} />
              <p className="text-xs text-muted-foreground">
                Este valor será aplicado na conta recorrente e em todas as contas provisionadas pendentes
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setEditarValorDialogOpen(false);
              setContaParaEditarValor(null);
            }}>Cancelar</Button>
            <Button onClick={confirmarEditarValorRecorrente}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Estender Recorrência */}
      <Dialog open={estenderDialogOpen} onOpenChange={setEstenderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Estender Recorrência</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {contaParaEstender && <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <p className="font-medium">{contaParaEstender.descricao}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{contaParaEstender.supplier_name}</p>
                <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(Number(contaParaEstender.valor))}/mês</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Parcelas pendentes atuais: {contas.filter(c => (c.recurring_payable_id === contaParaEstender.id || c.id === contaParaEstender.id) && c.status === 'pendente').length}
                </p>
              </div>}
            <div className="grid gap-2">
              <Label htmlFor="meses-estender">Quantos meses adicionar?</Label>
              <Input id="meses-estender" type="number" min="1" max="60" placeholder="6" value={mesesParaEstender} onChange={e => setMesesParaEstender(Math.max(1, Math.min(60, parseInt(e.target.value) || 6)))} />
              <p className="text-xs text-muted-foreground">
                Serão criadas {mesesParaEstender} novas contas provisionadas após a última data existente
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setEstenderDialogOpen(false);
              setContaParaEstender(null);
            }}>Cancelar</Button>
            <Button onClick={confirmarEstenderRecorrencia}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar {mesesParaEstender} Meses
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Pagamento ───────────────────────────────────────────── */}
      {modalPagamento && contaSelecionada && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalPagamento(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 80px rgba(71,17,143,0.18)', fontFamily: 'Gilroy' }}>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Registrar Pagamento</p>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2937', margin: 0 }}>{contaSelecionada.descricao}</h2>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>
                Vencimento: {format(new Date(contaSelecionada.due_on + 'T00:00:00'), 'dd/MM/yyyy')}
                {' · '}Valor original: <strong>{formatCurrency(Number((contaSelecionada as any).original_amount ?? contaSelecionada.valor))}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Data de pagamento */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Data de Pagamento</label>
                <input
                  type="date"
                  value={pagData}
                  onChange={e => {
                    setPagData(e.target.value);
                    const base = Number((contaSelecionada as any).original_amount ?? contaSelecionada.valor);
                    const venc = new Date(contaSelecionada.due_on + 'T00:00:00');
                    const pag  = new Date(e.target.value + 'T00:00:00');
                    const dias = Math.max(0, differenceInDays(pag, venc));
                    if (dias > 0) {
                      setPagMulta(parseFloat((base * 0.02).toFixed(2)));
                      setPagJuros(parseFloat((base * 0.01 * (dias / 30)).toFixed(2)));
                    } else {
                      setPagMulta(0);
                      setPagJuros(0);
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.25)', fontSize: '0.9rem', fontFamily: 'Gilroy', outline: 'none', background: 'rgba(142,95,207,0.04)' }}
                />
              </div>

              {/* Juros / Multa / Desconto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Juros (R$)', value: pagJuros, set: setPagJuros, color: '#EF4444' },
                  { label: 'Multa (R$)',  value: pagMulta, set: setPagMulta,  color: '#F59E0B' },
                  { label: 'Desconto (R$)', value: pagDesconto, set: setPagDesconto, color: '#10B981' },
                ].map(({ label, value, set, color }) => (
                  <div key={label}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>{label}</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={value}
                      onChange={e => set(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${color}33`, fontSize: '0.9rem', fontFamily: 'Gilroy', outline: 'none', background: `${color}08`, color }}
                    />
                  </div>
                ))}
              </div>

              {/* Forma de pagamento */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Forma de Pagamento</label>
                <select
                  value={pagForma}
                  onChange={e => setPagForma(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.25)', fontSize: '0.9rem', fontFamily: 'Gilroy', outline: 'none', background: 'rgba(142,95,207,0.04)', cursor: 'pointer' }}>
                  <option value="">Selecionar...</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto</option>
                  <option value="transferencia">Transferência</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              {/* Total preview */}
              <div style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.06))', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Total a pagar</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {formatCurrency(Number((contaSelecionada as any).original_amount ?? contaSelecionada.valor) + pagJuros + pagMulta - pagDesconto)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setModalPagamento(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'transparent', fontSize: '0.9rem', fontFamily: 'Gilroy', fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={confirmarPagamento}
                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontSize: '0.9rem', fontFamily: 'Gilroy', fontWeight: 700, cursor: 'pointer' }}>
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ContasAPagar;