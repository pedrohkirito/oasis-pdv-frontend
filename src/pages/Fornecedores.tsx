import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Plus, Search, Trash2, Edit, Phone, Mail, MapPin, Building2, Loader2,
  ChevronDown, Truck, LayoutList, LayoutGrid, Tag, CheckCircle, XCircle,
  Download, Upload,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import type { Tables } from '@/lib/database';

type Fornecedor = Tables<'fornecedores'>;

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// ─── Máscaras ─────────────────────────────────────────────────────────────────

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
};

// ─── Validação CNPJ ───────────────────────────────────────────────────────────

const validateCNPJ = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(digits[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(digits[12]) !== digito1) return false;
  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(digits[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(digits[13]) === digito2;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string; razao_social: string; cnpj: string; email: string;
  telefone: string; endereco: string; numero: string;
  cidade: string; estado: string; cep: string; categoria: string;
};

interface FormFieldsProps {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
  loadingCepState: boolean;
  onCepChange: (cep: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Gilroy', color: '#374151', display: 'block', marginBottom: 4,
}

// ─── FormFields ───────────────────────────────────────────────────────────────

const FormFields = ({ data, setData, loadingCepState, onCepChange }: FormFieldsProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <Label htmlFor="name" style={labelStyle}>Nome Fantasia *</Label>
        <Input id="name" placeholder="Nome do fornecedor" value={data.name}
          onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
      <div>
        <Label htmlFor="legal_name" style={labelStyle}>Razão Social</Label>
        <Input id="legal_name" placeholder="Razão social" value={data.razao_social}
          onChange={(e) => setData(prev => ({ ...prev, razao_social: e.target.value }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <Label htmlFor="cnpj" style={labelStyle}>CNPJ *</Label>
        <Input id="cnpj" placeholder="00.000.000/0000-00" value={data.cnpj}
          onChange={(e) => setData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
      <div>
        <Label htmlFor="telefone" style={labelStyle}>Telefone</Label>
        <Input id="telefone" placeholder="(00) 00000-0000" value={data.telefone}
          onChange={(e) => setData(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
    </div>
    <div>
      <Label htmlFor="email" style={labelStyle}>E-mail</Label>
      <Input id="email" type="email" placeholder="email@exemplo.com" value={data.email}
        onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
        style={{ fontFamily: 'Gilroy' }} />
    </div>
    <div>
      <Label htmlFor="cep" style={labelStyle}>CEP</Label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input id="cep" placeholder="00000-000" value={data.cep}
          onChange={(e) => {
            const formatted = formatCEP(e.target.value);
            setData(prev => ({ ...prev, cep: formatted }));
            if (formatted.replace(/\D/g, '').length === 8) onCepChange(formatted);
          }}
          style={{ fontFamily: 'Gilroy', flex: 1 }} />
        {loadingCepState && <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#8E5FCF', flexShrink: 0 }} />}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
      <div style={{ gridColumn: '1 / 3' }}>
        <Label htmlFor="endereco" style={labelStyle}>Endereço</Label>
        <Input id="endereco" placeholder="Rua, Avenida..." value={data.endereco}
          onChange={(e) => setData(prev => ({ ...prev, endereco: e.target.value }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
      <div>
        <Label htmlFor="numero" style={labelStyle}>Número</Label>
        <Input id="numero" placeholder="Nº" value={data.numero}
          onChange={(e) => setData(prev => ({ ...prev, numero: e.target.value }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <Label htmlFor="cidade" style={labelStyle}>Cidade</Label>
        <Input id="cidade" placeholder="Cidade" value={data.cidade}
          onChange={(e) => setData(prev => ({ ...prev, cidade: e.target.value }))}
          style={{ fontFamily: 'Gilroy' }} />
      </div>
      <div>
        <Label htmlFor="estado" style={labelStyle}>Estado</Label>
        <Select value={data.estado} onValueChange={value => setData(prev => ({ ...prev, estado: value }))}>
          <SelectTrigger style={{ fontFamily: 'Gilroy' }}><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            {estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div>
      <Label htmlFor="category" style={labelStyle}>Categoria</Label>
      <Input id="category" placeholder="Ex: Produtos, Serviços, Utilidades" value={data.categoria}
        onChange={(e) => setData(prev => ({ ...prev, categoria: e.target.value }))}
        style={{ fontFamily: 'Gilroy' }} />
    </div>
  </div>
);

// ─── FornecedorRow (modo lista) ───────────────────────────────────────────────

function FornecedorRow({ fornecedor, onEdit, onDelete, onToggleAtivo, onViewDetalhes }: {
  fornecedor: Fornecedor;
  onEdit: (f: Fornecedor) => void;
  onDelete: (id: string) => void;
  onToggleAtivo: (f: Fornecedor) => void;
  onViewDetalhes: (f: Fornecedor) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hover, setHover] = useState(false);
  const hasDetails = fornecedor.email || fornecedor.telefone || fornecedor.cidade || fornecedor.endereco || fornecedor.cnpj;

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: hover ? 'rgba(142,95,207,0.04)' : 'transparent',
          transition: 'background 0.15s ease',
          borderBottom: '1px solid rgba(142,95,207,0.06)',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Left: avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.85rem', color: '#8E5FCF' }}>
              {initials(fornecedor.name)}
            </span>
          </div>
          {/* Name + CNPJ */}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', fontSize: '0.9rem', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {fornecedor.name}
            </p>
            {fornecedor.cnpj && (
              <p style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy', margin: 0 }}>
                {fornecedor.cnpj}
              </p>
            )}
          </div>
          {/* Categoria badge */}
          {fornecedor.categoria && (
            <span style={{
              background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
              borderRadius: 20, padding: '3px 10px',
              fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {fornecedor.categoria}
            </span>
          )}
          {/* Status badge */}
          <span
            onClick={() => onToggleAtivo(fornecedor)}
            style={{
              background: fornecedor.active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
              color: fornecedor.active ? '#10B981' : '#6B7280',
              borderRadius: 20, padding: '4px 10px',
              fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600,
              whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {fornecedor.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
          {hover && (
            <>
              <RowBtn label="Ver" onClick={() => onViewDetalhes(fornecedor)} primary />
              <RowBtn label="Editar" onClick={() => onEdit(fornecedor)} />
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 7, padding: '5px 8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#9CA3AF', padding: '4px', borderRadius: 6,
                display: 'flex', alignItems: 'center',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '10px 20px 14px 72px', background: 'rgba(142,95,207,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {fornecedor.telefone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy' }}>
                <Phone size={12} color="#9CA3AF" /> {fornecedor.telefone}
              </span>
            )}
            {fornecedor.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy' }}>
                <Mail size={12} color="#9CA3AF" /> {fornecedor.email}
              </span>
            )}
            {fornecedor.cidade && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy' }}>
                <MapPin size={12} color="#9CA3AF" />
                {fornecedor.cidade}{fornecedor.estado ? ` - ${fornecedor.estado}` : ''}
              </span>
            )}
            {fornecedor.endereco && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy', gridColumn: '1 / -1' }}>
                <MapPin size={12} color="#9CA3AF" /> {fornecedor.endereco}
              </span>
            )}
            {fornecedor.razao_social && (
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontFamily: 'Gilroy', gridColumn: '1 / -1' }}>
                Razão Social: {fornecedor.razao_social}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{fornecedor.name}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDelete(false); onDelete(fornecedor.id); }}>
              Sim, excluir
            </Button>
            <Button onClick={() => setConfirmDelete(false)}>Não, manter</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── RowBtn helper ────────────────────────────────────────────────────────────

function RowBtn({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        background: primary
          ? (hov ? '#8E5FCF' : 'rgba(142,95,207,0.08)')
          : (hov ? '#6B7280' : 'rgba(107,114,128,0.07)'),
        color: primary
          ? (hov ? 'white' : '#8E5FCF')
          : (hov ? 'white' : '#6B7280'),
        border: primary ? '1px solid rgba(142,95,207,0.2)' : '1px solid rgba(107,114,128,0.15)',
        borderRadius: 7, padding: '5px 10px',
        fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  )
}

// ─── FornecedorCard (modo grid) ───────────────────────────────────────────────

function FornecedorCard({ fornecedor, onEdit, onDelete, onToggleAtivo, onViewDetalhes }: {
  fornecedor: Fornecedor;
  onEdit: (f: Fornecedor) => void;
  onDelete: (id: string) => void;
  onToggleAtivo: (f: Fornecedor) => void;
  onViewDetalhes: (f: Fornecedor) => void;
}) {
  const [hover, setHover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(142,95,207,0.12)',
        borderRadius: 20,
        overflow: 'hidden',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover ? '0 16px 48px rgba(71,17,143,0.12)' : '0 2px 8px rgba(71,17,143,0.04)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Corpo */}
      <div style={{ padding: 20 }}>
        {/* Topo: avatar + badge active */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: hover ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.25s ease',
          }}>
            <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.25rem', color: '#8E5FCF' }}>
              {initials(fornecedor.name)}
            </span>
          </div>
          <span
            onClick={() => onToggleAtivo(fornecedor)}
            style={{
              position: 'absolute', top: 0, right: 0,
              background: fornecedor.active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
              color: fornecedor.active ? '#10B981' : '#6B7280',
              borderRadius: 20, padding: '3px 8px',
              fontSize: '0.68rem', fontFamily: 'Gilroy', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {fornecedor.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>

        {/* Nome */}
        <p style={{ fontWeight: 700, fontFamily: 'Gilroy', textAlign: 'center', color: '#1F2937', margin: '0 0 8px', fontSize: '0.95rem' }}>
          {fornecedor.name}
        </p>

        {/* Categoria */}
        {fornecedor.categoria && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{
              background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
              borderRadius: 20, padding: '3px 12px',
              fontSize: '0.7rem', fontFamily: 'Gilroy', fontWeight: 600,
            }}>
              {fornecedor.categoria}
            </span>
          </div>
        )}

        {/* CNPJ / telefone */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          {fornecedor.cnpj && (
            <p style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy', margin: '0 0 2px' }}>
              {fornecedor.cnpj}
            </p>
          )}
          {fornecedor.telefone && (
            <p style={{ fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy', margin: 0 }}>
              {fornecedor.telefone}
            </p>
          )}
        </div>

        {/* Divisória */}
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.08)', margin: '0 0 12px' }} />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Cidade</p>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy', margin: 0 }}>
              {fornecedor.cidade || '—'}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 2px' }}>Estado</p>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy', margin: 0 }}>
              {fornecedor.estado || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        borderTop: '1px solid rgba(142,95,207,0.08)',
        padding: '12px 16px', display: 'flex', gap: 8,
      }}>
        <button
          onClick={() => onViewDetalhes(fornecedor)}
          style={{
            flex: 1, background: 'rgba(142,95,207,0.08)', color: '#8E5FCF',
            border: '1px solid rgba(142,95,207,0.2)', borderRadius: 8,
            padding: '7px', fontFamily: 'Gilroy', fontWeight: 600,
            fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#8E5FCF'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.08)'; e.currentTarget.style.color = '#8E5FCF' }}
        >
          Ver detalhes
        </button>
        <button
          onClick={() => onEdit(fornecedor)}
          style={{
            background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white',
            border: 'none', borderRadius: 8, padding: '7px 14px',
            fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Edit size={12} /> Editar
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            background: 'rgba(239,68,68,0.08)', color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8,
            padding: '7px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{fornecedor.name}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDelete(false); onDelete(fornecedor.id); }}>
              Sim, excluir
            </Button>
            <Button onClick={() => setConfirmDelete(false)}>Não, manter</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Fornecedores = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { companyId } = useEmpresa();
  const navigate = useNavigate();

  const [dialogOpen,       setDialogOpen]       = useState(false);
  const [editDialogOpen,   setEditDialogOpen]   = useState(false);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [fornecedores,     setFornecedores]     = useState<Fornecedor[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [editingFornecedor,setEditingFornecedor]= useState<Fornecedor | null>(null);
  const [loadingCep,       setLoadingCep]       = useState(false);
  const [loadingCepEdit,   setLoadingCepEdit]   = useState(false);

  // UI state
  const [viewMode,         setViewMode]         = useState<'lista' | 'grid'>('lista');
  const [detalheFornecedor,setDetalheFornecedor]= useState<Fornecedor | null>(null);
  const [hovKpi,           setHovKpi]           = useState<number | null>(null);
  const [hovNovo,          setHovNovo]          = useState(false);

  const emptyForm = {
    name: '', razao_social: '', cnpj: '', email: '', telefone: '',
    endereco: '', numero: '', cidade: '', estado: '', cep: '', categoria: '',
  };

  const [novoFornecedor, setNovoFornecedor] = useState(emptyForm);
  const [editFornecedor, setEditFornecedor] = useState(emptyForm);

  // ── Busca CEP ──────────────────────────────────────────────────────────────

  const buscarCep = async (cep: string, isEdit: boolean = false) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    if (isEdit) { setLoadingCepEdit(true); } else { setLoadingCep(true); }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", description: "Verifique o CEP informado", variant: "destructive" });
        return;
      }
      if (isEdit) {
        setEditFornecedor(prev => ({ ...prev, endereco: data.logradouro || '', cidade: data.localidade || '', estado: data.uf || '' }));
      } else {
        setNovoFornecedor(prev => ({ ...prev, endereco: data.logradouro || '', cidade: data.localidade || '', estado: data.uf || '' }));
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", description: "Não foi possível consultar o CEP", variant: "destructive" });
    } finally {
      if (isEdit) { setLoadingCepEdit(false); } else { setLoadingCep(false); }
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && companyId) fetchFornecedores();
  }, [user, companyId]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchFornecedores = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await api
      .from('supplier')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (error) {
      handleApiError(error, "Erro ao carregar fornecedores");
    } else {
      setFornecedores(data || []);
    }
    setLoading(false);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSalvar = async () => {
    if (!novoFornecedor.name || !novoFornecedor.cnpj || !user) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!validateCNPJ(novoFornecedor.cnpj)) {
      toast({ title: "CNPJ inválido", description: "Verifique os dígitos do CNPJ informado", variant: "destructive" });
      return;
    }
    const enderecoCompleto = novoFornecedor.numero
      ? `${novoFornecedor.endereco}, ${novoFornecedor.numero}`
      : novoFornecedor.endereco;
    const { error } = await api.from('supplier').insert({
      user_id: user.id, company_id: companyId,
      name: novoFornecedor.name,
      razao_social: novoFornecedor.razao_social || null,
      cnpj: novoFornecedor.cnpj,
      email: novoFornecedor.email || null,
      telefone: novoFornecedor.telefone || null,
      endereco: enderecoCompleto || null,
      cidade: novoFornecedor.cidade || null,
      estado: novoFornecedor.estado || null,
      categoria: novoFornecedor.categoria || 'Outros',
      active: true,
    });
    if (error) {
      handleApiError(error, "Erro ao cadastrar fornecedor");
    } else {
      setNovoFornecedor(emptyForm);
      setDialogOpen(false);
      fetchFornecedores();
      toast({ title: "Sucesso!", description: "Fornecedor cadastrado com sucesso" });
    }
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setEditFornecedor({
      name: fornecedor.name,
      razao_social: fornecedor.razao_social || '',
      cnpj: fornecedor.cnpj,
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      endereco: fornecedor.endereco || '',
      numero: '',
      cidade: fornecedor.cidade || '',
      estado: fornecedor.estado || '',
      cep: '',
      categoria: fornecedor.categoria || '',
    });
    setEditDialogOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!editingFornecedor || !editFornecedor.name || !editFornecedor.cnpj) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!validateCNPJ(editFornecedor.cnpj)) {
      toast({ title: "CNPJ inválido", description: "Verifique os dígitos do CNPJ informado", variant: "destructive" });
      return;
    }
    const enderecoCompleto = editFornecedor.numero
      ? `${editFornecedor.endereco}, ${editFornecedor.numero}`
      : editFornecedor.endereco;
    const { error } = await api.from('supplier')
      .update({
        name: editFornecedor.name,
        razao_social: editFornecedor.razao_social || null,
        cnpj: editFornecedor.cnpj,
        email: editFornecedor.email || null,
        telefone: editFornecedor.telefone || null,
        endereco: enderecoCompleto || null,
        cidade: editFornecedor.cidade || null,
        estado: editFornecedor.estado || null,
        categoria: editFornecedor.categoria || 'Outros',
      })
      .eq('id', editingFornecedor.id);
    if (error) {
      handleApiError(error, "Erro ao atualizar fornecedor");
    } else {
      setEditDialogOpen(false);
      setEditingFornecedor(null);
      fetchFornecedores();
      toast({ title: "Sucesso!", description: "Fornecedor atualizado com sucesso" });
    }
  };

  const handleToggleAtivo = async (fornecedor: Fornecedor) => {
    const { error } = await api.from('supplier').update({ active: !fornecedor.active }).eq('id', fornecedor.id);
    if (error) {
      handleApiError(error, "Erro ao atualizar status");
    } else {
      fetchFornecedores();
      toast({ title: "Sucesso", description: `Fornecedor ${fornecedor.active ? 'desativado' : 'ativado'}` });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await api.from('supplier').delete().eq('id', id);
    if (error) {
      handleApiError(error, "Erro ao excluir fornecedor");
    } else {
      fetchFornecedores();
      toast({ title: "Sucesso", description: "Fornecedor excluído" });
    }
  };

  const filteredFornecedores = fornecedores.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.razao_social && f.razao_social.toLowerCase().includes(searchTerm.toLowerCase())) ||
    f.cnpj.includes(searchTerm)
  );

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Gilroy' }}>Carregando...</div>;
  }

  // ── KPI cards ──────────────────────────────────────────────────────────────

  const kpiCards = [
    { label: 'Total Fornecedores', value: fornecedores.length, sub: 'cadastrados', Icon: Truck, iconBg: 'rgba(142,95,207,0.12)', iconColor: '#8E5FCF', valueColor: '#1F2937', borderColor: '#8E5FCF' },
    { label: 'Fornecedores Ativos', value: fornecedores.filter(f => f.active).length, sub: 'em operação', Icon: CheckCircle, iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10B981', valueColor: '#10B981', borderColor: '#10B981' },
    { label: 'Fornecedores Inativos', value: fornecedores.filter(f => !f.active).length, sub: 'desativados', Icon: XCircle, iconBg: 'rgba(245,158,11,0.12)', iconColor: '#F59E0B', valueColor: '#F59E0B', borderColor: '#F59E0B' },
    { label: 'Com Categoria', value: fornecedores.filter(f => f.categoria).length, sub: 'categorizados', Icon: Tag, iconBg: 'rgba(59,130,246,0.12)', iconColor: '#3B82F6', valueColor: '#3B82F6', borderColor: '#3B82F6' },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: 12, padding: '10px 14px', fontFamily: 'Gilroy',
    fontSize: '0.85rem', color: '#1F2937', outline: 'none', transition: 'all 0.2s ease',
  }

  const onFocusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid #8E5FCF'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(142,95,207,0.15)'
  }
  const onBlurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid rgba(142,95,207,0.2)'
    e.currentTarget.style.boxShadow = 'none'
  }

  // ── Modal shared style ─────────────────────────────────────────────────────

  const modalContentStyle: React.CSSProperties = {
    padding: 0, overflow: 'hidden',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(142,95,207,0.15)',
    borderRadius: 24,
    boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
    maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
  }

  const renderModalContent = (titulo: string, formData: FormData, setFormData: React.Dispatch<React.SetStateAction<FormData>>, isLoadingCep: boolean, onCep: (cep: string) => void, onSalvar: () => void, onClose: () => void) => (
    <>
      <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '20px 24px', flexShrink: 0 }}>
        <h2 style={{
          fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.2rem',
          background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0,
        }}>
          {titulo}
        </h2>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <FormFields data={formData} setData={setFormData} loadingCepState={isLoadingCep} onCepChange={onCep} />
      </div>
      <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'rgba(107,114,128,0.08)', color: '#6B7280', border: '1px solid rgba(107,114,128,0.15)', borderRadius: 10, padding: '10px 20px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={onSalvar} style={{ background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.35)' }}>
          Salvar
        </button>
      </div>
    </>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative' }}>
      {/* Orb roxo */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      {/* Orb amarelo */}
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px' }}>
              Oasis › Fornecedores
            </p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 4px' }}>
              Fornecedores
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', margin: 0 }}>
              Cadastro e gerenciamento de fornecedores
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ background: 'rgba(142,95,207,0.07)', color: '#8E5FCF', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12, padding: '10px 18px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={15} /> Exportar
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              style={{ background: hovNovo ? 'linear-gradient(135deg, #7A4FB8, #3A0E7A)' : 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', borderRadius: 12, padding: '10px 20px', border: 'none', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.35)', transform: hovNovo ? 'translateY(-2px)' : 'translateY(0)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={() => setHovNovo(true)}
              onMouseLeave={() => setHovNovo(false)}
            >
              <Plus size={16} /> Novo Fornecedor
            </button>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
          {kpiCards.map((card, idx) => (
            <div
              key={idx}
              style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderTop: `3px solid ${card.borderColor}`, borderRadius: 20, padding: 24, transform: hovKpi === idx ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hovKpi === idx ? '0 12px 32px rgba(71,17,143,0.1)' : '0 2px 8px rgba(71,17,143,0.04)', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default' }}
              onMouseEnter={() => setHovKpi(idx)}
              onMouseLeave={() => setHovKpi(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, margin: 0 }}>{card.label}</p>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <card.Icon size={18} color={card.iconColor} />
                </div>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'Gilroy', color: card.valueColor, margin: '0 0 4px' }}>
                {card.value}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: 0 }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filtros + Toggle ────────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
          {/* Busca */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por name, CNPJ..."
              style={{ ...inputStyle, paddingLeft: 36, width: '100%', boxSizing: 'border-box' as const }}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
            />
          </div>

          {/* Contador */}
          <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy', whiteSpace: 'nowrap' }}>
            {filteredFornecedores.length} fornecedor{filteredFornecedores.length !== 1 ? 'es' : ''}
          </span>

          {/* Toggle lista/grid */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(142,95,207,0.06)', borderRadius: 10, padding: 4 }}>
            {([['lista', LayoutList], ['grid', LayoutGrid]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? '#8E5FCF' : 'transparent',
                  color: viewMode === mode ? 'white' : '#6B7280',
                  border: 'none', borderRadius: 8, padding: '6px 10px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Conteúdo ────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 20, padding: '48px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#8E5FCF', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', margin: 0 }}>Carregando fornecedores…</p>
          </div>
        ) : filteredFornecedores.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px', background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={36} color="#8E5FCF" />
            </div>
            <p style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.1rem', color: '#1F2937', margin: '0 0 8px' }}>
              Nenhum fornecedor cadastrado
            </p>
            <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.9rem', margin: '0 auto 24px', maxWidth: 300 }}>
              Cadastre seus fornecedores para controlar compras e pedidos
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              style={{ background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', borderRadius: 12, padding: '12px 24px', border: 'none', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={16} /> Adicionar fornecedor
            </button>
          </div>
        ) : viewMode === 'lista' ? (
          /* Lista */
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 20, overflow: 'hidden' }}>
            {/* Cabeçalho tabela */}
            <div style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.04))', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fornecedor
              </span>
              <span style={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'Gilroy', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ações
              </span>
            </div>
            {filteredFornecedores.map(fornecedor => (
              <FornecedorRow
                key={fornecedor.id}
                fornecedor={fornecedor}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleAtivo={handleToggleAtivo}
                onViewDetalhes={f => setDetalheFornecedor(f)}
              />
            ))}
          </div>
        ) : (
          /* Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filteredFornecedores.map(fornecedor => (
              <FornecedorCard
                key={fornecedor.id}
                fornecedor={fornecedor}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleAtivo={handleToggleAtivo}
                onViewDetalhes={f => setDetalheFornecedor(f)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Drawer Detalhes ───────────────────────────────────────────── */}
      <Sheet open={!!detalheFornecedor} onOpenChange={v => { if (!v) setDetalheFornecedor(null) }}>
        <SheetContent
          className="p-0 overflow-hidden flex flex-col"
          style={{ width: 480, maxWidth: '95vw', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(142,95,207,0.15)' }}
        >
          {detalheFornecedor && (
            <>
              {/* Header */}
              <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: 24, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.25rem', color: '#8E5FCF' }}>
                      {initials(detalheFornecedor.name)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <p style={{ fontFamily: 'Gilroy', fontWeight: 800, fontSize: '1.1rem', color: '#1F2937', margin: 0 }}>
                        {detalheFornecedor.name}
                      </p>
                      <span style={{ background: detalheFornecedor.active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: detalheFornecedor.active ? '#10B981' : '#6B7280', borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600 }}>
                        {detalheFornecedor.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {detalheFornecedor.cnpj && (
                      <p style={{ fontFamily: 'Gilroy', fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
                        CNPJ: {detalheFornecedor.cnpj}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Dados */}
                <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Dados
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {[
                    { label: 'Telefone', value: detalheFornecedor.telefone, icon: Phone },
                    { label: 'E-mail', value: detalheFornecedor.email, icon: Mail },
                    { label: 'Categoria', value: detalheFornecedor.categoria, icon: Tag },
                    { label: 'Razão Social', value: detalheFornecedor.razao_social, icon: Building2 },
                    { label: 'Cidade', value: detalheFornecedor.cidade, icon: MapPin },
                    { label: 'Estado', value: detalheFornecedor.estado, icon: MapPin },
                  ].filter(item => item.value).map(item => (
                    <div key={item.label} style={{ background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <item.icon size={11} /> {item.label}
                      </p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', margin: 0, wordBreak: 'break-word' }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                  {detalheFornecedor.endereco && (
                    <div style={{ gridColumn: '1 / -1', background: 'rgba(142,95,207,0.04)', border: '1px solid rgba(142,95,207,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontFamily: 'Gilroy', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> Endereço
                      </p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy', margin: 0 }}>
                        {detalheFornecedor.endereco}
                        {detalheFornecedor.cidade ? `, ${detalheFornecedor.cidade}` : ''}
                        {detalheFornecedor.estado ? ` - ${detalheFornecedor.estado}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Histórico de pedidos (empty state) */}
                <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Histórico de Pedidos
                </p>
                <div style={{ background: 'rgba(142,95,207,0.03)', border: '1px dashed rgba(142,95,207,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center', marginBottom: 20 }}>
                  <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>
                    Nenhum pedido registrado
                  </p>
                </div>

                {/* Contas a pagar (empty state) */}
                <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  Contas a Pagar
                </p>
                <div style={{ background: 'rgba(142,95,207,0.03)', border: '1px dashed rgba(142,95,207,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Gilroy', color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>
                    Nenhuma conta a pagar
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', padding: '16px 24px', display: 'flex', gap: 10, flexShrink: 0 }}>
                <button
                  onClick={() => { handleEdit(detalheFornecedor); setDetalheFornecedor(null) }}
                  style={{ flex: 1, background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 10, padding: '12px', fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Edit size={15} /> Editar
                </button>
                <button
                  onClick={() => setDetalheFornecedor(null)}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(142,95,207,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Plus size={15} /> Novo Pedido
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Dialog Novo Fornecedor ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[580px]" style={modalContentStyle}>
          {renderModalContent(
            'Cadastrar Fornecedor',
            novoFornecedor, setNovoFornecedor,
            loadingCep, (cep) => buscarCep(cep, false),
            handleSalvar, () => setDialogOpen(false)
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Editar Fornecedor ──────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[580px]" style={modalContentStyle}>
          {renderModalContent(
            'Editar Fornecedor',
            editFornecedor, setEditFornecedor,
            loadingCepEdit, (cep) => buscarCep(cep, true),
            handleSalvarEdicao, () => setEditDialogOpen(false)
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fornecedores;
