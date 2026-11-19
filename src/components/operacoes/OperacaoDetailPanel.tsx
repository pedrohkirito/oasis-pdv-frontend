import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Operacao, OperacaoTarefa, OperacaoHistorico, getStatusLabel, KANBAN_COLUMNS } from '@/hooks/useOperacoes';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, Truck, Wrench, Clock, MessageSquare, CheckCircle2, Circle, Trash2, Send, Pencil, Save, X, CalendarIcon, Package, Loader2, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface OperacaoDetailPanelProps {
  operacao: Operacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, newStatus: string, oldStatus: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: () => void;
}

interface ClienteContatos {
  telefone?: string | null;
  telefone_adicional?: string | null;
  email?: string | null;
}

interface ItemVendaDetalhado {
  id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  produto_nome: string;
  fornecedor_nome: string | null;
}

const TAILWIND_TO_HEX: Record<string, string> = {
  'bg-blue-500': '#3B82F6',
  'bg-yellow-500': '#EAB308',
  'bg-emerald-500': '#10B981',
  'bg-orange-500': '#F97316',
  'bg-indigo-500': '#6366F1',
  'bg-teal-500': '#14B8A6',
  'bg-purple-500': '#8B5CF6',
  'bg-green-600': '#16A34A',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#8E5FCF',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: 0,
};

const miniCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(142,95,207,0.1)',
  borderRadius: 10,
  padding: '10px 12px',
};

export function OperacaoDetailPanel({ operacao, open, onOpenChange, onStatusChange, onDelete, onUpdate }: OperacaoDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState<OperacaoTarefa[]>([]);
  const [historico, setHistorico] = useState<OperacaoHistorico[]>([]);
  const [novaObs, setNovaObs] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [savedObsFlash, setSavedObsFlash] = useState(false);
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [clienteContatos, setClienteContatos] = useState<ClienteContatos | null>(null);
  const [itensVenda, setItensVenda] = useState<ItemVendaDetalhado[]>([]);
  const [editForm, setEditForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    produtos: '',
    data_prevista: '',
    observacoes: '',
  });

  useEffect(() => {
    if (operacao) {
      setEditForm({
        cliente_nome: operacao.cliente_nome || '',
        cliente_telefone: operacao.cliente_telefone || '',
        cliente_email: operacao.cliente_email || '',
        produtos: operacao.produtos || '',
        data_prevista: operacao.data_prevista || '',
        observacoes: operacao.observacoes || '',
      });
      setEditing(false);
      // CRÍTICO: limpar campos transitórios ao trocar de operação para evitar
      // que o texto digitado em uma operação "vaze" para outra ao alternar cards.
      setNovaObs('');
      setTarefas([]);
      setHistorico([]);
      setClienteContatos(null);
      setItensVenda([]);
    }
  }, [operacao?.id]);

  useEffect(() => {
    if (operacao && open) {
      fetchTarefas();
      fetchHistorico();
      fetchClienteContatos();
      fetchItensVenda();
    }
  }, [operacao?.id, open]);

  const fetchItensVenda = async () => {
    if (!operacao?.venda_id) {
      setItensVenda([]);
      return;
    }
    const { data } = await api
      .from('sale_item')
      .select('id, quantidade, preco_unitario, subtotal, produto_id')
      .eq('sale_id', operacao.venda_id);

    if (!data || data.length === 0) {
      setItensVenda([]);
      return;
    }

    const produtoIds = data.map(i => i.produto_id);
    const { data: produtos } = await api
      .from('product')
      .select('id, name, fornecedor_id')
      .in('id', produtoIds);

    const fornecedorIds = (produtos || []).filter(p => p.fornecedor_id).map(p => p.fornecedor_id!);
    let fornecedoresMap: Record<string, string> = {};
    if (fornecedorIds.length > 0) {
      const { data: fornecedores } = await api
        .from('supplier')
        .select('id, name')
        .in('id', fornecedorIds);
      fornecedoresMap = (fornecedores || []).reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {} as Record<string, string>);
    }

    const produtosMap = (produtos || []).reduce((acc, p) => ({
      ...acc,
      [p.id]: { name: p.name, fornecedor_nome: p.fornecedor_id ? (fornecedoresMap[p.fornecedor_id] || null) : null }
    }), {} as Record<string, { name: string; fornecedor_nome: string | null }>);

    setItensVenda(data.map(item => ({
      id: item.id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal,
      produto_nome: produtosMap[item.produto_id]?.name || 'Produto',
      fornecedor_nome: produtosMap[item.produto_id]?.fornecedor_nome || null,
    })));
  };

  const fetchClienteContatos = async () => {
    if (!operacao?.empresa_id || !operacao?.cliente_nome) return;
    const { data } = await api
      .from('customer')
      .select('telefone, telefone_adicional, email')
      .eq('company_id', operacao.empresa_id)
      .eq('name', operacao.cliente_nome)
      .limit(1)
      .maybeSingle();
    setClienteContatos(data as ClienteContatos | null);
  };

  const fetchTarefas = async () => {
    if (!operacao) return;
    setLoadingTarefas(true);
    const { data } = await api
      .from('operation_task')
      .select('*')
      .eq('operation_id', operacao.id)
      .order('sort_order', { ascending: true });
    setTarefas((data || []) as unknown as OperacaoTarefa[]);
    setLoadingTarefas(false);
  };

  const fetchHistorico = async () => {
    if (!operacao) return;
    const { data } = await api
      .from('operation_event')
      .select('*')
      .eq('operation_id', operacao.id)
      .order('created_at', { ascending: false });
    setHistorico((data || []) as unknown as OperacaoHistorico[]);
  };

  const CHECKLIST_STATUS_MAP: Record<number, string> = {
    0: 'aguardando_fornecedor',
    1: 'produto_recebido',
    2: 'aguardando_agendamento',
    3: 'entrega_agendada',
    4: 'entregue',
    5: 'finalizado',
  };

  const toggleTarefa = async (tarefa: OperacaoTarefa) => {
    if (!user || !operacao) return;
    const concluida = !tarefa.concluida;
    await api
      .from('operation_task')
      .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null, concluida_por: concluida ? user.id : null } as any)
      .eq('id', tarefa.id);

    await api.from('operation_event').insert({
      operacao_id: operacao.id,
      kind: 'checklist',
      descricao: `${concluida ? '✅' : '⬜'} ${tarefa.titulo}`,
      user_id: user.id,
    } as any);

    if (concluida) {
      const nextStatus = CHECKLIST_STATUS_MAP[tarefa.ordem];
      if (nextStatus && nextStatus !== operacao.status) {
        onStatusChange(operacao.id, nextStatus, operacao.status);
        toast({ title: `Movido para "${getStatusLabel(nextStatus)}"` });
      }
    }

    fetchTarefas();
    fetchHistorico();
  };

  const MAX_OBS_LEN = 1000;
  const MIN_OBS_LEN = 2;

  const addObservacao = async () => {
    // Bloqueia clique duplicado em pleno salvamento.
    if (savingObs) return;

    const textoObs = novaObs.trim();

    // Validações extras antes de tocar no banco.
    if (!operacao || !user) {
      toast({ title: 'Operação não selecionada', variant: 'destructive' });
      return;
    }
    if (textoObs.length < MIN_OBS_LEN) {
      toast({
        title: 'Observação muito curta',
        description: `Digite pelo menos ${MIN_OBS_LEN} caracteres.`,
        variant: 'destructive',
      });
      return;
    }
    if (textoObs.length > MAX_OBS_LEN) {
      toast({
        title: 'Observação muito longa',
        description: `Limite de ${MAX_OBS_LEN} caracteres.`,
        variant: 'destructive',
      });
      return;
    }

    // Captura o ID da operação ATUAL no momento do clique para garantir
    // que a observação seja gravada exclusivamente nesta operação,
    // mesmo se o usuário trocar de card antes da requisição completar.
    const operacaoIdAtual = operacao.id;
    setSavingObs(true);

    try {
      const { error: histErr } = await api.from('operation_event').insert({
        operacao_id: operacaoIdAtual,
        kind: 'note',
        descricao: textoObs,
        user_id: user.id,
      } as any);

      if (histErr) throw histErr;

      // Atualiza o campo observacoes APENAS desta operação específica.
      const { error: updErr } = await api
        .from('operation')
        .update({ observacoes: textoObs } as any)
        .eq('id', operacaoIdAtual);

      if (updErr) throw updErr;

      setNovaObs('');
      // Só recarrega o histórico se ainda estivermos na mesma operação
      if (operacao?.id === operacaoIdAtual) {
        fetchHistorico();
      }
      toast({ title: '✅ Observação salva com sucesso' });
      setSavedObsFlash(true);
      setTimeout(() => setSavedObsFlash(false), 1800);
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar observação',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSavingObs(false);
    }
  };

  const saveEdits = async () => {
    if (!operacao) return;
    const { error } = await api
      .from('operation')
      .update({
        cliente_nome: editForm.cliente_nome,
        cliente_telefone: editForm.cliente_telefone || null,
        cliente_email: editForm.cliente_email || null,
        produtos: editForm.produtos,
        data_prevista: editForm.data_prevista || null,
        observacoes: editForm.observacoes || null,
      } as any)
      .eq('id', operacao.id);

    if (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
      return;
    }
    toast({ title: 'Operação atualizada' });
    setEditing(false);
    onUpdate?.();
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank');
  };

  if (!operacao) return null;

  const completedCount = tarefas.filter(t => t.concluida).length;
  const progress = tarefas.length > 0 ? Math.round((completedCount / tarefas.length) * 100) : 0;

  const currentCol = KANBAN_COLUMNS.find(c => c.id === operacao.status);
  const statusHex = currentCol ? (TAILWIND_TO_HEX[currentCol.color] || '#8E5FCF') : '#8E5FCF';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 overflow-hidden flex flex-col"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(250,250,252,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(142,95,207,0.15)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: 'linear-gradient(135deg, rgba(71,17,143,0.05), rgba(142,95,207,0.03))',
          borderBottom: '1px solid rgba(142,95,207,0.1)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <>
                  <input
                    style={{ fontSize: 18, fontWeight: 700, background: 'transparent', borderBottom: '2px solid #8E5FCF', outline: 'none', width: '100%', color: '#1F2937', fontFamily: 'inherit', paddingBottom: 2 }}
                    value={editForm.cliente_nome}
                    onChange={e => setEditForm(f => ({ ...f, cliente_nome: e.target.value }))}
                  />
                  <input
                    style={{ fontSize: 12, background: 'transparent', borderBottom: '1px solid rgba(142,95,207,0.3)', outline: 'none', width: '100%', color: '#6B7280', fontFamily: 'inherit', marginTop: 4, paddingBottom: 2 }}
                    value={editForm.produtos}
                    onChange={e => setEditForm(f => ({ ...f, produtos: e.target.value }))}
                    placeholder="Produtos..."
                  />
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {operacao.cliente_nome}
                  </h2>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {operacao.produtos}
                  </p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
              {editing ? (
                <>
                  <button onClick={saveEdits} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                    <Save style={{ width: 13, height: 13 }} />
                  </button>
                  <button onClick={() => setEditing(false)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E5FCF' }}>
                  <Pencil style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px', background: 'rgba(142,95,207,0.1)', border: '1px solid rgba(142,95,207,0.2)', color: '#8E5FCF', display: 'flex', alignItems: 'center', gap: 4 }}>
              {operacao.kind === 'entrega_montagem' ? <><Wrench style={{ width: 10, height: 10 }} /> Entrega + Montagem</> : <><Truck style={{ width: 10, height: 10 }} /> Entrega</>}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px', background: operacao.status_pagamento === 'pago' ? 'rgba(16,185,129,0.1)' : 'transparent', border: operacao.status_pagamento === 'pago' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(107,114,128,0.3)', color: operacao.status_pagamento === 'pago' ? '#059669' : '#6B7280' }}>
              {operacao.status_pagamento === 'pago' ? 'Pago' : 'Pagamento Pendente'}
            </span>
          </div>

          {/* Status changer */}
          <Select value={operacao.status} onValueChange={(v) => onStatusChange(operacao.id, v, operacao.status)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KANBAN_COLUMNS.map(col => (
                <SelectItem key={col.id} value={col.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', col.color)} />
                    {col.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Produtos da venda */}
            {itensVenda.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Package style={{ width: 13, height: 13, color: '#8E5FCF' }} />
                  <p style={sectionTitle}>Produtos</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {itensVenda.map(item => (
                    <div key={item.id} style={miniCard}>
                      <p style={{ fontSize: 13, color: '#1F2937', margin: 0 }}>
                        {item.quantidade}x {item.produto_nome}
                      </p>
                      {item.fornecedor_nome && (
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                          Fornecedor: {item.fornecedor_nome}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: 'rgba(142,95,207,0.08)', margin: '16px 0 0' }} />
              </div>
            )}

            {/* Contatos */}
            <div>
              <p style={{ ...sectionTitle, marginBottom: 10 }}>Contatos</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {editing ? (
                  <div style={miniCard}>
                    <input
                      style={{ fontSize: 13, background: 'transparent', borderBottom: '1px solid rgba(142,95,207,0.2)', outline: 'none', width: '100%', color: '#1F2937', fontFamily: 'inherit', paddingBottom: 2, marginBottom: 8 }}
                      value={editForm.cliente_telefone}
                      onChange={e => setEditForm(f => ({ ...f, cliente_telefone: e.target.value }))}
                      placeholder="Telefone do cliente"
                    />
                    <input
                      style={{ fontSize: 13, background: 'transparent', borderBottom: '1px solid rgba(142,95,207,0.2)', outline: 'none', width: '100%', color: '#1F2937', fontFamily: 'inherit', paddingBottom: 2 }}
                      value={editForm.cliente_email}
                      onChange={e => setEditForm(f => ({ ...f, cliente_email: e.target.value }))}
                      placeholder="Email do cliente"
                    />
                  </div>
                ) : (
                  <>
                    {(operacao.cliente_telefone || clienteContatos?.telefone) && (
                      <div style={{ ...miniCard, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone style={{ width: 13, height: 13, color: '#8E5FCF', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                          Cliente: {operacao.cliente_telefone || clienteContatos?.telefone}
                        </span>
                        <button
                          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}
                          onClick={() => openWhatsApp((operacao.cliente_telefone || clienteContatos?.telefone)!)}
                        >
                          <MessageSquare style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    )}
                    {clienteContatos?.telefone_adicional && (
                      <div style={{ ...miniCard, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone style={{ width: 13, height: 13, color: '#8E5FCF', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                          Adicional: {clienteContatos.telefone_adicional}
                        </span>
                        <button
                          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}
                          onClick={() => openWhatsApp(clienteContatos.telefone_adicional!)}
                        >
                          <MessageSquare style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    )}
                    {(operacao.cliente_email || clienteContatos?.email) && (
                      <div style={{ ...miniCard, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mail style={{ width: 13, height: 13, color: '#8E5FCF', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#374151' }}>{operacao.cliente_email || clienteContatos?.email}</span>
                      </div>
                    )}
                    {operacao.fornecedor_nome && (
                      <div style={{ ...miniCard, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Truck style={{ width: 13, height: 13, color: '#8E5FCF', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#374151' }}>Fornecedor: {operacao.fornecedor_nome}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />

            {/* Datas */}
            <div>
              <p style={{ ...sectionTitle, marginBottom: 10 }}>Datas</p>
              {editing ? (
                <div style={miniCard}>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Data prevista</p>
                  <input
                    type="date"
                    style={{ fontSize: 13, background: 'transparent', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 8, padding: '5px 8px', width: '100%', color: '#1F2937', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    value={editForm.data_prevista}
                    onChange={e => setEditForm(f => ({ ...f, data_prevista: e.target.value }))}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {operacao.data_prevista && (
                    <div style={miniCard}>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 3px' }}>Prevista</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{format(new Date(operacao.data_prevista), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  )}
                  {operacao.data_entrega && (
                    <div style={miniCard}>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 3px' }}>Entrega</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{format(new Date(operacao.data_entrega), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  )}
                  {operacao.data_montagem && (
                    <div style={miniCard}>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 3px' }}>Montagem</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', margin: 0 }}>{format(new Date(operacao.data_montagem), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />

            {/* Checklist */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={sectionTitle}>Checklist</p>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{completedCount}/{tarefas.length} ({progress}%)</span>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: 5, background: 'rgba(142,95,207,0.12)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #47118F, #8E5FCF)', borderRadius: 999, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {tarefas.map(tarefa => (
                  <div key={tarefa.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => toggleTarefa(tarefa)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none', background: tarefa.concluida ? 'rgba(142,95,207,0.06)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                    >
                      {tarefa.concluida ? (
                        <CheckCircle2 style={{ width: 16, height: 16, color: '#8E5FCF', flexShrink: 0 }} />
                      ) : (
                        <Circle style={{ width: 16, height: 16, color: '#D1D5DB', flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: 13, color: tarefa.concluida ? '#9CA3AF' : '#374151', textDecoration: tarefa.concluida ? 'line-through' : 'none', fontFamily: 'inherit' }}>
                        {tarefa.titulo}
                      </span>
                    </button>
                    {tarefa.ordem === 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#8E5FCF', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', flexShrink: 0 }}>
                            <CalendarIcon style={{ width: 11, height: 11 }} />
                            {operacao.data_prevista
                              ? format(new Date(operacao.data_prevista), 'dd/MM/yy', { locale: ptBR })
                              : 'Data'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={operacao.data_prevista ? new Date(operacao.data_prevista) : undefined}
                            onSelect={async (date) => {
                              if (!date || !operacao) return;
                              const dateStr = format(date, 'yyyy-MM-dd');
                              await api
                                .from('operation')
                                .update({ data_prevista: dateStr } as any)
                                .eq('id', operacao.id);
                              onUpdate?.();
                              toast({ title: `Data de entrega: ${format(date, 'dd/MM/yyyy', { locale: ptBR })}` });
                            }}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />

            {/* Observações */}
            <div>
              <p style={{ ...sectionTitle, marginBottom: 10 }}>Observações</p>
              <Textarea
                placeholder={`Adicionar observação para ${operacao.cliente_nome}...`}
                value={novaObs}
                onChange={e => setNovaObs(e.target.value.slice(0, MAX_OBS_LEN))}
                disabled={savingObs}
                maxLength={MAX_OBS_LEN}
                className="text-sm min-h-[72px]"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: savedObsFlash
                    ? '1px solid rgba(16,185,129,0.55)'
                    : '1px solid rgba(142,95,207,0.2)',
                  borderRadius: 10,
                  opacity: savingObs ? 0.7 : 1,
                  transition: 'border-color 0.25s',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: novaObs.length > MAX_OBS_LEN * 0.9 ? '#F59E0B' : '#9CA3AF' }}>
                  {novaObs.length}/{MAX_OBS_LEN}
                </span>
                <button
                  onClick={addObservacao}
                  disabled={savingObs || novaObs.trim().length < MIN_OBS_LEN}
                  aria-busy={savingObs}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', fontSize: 13, fontWeight: 600,
                    borderRadius: 10,
                    border: savedObsFlash ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(142,95,207,0.25)',
                    background: savedObsFlash
                      ? 'rgba(16,185,129,0.12)'
                      : (savingObs || novaObs.trim().length < MIN_OBS_LEN)
                        ? 'rgba(142,95,207,0.08)'
                        : 'linear-gradient(135deg, #47118F, #8E5FCF)',
                    color: savedObsFlash
                      ? '#059669'
                      : (savingObs || novaObs.trim().length < MIN_OBS_LEN)
                        ? '#9CA3AF'
                        : '#fff',
                    cursor: (savingObs || novaObs.trim().length < MIN_OBS_LEN) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                    minWidth: 170, justifyContent: 'center',
                  }}
                >
                  {savingObs ? (
                    <>
                      <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                      Salvando...
                    </>
                  ) : savedObsFlash ? (
                    <>
                      <Check style={{ width: 13, height: 13 }} />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Save style={{ width: 13, height: 13 }} />
                      Salvar observação
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(142,95,207,0.08)' }} />

            {/* Histórico */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Clock style={{ width: 13, height: 13, color: '#8E5FCF' }} />
                <p style={sectionTitle}>Histórico</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {historico.map((entry, idx) => {
                  const dotColor = entry.kind === 'status_change' ? '#8E5FCF' : entry.kind === 'checklist' ? '#10B981' : '#9CA3AF';
                  return (
                    <div key={entry.id} style={{ display: 'flex', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 4 }} />
                        {idx < historico.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(142,95,207,0.1)', marginTop: 4, minHeight: 20 }} />}
                      </div>
                      <div style={{ paddingBottom: 14, flex: 1 }}>
                        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.4 }}>{entry.descricao}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            Excluir
          </button>

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir operação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta operação? Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(operacao.id); onOpenChange(false); }}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Sim, excluir
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Não, manter
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
