import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Trash2, Edit, Package, Tag, Upload, BarChart3, AlertCircle, CheckCircle2, FileCode, FileSpreadsheet, Settings2, Copy, TrendingUp, TrendingDown, AlertTriangle, ShoppingCart, Layers } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import ExcelJS from 'exceljs';

import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { GerenciarCategoriasDialog, CategoriaDB } from '@/components/produtos/GerenciarCategoriasDialog';
import { ModalEtiquetas } from '@/components/etiquetas/ModalEtiquetas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GradeVariacoes } from '@/components/produtos/GradeVariacoes';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DonutChart } from '@/components/charts/DonutChart';
import { XmlImportDialog, ProdutoXml, FornecedorXml, DestinatarioXml } from '@/components/produtos/XmlImportDialog';

interface Fornecedor {
  id: string;
  nome: string;
}
interface Produto {
  id: string;
  user_id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  preco: number;
  custo: number | null;
  estoque: number | null;
  estoque_minimo: number | null;
  categoria: string | null;
  ativo: boolean | null;
  fornecedor_id: string | null;
  fornecedores: Fornecedor | null;
  ncm: string | null;
  cfop: string | null;
  origem: string | null;
  unidade_comercial: string | null;
  ean: string | null;
  tem_variacoes: boolean | null;
  created_at: string;
  updated_at: string;
}

interface UltimaVenda {
  produto_id: string;
  data_venda: string;
}

const FALLBACK_COLORS: Record<string, string> = {
  'Acessório': '#8b5cf6',
  'Berço': '#0ea5e9',
  'Blusas': '#ec4899',
  'Bolsa': '#06b6d4',
  'Calça': '#f59e0b',
  'Calçado': '#f97316',
  'Cama': '#7c3aed',
  'Cômoda': '#059669',
  'Conjunto': '#10b981',
  'Macacão': '#6366f1',
  'Móveis': '#2563eb',
  'Vestido': '#84cc16',
  'Outros': '#6b7280',
};

// Helpers de margem
const calcMargem = (preco: number, custo: number | null) => {
  if (!custo || custo <= 0 || preco <= 0) return null;
  const valor = preco - custo;
  const percentual = valor / preco;
  return { valor, percentual };
};

const getMargemColor = (percentual: number) => {
  if (percentual >= 0.4) return 'text-emerald-600 dark:text-emerald-400';
  if (percentual >= 0.2) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const getMargemBg = (percentual: number) => {
  if (percentual >= 0.4) return 'bg-emerald-500/10 border-emerald-500/30';
  if (percentual >= 0.2) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

const getEstoqueStatus = (estoque: number | null, estoqueMinimo: number | null) => {
  const qty = estoque ?? 0;
  const min = estoqueMinimo ?? 0;
  if (qty === 0) return 'zerado';
  if (min > 0 && qty <= min) return 'baixo';
  return 'ok';
};

const Produtos = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { empresaId } = useEmpresa();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [xmlImportDialogOpen, setXmlImportDialogOpen] = useState(false);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [modalEtiqueta, setModalEtiqueta] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [filterFornecedor, setFilterFornecedor] = useState<string>('todos');
  const [filterAtivo, setFilterAtivo] = useState<string>('todos');
  const [filterComEstoque, setFilterComEstoque] = useState(false);
  const [sortBy, setSortBy] = useState('nome_asc');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [editTab, setEditTab] = useState('informacoes');
  const [importedProdutos, setImportedProdutos] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [categoriasDialogOpen, setCategoriasDialogOpen] = useState(false);
  const [categoriasDB, setCategoriasDB] = useState<CategoriaDB[]>([]);
  const [ultimasVendas, setUltimasVendas] = useState<Record<string, string>>({});
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);

  const getCategoriaColor = (categoria: string | null): string => {
    if (!categoria) return FALLBACK_COLORS['Outros'];
    const cat = categoriasDB.find(c => c.nome === categoria);
    if (cat) return cat.cor;
    return FALLBACK_COLORS[categoria] || FALLBACK_COLORS['Outros'];
  };

  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    codigo: '',
    fornecedor_id: '',
    preco: 0,
    custo: 0,
    estoque: 0,
    estoque_minimo: 0,
    categoria: '',
    ativo: true,
    ncm: '',
    cfop: '5102',
    origem: '0',
    unidade_comercial: 'UN',
    ean: ''
  });
  const [editProduto, setEditProduto] = useState({
    nome: '',
    codigo: '',
    fornecedor_id: '',
    preco: 0,
    custo: 0,
    estoque: 0,
    estoque_minimo: 0,
    categoria: '',
    ativo: true,
    ncm: '',
    cfop: '5102',
    origem: '0',
    unidade_comercial: 'UN',
    ean: ''
  });
  const [eanSearch, setEanSearch] = useState('');
  const [eanSearching, setEanSearching] = useState(false);
  const [produtoEncontrado, setProdutoEncontrado] = useState<Produto | null>(null);
  const [createStep, setCreateStep] = useState<'search' | 'form'>('search');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchCategoriasDB = async () => {
    if (!empresaId) return;
    const { data } = await api
      .from('categorias_produto')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'produto')
      .order('nome');
    setCategoriasDB(data as CategoriaDB[] || []);
  };

  const fetchUltimasVendas = async () => {
    if (!empresaId) return;
    // Get the most recent sale date for each product via itens_venda
    const { data } = await api
      .from('itens_venda')
      .select('produto_id, venda_id, vendas!inner(data_venda, empresa_id)')
      .eq('vendas.empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (data) {
      const map: Record<string, string> = {};
      for (const item of data) {
        const prodId = item.produto_id;
        const dataVenda = (item as any).vendas?.data_venda;
        if (dataVenda && !map[prodId]) {
          map[prodId] = dataVenda;
        }
      }
      setUltimasVendas(map);
    }
  };

  useEffect(() => {
    if (user && empresaId) {
      fetchProdutos();
      fetchFornecedores();
      fetchCategoriasDB();
      fetchUltimasVendas();
    }
  }, [user, empresaId]);

  const fetchFornecedores = async () => {
    if (!empresaId) return;
    const { data } = await api.from('fornecedores').select('id, nome').eq('ativo', true).eq('empresa_id', empresaId).order('nome', { ascending: true });
    setFornecedores(data || []);
  };

  const fetchProdutos = async () => {
    if (!empresaId) return;
    setLoading(true);
    let allProducts: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await api
        .from('produtos')
        .select('*, fornecedores(id, nome)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'produto')
        .order('nome', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        toast({ title: "Erro", description: "Erro ao carregar produtos", variant: "destructive" });
        setLoading(false);
        return;
      }
      allProducts = allProducts.concat(data || []);
      hasMore = (data?.length || 0) === pageSize;
      from += pageSize;
    }
    setProdutos(allProducts);
    setLoading(false);
  };

  const gerarProximoCodigo = async () => {
    try {
      let allCodigos: string[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data } = await api.from('produtos').select('codigo').eq('empresa_id', empresaId).range(from, from + pageSize - 1);
        if (data) {
          allCodigos = allCodigos.concat(data.map(p => p.codigo || '0'));
        }
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      let maxNum = 0;
      for (const cod of allCodigos) {
        const num = parseInt(cod, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      return String(maxNum + 1).padStart(6, '0');
    } catch {
      return '000001';
    }
  };

  const handleBuscarProduto = async () => {
    if (!empresaId) return;
    setEanSearching(true);
    setProdutoEncontrado(null);

    // 1️⃣ Busca por EAN
    if (eanSearch.trim()) {
      const { data: byEan } = await api
        .from('produtos')
        .select('*, fornecedores(id, nome)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'produto')
        .eq('ean', eanSearch.trim())
        .limit(1);
      if (byEan && byEan.length > 0) {
        setProdutoEncontrado(byEan[0] as unknown as Produto);
        setEanSearching(false);
        toast({ title: "Produto encontrado!", description: `"${byEan[0].nome}" já cadastrado com este EAN.` });
        return;
      }
    }

    // 2️⃣ Busca por nome
    if (novoProduto.nome.trim()) {
      const { data: byName } = await api
        .from('produtos')
        .select('*, fornecedores(id, nome)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'produto')
        .ilike('nome', novoProduto.nome.trim())
        .limit(1);
      if (byName && byName.length > 0) {
        setProdutoEncontrado(byName[0] as unknown as Produto);
        setEanSearching(false);
        toast({ title: "Produto encontrado!", description: `"${byName[0].nome}" já cadastrado com este nome.` });
        return;
      }
    }

    // 3️⃣ Não encontrou → continuar para criação
    setEanSearching(false);
    setCreateStep('form');
    if (eanSearch.trim()) {
      setNovoProduto(prev => ({ ...prev, ean: eanSearch.trim() }));
    }
    toast({ title: "Produto não encontrado", description: "Preencha os dados para criar um novo produto." });
  };

  const handleSalvar = async () => {
    if (!novoProduto.nome || !novoProduto.preco || !user) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const codigoFinal = novoProduto.codigo.trim() || await gerarProximoCodigo();
    const { error } = await api.from('produtos').insert({
      user_id: user.id,
      empresa_id: empresaId,
      tipo: 'produto',
      nome: novoProduto.nome,
      codigo: codigoFinal,
      fornecedor_id: novoProduto.fornecedor_id || null,
      preco: novoProduto.preco,
      custo: novoProduto.custo || null,
      estoque: novoProduto.estoque || 0,
      estoque_minimo: novoProduto.estoque_minimo || 0,
      categoria: novoProduto.categoria || 'Outros',
      ativo: novoProduto.ativo,
      ncm: novoProduto.ncm || null,
      cfop: novoProduto.cfop || '5102',
      origem: novoProduto.origem || '0',
      unidade_comercial: novoProduto.unidade_comercial || 'UN',
      ean: novoProduto.ean || null
    });
    if (error) {
      toast({ title: "Erro", description: error.code === '23505' ? "Este código já está em uso" : "Erro ao cadastrar produto", variant: "destructive" });
    } else {
      resetCreateDialog();
      setDialogOpen(false);
      fetchProdutos();
      toast({ title: "Sucesso!", description: "Produto cadastrado com sucesso" });
    }
  };

  const resetCreateDialog = () => {
    setNovoProduto({ nome: '', codigo: '', fornecedor_id: '', preco: 0, custo: 0, estoque: 0, estoque_minimo: 0, categoria: '', ativo: true, ncm: '', cfop: '5102', origem: '0', unidade_comercial: 'UN', ean: '' });
    setEanSearch('');
    setProdutoEncontrado(null);
    setCreateStep('search');
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setEditProduto({
      nome: produto.nome,
      codigo: produto.codigo || '',
      fornecedor_id: produto.fornecedor_id || '',
      preco: Number(produto.preco),
      custo: Number(produto.custo) || 0,
      estoque: produto.estoque || 0,
      estoque_minimo: produto.estoque_minimo || 0,
      categoria: produto.categoria || '',
      ativo: produto.ativo ?? true,
      ncm: produto.ncm || '',
      cfop: produto.cfop || '5102',
      origem: produto.origem || '0',
      unidade_comercial: produto.unidade_comercial || 'UN',
      ean: produto.ean || ''
    });
    setEditTab('informacoes');
    setEditDialogOpen(true);
  };

  const handleAtivarVariacoes = async (produto: Produto) => {
    await api.from('produtos').update({ tem_variacoes: true }).eq('id', produto.id);
    fetchProdutos();
    setEditingProduto({ ...produto, tem_variacoes: true });
  };

  const handleSalvarEdicao = async () => {
    if (!editingProduto || !editProduto.nome || !editProduto.preco) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const codigoFinal = editProduto.codigo.trim() || await gerarProximoCodigo();
    const { error } = await api.from('produtos').update({
      nome: editProduto.nome,
      codigo: codigoFinal,
      fornecedor_id: editProduto.fornecedor_id || null,
      preco: editProduto.preco,
      custo: editProduto.custo || null,
      estoque: editProduto.estoque || 0,
      estoque_minimo: editProduto.estoque_minimo || 0,
      categoria: editProduto.categoria || 'Outros',
      ativo: editProduto.ativo,
      ncm: editProduto.ncm || null,
      cfop: editProduto.cfop || '5102',
      origem: editProduto.origem || '0',
      unidade_comercial: editProduto.unidade_comercial || 'UN'
    }).eq('id', editingProduto.id);
    if (error) {
      toast({ title: "Erro", description: error.code === '23505' ? "Este código já está em uso" : "Erro ao atualizar produto", variant: "destructive" });
    } else {
      setEditDialogOpen(false);
      setEditingProduto(null);
      fetchProdutos();
      toast({ title: "Sucesso!", description: "Produto atualizado com sucesso" });
    }
  };

  const [produtoToDelete, setProdutoToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await api.from('produtos').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir produto", variant: "destructive" });
    } else {
      fetchProdutos();
      toast({ title: "Sucesso!", description: "Produto excluído com sucesso" });
    }
  };

  const handleToggleAtivo = async (produto: Produto) => {
    const { error } = await api.from('produtos').update({ ativo: !produto.ativo }).eq('id', produto.id);
    if (error) {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    } else {
      fetchProdutos();
    }
  };

  const handleDuplicar = async (produto: Produto) => {
    if (!user) return;
    const novoCodigo = await gerarProximoCodigo();
    const { error } = await api.from('produtos').insert({
      user_id: user.id,
      empresa_id: empresaId,
      tipo: 'produto',
      nome: `${produto.nome} (cópia)`,
      codigo: novoCodigo,
      fornecedor_id: produto.fornecedor_id,
      preco: produto.preco,
      custo: produto.custo,
      estoque: 0,
      estoque_minimo: produto.estoque_minimo || 0,
      categoria: produto.categoria || 'Outros',
      ativo: true,
      ncm: produto.ncm,
      cfop: produto.cfop || '5102',
      origem: produto.origem || '0',
      unidade_comercial: produto.unidade_comercial || 'UN'
    });
    if (error) {
      toast({ title: "Erro", description: "Erro ao duplicar produto", variant: "destructive" });
    } else {
      fetchProdutos();
      toast({ title: "Sucesso!", description: "Produto duplicado com sucesso" });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Dados para o gráfico de produtos por fornecedor
  const CHART_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#10b981', '#f97316', '#6366f1', '#84cc16'];
  const produtosPorFornecedor = fornecedores.map((f, index) => ({
    name: f.nome,
    value: produtos.filter(p => p.fornecedor_id === f.id).length,
    color: CHART_COLORS[index % CHART_COLORS.length]
  })).filter(item => item.value > 0);
  const produtosSemFornecedor = produtos.filter(p => !p.fornecedor_id).length;
  if (produtosSemFornecedor > 0) {
    produtosPorFornecedor.push({ name: 'Sem Fornecedor', value: produtosSemFornecedor, color: '#6b7280' });
  }

  const normalizeHeader = (name: string): string => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").replace(/['"]/g, "").trim();
  };

  const findColIndex = (headers: string[], aliases: string[]): number => {
    const norm = headers.map(normalizeHeader);
    const normAliases = aliases.map(normalizeHeader);
    for (const a of normAliases) { const idx = norm.indexOf(a); if (idx !== -1) return idx; }
    for (const a of normAliases) { const idx = norm.findIndex(h => h.startsWith(a)); if (idx !== -1) return idx; }
    for (const a of normAliases) { const idx = norm.findIndex(h => h.includes(a)); if (idx !== -1) return idx; }
    return -1;
  };

  const parseNumericValue = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    let cleaned = value.toString().replace(/\s/g, '').replace(/[R$€$]/g, '');
    if (!cleaned) return null;
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastDot === -1 && lastComma === -1) return parseFloat(cleaned) || null;
    if (lastDot > lastComma) { cleaned = cleaned.replace(/,/g, ''); }
    else if (lastComma > lastDot) { cleaned = cleaned.replace(/\./g, '').replace(',', '.'); }
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const parseRows = (headers: string[], rows: string[][]) => {
    const nomeIndex = findColIndex(headers, ['nome', 'produto', 'descricao', 'descrição', 'description', 'item', 'mercadoria']);
    const precoIndex = findColIndex(headers, ['preco', 'preço', 'valor', 'price', 'preco_venda', 'preco venda', 'valor venda', 'valor unitario']);
    const custoIndex = findColIndex(headers, ['custo', 'cost', 'preco_custo', 'preco custo', 'valor custo']);
    const estoqueIndex = findColIndex(headers, ['estoque', 'quantidade', 'qtd', 'stock', 'qtde', 'quant', 'saldo']);
    const categoriaIndex = findColIndex(headers, ['categoria', 'category', 'grupo', 'tipo']);
    const fornecedorIndex = findColIndex(headers, ['fornecedor', 'supplier', 'fabricante', 'marca']);
    const codigoIndex = findColIndex(headers, ['codigo', 'código', 'code', 'sku', 'ref', 'referencia', 'referência', 'cod']);

    if (nomeIndex === -1 || precoIndex === -1) {
      toast({ title: "Erro", description: "O arquivo deve conter as colunas 'nome' e 'preco'", variant: "destructive" });
      return;
    }

    const parsedProdutos: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i];
      const nome = values[nomeIndex]?.trim();
      const preco = parseNumericValue(values[precoIndex]);
      if (!nome) { errors.push(`Linha ${i + 2}: Nome do produto é obrigatório`); continue; }
      if (preco === null || preco <= 0) { errors.push(`Linha ${i + 2}: Preço inválido para "${nome}"`); continue; }
      const custo = custoIndex !== -1 ? (parseNumericValue(values[custoIndex]) ?? 0) : 0;
      const estoque = estoqueIndex !== -1 ? (parseInt(String(values[estoqueIndex])) || 0) : 0;
      const categoria = categoriaIndex !== -1 ? values[categoriaIndex]?.trim() : 'Outros';
      const fornecedorNome = fornecedorIndex !== -1 ? values[fornecedorIndex]?.trim() : '';
      const codigo = codigoIndex !== -1 ? values[codigoIndex]?.trim() : '';
      const fornecedor = fornecedores.find(f => f.nome.toLowerCase() === fornecedorNome?.toLowerCase());
      parsedProdutos.push({ nome, preco, custo, estoque, categoria: categoria || 'Outros', codigo: codigo || null, fornecedor_id: fornecedor?.id || null, fornecedor_nome: fornecedorNome || null, ativo: true });
    }

    setImportedProdutos(parsedProdutos);
    setImportErrors(errors);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const sheet = workbook.worksheets[0];
          if (!sheet || sheet.rowCount < 1) { toast({ title: "Erro", description: "Planilha vazia ou sem dados", variant: "destructive" }); return; }
          const jsonData: string[][] = [];
          sheet.eachRow((row) => {
            jsonData.push(row.values ? (row.values as any[]).slice(1).map((v: any) => String(v ?? '')) : []);
          });
          if (jsonData.length < 2) { toast({ title: "Erro", description: "Planilha vazia ou sem dados suficientes", variant: "destructive" }); return; }
          const headers = jsonData[0].map((h: any) => String(h ?? '').trim().toLowerCase().replace(/['"]/g, ''));
          const rows = jsonData.slice(1).map((row: any[]) => row.map((cell: any) => String(cell ?? ''))).filter((row: string[]) => row.some(c => c.trim()));
          parseRows(headers, rows);
        } catch (err) {
          toast({ title: "Erro", description: "Não foi possível ler o arquivo Excel", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) { toast({ title: "Erro", description: "Arquivo vazio ou sem dados", variant: "destructive" }); return; }
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const rows = lines.slice(1).map(line => line.split(separator).map(v => v.trim().replace(/['"]/g, '')));
        parseRows(headers, rows);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleImportProdutos = async () => {
    if (!user || importedProdutos.length === 0) return;
    setImportLoading(true);
    let successCount = 0;
    let errorCount = 0;
    let nextCodeNum = 0;
    const needsCode = importedProdutos.some(p => !p.codigo);
    if (needsCode) {
      try {
        const { data } = await api.from('produtos').select('codigo').eq('empresa_id', empresaId);
        let maxNum = 0;
        if (data) { for (const p of data) { const num = parseInt(p.codigo || '0', 10); if (!isNaN(num) && num > maxNum) maxNum = num; } }
        nextCodeNum = maxNum + 1;
      } catch { nextCodeNum = 1; }
    }
    // O upsert casa por código; um código que já pertence a um serviço não pode
    // ser sobrescrito com dados de produto.
    const { data: servicosExistentes } = await api.from('produtos').select('codigo').eq('empresa_id', empresaId).eq('tipo', 'servico');
    const codigosServico = new Set(((servicosExistentes || []) as { codigo: string | null }[]).map(s => s.codigo).filter(Boolean));
    for (const produto of importedProdutos) {
      const codigo = produto.codigo || String(nextCodeNum++).padStart(6, '0');
      if (codigosServico.has(codigo)) { errorCount++; continue; }
      const { error } = await api.from('produtos').upsert({
        user_id: user.id,
        empresa_id: empresaId,
        nome: produto.nome,
        codigo,
        preco: produto.preco,
        custo: produto.custo || null,
        estoque: produto.estoque || 0,
        categoria: produto.categoria || 'Outros',
        fornecedor_id: produto.fornecedor_id,
        ativo: true
      }, { onConflict: 'empresa_id,codigo' });
      if (error) { errorCount++; } else { successCount++; }
    }
    setImportLoading(false);
    setImportDialogOpen(false);
    setImportedProdutos([]);
    setImportErrors([]);
    fetchProdutos();
    toast({ title: "Importação concluída", description: `${successCount} produtos importados com sucesso${errorCount > 0 ? `, ${errorCount} erros` : ''}` });
  };

  const handleXmlImport = async (produtosXml: ProdutoXml[], updateExisting: boolean, mergeStock: boolean, fornecedor?: FornecedorXml, destinatario?: DestinatarioXml) => {
    if (!user || !empresaId) return;

    let fornecedorId: string | null = null;

    if (fornecedor && empresaId) {
      const { data: existing } = await api.from('fornecedores').select('id').eq('empresa_id', empresaId).eq('cnpj', fornecedor.cnpj).maybeSingle();
      if (existing) {
        fornecedorId = existing.id;
      } else {
        const { data: newFornecedor, error: fornError } = await api.from('fornecedores').insert({
          user_id: user.id, empresa_id: empresaId, nome: fornecedor.nomeFantasia || fornecedor.razaoSocial, razao_social: fornecedor.razaoSocial, cnpj: fornecedor.cnpj, endereco: fornecedor.endereco || null, cidade: fornecedor.cidade || null, estado: fornecedor.estado || null, ativo: true,
        }).select('id').single();
        if (!fornError && newFornecedor) { fornecedorId = newFornecedor.id; fetchFornecedores(); }
      }
    }

    let successCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    let nextCodeNum = 0;
    {
      try {
        const { data } = await api.from('produtos').select('codigo').eq('empresa_id', empresaId);
        let maxNum = 0;
        if (data) { for (const p of data) { const num = parseInt(p.codigo || '0', 10); if (!isNaN(num) && num > maxNum) maxNum = num; } }
        nextCodeNum = maxNum + 1;
      } catch { nextCodeNum = 1; }
    }

    for (const produto of produtosXml) {
      if (produto.isDuplicate && produto.existingProductId) {
        const novoEstoque = (produto.existingStock ?? 0) + Math.floor(produto.quantidade);
        const updateData: Record<string, unknown> = {
          codigo_fornecedor: produto.codigo || null, ean: produto.ean || null, custo: produto.valorUnitario, ncm: produto.ncm || null, cfop: produto.cfop || '5102', origem: produto.origem || '0', unidade_comercial: produto.unidade || 'UN', estoque: novoEstoque,
        };
        if (produto.precoVenda && produto.precoVenda > 0) updateData.preco = produto.precoVenda;
        if (fornecedorId) updateData.fornecedor_id = fornecedorId;
        const { error } = await api.from('produtos').update(updateData).eq('id', produto.existingProductId);
        if (error) { errorCount++; } else { updateCount++; }
        continue;
      }

      const codigoSequencial = String(nextCodeNum).padStart(6, '0');
      nextCodeNum++;
      const { error } = await api.from('produtos').insert({
        user_id: user.id, empresa_id: empresaId, tipo: 'produto', nome: produto.nome, codigo: codigoSequencial, codigo_fornecedor: produto.codigo || null, ean: produto.ean || null, custo: produto.valorUnitario, preco: produto.precoVenda || produto.valorUnitario, ncm: produto.ncm || null, cfop: produto.cfop || '5102', origem: produto.origem || '0', unidade_comercial: produto.unidade || 'UN', estoque: Math.floor(produto.quantidade), fornecedor_id: fornecedorId, ativo: true
      });
      if (error) { errorCount++; } else { successCount++; }
    }

    fetchProdutos();

    // Auto-preencher dados fiscais da empresa com o destinatário do XML
    let fiscalUpdated = false;
    if (destinatario && empresaId) {
      const { data: fiscal } = await api.from('empresa_fiscal').select('id, cnpj').eq('empresa_id', empresaId).maybeSingle();
      if (fiscal) {
        if (fiscal.cnpj === destinatario.cnpj || !fiscal.cnpj) {
          const { error: fiscalError } = await api.from('empresa_fiscal').update({
            razao_social: destinatario.razaoSocial, inscricao_estadual: destinatario.inscricaoEstadual || fiscal.cnpj ? undefined : '', endereco_logradouro: destinatario.logradouro || undefined, endereco_numero: destinatario.numero || undefined, endereco_complemento: destinatario.complemento || undefined, endereco_bairro: destinatario.bairro || undefined, endereco_cidade: destinatario.cidade || undefined, endereco_uf: destinatario.estado || undefined, endereco_cep: destinatario.cep || undefined, endereco_codigo_municipio: destinatario.codigoMunicipio || undefined,
          }).eq('id', fiscal.id);
          if (!fiscalError) fiscalUpdated = true;
        }
      } else {
        const { error: fiscalError } = await api.from('empresa_fiscal').insert({
          user_id: user.id, empresa_id: empresaId, cnpj: destinatario.cnpj, razao_social: destinatario.razaoSocial, inscricao_estadual: destinatario.inscricaoEstadual || '', endereco_logradouro: destinatario.logradouro || '', endereco_numero: destinatario.numero || '', endereco_bairro: destinatario.bairro || '', endereco_cidade: destinatario.cidade || '', endereco_uf: destinatario.estado || '', endereco_cep: destinatario.cep || '', endereco_codigo_municipio: destinatario.codigoMunicipio || '',
        });
        if (!fiscalError) fiscalUpdated = true;
      }
    }

    let description = '';
    const parts = [];
    if (successCount > 0) parts.push(`${successCount} importados`);
    if (updateCount > 0) parts.push(`${updateCount} atualizados`);
    if (skipCount > 0) parts.push(`${skipCount} ignorados`);
    if (errorCount > 0) parts.push(`${errorCount} erros`);
    if (fornecedorId) parts.push('fornecedor vinculado');
    if (fiscalUpdated) parts.push('dados fiscais atualizados');
    description = parts.join(', ');
    toast({ title: "Importação XML concluída", description });
  };

  // Filtros
  const filteredProdutos = produtos.filter(produto => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = produto.nome.toLowerCase().includes(searchLower) ||
      produto.fornecedores?.nome?.toLowerCase().includes(searchLower) ||
      produto.codigo?.toLowerCase().includes(searchLower) ||
      produto.categoria?.toLowerCase().includes(searchLower);
    const matchCategoria = filterCategoria === 'todos' || produto.categoria === filterCategoria;
    const matchFornecedor = filterFornecedor === 'todos' || produto.fornecedor_id === filterFornecedor;
    const matchAtivo = filterAtivo === 'todos' || filterAtivo === 'ativo' && produto.ativo || filterAtivo === 'inativo' && !produto.ativo;
    const matchEstoque = !filterComEstoque || (produto.estoque || 0) > 0;
    return matchSearch && matchCategoria && matchFornecedor && matchAtivo && matchEstoque;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'nome_asc': return a.nome.localeCompare(b.nome);
      case 'nome_desc': return b.nome.localeCompare(a.nome);
      case 'codigo_asc': return parseInt(a.codigo || '0', 10) - parseInt(b.codigo || '0', 10);
      case 'codigo_desc': return parseInt(b.codigo || '0', 10) - parseInt(a.codigo || '0', 10);
      case 'preco_asc': return a.preco - b.preco;
      case 'preco_desc': return b.preco - a.preco;
      case 'estoque_desc': return (b.estoque ?? 0) - (a.estoque ?? 0);
      case 'estoque_asc': return (a.estoque ?? 0) - (b.estoque ?? 0);
      case 'recentes': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'antigos': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default: return 0;
    }
  });

  const categoriasUnicas = [...new Set(produtos.map(p => p.categoria).filter(Boolean))] as string[];

  // Dashboard stats
  const produtosAtivos = produtos.filter(p => p.ativo).length;
  const produtosSemEstoque = produtos.filter(p => p.ativo && (p.estoque ?? 0) === 0).length;
  const produtosEstoqueBaixo = produtos.filter(p => {
    const min = p.estoque_minimo ?? 0;
    const qty = p.estoque ?? 0;
    return p.ativo && min > 0 && qty > 0 && qty <= min;
  }).length;
  const margens = produtos.filter(p => p.ativo && p.custo && Number(p.custo) > 0 && Number(p.preco) > 0).map(p => {
    const m = calcMargem(Number(p.preco), Number(p.custo));
    return m ? m.percentual : 0;
  });
  const margemMedia = margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;

  const totalProdutos = filteredProdutos.length;
  const valorEstoque = filteredProdutos.reduce((sum, p) => sum + Number(p.preco) * (p.estoque || 0), 0);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative', overflow: 'hidden' }}>
    {/* Orbs */}
    <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(142,95,207,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
    <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,17,143,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

    <div style={{ position: 'relative', zIndex: 1 }}>
    <div className="p-8 space-y-6">

        {/* Oasis Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Oasis › Produtos
            </p>
            <h1 style={{ fontSize: '1.875rem', fontFamily: 'Gilroy', fontWeight: 800, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
              Produtos
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
              Catálogo, estoque e gestão de itens
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setModalEtiqueta(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: '1.5px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', color: '#47118F', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.1)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.3)'; }}
            >
              <Tag style={{ width: '16px', height: '16px' }} />
              Gerar Etiquetas
            </button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetCreateDialog(); }}>
              <DialogTrigger asChild>
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #8E5FCF 0%, #47118F 100%)', color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.4)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(142,95,207,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(142,95,207,0.4)'; }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  Novo Produto
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{createStep === 'search' ? 'Buscar / Novo Produto' : 'Cadastrar Produto'}</DialogTitle>
                </DialogHeader>

                {createStep === 'search' && (
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ean-search">Código de Barras (EAN)</Label>
                      <Input id="ean-search" placeholder="Leia ou digite o EAN" value={eanSearch} onChange={e => setEanSearch(e.target.value.replace(/\D/g, ''))} onKeyDown={e => { if (e.key === 'Enter') handleBuscarProduto(); }} autoFocus />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nome-search">ou Nome do Produto</Label>
                      <Input id="nome-search" placeholder="Ex: Vestido Floral" value={novoProduto.nome} onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') handleBuscarProduto(); }} />
                    </div>

                    {produtoEncontrado && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <span className="font-medium">Produto já cadastrado!</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">Nome:</span> {produtoEncontrado.nome}</p>
                          <p><span className="text-muted-foreground">Código:</span> {produtoEncontrado.codigo}</p>
                          <p><span className="text-muted-foreground">Preço:</span> {formatCurrency(produtoEncontrado.preco)}</p>
                          <p><span className="text-muted-foreground">Estoque:</span> {produtoEncontrado.estoque ?? 0}</p>
                        </div>
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => { handleEdit(produtoEncontrado); setDialogOpen(false); resetCreateDialog(); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar produto
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleBuscarProduto} disabled={eanSearching || (!eanSearch.trim() && !novoProduto.nome.trim())}>
                        <Search className="h-4 w-4 mr-2" />
                        {eanSearching ? 'Buscando...' : 'Buscar'}
                      </Button>
                      <Button variant="ghost" onClick={() => setCreateStep('form')}>
                        Pular busca
                      </Button>
                    </div>
                  </div>
                )}

                {createStep === 'form' && (
                  <>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2 col-span-2">
                          <Label htmlFor="nome">Nome do Produto *</Label>
                          <Input id="nome" placeholder="Ex: Vestido Floral" value={novoProduto.nome} onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="codigo">Código</Label>
                          <Input id="codigo" placeholder="Auto" value={novoProduto.codigo} onChange={e => setNovoProduto({ ...novoProduto, codigo: e.target.value.toUpperCase() })} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ean">EAN (Código de Barras)</Label>
                        <Input id="ean" placeholder="Ex: 7891234567890" value={novoProduto.ean} onChange={e => setNovoProduto({ ...novoProduto, ean: e.target.value.replace(/\D/g, '') })} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fornecedor">Fornecedor</Label>
                        <Select value={novoProduto.fornecedor_id} onValueChange={value => setNovoProduto({ ...novoProduto, fornecedor_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o fornecedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="preco">Preço de Venda *</Label>
                          <Input id="preco" type="text" inputMode="numeric" placeholder="0,00" value={novoProduto.preco ? novoProduto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} onChange={e => {
                            const onlyNumbers = e.target.value.replace(/\D/g, '');
                            const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                            setNovoProduto({ ...novoProduto, preco: numericValue });
                          }} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="custo">Custo</Label>
                          <Input id="custo" type="text" inputMode="numeric" placeholder="0,00" value={novoProduto.custo ? novoProduto.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} onChange={e => {
                            const onlyNumbers = e.target.value.replace(/\D/g, '');
                            const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                            setNovoProduto({ ...novoProduto, custo: numericValue });
                          }} />
                        </div>
                      </div>
                      {novoProduto.preco > 0 && novoProduto.custo > 0 && (() => {
                        const m = calcMargem(novoProduto.preco, novoProduto.custo);
                        if (!m) return null;
                        return (
                          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md border text-sm", getMargemBg(m.percentual))}>
                            <TrendingUp className="h-4 w-4" />
                            <span>Margem: {formatCurrency(m.valor)} ({(m.percentual * 100).toFixed(1)}%)</span>
                          </div>
                        );
                      })()}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="estoque">Estoque</Label>
                          <Input id="estoque" type="number" placeholder="0" value={novoProduto.estoque || ''} onChange={e => setNovoProduto({ ...novoProduto, estoque: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                          <Input id="estoque_minimo" type="number" placeholder="0" value={novoProduto.estoque_minimo || ''} onChange={e => setNovoProduto({ ...novoProduto, estoque_minimo: parseInt(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Categoria</Label>
                          <Select value={novoProduto.categoria} onValueChange={value => setNovoProduto({ ...novoProduto, categoria: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriasDB.filter(c => c.ativo).map(c => (
                                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end pb-1">
                          <div className="flex items-center gap-2">
                            <Switch id="ativo" checked={novoProduto.ativo} onCheckedChange={checked => setNovoProduto({ ...novoProduto, ativo: checked })} />
                            <Label htmlFor="ativo">Ativo</Label>
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-4 mt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Dados Fiscais (NFC-e)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="ncm">NCM</Label>
                            <Input id="ncm" placeholder="00000000" maxLength={8} value={novoProduto.ncm} onChange={e => setNovoProduto({ ...novoProduto, ncm: e.target.value.replace(/\D/g, '') })} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="cfop">CFOP</Label>
                            <Select value={novoProduto.cfop} onValueChange={value => setNovoProduto({ ...novoProduto, cfop: value })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5102">5102 - Venda merc. adquirida</SelectItem>
                                <SelectItem value="5101">5101 - Venda prod. próprio</SelectItem>
                                <SelectItem value="5405">5405 - Venda merc. ST</SelectItem>
                                <SelectItem value="5403">5403 - Venda prod. ST</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="grid gap-2">
                            <Label htmlFor="origem">Origem</Label>
                            <Select value={novoProduto.origem} onValueChange={value => setNovoProduto({ ...novoProduto, origem: value })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0 - Nacional</SelectItem>
                                <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                                <SelectItem value="2">2 - Estrangeira (adquirida no mercado interno)</SelectItem>
                                <SelectItem value="3">3 - Nacional (mais de 40% conteúdo estrangeiro)</SelectItem>
                                <SelectItem value="5">5 - Nacional (conteúdo importado inferior a 40%)</SelectItem>
                                <SelectItem value="8">8 - Nacional (conteúdo importado superior a 70%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="unidade">Unidade</Label>
                            <Select value={novoProduto.unidade_comercial} onValueChange={value => setNovoProduto({ ...novoProduto, unidade_comercial: value })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UN">UN - Unidade</SelectItem>
                                <SelectItem value="PC">PC - Peça</SelectItem>
                                <SelectItem value="CX">CX - Caixa</SelectItem>
                                <SelectItem value="KG">KG - Quilograma</SelectItem>
                                <SelectItem value="M">M - Metro</SelectItem>
                                <SelectItem value="PAR">PAR - Par</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2">
                      <Button variant="ghost" onClick={() => setCreateStep('search')}>← Voltar</Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setDialogOpen(false); resetCreateDialog(); }}>Cancelar</Button>
                        <Button onClick={handleSalvar}>Salvar</Button>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(142,95,207,0.15)', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9CA3AF' }} />
            <input
              placeholder="Buscar por nome, código ou categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy', fontSize: '0.875rem', color: '#374151', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#8E5FCF'; e.target.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(142,95,207,0.2)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[150px]">
              <Tag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Categoria</SelectItem>
              {categoriasUnicas.sort().map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAtivo} onValueChange={setFilterAtivo}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Fornecedor</SelectItem>
              {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome_asc">Nome (A → Z)</SelectItem>
              <SelectItem value="nome_desc">Nome (Z → A)</SelectItem>
              <SelectItem value="codigo_asc">Código (menor → maior)</SelectItem>
              <SelectItem value="codigo_desc">Código (maior → menor)</SelectItem>
              <SelectItem value="preco_asc">Preço (menor → maior)</SelectItem>
              <SelectItem value="preco_desc">Preço (maior → menor)</SelectItem>
              <SelectItem value="estoque_desc">Estoque (maior → menor)</SelectItem>
              <SelectItem value="estoque_asc">Estoque (menor → maior)</SelectItem>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigos">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Switch id="filter-estoque" checked={filterComEstoque} onCheckedChange={setFilterComEstoque} />
            <Label htmlFor="filter-estoque" className="text-sm whitespace-nowrap cursor-pointer">Com estoque</Label>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCategoriasDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <Settings2 style={{ width: '14px', height: '14px' }} />
              Categorias
            </button>
            <button
              onClick={() => setChartDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <BarChart3 style={{ width: '14px', height: '14px' }} />
              Relatório
            </button>
            <button
              onClick={() => setXmlImportDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <FileCode style={{ width: '14px', height: '14px' }} />
              XML
            </button>
            <button
              onClick={() => setImportDialogOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.4)'; e.currentTarget.style.color = '#47118F'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,95,207,0.2)'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <FileSpreadsheet style={{ width: '14px', height: '14px' }} />
              Excel/CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[
            { label: 'Produtos Ativos', value: produtosAtivos, icon: Package, color: '#8E5FCF', bg: 'linear-gradient(135deg, #8E5FCF, #47118F)' },
            { label: 'Sem Estoque', value: produtosSemEstoque, icon: AlertCircle, color: '#EF4444', bg: 'linear-gradient(135deg, #EF4444, #DC2626)' },
            { label: 'Estoque Baixo', value: produtosEstoqueBaixo, icon: AlertTriangle, color: '#F59E0B', bg: 'linear-gradient(135deg, #F59E0B, #D97706)' },
            { label: 'Margem Média', value: margens.length > 0 ? `${(margemMedia * 100).toFixed(1)}%` : '—', icon: TrendingUp, color: '#10B981', bg: 'linear-gradient(135deg, #10B981, #059669)' },
          ].map((kpi, i) => {
            const KpiIcon = kpi.icon;
            const isHovered = hoveredKpi === i;
            return (
              <motion.div key={i} variants={staggerItem}>
                <div
                  onMouseEnter={() => setHoveredKpi(i)}
                  onMouseLeave={() => setHoveredKpi(null)}
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', borderTop: `3px solid ${kpi.color}`, padding: '20px', boxShadow: isHovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)', transform: isHovered ? 'translateY(-4px)' : 'translateY(0)', transition: 'all 0.3s ease', cursor: 'default' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <KpiIcon style={{ width: '20px', height: '20px', color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, margin: 0 }}>{kpi.label}</p>
                      <p style={{ fontSize: '1.5rem', fontFamily: 'Gilroy', fontWeight: 800, color: '#1F2937', margin: 0, lineHeight: 1.2 }}>{kpi.value}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Lista de Produtos */}
        <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(142,95,207,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Produtos</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="outline">{filteredProdutos.length} produtos</Badge>
              <Badge variant="outline" className="text-primary">{formatCurrency(valorEstoque)} em estoque</Badge>
            </div>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {loading ? <TableSkeleton columns={5} rows={5} /> : <div className="space-y-3">
              {filteredProdutos.map(produto => {
                const margem = calcMargem(Number(produto.preco), Number(produto.custo));
                const estoqueStatus = getEstoqueStatus(produto.estoque, produto.estoque_minimo);
                const ultimaVenda = ultimasVendas[produto.id];

                return (
                  <div key={produto.id} className={cn("group flex items-center justify-between p-4 rounded-lg transition-all duration-200", !produto.ativo && "opacity-60")} style={{ border: '1px solid rgba(142,95,207,0.06)', background: 'transparent', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.04)'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.15)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(142,95,207,0.06)'; }}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${getCategoriaColor(produto.categoria)}20` }}>
                        <Package className="h-5 w-5" style={{ color: getCategoriaColor(produto.categoria) }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{produto.nome}</p>
                          {produto.codigo && (
                            <Badge variant="secondary" className="text-xs font-mono">{produto.codigo}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {produto.fornecedores?.nome || 'Sem fornecedor'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className={cn(
                            estoqueStatus === 'zerado' && 'text-red-500 font-medium',
                            estoqueStatus === 'baixo' && 'text-amber-500 font-medium'
                          )}>
                            {estoqueStatus === 'zerado' && '⚠ '}
                            {estoqueStatus === 'baixo' && '⚡ '}
                            Estoque: {produto.estoque || 0}
                            {(produto.estoque_minimo ?? 0) > 0 && ` (mín: ${produto.estoque_minimo})`}
                          </span>
                          {produto.custo && <span>Custo: {formatCurrency(Number(produto.custo))}</span>}
                          {ultimaVenda && (
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3" />
                              Últ. venda: {new Date(ultimaVenda + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Margem badge */}
                      {margem && (
                        <Badge variant="outline" className={cn("text-xs", getMargemBg(margem.percentual))}>
                          {(margem.percentual * 100).toFixed(0)}%
                        </Badge>
                      )}
                      {produto.tem_variacoes && (
                        <Badge variant="outline" className="bg-violet-500/10 border-violet-500 text-violet-600 gap-1">
                          <Layers className="h-3 w-3" />
                          Variações
                        </Badge>
                      )}
                      <Badge variant="outline" style={{
                        backgroundColor: `${getCategoriaColor(produto.categoria)}20`,
                        borderColor: getCategoriaColor(produto.categoria),
                        color: getCategoriaColor(produto.categoria)
                      }}>
                        {produto.categoria || 'Outros'}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        estoqueStatus === 'ok' && "bg-blue-500/10 border-blue-500 text-blue-500",
                        estoqueStatus === 'baixo' && "bg-amber-500/10 border-amber-500 text-amber-500",
                        estoqueStatus === 'zerado' && "bg-destructive/10 border-destructive text-destructive",
                      )}>
                        {estoqueStatus === 'ok' && 'Em estoque'}
                        {estoqueStatus === 'baixo' && 'Estoque baixo'}
                        {estoqueStatus === 'zerado' && 'Sem estoque'}
                      </Badge>
                      <p className="font-bold text-foreground min-w-[100px] text-right">
                        {formatCurrency(Number(produto.preco))}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicar(produto)} title="Duplicar">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(produto)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setProdutoToDelete(produto.id)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredProdutos.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package style={{ width: '28px', height: '28px', color: 'white' }} />
                  </div>
                  <p style={{ fontFamily: 'Gilroy', fontWeight: 600, color: '#374151', margin: 0 }}>Nenhum produto encontrado</p>
                  <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>Tente ajustar os filtros ou cadastre um novo produto</p>
                </div>
              )}
            </div>}
          </div>
        </div>
      </div>
    </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <Tabs value={editTab} onValueChange={setEditTab} className="w-full">
            <TabsList className="w-full mb-2">
              <TabsTrigger value="informacoes" className="flex-1">Informações</TabsTrigger>
              <TabsTrigger value="variacoes" className="flex-1">Variações</TabsTrigger>
            </TabsList>

            <TabsContent value="variacoes" className="mt-0">
              {editingProduto && !editingProduto.tem_variacoes ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <Layers className="h-12 w-12 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium text-foreground">Este produto não usa variações</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ative variações para gerenciar tamanhos, cores ou numeração individualmente.
                    </p>
                  </div>
                  <Button onClick={() => editingProduto && handleAtivarVariacoes(editingProduto)}>
                    Ativar variações para este produto
                  </Button>
                </div>
              ) : editingProduto ? (
                <GradeVariacoes
                  produtoId={editingProduto.id}
                  precoBase={editingProduto.preco}
                  precoCustoBase={editingProduto.custo ?? 0}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="informacoes" className="mt-0">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="edit-nome">Nome do Produto *</Label>
                <Input id="edit-nome" placeholder="Ex: Vestido Floral" value={editProduto.nome} onChange={e => setEditProduto({ ...editProduto, nome: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-codigo">Código</Label>
                <Input id="edit-codigo" placeholder="Auto" value={editProduto.codigo} onChange={e => setEditProduto({ ...editProduto, codigo: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-fornecedor">Fornecedor</Label>
              <Select value={editProduto.fornecedor_id} onValueChange={value => setEditProduto({ ...editProduto, fornecedor_id: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-preco">Preço de Venda *</Label>
                <Input id="edit-preco" type="text" inputMode="numeric" placeholder="0,00" value={editProduto.preco ? editProduto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} onChange={e => {
                  const onlyNumbers = e.target.value.replace(/\D/g, '');
                  const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                  setEditProduto({ ...editProduto, preco: numericValue });
                }} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-custo">Custo</Label>
                <Input id="edit-custo" type="text" inputMode="numeric" placeholder="0,00" value={editProduto.custo ? editProduto.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} onChange={e => {
                  const onlyNumbers = e.target.value.replace(/\D/g, '');
                  const numericValue = parseInt(onlyNumbers || '0', 10) / 100;
                  setEditProduto({ ...editProduto, custo: numericValue });
                }} />
              </div>
            </div>
            {/* Preview de margem no form de edição */}
            {editProduto.preco > 0 && editProduto.custo > 0 && (() => {
              const m = calcMargem(editProduto.preco, editProduto.custo);
              if (!m) return null;
              return (
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md border text-sm", getMargemBg(m.percentual))}>
                  <TrendingUp className="h-4 w-4" />
                  <span>Margem: {formatCurrency(m.valor)} ({(m.percentual * 100).toFixed(1)}%)</span>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-estoque">Estoque</Label>
                <Input id="edit-estoque" type="number" placeholder="0" value={editProduto.estoque || ''} onChange={e => setEditProduto({ ...editProduto, estoque: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-estoque-minimo">Estoque Mínimo</Label>
                <Input id="edit-estoque-minimo" type="number" placeholder="0" value={editProduto.estoque_minimo || ''} onChange={e => setEditProduto({ ...editProduto, estoque_minimo: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={editProduto.categoria} onValueChange={value => setEditProduto({ ...editProduto, categoria: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categoriasDB.filter(c => c.ativo || c.nome === editProduto.categoria).map(c => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos Fiscais */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Dados Fiscais (NFC-e)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-ncm">NCM</Label>
                  <Input id="edit-ncm" placeholder="00000000" maxLength={8} value={editProduto.ncm} onChange={e => setEditProduto({ ...editProduto, ncm: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-cfop">CFOP</Label>
                  <Select value={editProduto.cfop} onValueChange={value => setEditProduto({ ...editProduto, cfop: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5102">5102 - Venda merc. adquirida</SelectItem>
                      <SelectItem value="5101">5101 - Venda prod. próprio</SelectItem>
                      <SelectItem value="5405">5405 - Venda merc. ST</SelectItem>
                      <SelectItem value="5403">5403 - Venda prod. ST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-origem">Origem</Label>
                  <Select value={editProduto.origem} onValueChange={value => setEditProduto({ ...editProduto, origem: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Nacional</SelectItem>
                      <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                      <SelectItem value="2">2 - Estrangeira (adquirida no mercado interno)</SelectItem>
                      <SelectItem value="3">3 - Nacional (mais de 40% conteúdo estrangeiro)</SelectItem>
                      <SelectItem value="5">5 - Nacional (conteúdo importado inferior a 40%)</SelectItem>
                      <SelectItem value="8">8 - Nacional (conteúdo importado superior a 70%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unidade">Unidade</Label>
                  <Select value={editProduto.unidade_comercial} onValueChange={value => setEditProduto({ ...editProduto, unidade_comercial: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN - Unidade</SelectItem>
                      <SelectItem value="PC">PC - Peça</SelectItem>
                      <SelectItem value="CX">CX - Caixa</SelectItem>
                      <SelectItem value="KG">KG - Quilograma</SelectItem>
                      <SelectItem value="M">M - Metro</SelectItem>
                      <SelectItem value="PAR">PAR - Par</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="edit-ativo" checked={editProduto.ativo} onCheckedChange={checked => setEditProduto({ ...editProduto, ativo: checked })} />
              <Label htmlFor="edit-ativo">Produto ativo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao}>Salvar</Button>
          </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de Relatório/Gráfico */}
      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Produtos por Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {produtosPorFornecedor.length > 0 ? <div className="grid gap-6">
              <div>
                <DonutChart
                  data={produtosPorFornecedor}
                  valueFormatter={(v) => `${v} produto${v !== 1 ? 's' : ''}`}
                />
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={produtosPorFornecedor}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Produtos">
                      {produtosPorFornecedor.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                <h4 className="font-medium">Resumo</h4>
                <div className="grid gap-1 text-sm">
                  {produtosPorFornecedor.map((item, index) => <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value} produtos</span>
                  </div>)}
                </div>
              </div>
            </div> : <div className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado ainda</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação */}
      <Dialog open={importDialogOpen} onOpenChange={open => { setImportDialogOpen(open); if (!open) { setImportedProdutos([]); setImportErrors([]); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Produtos (Excel/CSV)</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo Excel (.xlsx, .xls) ou CSV</p>
                <p className="text-xs text-muted-foreground mt-1">O arquivo deve conter as colunas: <strong>nome</strong>, <strong>preco</strong> (obrigatórias), custo, estoque, categoria, fornecedor, codigo (opcionais)</p>
              </label>
            </div>
            {importErrors.length > 0 && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Erros encontrados:</span>
              </div>
              <ul className="text-sm text-destructive space-y-1">
                {importErrors.slice(0, 5).map((error, index) => <li key={index}>{error}</li>)}
                {importErrors.length > 5 && <li>...e mais {importErrors.length - 5} erros</li>}
              </ul>
            </div>}
            {importedProdutos.length > 0 && <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">{importedProdutos.length} produtos prontos para importar</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Nome</th>
                      <th className="text-left p-2">Preço</th>
                      <th className="text-left p-2">Estoque</th>
                      <th className="text-left p-2">Fornecedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedProdutos.slice(0, 10).map((produto, index) => <tr key={index} className="border-t">
                      <td className="p-2">{produto.nome}</td>
                      <td className="p-2">{formatCurrency(produto.preco)}</td>
                      <td className="p-2">{produto.estoque}</td>
                      <td className="p-2">{produto.fornecedor_nome || '-'}</td>
                    </tr>)}
                  </tbody>
                </table>
                {importedProdutos.length > 10 && <div className="p-2 text-center text-sm text-muted-foreground">...e mais {importedProdutos.length - 10} produtos</div>}
              </div>
            </div>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportProdutos} disabled={importedProdutos.length === 0 || importLoading}>
              {importLoading ? 'Importando...' : `Importar ${importedProdutos.length} produtos`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* XML Import Dialog */}
      <XmlImportDialog
        open={xmlImportDialogOpen}
        onOpenChange={setXmlImportDialogOpen}
        onImport={handleXmlImport}
        existingCodes={produtos.map(p => p.codigo).filter(Boolean) as string[]}
        existingProducts={produtos.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome, ean: (p as any).ean ?? null, codigo_fornecedor: (p as any).codigo_fornecedor ?? null, estoque: p.estoque ?? 0, preco: p.preco ?? 0 }))}
      />

      {/* Gerenciar Categorias Dialog */}
      {empresaId && (
        <GerenciarCategoriasDialog
          open={categoriasDialogOpen}
          onOpenChange={setCategoriasDialogOpen}
          empresaId={empresaId}
          onCategoriasChange={() => { fetchCategoriasDB(); fetchProdutos(); }}
        />
      )}

    <ModalEtiquetas
      open={modalEtiqueta}
      onOpenChange={setModalEtiqueta}
      produtos={filteredProdutos}
    />

    {/* Confirmação de exclusão de produto */}
    <AlertDialog open={!!produtoToDelete} onOpenChange={(open) => !open && setProdutoToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este produto? Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => { if (produtoToDelete) { handleDelete(produtoToDelete); setProdutoToDelete(null); } }} className="border-border bg-background text-foreground hover:bg-accent">
            Sim, excluir
          </Button>
          <Button onClick={() => setProdutoToDelete(null)}>
            Não, manter
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  );
};
export default Produtos;
