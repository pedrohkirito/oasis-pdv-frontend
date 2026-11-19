import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, CalendarDays, Filter } from 'lucide-react';
import { useLayoutActions } from '@/components/layout/LayoutActions';
import { useOperacoes, KanbanStatus } from '@/hooks/useOperacoes';
import { KanbanBoard } from '@/components/operacoes/KanbanBoard';
import { OperacoesCalendar } from '@/components/operacoes/OperacoesCalendar';
import { OperacaoDetailPanel } from '@/components/operacoes/OperacaoDetailPanel';
import { NovaOperacaoDialog } from '@/components/operacoes/NovaOperacaoDialog';
import { OperacoesStats } from '@/components/operacoes/OperacoesStats';
import { OperacoesAlerts } from '@/components/operacoes/OperacoesAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Operacao } from '@/hooks/useOperacoes';

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 16,
};

export default function Operacoes() {
  const { operacoes, loading, createOperacao, updateStatus, deleteOperacao, fetchOperacoes } = useOperacoes();
  const { setActions } = useLayoutActions();
  const location = useLocation();
  const [novaDialogOpen, setNovaDialogOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<Operacao | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<'kanban' | 'calendar'>('kanban');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    kind: 'todos',
    fornecedor: '',
    pagamento: 'todos',
  });

  useEffect(() => {
    setActions(
      <Button size="sm" onClick={() => setNovaDialogOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Nova Operação
      </Button>
    );
    return () => setActions(null);
  }, [setActions]);

  // Auto-open operation from dashboard navigation
  useEffect(() => {
    const state = location.state as { openOperacaoId?: string } | null;
    if (state?.openOperacaoId && operacoes.length > 0) {
      const op = operacoes.find(o => o.id === state.openOperacaoId);
      if (op) {
        setSelectedOp(op);
        setPanelOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, operacoes]);

  const handleCardClick = (op: Operacao) => {
    setSelectedOp(op);
    setPanelOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: string, oldStatus: string) => {
    await updateStatus(id, newStatus as KanbanStatus, oldStatus);
    if (selectedOp?.id === id) {
      setSelectedOp(prev => prev ? { ...prev, status: newStatus as KanbanStatus } : null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteOperacao(id);
    setSelectedOp(null);
    setPanelOpen(false);
  };

  const fornecedores = useMemo(() => {
    const names = new Set(operacoes.map(o => o.fornecedor_nome).filter(Boolean));
    return Array.from(names) as string[];
  }, [operacoes]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', padding: '32px' }}>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[400px] w-[280px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative' }}>
      {/* Orb roxo */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      {/* Orb amarelo */}
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: '#8E5FCF', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            PDV • Operações
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0, lineHeight: 1.2 }}>
            Operações
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            Acompanhamento de entregas, montagens e encomendas
          </p>
        </div>

        {/* Stats */}
        <OperacoesStats operacoes={operacoes} />

        {/* Alerts */}
        <div style={{ marginTop: 16 }}>
          <OperacoesAlerts operacoes={operacoes} />
        </div>

        {/* Toolbar */}
        <div style={{ ...glassCard, padding: '12px 16px', marginTop: 20, marginBottom: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              placeholder="Buscar cliente ou produto..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1px solid rgba(142,95,207,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.6)', outline: 'none', fontFamily: 'inherit', color: '#1F2937', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, borderRadius: 10, border: `1px solid ${showFilters ? 'rgba(142,95,207,0.4)' : 'rgba(142,95,207,0.2)'}`, background: showFilters ? 'rgba(142,95,207,0.08)' : 'transparent', color: showFilters ? '#8E5FCF' : '#6B7280', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.2s' }}
          >
            <Filter style={{ width: 13, height: 13 }} />
            Filtros
          </button>

          {/* View toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', background: 'rgba(142,95,207,0.06)', borderRadius: 10, padding: 3, gap: 2 }}>
            {([
              { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
              { id: 'calendar', label: 'Calendário', Icon: CalendarDays },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.2s', background: view === id ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'transparent', color: view === id ? '#fff' : '#6B7280' }}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter row */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ ...glassCard, padding: '12px 16px', marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}
          >
            <Select value={filters.kind} onValueChange={v => setFilters(f => ({ ...f, kind: v }))}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="entrega">Entrega</SelectItem>
                <SelectItem value="entrega_montagem">Entrega + Montagem</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.pagamento} onValueChange={v => setFilters(f => ({ ...f, pagamento: v }))}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Pagamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pagamento Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>

            {fornecedores.length > 0 && (
              <Select value={filters.fornecedor} onValueChange={v => setFilters(f => ({ ...f, fornecedor: v === 'todos' ? '' : v }))}>
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos fornecedores</SelectItem>
                  {fornecedores.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <button
              onClick={() => setFilters({ search: '', kind: 'todos', fornecedor: '', pagamento: 'todos' })}
              style={{ fontSize: 12, color: '#8E5FCF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}
            >
              Limpar filtros
            </button>
          </motion.div>
        )}

        {/* Content */}
        <div style={{ marginTop: 16 }}>
          {view === 'kanban' ? (
            <KanbanBoard
              operacoes={operacoes}
              onStatusChange={handleStatusChange}
              onCardClick={handleCardClick}
              filters={filters}
            />
          ) : (
            <OperacoesCalendar operacoes={operacoes} onCardClick={handleCardClick} />
          )}
        </div>
      </div>

      <OperacaoDetailPanel
        operacao={selectedOp}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onUpdate={() => { fetchOperacoes(); setSelectedOp(null); setPanelOpen(false); }}
      />

      <NovaOperacaoDialog
        open={novaDialogOpen}
        onOpenChange={setNovaDialogOpen}
        onCreate={createOperacao}
      />
    </div>
  );
}
