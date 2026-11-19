import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarIcon, ChevronLeft, ChevronRight, ShoppingCart, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import type { NovoPedidoPayload, ItemPedido } from '@/hooks/usePedidosCompra';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface FornecedorOpt { id: string; name: string; }
interface ProdutoOpt  { id: string; name: string; code: string | null; custo: number | null; }

type ItemForm = {
  produto_id: string | null;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
};

const CONDICOES = ['À vista', '30 dias', '30/60 dias', '30/60/90 dias', 'Outro'];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCriado: (pedido: NovoPedidoPayload, itens: Omit<ItemPedido, 'id' | 'purchase_order_id' | 'company_id' | 'total_amount' | 'created_at'>[]) => Promise<any>;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#374151',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 5, display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 13,
  border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12,
  background: 'rgba(255,255,255,0.8)', outline: 'none',
  fontFamily: 'inherit', color: '#1F2937', boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ModalNovoPedido({ open, onOpenChange, onCriado }: Props) {
  const { companyId } = useEmpresa();

  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [fornecedores, setFornecedores] = useState<FornecedorOpt[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [carregando, setCarregando] = useState(false);

  const [form, setForm] = useState<NovoPedidoPayload>({
    fornecedor_id: null,
    fornecedor_nome: null,
    numero_pedido: '',
    numero_nf_fornecedor: '',
    prazo_entrega: null,
    condicao_pagamento: null,
    observacoes: '',
  });
  const [prazoDate, setPrazoDate] = useState<Date | undefined>(undefined);

  const [itens, setItens] = useState<ItemForm[]>([
    { produto_id: null, produto_nome: '', quantidade: 1, valor_unitario: 0 },
  ]);

  const [criarComoConfirmado, setCriarComoConfirmado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    const carregar = async () => {
      setCarregando(true);
      const [{ data: forn }, { data: prod }] = await Promise.all([
        api.from('supplier').select('id, name').eq('company_id', companyId).order('name'),
        api.from('product').select('id, name, code, cost').eq('company_id', companyId).eq('kind', 'produto').eq('active', true).order('name'),
      ]);
      setFornecedores((forn ?? []) as FornecedorOpt[]);
      setProdutos((prod ?? []) as ProdutoOpt[]);
      setCarregando(false);
    };
    carregar();
  }, [open, companyId]);

  const resetar = () => {
    setPasso(1);
    setForm({ fornecedor_id: null, fornecedor_nome: null, numero_pedido: '', numero_nf_fornecedor: '', prazo_entrega: null, condicao_pagamento: null, observacoes: '' });
    setPrazoDate(undefined);
    setItens([{ produto_id: null, produto_nome: '', quantidade: 1, valor_unitario: 0 }]);
    setCriarComoConfirmado(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) resetar();
    onOpenChange(v);
  };

  const adicionarItem = () =>
    setItens(prev => [...prev, { produto_id: null, produto_nome: '', quantidade: 1, valor_unitario: 0 }]);

  const removerItem = (idx: number) =>
    setItens(prev => prev.filter((_, i) => i !== idx));

  const atualizarItem = (idx: number, campo: keyof ItemForm, valor: string | number | null) => {
    setItens(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [campo]: valor };
      if (campo === 'product_id' && typeof valor === 'string') {
        const prod = produtos.find(p => p.id === valor);
        if (prod) {
          updated.produto_nome = prod.name;
          updated.valor_unitario = prod.custo ?? 0;
        }
      }
      return updated;
    }));
  };

  const totalPedido = itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0);

  const handleCriar = async () => {
    setSalvando(true);
    await onCriado(
      { ...form, status: criarComoConfirmado ? 'confirmado' : 'rascunho' } as NovoPedidoPayload,
      itens.map(i => ({
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        quantidade: i.quantidade,
        quantidade_recebida: 0,
        valor_unitario: i.valor_unitario,
      })),
    );
    setSalvando(false);
    handleClose(false);
  };

  const PASSO_LABELS = ['Informações gerais', 'Itens do pedido', 'Revisão e confirmação'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(142,95,207,0.15)',
          borderRadius: 24,
          boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 28px 16px',
          borderBottom: '1px solid rgba(142,95,207,0.1)',
          background: 'linear-gradient(135deg, rgba(71,17,143,0.05), rgba(142,95,207,0.03))',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingCart style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>Novo Pedido de Compra</h2>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{PASSO_LABELS[passo - 1]}</p>
              </div>
            </div>
            <button
              onClick={() => handleClose(false)}
              style={{ width: 30, height: 30, borderRadius: 9, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {([1, 2, 3] as const).map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                  background: passo === n ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : passo > n ? '#10B981' : 'rgba(142,95,207,0.1)',
                  color: passo >= n ? '#fff' : '#6B7280',
                  boxShadow: passo === n ? '0 4px 12px rgba(142,95,207,0.3)' : 'none',
                }}>
                  {n}
                </div>
                {n < 3 && <div style={{ width: 32, height: 2, borderRadius: 1, background: passo > n ? '#10B981' : 'rgba(142,95,207,0.15)', transition: 'background 0.3s' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 28px' }}>

          {/* ── PASSO 1 ──────────────────────────────────────────────────────── */}
          {passo === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Fornecedor</label>
                <Select
                  value={form.fornecedor_id ?? ''}
                  onValueChange={v => {
                    const forn = fornecedores.find(f => f.id === v);
                    setForm(prev => ({ ...prev, fornecedor_id: v || null, fornecedor_nome: forn?.name ?? null }));
                  }}
                  disabled={carregando}
                >
                  <SelectTrigger className="h-10 text-sm" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12 }}>
                    <SelectValue placeholder={carregando ? 'Carregando...' : 'Selecione o fornecedor'} />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nº Pedido / Referência</label>
                  <input
                    placeholder="Ex: PC-2026-001"
                    value={form.numero_pedido ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, numero_pedido: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Nº NF do Fornecedor</label>
                  <input
                    placeholder="Ex: 12345"
                    value={form.numero_nf_fornecedor ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, numero_nf_fornecedor: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Prazo de Entrega</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: prazoDate ? '#1F2937' : '#9CA3AF' }}
                      >
                        <CalendarIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                        {prazoDate ? format(prazoDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={prazoDate}
                        onSelect={d => {
                          setPrazoDate(d);
                          setForm(prev => ({ ...prev, prazo_entrega: d ? format(d, 'yyyy-MM-dd') : null }));
                        }}
                        locale={ptBR}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label style={labelStyle}>Condição de Pagamento</label>
                  <Select
                    value={form.condicao_pagamento ?? ''}
                    onValueChange={v => setForm(prev => ({ ...prev, condicao_pagamento: v || null }))}
                  >
                    <SelectTrigger className="h-10 text-sm" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12 }}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDICOES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Observações</label>
                <Textarea
                  placeholder="Informações adicionais sobre o pedido..."
                  value={form.observacoes ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="resize-none"
                  style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12, fontFamily: 'inherit' }}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── PASSO 2 ──────────────────────────────────────────────────────── */}
          {passo === 2 && (
            <div>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(142,95,207,0.12)' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))' }}>
                      {['Produto', 'Qtd', 'Valor Unit.', 'Total', ''].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Total' || h === 'Valor Unit.' ? 'right' as const : 'left' as const, fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <Select
                            value={item.produto_id ?? ''}
                            onValueChange={v => atualizarItem(idx, 'product_id', v || null)}
                          >
                            <SelectTrigger className="h-8 text-xs" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 8 }}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.code ? `[${p.code}] ` : ''}{p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!item.produto_id && (
                            <input
                              placeholder="ou descreva manualmente"
                              value={item.produto_nome}
                              onChange={e => atualizarItem(idx, 'product_name', e.target.value)}
                              style={{ marginTop: 4, width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid rgba(142,95,207,0.15)', borderRadius: 8, background: 'rgba(255,255,255,0.7)', outline: 'none', fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box' }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={e => atualizarItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: 56, padding: '5px 6px', fontSize: 12, border: '1px solid rgba(142,95,207,0.15)', borderRadius: 8, background: 'rgba(255,255,255,0.7)', outline: 'none', textAlign: 'center', fontFamily: 'inherit', color: '#374151' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' as const }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.valor_unitario || ''}
                            onChange={e => atualizarItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)}
                            placeholder="0,00"
                            style={{ width: 96, padding: '5px 8px', fontSize: 12, border: '1px solid rgba(142,95,207,0.15)', borderRadius: 8, background: 'rgba(255,255,255,0.7)', outline: 'none', textAlign: 'right', fontFamily: 'inherit', color: '#374151' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 13, fontWeight: 700, color: '#8E5FCF' }}>
                          {fmtBRL(item.quantidade * item.valor_unitario)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => removerItem(idx)}
                            disabled={itens.length === 1}
                            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: itens.length === 1 ? 'transparent' : 'rgba(239,68,68,0.06)', cursor: itens.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: itens.length === 1 ? '#D1D5DB' : '#EF4444', opacity: itens.length === 1 ? 0.4 : 1 }}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid rgba(142,95,207,0.08)' }}>
                      <td colSpan={5} style={{ padding: '8px 12px' }}>
                        <button
                          onClick={adicionarItem}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#8E5FCF', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}
                        >
                          <Plus style={{ width: 13, height: 13 }} />
                          Adicionar item
                        </button>
                      </td>
                    </tr>
                    <tr style={{ borderTop: '2px solid rgba(142,95,207,0.1)', background: 'rgba(142,95,207,0.04)' }}>
                      <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        Total do Pedido:
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' as const, fontSize: 15, fontWeight: 800, color: '#8E5FCF' }}>
                        {fmtBRL(totalPedido)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── PASSO 3 ──────────────────────────────────────────────────────── */}
          {passo === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Resumo */}
              <div style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 14, padding: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Resumo do pedido</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Fornecedor',        valor: form.fornecedor_nome ?? '—' },
                    { label: 'Nº Pedido',          valor: form.numero_pedido || '—' },
                    { label: 'NF Fornecedor',      valor: form.numero_nf_fornecedor || '—' },
                    { label: 'Prazo Entrega',      valor: prazoDate ? format(prazoDate, 'dd/MM/yyyy', { locale: ptBR }) : '—' },
                    { label: 'Cond. Pagamento',    valor: form.condicao_pagamento ?? '—' },
                    { label: 'Itens',              valor: `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}` },
                  ].map(({ label, valor }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6B7280' }}>{label}:</span>
                      <span style={{ fontWeight: 600, color: '#1F2937', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 16 }}>{valor}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(142,95,207,0.1)', paddingTop: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Total do Pedido:</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#8E5FCF' }}>{fmtBRL(totalPedido)}</span>
                  </div>
                </div>
              </div>

              {/* Toggle rascunho / confirmado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 14, padding: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 3px' }}>
                    {criarComoConfirmado ? 'Criar como Confirmado' : 'Criar como Rascunho'}
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    {criarComoConfirmado
                      ? 'O pedido será enviado ao fornecedor imediatamente.'
                      : 'Salva o pedido sem confirmação final.'}
                  </p>
                </div>
                <button
                  onClick={() => setCriarComoConfirmado(v => !v)}
                  style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background 0.25s', background: criarComoConfirmado ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(142,95,207,0.2)', padding: 0, flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.25s', left: criarComoConfirmado ? 23 : 3 }} />
                </button>
              </div>

              {form.observacoes && (
                <div style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.1)', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações</p>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{form.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(142,95,207,0.1)', background: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => passo > 1 ? setPasso(p => (p - 1) as 1 | 2 | 3) : handleClose(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {passo > 1 && <ChevronLeft style={{ width: 14, height: 14 }} />}
            {passo > 1 ? 'Voltar' : 'Cancelar'}
          </button>

          {passo < 3 ? (
            <button
              onClick={() => setPasso(p => (p + 1) as 1 | 2 | 3)}
              disabled={passo === 2 && itens.every(i => !i.produto_nome && !i.produto_id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: (passo === 2 && itens.every(i => !i.produto_nome && !i.produto_id)) ? 'rgba(142,95,207,0.3)' : 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: (passo === 2 && itens.every(i => !i.produto_nome && !i.produto_id)) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            >
              Próximo <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button
              onClick={handleCriar}
              disabled={salvando}
              style={{ padding: '9px 24px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: salvando ? 'rgba(142,95,207,0.4)' : 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: salvando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            >
              {salvando ? 'Criando...' : 'Criar Pedido'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
