import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Operacao } from '@/hooks/useOperacoes';
import { X, Layers } from 'lucide-react';

interface NovaOperacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: Partial<Operacao>) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid rgba(142,95,207,0.2)',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.6)',
  outline: 'none',
  fontFamily: 'inherit',
  color: '#1F2937',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

export function NovaOperacaoDialog({ open, onOpenChange, onCreate }: NovaOperacaoDialogProps) {
  const { empresaId } = useEmpresa();
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    produtos: '',
    tipo: 'entrega',
    status_pagamento: 'pendente',
    data_prevista: '',
    fornecedor_id: '',
    fornecedor_nome: '',
    urgencia: 'normal',
    observacoes: '',
  });

  useEffect(() => {
    if (open && empresaId) {
      api.from('fornecedores').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true).then(({ data }) => {
        setFornecedores(data || []);
      });
    }
  }, [open, empresaId]);

  const handleSubmit = () => {
    if (!form.cliente_nome || !form.produtos) return;
    const fornecedor = fornecedores.find(f => f.id === form.fornecedor_id);
    onCreate({
      ...form,
      data_prevista: form.data_prevista || null,
      fornecedor_id: form.fornecedor_id || null,
      fornecedor_nome: fornecedor?.nome || form.fornecedor_nome || null,
    } as any);
    setForm({
      cliente_nome: '', cliente_telefone: '', cliente_email: '', produtos: '',
      tipo: 'entrega', status_pagamento: 'pendente', data_prevista: '',
      fornecedor_id: '', fornecedor_nome: '', urgencia: 'normal', observacoes: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(142,95,207,0.15)',
          borderRadius: 20,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: 'linear-gradient(135deg, rgba(71,17,143,0.06), rgba(142,95,207,0.04))',
          borderBottom: '1px solid rgba(142,95,207,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>Nova Operação</h2>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Registre uma nova entrega ou montagem</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '60vh', overflowY: 'auto' }}>
          <div>
            <label style={labelStyle}>Cliente *</label>
            <input
              placeholder="Nome do cliente"
              value={form.cliente_nome}
              onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input
                placeholder="(00) 00000-0000"
                value={form.cliente_telefone}
                onChange={e => setForm(f => ({ ...f, cliente_telefone: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                placeholder="email@..."
                value={form.cliente_email}
                onChange={e => setForm(f => ({ ...f, cliente_email: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Produtos *</label>
            <textarea
              placeholder="Berço, cama auxiliar..."
              value={form.produtos}
              onChange={e => setForm(f => ({ ...f, produtos: e.target.value }))}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrega">Entrega</SelectItem>
                  <SelectItem value="entrega_montagem">Entrega + Montagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Pagamento</label>
              <Select value={form.status_pagamento} onValueChange={v => setForm(f => ({ ...f, status_pagamento: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Data Prevista</label>
              <input
                type="date"
                value={form.data_prevista}
                onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Urgência</label>
              <Select value={form.urgencia} onValueChange={v => setForm(f => ({ ...f, urgencia: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Fornecedor</label>
            <Select value={form.fornecedor_id} onValueChange={v => {
              const f = fornecedores.find(x => x.id === v);
              setForm(prev => ({ ...prev, fornecedor_id: v, fornecedor_nome: f?.nome || '' }));
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
              <SelectContent>
                {fornecedores.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              placeholder="Observações..."
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.5)' }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.cliente_nome || !form.produtos}
            style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: (!form.cliente_nome || !form.produtos) ? 'rgba(142,95,207,0.3)' : 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: (!form.cliente_nome || !form.produtos) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >
            Criar Operação
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
