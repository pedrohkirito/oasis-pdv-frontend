import React, { useState, useEffect, useRef } from 'react';
import { ClienteComprasDialog } from '@/components/clientes/ClienteComprasDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Edit, User, Phone, Mail, MapPin, Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

import { PageTransition } from '@/components/layout/PageTransition';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/utils/errorHandler';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Cliente {
  id: string;
  user_id: string;
  name: string;
  cpf: string | null;
  telefone: string | null;
  telefone_adicional: string | null;
  email: string | null;
  birth_date: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface ImportedCliente {
  name: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Máscaras de formatação
const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
};

// Validação de CPF
const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(digits)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;
  
  return true;
};

function ClienteRow({ cliente, onEdit, onDelete }: {
  cliente: Cliente;
  onEdit: (c: Cliente) => void;
  onDelete: (id: string) => void;
}) {
  const hasDetails = cliente.cpf || cliente.telefone || cliente.telefone_adicional || cliente.email || cliente.cidade || cliente.endereco || cliente.complemento || cliente.bairro || cliente.observacoes;
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comprasOpen, setComprasOpen] = useState(false);

  return (
    <div className="group">
      <div className="flex items-center justify-between py-3 px-2 rounded-lg transition-colors -mx-2"
        style={{ transition: 'background 0.15s ease' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(142,95,207,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
            color: 'white', fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {cliente.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <button
              onClick={() => setComprasOpen(true)}
              className="text-sm font-semibold truncate text-left hover:text-primary hover:underline transition-colors cursor-pointer"
            >
              {cliente.name}
            </button>
            <Badge variant={cliente.active !== false ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
              {cliente.active !== false ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(cliente)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{cliente.name}"? Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => { setConfirmDelete(false); onDelete(cliente.id); }} className="border-border bg-background text-foreground hover:bg-accent">
                    Sim, excluir
                  </Button>
                  <Button onClick={() => setConfirmDelete(false)}>
                    Não, manter
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="pl-14 pr-4 pb-3 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {cliente.cpf && (
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0" />
                CPF: {cliente.cpf}
              </span>
            )}
            {cliente.telefone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                {cliente.telefone}
              </span>
            )}
            {cliente.telefone_adicional && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                {cliente.telefone_adicional} (adicional)
              </span>
            )}
            {cliente.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 shrink-0" />
                {cliente.email}
              </span>
            )}
            {cliente.cidade && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                {cliente.cidade}{cliente.estado ? ` - ${cliente.estado}` : ''}
              </span>
            )}
            {cliente.endereco && (
              <span className="flex items-center gap-1.5 sm:col-span-2">
                <MapPin className="h-3 w-3 shrink-0" />
                {cliente.endereco}
                {cliente.complemento ? ` - ${cliente.complemento}` : ''}
                {cliente.bairro ? `, ${cliente.bairro}` : ''}
              </span>
            )}
            {cliente.observacoes && (
              <span className="sm:col-span-2 text-muted-foreground/70">
                Obs: {cliente.observacoes}
              </span>
            )}
          </div>
        </div>
      )}
      <ClienteComprasDialog
        open={comprasOpen}
        onOpenChange={setComprasOpen}
        customerId={cliente.id}
        clienteNome={cliente.name}
      />
    </div>
  );
}

const Clientes = () => {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { companyId } = useEmpresa();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCepEdit, setLoadingCepEdit] = useState(false);
  const [importedClientes, setImportedClientes] = useState<ImportedCliente[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  
  const [novoCliente, setNovoCliente] = useState({
    name: '',
    cpf: '',
    telefone: '',
    telefone_adicional: '',
    email: '',
    birth_date: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: ''
  });

  const [editCliente, setEditCliente] = useState({
    name: '',
    cpf: '',
    telefone: '',
    telefone_adicional: '',
    email: '',
    birth_date: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: ''
  });

  // Busca CEP via ViaCEP
  const buscarCep = async (cep: string, isEdit: boolean = false) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    if (isEdit) {
      setLoadingCepEdit(true);
    } else {
      setLoadingCep(true);
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado",
          variant: "destructive"
        });
        return;
      }

      if (isEdit) {
        setEditCliente(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || ''
        }));
      } else {
        setNovoCliente(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || ''
        }));
      }
    } catch {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP",
        variant: "destructive"
      });
    } finally {
      if (isEdit) {
        setLoadingCepEdit(false);
      } else {
        setLoadingCep(false);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && companyId) {
      fetchClientes();
    }
  }, [user, companyId]);

  const fetchClientes = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await api
      .from('customer')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    
    if (error) {
      handleApiError(error, "Erro ao carregar clientes");
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const handleSalvar = async () => {
    if (!novoCliente.name || !user) {
      toast({
        title: "Erro",
        description: "O name do cliente é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Validar CPF se informado
    if (novoCliente.cpf && novoCliente.cpf.replace(/\D/g, '').length === 11) {
      if (!validateCPF(novoCliente.cpf)) {
        toast({
          title: "CPF Inválido",
          description: "O CPF informado não é válido. Verifique os dígitos.",
          variant: "destructive"
        });
        return;
      }
    }

    const enderecoCompleto = novoCliente.numero 
      ? `${novoCliente.endereco}, ${novoCliente.numero}` 
      : novoCliente.endereco;

    const { error } = await api.from('customer').insert({
      user_id: user.id,
      company_id: companyId,
      name: novoCliente.name,
      cpf: novoCliente.cpf || null,
      telefone: novoCliente.telefone || null,
      telefone_adicional: novoCliente.telefone_adicional || null,
      email: novoCliente.email || null,
      birth_date: novoCliente.birth_date || null,
      endereco: enderecoCompleto || null,
      complemento: novoCliente.complemento || null,
      bairro: novoCliente.bairro || null,
      cidade: novoCliente.cidade || null,
      estado: novoCliente.estado || null,
      cep: novoCliente.cep || null,
      observacoes: novoCliente.observacoes || null
    });

    if (error) {
      handleApiError(error, "Erro ao cadastrar cliente");
    } else {
      setNovoCliente({
        name: '',
        cpf: '',
        telefone: '',
        telefone_adicional: '',
        email: '',
        birth_date: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        observacoes: ''
      });
      setDialogOpen(false);
      fetchClientes();
      toast({
        title: "Sucesso!",
        description: "Cliente cadastrado com sucesso"
      });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setEditCliente({
      name: cliente.name,
      cpf: cliente.cpf || '',
      telefone: cliente.telefone || '',
      telefone_adicional: cliente.telefone_adicional || '',
      email: cliente.email || '',
      birth_date: cliente.birth_date || '',
      endereco: cliente.endereco || '',
      numero: '',
      complemento: cliente.complemento || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      cep: cliente.cep || '',
      observacoes: cliente.observacoes || ''
    });
    setEditDialogOpen(true);
  };

  const handleSalvarEdicao = async () => {
    if (!editingCliente || !editCliente.name) {
      toast({
        title: "Erro",
        description: "O name do cliente é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Validar CPF se informado
    if (editCliente.cpf && editCliente.cpf.replace(/\D/g, '').length === 11) {
      if (!validateCPF(editCliente.cpf)) {
        toast({
          title: "CPF Inválido",
          description: "O CPF informado não é válido. Verifique os dígitos.",
          variant: "destructive"
        });
        return;
      }
    }

    const enderecoCompleto = editCliente.numero 
      ? `${editCliente.endereco}, ${editCliente.numero}` 
      : editCliente.endereco;

    const { error } = await api.from('customer').update({
      name: editCliente.name,
      cpf: editCliente.cpf || null,
      telefone: editCliente.telefone || null,
      telefone_adicional: editCliente.telefone_adicional || null,
      email: editCliente.email || null,
      birth_date: editCliente.birth_date || null,
      endereco: enderecoCompleto || null,
      complemento: editCliente.complemento || null,
      bairro: editCliente.bairro || null,
      cidade: editCliente.cidade || null,
      estado: editCliente.estado || null,
      cep: editCliente.cep || null,
      observacoes: editCliente.observacoes || null
    }).eq('id', editingCliente.id);

    if (error) {
      handleApiError(error, "Erro ao atualizar cliente");
    } else {
      setEditDialogOpen(false);
      setEditingCliente(null);
      fetchClientes();
      toast({
        title: "Sucesso!",
        description: "Cliente atualizado com sucesso"
      });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await api.from('customer').delete().eq('id', id);
    if (error) {
      handleApiError(error, "Erro ao excluir cliente");
    } else {
      fetchClientes();
      toast({
        title: "Sucesso!",
        description: "Cliente excluído com sucesso"
      });
    }
  };

  // Função para processar arquivo CSV/Excel
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportErrors([]);
    setImportedClientes([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setImportErrors(['O arquivo deve conter pelo menos uma linha de cabeçalho e uma de dados']);
        setImportLoading(false);
        return;
      }

      // Detectar separador (vírgula ou ponto-vírgula)
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      // Mapear colunas
      const nomeIndex = headers.findIndex(h => h.includes('name'));
      const cpfIndex = headers.findIndex(h => h.includes('tax_id'));
      const telefoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('celular') || h.includes('fone'));
      const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('e-mail'));
      const enderecoIndex = headers.findIndex(h => h.includes('street') || h.includes('endereço'));
      const cidadeIndex = headers.findIndex(h => h.includes('city'));
      const estadoIndex = headers.findIndex(h => h.includes('state') || h.includes('uf'));
      const cepIndex = headers.findIndex(h => h.includes('postal_code'));

      if (nomeIndex === -1) {
        setImportErrors(['A coluna "name" é obrigatória no arquivo']);
        setImportLoading(false);
        return;
      }

      const importados: ImportedCliente[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
        const name = values[nomeIndex];
        
        if (!name) {
          errors.push(`Linha ${i + 1}: Nome vazio, ignorada`);
          continue;
        }

        const cpf = cpfIndex >= 0 ? formatCPF(values[cpfIndex] || '') : '';
        
        // Validar CPF se tiver 11 dígitos
        if (cpf && cpf.replace(/\D/g, '').length === 11 && !validateCPF(cpf)) {
          errors.push(`Linha ${i + 1}: CPF inválido para "${name}"`);
        }

        importados.push({
          name,
          cpf,
          telefone: telefoneIndex >= 0 ? formatPhone(values[telefoneIndex] || '') : '',
          email: emailIndex >= 0 ? values[emailIndex] : '',
          endereco: enderecoIndex >= 0 ? values[enderecoIndex] : '',
          cidade: cidadeIndex >= 0 ? values[cidadeIndex] : '',
          estado: estadoIndex >= 0 ? values[estadoIndex]?.toUpperCase() : '',
          cep: cepIndex >= 0 ? formatCEP(values[cepIndex] || '') : ''
        });
      }

      setImportedClientes(importados);
      setImportErrors(errors);
    } catch {
      setImportErrors(['Erro ao processar o arquivo. Verifique o formato.']);
    }
    
    setImportLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClientes = async () => {
    if (!user || importedClientes.length === 0) return;

    setImportLoading(true);

    const clientesValidos = importedClientes.filter(c => {
      if (!c.cpf || c.cpf.replace(/\D/g, '').length !== 11) return true;
      return validateCPF(c.cpf);
    });

    const clientesParaInserir = clientesValidos.map(c => ({
      user_id: user.id,
      company_id: companyId,
      name: c.name,
      cpf: c.cpf || null,
      telefone: c.telefone || null,
      email: c.email || null,
      endereco: c.endereco || null,
      cidade: c.cidade || null,
      estado: c.estado || null,
      cep: c.cep || null
    }));

    const { error } = await api.from('customer').insert(clientesParaInserir);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao importar clientes",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso!",
        description: `${clientesValidos.length} clientes importados com sucesso`
      });
      setImportDialogOpen(false);
      setImportedClientes([]);
      setImportErrors([]);
      fetchClientes();
    }

    setImportLoading(false);
  };

  const filteredClientes = clientes.filter(cliente => {
    const searchLower = searchTerm.toLowerCase();
    return (cliente.name || '').toLowerCase().includes(searchLower) ||
           (cliente.email && cliente.email.toLowerCase().includes(searchLower)) ||
           (cliente.telefone && cliente.telefone.includes(searchTerm)) ||
           (cliente.cpf && cliente.cpf.includes(searchTerm));
  });

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
              Oasis › Clientes
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy',
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.2,
            }}>
              Clientes
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy', marginTop: '4px' }}>
              Cadastro e histórico de clientes
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <button
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(142,95,207,0.3)',
                    color: '#8E5FCF', borderRadius: '12px',
                    padding: '10px 20px', cursor: 'pointer',
                    fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#8E5FCF';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                    e.currentTarget.style.color = '#8E5FCF';
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Importar
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Importar Clientes
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Arquivo CSV ou Excel</Label>
                    <div className="flex gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.xls,.xlsx"
                        onChange={handleFileUpload}
                        disabled={importLoading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O arquivo deve conter uma coluna "name" (obrigatória). Colunas opcionais: cpf, telefone, email, endereco, cidade, estado, cep.
                    </p>
                  </div>

                  {importLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando arquivo...
                    </div>
                  )}

                  {importErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-4 text-sm">
                          {importErrors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {importErrors.length > 5 && (
                            <li>...e mais {importErrors.length - 5} avisos</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {importedClientes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span>{importedClientes.length} clientes prontos para importar</span>
                      </div>
                      <div className="border rounded-lg max-h-[200px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>CPF</TableHead>
                              <TableHead>Telefone</TableHead>
                              <TableHead>E-mail</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importedClientes.slice(0, 10).map((c, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-sm">{c.name}</TableCell>
                                <TableCell className="text-sm">{c.cpf || '-'}</TableCell>
                                <TableCell className="text-sm">{c.telefone || '-'}</TableCell>
                                <TableCell className="text-sm">{c.email || '-'}</TableCell>
                              </TableRow>
                            ))}
                            {importedClientes.length > 10 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                                  ...e mais {importedClientes.length - 10} clientes
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => {
                      setImportDialogOpen(false);
                      setImportedClientes([]);
                      setImportErrors([]);
                    }}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleImportClientes} 
                      disabled={importedClientes.length === 0 || importLoading}
                    >
                      {importLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>Importar {importedClientes.length} clientes</>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
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
                Novo Cliente
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Cliente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input 
                    id="name" 
                    placeholder="Nome do cliente" 
                    value={novoCliente.name} 
                    onChange={e => setNovoCliente({ ...novoCliente, name: e.target.value })} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input 
                      id="cpf" 
                      placeholder="000.000.000-00" 
                      value={novoCliente.cpf} 
                      onChange={e => setNovoCliente({ ...novoCliente, cpf: formatCPF(e.target.value) })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input 
                      id="birth_date" 
                      type="date"
                      value={novoCliente.birth_date} 
                      onChange={e => setNovoCliente({ ...novoCliente, birth_date: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      placeholder="(00) 00000-0000" 
                      value={novoCliente.telefone} 
                      onChange={e => setNovoCliente({ ...novoCliente, telefone: formatPhone(e.target.value) })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone_adicional">Telefone Adicional</Label>
                    <Input 
                      id="telefone_adicional" 
                      placeholder="(00) 00000-0000" 
                      value={novoCliente.telefone_adicional} 
                      onChange={e => setNovoCliente({ ...novoCliente, telefone_adicional: formatPhone(e.target.value) })} 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="email@exemplo.com" 
                    value={novoCliente.email} 
                    onChange={e => setNovoCliente({ ...novoCliente, email: e.target.value })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="cep" 
                      placeholder="00000-000" 
                      value={novoCliente.cep} 
                      onChange={e => {
                        const formatted = formatCEP(e.target.value);
                        setNovoCliente({ ...novoCliente, cep: formatted });
                        if (formatted.replace(/\D/g, '').length === 8) {
                          buscarCep(formatted);
                        }
                      }} 
                      className="flex-1"
                    />
                    {loadingCep && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input 
                      id="endereco" 
                      placeholder="Rua, Avenida..." 
                      value={novoCliente.endereco} 
                      onChange={e => setNovoCliente({ ...novoCliente, endereco: e.target.value })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input 
                      id="numero" 
                      placeholder="Nº" 
                      value={novoCliente.numero} 
                      onChange={e => setNovoCliente({ ...novoCliente, numero: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input 
                      id="complemento" 
                      placeholder="Apto, Bloco, Sala..." 
                      value={novoCliente.complemento} 
                      onChange={e => setNovoCliente({ ...novoCliente, complemento: e.target.value })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input 
                      id="bairro" 
                      placeholder="Bairro" 
                      value={novoCliente.bairro} 
                      onChange={e => setNovoCliente({ ...novoCliente, bairro: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input 
                      id="cidade" 
                      placeholder="Cidade" 
                      value={novoCliente.cidade} 
                      onChange={e => setNovoCliente({ ...novoCliente, cidade: e.target.value })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select 
                      value={novoCliente.estado} 
                      onValueChange={value => setNovoCliente({ ...novoCliente, estado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSalvar} className="w-full">
                  Cadastrar Cliente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
          <div className="relative" style={{ maxWidth: '480px' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#9CA3AF' }} />
            <input
              placeholder="Buscar por name, e-mail, telefone ou CPF..."
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
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Total de Clientes',
              value: String(clientes.length),
              sub: 'cadastrados',
              accentGradient: 'linear-gradient(90deg, #8E5FCF, #B987FF)',
              valueColor: '#8E5FCF',
            },
            {
              label: 'Clientes Ativos',
              value: String(clientes.filter(c => c.active !== false).length),
              sub: 'ativos no sistema',
              accentGradient: 'linear-gradient(90deg, #10B981, #6EE7B7)',
              valueColor: '#10B981',
            },
            {
              label: 'Com E-mail',
              value: String(clientes.filter(c => c.email).length),
              sub: 'para contato',
              accentGradient: 'linear-gradient(90deg, #3B82F6, #93C5FD)',
              valueColor: '#3B82F6',
            },
          ].map((card, idx) => (
            <div
              key={idx}
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
          ))}
        </div>

        {/* Clientes List */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(142,95,207,0.12)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(142,95,207,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Gilroy', color: '#1F2937' }}>
              Clientes Cadastrados
            </h2>
            <span style={{
              background: 'rgba(142,95,207,0.08)',
              border: '1px solid rgba(142,95,207,0.2)',
              color: '#8E5FCF',
              borderRadius: '20px', padding: '4px 12px',
              fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.75rem',
            }}>
              {filteredClientes.length} clientes
            </span>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {loading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : filteredClientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div style={{
                  width: '80px', height: '80px', borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <User className="h-9 w-9" style={{ color: '#8E5FCF' }} />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy', marginBottom: '6px' }}>
                  Nenhum cliente encontrado
                </p>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: 'Gilroy' }}>
                  {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro cliente'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(142,95,207,0.06)' }}>
                {filteredClientes.map(cliente => (
                  <ClienteRow
                    key={cliente.id}
                    cliente={cliente}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_nome">Nome Completo *</Label>
                <Input 
                  id="edit_nome" 
                  placeholder="Nome do cliente" 
                  value={editCliente.name} 
                  onChange={e => setEditCliente({ ...editCliente, name: e.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_cpf">CPF</Label>
                  <Input 
                    id="edit_cpf" 
                    placeholder="000.000.000-00" 
                    value={editCliente.cpf} 
                    onChange={e => setEditCliente({ ...editCliente, cpf: formatCPF(e.target.value) })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_data_nascimento">Data de Nascimento</Label>
                  <Input 
                    id="edit_data_nascimento" 
                    type="date"
                    value={editCliente.birth_date} 
                    onChange={e => setEditCliente({ ...editCliente, birth_date: e.target.value })} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_telefone">Telefone</Label>
                  <Input 
                    id="edit_telefone" 
                    placeholder="(00) 00000-0000" 
                    value={editCliente.telefone} 
                    onChange={e => setEditCliente({ ...editCliente, telefone: formatPhone(e.target.value) })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_telefone_adicional">Telefone Adicional</Label>
                  <Input 
                    id="edit_telefone_adicional" 
                    placeholder="(00) 00000-0000" 
                    value={editCliente.telefone_adicional} 
                    onChange={e => setEditCliente({ ...editCliente, telefone_adicional: formatPhone(e.target.value) })} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_email">E-mail</Label>
                <Input 
                  id="edit_email" 
                  type="email"
                  placeholder="email@exemplo.com" 
                  value={editCliente.email} 
                  onChange={e => setEditCliente({ ...editCliente, email: e.target.value })} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_cep">CEP</Label>
                <div className="flex gap-2">
                  <Input 
                    id="edit_cep" 
                    placeholder="00000-000" 
                    value={editCliente.cep} 
                    onChange={e => {
                      const formatted = formatCEP(e.target.value);
                      setEditCliente({ ...editCliente, cep: formatted });
                      if (formatted.replace(/\D/g, '').length === 8) {
                        buscarCep(formatted, true);
                      }
                    }} 
                    className="flex-1"
                  />
                  {loadingCepEdit && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="edit_endereco">Endereço</Label>
                  <Input 
                    id="edit_endereco" 
                    placeholder="Rua, Avenida..." 
                    value={editCliente.endereco} 
                    onChange={e => setEditCliente({ ...editCliente, endereco: e.target.value })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_numero">Número</Label>
                  <Input 
                    id="edit_numero" 
                    placeholder="Nº" 
                    value={editCliente.numero} 
                    onChange={e => setEditCliente({ ...editCliente, numero: e.target.value })} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_complemento">Complemento</Label>
                  <Input 
                    id="edit_complemento" 
                    placeholder="Apto, Bloco, Sala..." 
                    value={editCliente.complemento} 
                    onChange={e => setEditCliente({ ...editCliente, complemento: e.target.value })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_bairro">Bairro</Label>
                  <Input 
                    id="edit_bairro" 
                    placeholder="Bairro" 
                    value={editCliente.bairro} 
                    onChange={e => setEditCliente({ ...editCliente, bairro: e.target.value })} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_cidade">Cidade</Label>
                  <Input 
                    id="edit_cidade" 
                    placeholder="Cidade" 
                    value={editCliente.cidade} 
                    onChange={e => setEditCliente({ ...editCliente, cidade: e.target.value })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_estado">Estado</Label>
                  <Select 
                    value={editCliente.estado} 
                    onValueChange={value => setEditCliente({ ...editCliente, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_observacoes">Observações</Label>
                <Textarea 
                  id="edit_observacoes" 
                  placeholder="Observações sobre o cliente"
                  value={editCliente.observacoes}
                  onChange={e => setEditCliente({ ...editCliente, observacoes: e.target.value })}
                />
              </div>
              <Button onClick={handleSalvarEdicao} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
  );
};

export default Clientes;
