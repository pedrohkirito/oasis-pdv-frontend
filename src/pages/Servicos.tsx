import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Trash2, Edit, Wrench, Repeat, TrendingUp, Settings2, Copy, ShoppingCart } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/components/layout/PageTransition';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useUserRole } from '@/hooks/useUserRole';
import { api } from '@/lib/api';
import { GerenciarCategoriasDialog, CategoriaDB } from '@/components/produtos/GerenciarCategoriasDialog';
import { RECORRENCIA_OPCOES, RecorrenciaTipo, labelRecorrencia, sufixoRecorrencia } from '@/lib/servicos';

interface Servico {
  id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  preco: number;
  custo: number | null;
  categoria: string | null;
  ativo: boolean | null;
  recorrente: boolean;
  recurrence_kind: string | null;
  created_at: string;
}

interface FormServico {
  nome: string;
  codigo: string;
  descricao: string;
  preco: number;
  custo: number;
  categoria: string;
  ativo: boolean;
  recorrente: boolean;
  recurrence_kind: RecorrenciaTipo | '';
}

const FORM_VAZIO: FormServico = {
  nome: '',
  codigo: '',
  descricao: '',
  preco: 0,
  custo: 0,
  categoria: '',
  ativo: true,
  recorrente: false,
  recurrence_kind: '',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const calcMargem = (preco: number, custo: number | null) => {
  if (!custo || custo <= 0 || preco <= 0) return null;
  return (preco - custo) / preco;
};

const getMargemBg = (percentual: number) => {
  if (percentual >= 0.4) return 'bg-emerald-500/10 border-emerald-500/30';
  if (percentual >= 0.2) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

const toolbarButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px',
  border: '1.5px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.6)', color: '#6B7280',
  fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
};

const Servicos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyId } = useEmpresa();
  const { hasPermission } = useUserRole();
  const podeGerenciar = hasPermission('canManageServicos');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<CategoriaDB[]>([]);
  const [vendidos, setVendidos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [filtroRecorrencia, setFiltroRecorrencia] = useState('todos');

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [form, setForm] = useState<FormServico>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Servico | null>(null);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);

  useEffect(() => {
    if (user && companyId) {
      fetchServicos();
      fetchCategorias();
      fetchUltimasVendas();
    } else if (!companyId) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companyId]);

  const fetchServicos = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await api
      .from('produtos')
      .select('id, nome, codigo, descricao, preco, custo, categoria, ativo, recorrente, recurrence_kind, created_at')
      .eq('company_id', companyId)
      .eq('tipo', 'servico')
      .order('nome', { ascending: true });
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar serviços', variant: 'destructive' });
    } else {
      setServicos((data || []) as Servico[]);
    }
    setLoading(false);
  };

  const fetchCategorias = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('categorias_produto')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo', 'servico')
      .order('nome');
    setCategoriasDB((data as CategoriaDB[]) || []);
  };

  // Última venda de cada item: usada na lista e para decidir entre excluir e desativar.
  const fetchUltimasVendas = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('itens_venda')
      .select('product_id, vendas!inner(sold_on, company_id)')
      .eq('vendas.company_id', companyId)
      .order('created_at', { ascending: false });
    const mapa: Record<string, string> = {};
    for (const item of (data || []) as any[]) {
      const dataVenda = item.vendas?.sold_on;
      if (dataVenda && !mapa[item.product_id]) mapa[item.product_id] = dataVenda;
    }
    setVendidos(mapa);
  };

  // Produtos e serviços compartilham a numeração de código.
  const gerarProximoCodigo = async () => {
    const { data } = await api.from('produtos').select('codigo').eq('company_id', companyId);
    let maxNum = 0;
    for (const p of (data || []) as { codigo: string | null }[]) {
      const num = parseInt(p.codigo || '0', 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return String(maxNum + 1).padStart(6, '0');
  };

  const codigoEmUso = async (codigo: string, ignorarId?: string) => {
    const { data } = await api
      .from('produtos')
      .select('id')
      .eq('company_id', companyId)
      .eq('codigo', codigo);
    return ((data || []) as { id: string }[]).some((p) => p.id !== ignorarId);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormOpen(true);
  };

  const abrirEdicao = (s: Servico) => {
    setEditando(s);
    setForm({
      nome: s.nome,
      codigo: s.codigo || '',
      descricao: s.descricao || '',
      preco: Number(s.preco),
      custo: Number(s.custo) || 0,
      categoria: s.categoria || '',
      ativo: s.ativo ?? true,
      recorrente: s.recorrente,
      recurrence_kind: (s.recurrence_kind as RecorrenciaTipo) || '',
    });
    setFormOpen(true);
  };

  const handleSalvar = async () => {
    if (!user || !companyId) return;
    if (!form.nome.trim() || !form.preco) {
      toast({ title: 'Erro', description: 'Preencha nome e preço.', variant: 'destructive' });
      return;
    }
    if (form.recorrente && !form.recurrence_kind) {
      toast({ title: 'Erro', description: 'Escolha a periodicidade do serviço recorrente.', variant: 'destructive' });
      return;
    }

    setSalvando(true);
    try {
      const codigo = form.codigo.trim() || (await gerarProximoCodigo());
      if (await codigoEmUso(codigo, editando?.id)) {
        toast({ title: 'Erro', description: `O código ${codigo} já está em uso por outro produto ou serviço.`, variant: 'destructive' });
        return;
      }

      const dados = {
        nome: form.nome.trim(),
        codigo,
        descricao: form.descricao.trim() || null,
        preco: form.preco,
        custo: form.custo || null,
        categoria: form.categoria || null,
        ativo: form.ativo,
        recorrente: form.recorrente,
        recurrence_kind: form.recorrente ? form.recurrence_kind || null : null,
      };

      const { error } = editando
        ? await api.from('produtos').update(dados).eq('id', editando.id)
        : await api.from('produtos').insert({
            ...dados,
            user_id: user.id,
            company_id: companyId,
            tipo: 'servico',
            estoque: null,
            minimum_stock: null,
            has_variants: false,
          });

      if (error) {
        toast({ title: 'Erro', description: 'Erro ao salvar serviço', variant: 'destructive' });
        return;
      }
      setFormOpen(false);
      fetchServicos();
      toast({ title: 'Sucesso!', description: editando ? 'Serviço atualizado' : 'Serviço cadastrado' });
    } finally {
      setSalvando(false);
    }
  };

  const handleDuplicar = async (s: Servico) => {
    if (!user || !companyId) return;
    const { error } = await api.from('produtos').insert({
      user_id: user.id,
      company_id: companyId,
      tipo: 'servico',
      nome: `${s.nome} (cópia)`,
      codigo: await gerarProximoCodigo(),
      descricao: s.descricao,
      preco: s.preco,
      custo: s.custo,
      categoria: s.categoria,
      ativo: true,
      recorrente: s.recorrente,
      recurrence_kind: s.recurrence_kind,
      estoque: null,
      has_variants: false,
    });
    if (error) toast({ title: 'Erro', description: 'Erro ao duplicar serviço', variant: 'destructive' });
    else fetchServicos();
  };

  const handleToggleAtivo = async (s: Servico) => {
    const { error } = await api.from('produtos').update({ ativo: !s.ativo }).eq('id', s.id);
    if (error) toast({ title: 'Erro', description: 'Erro ao atualizar status', variant: 'destructive' });
    else fetchServicos();
  };

  const handleExcluir = async (s: Servico) => {
    const { error } = await api.from('produtos').delete().eq('id', s.id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir serviço', variant: 'destructive' });
    } else {
      fetchServicos();
      toast({ title: 'Serviço excluído' });
    }
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return servicos.filter((s) => {
      if (termo && !(s.nome || '').toLowerCase().includes(termo) && !(s.codigo || '').toLowerCase().includes(termo)) return false;
      if (filtroCategoria !== 'todos' && s.categoria !== filtroCategoria) return false;
      if (filtroAtivo === 'ativo' && !s.ativo) return false;
      if (filtroAtivo === 'inativo' && s.ativo) return false;
      if (filtroRecorrencia === 'recorrente' && !s.recorrente) return false;
      if (filtroRecorrencia === 'avulso' && s.recorrente) return false;
      return true;
    });
  }, [servicos, busca, filtroCategoria, filtroAtivo, filtroRecorrencia]);

  const categoriasUsadas = useMemo(
    () => [...new Set([...categoriasDB.filter((c) => c.active !== false).map((c) => c.name), ...servicos.map((s) => s.categoria).filter(Boolean) as string[]])].sort(),
    [categoriasDB, servicos],
  );

  const ativos = servicos.filter((s) => s.ativo);
  const margens = ativos.map((s) => calcMargem(Number(s.preco), Number(s.custo))).filter((m): m is number => m != null);
  const margemMedia = margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : null;
  const receitaRecorrenteMensal = ativos
    .filter((s) => s.recorrente)
    .reduce((soma, s) => {
      const meses = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }[s.recurrence_kind as RecorrenciaTipo] ?? 0;
      return meses ? soma + Number(s.preco) / meses : soma;
    }, 0);

  const kpis = [
    { label: 'Serviços Ativos', value: ativos.length, icon: Wrench, color: '#8E5FCF', bg: 'linear-gradient(135deg, #8E5FCF, #47118F)' },
    { label: 'Recorrentes', value: ativos.filter((s) => s.recorrente).length, icon: Repeat, color: '#0EA5E9', bg: 'linear-gradient(135deg, #0EA5E9, #0284C7)' },
    { label: 'Tabela mensal (recorrentes)', value: formatCurrency(receitaRecorrenteMensal), icon: ShoppingCart, color: '#F59E0B', bg: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    { label: 'Margem Média', value: margemMedia == null ? '—' : `${(margemMedia * 100).toFixed(1)}%`, icon: TrendingUp, color: '#10B981', bg: 'linear-gradient(135deg, #10B981, #059669)' },
  ];

  const margemForm = calcMargem(form.preco, form.custo);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(142,95,207,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,17,143,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="p-4 md:p-8 space-y-6">
          {/* Cabeçalho */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontFamily: 'Gilroy', fontWeight: 500, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Oasis › Serviços
              </p>
              <h1 style={{ fontSize: '1.875rem', fontFamily: 'Gilroy', fontWeight: 800, background: 'linear-gradient(135deg, #47118F 0%, #8E5FCF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
                Serviços
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 500, marginTop: '4px' }}>
                Serviços avulsos e recorrentes vendidos pela loja
              </p>
            </div>
            {podeGerenciar && (
              <button
                onClick={abrirNovo}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                Novo Serviço
              </button>
            )}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="relative" style={{ flex: '1 1 240px', maxWidth: 360 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Categoria</SelectItem>
                {categoriasUsadas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroRecorrencia} onValueChange={setFiltroRecorrencia}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Cobrança" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Cobrança</SelectItem>
                <SelectItem value="avulso">Avulsos</SelectItem>
                <SelectItem value="recorrente">Recorrentes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroAtivo} onValueChange={setFiltroAtivo}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Status</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            {podeGerenciar && (
              <button onClick={() => setCategoriasOpen(true)} style={{ ...toolbarButtonStyle, marginLeft: 'auto' }}>
                <Settings2 style={{ width: '14px', height: '14px' }} />
                Categorias
              </button>
            )}
          </div>

          {/* KPIs */}
          <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="initial" animate="animate">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              const hovered = hoveredKpi === i;
              return (
                <motion.div key={kpi.label} variants={staggerItem}>
                  <div
                    onMouseEnter={() => setHoveredKpi(i)}
                    onMouseLeave={() => setHoveredKpi(null)}
                    style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', borderTop: `3px solid ${kpi.color}`, padding: '20px', boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.04)', transform: hovered ? 'translateY(-4px)' : 'none', transition: 'all 0.3s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: '20px', height: '20px', color: 'white' }} />
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

          {/* Lista */}
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(142,95,207,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1rem', color: '#1F2937', margin: 0 }}>Serviços</h2>
              <Badge variant="outline">{filtrados.length} serviços</Badge>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {loading ? (
                <TableSkeleton columns={5} rows={5} />
              ) : (
                <div className="space-y-3">
                  {filtrados.map((s) => {
                    const margem = calcMargem(Number(s.preco), Number(s.custo));
                    const ultimaVenda = vendidos[s.id];
                    return (
                      <div
                        key={s.id}
                        className={cn('group flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg transition-all duration-200 hover:bg-primary/5', !s.ativo && 'opacity-60')}
                        style={{ border: '1px solid rgba(142,95,207,0.08)' }}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(142,95,207,0.12)' }}>
                            {s.recorrente ? <Repeat className="h-5 w-5" style={{ color: '#8E5FCF' }} /> : <Wrench className="h-5 w-5" style={{ color: '#8E5FCF' }} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{s.nome}</p>
                              {s.codigo && <Badge variant="secondary" className="text-xs font-mono">{s.codigo}</Badge>}
                            </div>
                            {s.descricao && <p className="text-sm text-muted-foreground truncate max-w-[420px]">{s.descricao}</p>}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {s.custo ? <span>Custo: {formatCurrency(Number(s.custo))}</span> : null}
                              {ultimaVenda && (
                                <span className="flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  Últ. venda: {new Date(ultimaVenda + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {margem != null && (
                            <Badge variant="outline" className={cn('text-xs', getMargemBg(margem))}>{(margem * 100).toFixed(0)}%</Badge>
                          )}
                          <Badge variant="outline" className={s.recorrente ? 'bg-sky-500/10 border-sky-500 text-sky-600 gap-1' : ''}>
                            {s.recorrente && <Repeat className="h-3 w-3" />}
                            {s.recorrente ? labelRecorrencia(s.recurrence_kind) : 'Avulso'}
                          </Badge>
                          {s.categoria && <Badge variant="outline">{s.categoria}</Badge>}
                          {!s.ativo && <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}
                          <p className="font-bold text-foreground min-w-[110px] text-right">
                            {formatCurrency(Number(s.preco))}
                            <span className="text-xs font-normal text-muted-foreground">{sufixoRecorrencia(s)}</span>
                          </p>
                          {podeGerenciar && (
                            <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicar(s)} title="Duplicar">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEdicao(s)} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setParaExcluir(s)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filtrados.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #8E5FCF, #47118F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wrench style={{ width: '28px', height: '28px', color: 'white' }} />
                      </div>
                      <p style={{ fontFamily: 'Gilroy', fontWeight: 600, color: '#374151', margin: 0 }}>
                        {servicos.length === 0 ? 'Nenhum serviço cadastrado' : 'Nenhum serviço encontrado'}
                      </p>
                      <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>
                        {servicos.length === 0 ? 'Cadastre serviços como montagem, instalação ou manutenção.' : 'Tente ajustar os filtros.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cadastro / edição */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="srv-nome">Nome do Serviço *</Label>
                <Input id="srv-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Montagem de berço" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="srv-codigo">Código</Label>
                <Input id="srv-codigo" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Automático" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="srv-descricao">Descrição</Label>
              <Textarea id="srv-descricao" rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="O que está incluído no serviço" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="srv-preco">Preço *</Label>
                <Input id="srv-preco" type="number" min={0} step="0.01" value={form.preco || ''} onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="srv-custo">Custo</Label>
                <Input id="srv-custo" type="number" min={0} step="0.01" value={form.custo || ''} onChange={(e) => setForm({ ...form, custo: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            {margemForm != null && (
              <p className="text-xs text-muted-foreground">
                Margem: {formatCurrency(form.preco - form.custo)} ({(margemForm * 100).toFixed(1)}%)
              </p>
            )}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria || 'nenhuma'} onValueChange={(v) => setForm({ ...form, categoria: v === 'nenhuma' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem categoria</SelectItem>
                  {categoriasUsadas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="srv-recorrente">Serviço recorrente</Label>
                  <p className="text-xs text-muted-foreground">
                    Ao vender, o sistema gera uma conta a receber por período.
                  </p>
                </div>
                <Switch
                  id="srv-recorrente"
                  checked={form.recorrente}
                  onCheckedChange={(v) => setForm({ ...form, recorrente: v, recurrence_kind: v ? form.recurrence_kind || 'mensal' : '' })}
                />
              </div>
              {form.recorrente && (
                <div className="space-y-2">
                  <Label>Periodicidade *</Label>
                  <Select value={form.recurrence_kind} onValueChange={(v) => setForm({ ...form, recurrence_kind: v as RecorrenciaTipo })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {RECORRENCIA_OPCOES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">O preço informado vale para cada período.</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch id="srv-ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label htmlFor="srv-ativo">Serviço ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {companyId && (
        <GerenciarCategoriasDialog
          open={categoriasOpen}
          onOpenChange={setCategoriasOpen}
          companyId={companyId}
          tipo="servico"
          onCategoriasChange={() => { fetchCategorias(); fetchServicos(); }}
        />
      )}

      {/* Exclusão: serviço já vendido não é excluído, para não deixar vendas sem item. */}
      <AlertDialog open={!!paraExcluir} onOpenChange={(open) => !open && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{paraExcluir && vendidos[paraExcluir.id] ? 'Serviço já foi vendido' : 'Excluir serviço?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {paraExcluir && vendidos[paraExcluir.id]
                ? 'Este serviço aparece em vendas e não pode ser excluído. Você pode desativá-lo para que não apareça mais em novas vendas.'
                : 'Tem certeza que deseja excluir este serviço? Essa ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {paraExcluir && vendidos[paraExcluir.id] ? (
              paraExcluir.ativo ? (
                <Button onClick={() => { handleToggleAtivo(paraExcluir); setParaExcluir(null); }}>Desativar serviço</Button>
              ) : (
                <Button onClick={() => setParaExcluir(null)}>Entendi</Button>
              )
            ) : (
              <>
                <Button variant="outline" onClick={() => { if (paraExcluir) handleExcluir(paraExcluir); setParaExcluir(null); }}>
                  Sim, excluir
                </Button>
                <Button onClick={() => setParaExcluir(null)}>Não, manter</Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Servicos;
