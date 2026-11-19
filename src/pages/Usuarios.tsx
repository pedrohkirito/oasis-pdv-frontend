import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';
import { useEmpresa } from '@/hooks/useEmpresa';
import { api } from '@/lib/api';
import { Navigate } from 'react-router-dom';

import { NiveisAcessoSection } from '@/components/usuarios/NiveisAcessoSection';
import { useNiveisAcesso } from '@/hooks/useNiveisAcesso';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Users, Shield, ShieldOff, Crown, Eye, ShoppingCart, UserPlus,
  Loader2, Pencil, CalendarIcon, Percent, History,
  Building2, Link, Unlink, Search, UserCheck, UserX, Activity, X, HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserWithRole {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  created_at: string;
  last_sign_in: string | null;
  desativado?: boolean;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  visualizador: 'Visualizador',
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  admin:       <Crown       style={{ width: 14, height: 14 }} />,
  gerente:     <Shield      style={{ width: 14, height: 14 }} />,
  vendedor:    <ShoppingCart style={{ width: 14, height: 14 }} />,
  visualizador:<Eye         style={{ width: 14, height: 14 }} />,
};

const roleDescriptions: Record<AppRole, string> = {
  admin:        'Acesso total ao sistema, incluindo gerenciamento de usuários',
  gerente:      'Acesso a todas as funcionalidades exceto gerenciamento de usuários',
  vendedor:     'Pode criar vendas e gerenciar clientes',
  visualizador: 'Apenas visualização, sem poder de edição',
};

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const getInitials = (name: string | null, email: string) => {
  if (name) return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  return email.slice(0, 2).toUpperCase();
};

const getRoleStyle = (role: AppRole): React.CSSProperties => ({
  admin:       { background: 'linear-gradient(135deg, #8E5FCF, #47118F)', color: '#fff',    border: 'none' },
  gerente:     { background: 'rgba(59,130,246,0.1)',  color: '#3B82F6',  border: '1px solid rgba(59,130,246,0.2)' },
  vendedor:    { background: 'rgba(16,185,129,0.1)',  color: '#10B981',  border: '1px solid rgba(16,185,129,0.2)' },
  visualizador:{ background: 'rgba(107,114,128,0.1)', color: '#6B7280',  border: '1px solid rgba(107,114,128,0.2)' },
}[role] as React.CSSProperties);

const getRoleStripe = (role: AppRole) => ({
  admin:        'linear-gradient(135deg, #8E5FCF, #47118F)',
  gerente:      'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  vendedor:     'linear-gradient(135deg, #10B981, #059669)',
  visualizador: 'linear-gradient(135deg, #9CA3AF, #6B7280)',
}[role]);

const getRoleAvatarBg = (role: AppRole) => ({
  admin:        'linear-gradient(135deg, #8E5FCF, #47118F)',
  gerente:      'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  vendedor:     'linear-gradient(135deg, #10B981, #059669)',
  visualizador: 'linear-gradient(135deg, #9CA3AF, #6B7280)',
}[role]);

// ─── Oasis Toggle ─────────────────────────────────────────────────────────────

function OasisToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 99, background: checked ? '#8E5FCF' : '#D1D5DB', cursor: 'pointer', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s ease' }} />
    </div>
  );
}

// ─── Glass Modal wrapper ──────────────────────────────────────────────────────

function GlassModal({ open, onClose, children, maxWidth = 480 }: { open: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  if (!open) return null;
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(71,17,143,0.15)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(142,95,207,0.15)', borderRadius: 24, boxShadow: '0 25px 80px rgba(71,17,143,0.2)', width: '100%', maxWidth, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </motion.div>
    </div>
  );
}

// ─── Modal Header ─────────────────────────────────────────────────────────────

function ModalHeader({ icon, title, subtitle, onClose }: { icon: React.ReactNode; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'Gilroy, sans-serif' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{subtitle}</p>}
        </div>
      </div>
      <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(142,95,207,0.15)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const Usuarios = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading: roleLoading } = useUserRole();
  const { companyId, empresaAtiva } = useEmpresa();
  const { niveis: niveisAcesso } = useNiveisAcesso();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('seller');
  const [emailExistsPrompt, setEmailExistsPrompt] = useState(false);

  // Link existing user state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkRole, setLinkRole] = useState<AppRole>('seller');
  const [linking, setLinking] = useState(false);

  // Ativar/desativar usuário (tela de edição)
  const [togglingAtivo, setTogglingAtivo] = useState(false);

  // Edit user state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [editingEmpresaRole, setEditingEmpresaRole] = useState<AppRole>('seller');
  const [editingNome, setEditingNome] = useState('');
  const [editingNivelAcessoId, setEditingNivelAcessoId] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  // Commission state
  const [comissaoDialogOpen, setComissaoDialogOpen] = useState(false);
  const [comissaoUser, setComissaoUser] = useState<UserWithRole | null>(null);
  const [novoPercentual, setNovoPercentual] = useState<string>('');
  const [dataInicioVigencia, setDataInicioVigencia] = useState<Date>(new Date());
  const [savingComissao, setSavingComissao] = useState(false);
  const [regrasComissao, setRegrasComissao] = useState<Record<string, any[]>>({});
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [historicoUser, setHistoricoUser] = useState<UserWithRole | null>(null);

  // Empresa management state
  interface EmpresaInfo { id: string; name: string; }
  interface UserEmpresaLink { id: string; user_id: string; company_id: string; role: AppRole; nivel_acesso_id?: string | null; }
  const [allEmpresas, setAllEmpresas] = useState<EmpresaInfo[]>([]);
  const [userEmpresaLinks, setUserEmpresaLinks] = useState<UserEmpresaLink[]>([]);
  const [empresaDialogOpen, setEmpresaDialogOpen] = useState(false);
  const [empresaDialogUser, setEmpresaDialogUser] = useState<UserWithRole | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [selectedEmpresaRole, setSelectedEmpresaRole] = useState<AppRole>('seller');
  const [savingEmpresaLink, setSavingEmpresaLink] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!companyId) { setUsers([]); setLoading(false); return; }
    try {
      const response = await api.functions.invoke('list-users', {
        body: { company_id: companyId }, method: 'POST',
      });
      if (response.error) throw new Error(response.error.message || 'Erro ao buscar usuários');
      if (response.data?.error) throw new Error(response.data.error);
      const usersWithRoles: UserWithRole[] = (response.data?.users || []).map((item: any) => ({
        id: item.id, email: item.email || 'Email não disponível', name: item.name,
        role: item.role as AppRole, created_at: item.created_at, last_sign_in: item.last_sign_in, desativado: !!item.desativado,
      }));
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Erro ao carregar usuários');
    } finally { setLoading(false); }
  };

  const fetchRegrasComissao = async () => {
    if (!companyId) return;
    const { data, error } = await api.from('commission_rule').select('*').eq('company_id', companyId).order('data_inicio_vigencia', { ascending: false });
    if (!error && data) {
      const grouped: Record<string, any[]> = {};
      data.forEach((r: any) => { if (!grouped[r.usuario_id]) grouped[r.usuario_id] = []; grouped[r.usuario_id].push(r); });
      setRegrasComissao(grouped);
    }
  };

  const fetchAllEmpresas = async () => {
    const { data } = await api.from('company').select('id, name').eq('active', true);
    if (data) setAllEmpresas(data);
  };

  const fetchUserEmpresaLinks = async () => {
    if (!companyId) { setUserEmpresaLinks([]); return; }
    const { data: currentEmpresaLinks } = await api.from('company_user').select('id, user_id, empresa_id, role, nivel_acesso_id').eq('company_id', companyId);
    if (currentEmpresaLinks) setUserEmpresaLinks(currentEmpresaLinks as UserEmpresaLink[]);
  };

  const getPercentualAtual = (userId: string): number => {
    const regras = regrasComissao[userId];
    if (!regras || regras.length === 0) return 1;
    const hoje = new Date().toISOString().split('T')[0];
    const ativa = regras.find((r: any) => r.data_inicio_vigencia <= hoje && (!r.data_fim_vigencia || r.data_fim_vigencia >= hoje));
    return ativa ? Number(ativa.percentual) : 1;
  };

  const getUserEmpresaLink = (userId: string): UserEmpresaLink | undefined =>
    userEmpresaLinks.find(link => link.user_id === userId);

  const getUserEmpresaRole = (userId: string): AppRole | null => {
    const link = getUserEmpresaLink(userId);
    return link?.role ?? null;
  };

  useEffect(() => {
    if (!authLoading && !roleLoading && hasPermission('canManageUsers')) {
      fetchUsers(); fetchRegrasComissao(); fetchAllEmpresas(); fetchUserEmpresaLinks();
    }
  }, [authLoading, roleLoading, hasPermission, companyId]);

  // === LINK EXISTING USER ===
  const handleLinkExistingUser = async () => {
    if (!linkEmail || !companyId) { toast.error('Preencha o email'); return; }
    setLinking(true);
    try {
      const response = await api.functions.invoke('link-existing-user', { body: { email: linkEmail, company_id: companyId, role: linkRole } });
      if (response.data?.error === 'user_not_found') { toast.error('Nenhum usuário encontrado com este email. Cadastre um novo usuário.'); return; }
      if (response.data?.error === 'already_linked') { toast.error('Este usuário já está vinculado a esta empresa.'); return; }
      if (response.error || response.data?.error) throw new Error(response.data?.message || response.error?.message || 'Erro ao vincular');
      toast.success(`Usuário ${response.data.user.email} vinculado com sucesso!`);
      setLinkDialogOpen(false); setLinkEmail(''); setLinkRole('seller');
      fetchUsers(); fetchUserEmpresaLinks();
    } catch (error: any) { toast.error(error.message || 'Erro ao vincular usuário'); } finally { setLinking(false); }
  };

  // === CREATE USER ===
  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserRole) { toast.error('Preencha todos os campos obrigatórios'); return; }
    if (newUserPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setCreating(true); setEmailExistsPrompt(false);
    try {
      const response = await api.functions.invoke('create-user', { body: { email: newUserEmail, password: newUserPassword, role: newUserRole, name: newUserNome || undefined, company_id: companyId } });
      if (response.data?.error === 'email_exists') { setEmailExistsPrompt(true); setCreating(false); return; }
      if (response.error || response.data?.error) throw new Error(response.data?.message || response.data?.error || response.error?.message);
      const newUserId = response.data?.user?.id;
      if (newUserId && companyId) { await api.from('company_user').insert({ user_id: newUserId, company_id: companyId, role: newUserRole }); }
      toast.success('Usuário criado e vinculado à empresa com sucesso!');
      setCreateDialogOpen(false); resetCreateForm(); fetchUsers(); fetchUserEmpresaLinks();
    } catch (error: any) { console.error('Error creating user:', error); toast.error(error.message || 'Erro ao criar usuário'); } finally { setCreating(false); }
  };

  const handleLinkFromCreate = async () => {
    if (!newUserEmail || !companyId) return;
    setCreating(true);
    try {
      const response = await api.functions.invoke('link-existing-user', { body: { email: newUserEmail, company_id: companyId, role: newUserRole } });
      if (response.data?.error === 'already_linked') { toast.error('Este usuário já está vinculado a esta empresa.'); return; }
      if (response.error || response.data?.error) throw new Error(response.data?.message || response.error?.message || 'Erro ao vincular');
      toast.success(`Usuário vinculado à empresa com sucesso!`);
      setCreateDialogOpen(false); resetCreateForm(); fetchUsers(); fetchUserEmpresaLinks();
    } catch (error: any) { toast.error(error.message || 'Erro ao vincular usuário'); } finally { setCreating(false); }
  };

  const resetCreateForm = () => { setNewUserEmail(''); setNewUserPassword(''); setNewUserNome(''); setNewUserRole('seller'); setEmailExistsPrompt(false); };

  // === EDIT USER ===
  const openEditDialog = (userItem: UserWithRole) => {
    setUserToEdit(userItem); setEditingEmpresaRole(getUserEmpresaRole(userItem.id) || userItem.role);
    setEditingNome(userItem.name || '');
    const link = getUserEmpresaLink(userItem.id);
    setEditingNivelAcessoId(link?.nivel_acesso_id || '');
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!userToEdit || !companyId) return;
    setUpdating(true);
    try {
      const link = getUserEmpresaLink(userToEdit.id);
      if (link) {
        const { error } = await api.from('company_user').update({ role: editingEmpresaRole, nivel_acesso_id: editingNivelAcessoId || null }).eq('id', link.id);
        if (error) throw error;
      }
      if (editingNome !== (userToEdit.name || '')) { await api.functions.invoke('update-user', { body: { userId: userToEdit.id, name: editingNome, company_id: companyId } }); }
      setUsers(prev => prev.map(u => u.id === userToEdit.id ? { ...u, role: editingEmpresaRole, name: editingNome || null } : u));
      toast.success('Usuário atualizado com sucesso!'); setEditDialogOpen(false); setUserToEdit(null); fetchUserEmpresaLinks();
    } catch (error: any) { console.error('Error updating user:', error); toast.error(error.message || 'Erro ao atualizar usuário'); } finally { setUpdating(false); }
  };

  // === ATIVAR / DESATIVAR ===
  // Usuários não são excluídos: desativar bloqueia o login e mantém todo o histórico.
  const handleToggleAtivo = async () => {
    if (!userToEdit || !companyId) return;
    const desativar = !userToEdit.desativado;
    if (desativar && !window.confirm(`Desativar ${userToEdit.name || userToEdit.email}? Ele deixa de conseguir entrar no sistema. Você pode reativar quando quiser.`)) return;
    setTogglingAtivo(true);
    try {
      const response = await api.functions.invoke('update-user', { body: { userId: userToEdit.id, company_id: companyId, active: !desativar } });
      if (response.error) throw new Error(response.error.message || 'Erro ao atualizar usuário');
      if (response.data?.error) throw new Error(response.data.error);
      toast.success(desativar ? 'Usuário desativado. Ele não consegue mais entrar no sistema.' : 'Usuário reativado.');
      setUserToEdit({ ...userToEdit, desativado: desativar });
      setUsers(prev => prev.map(u => u.id === userToEdit.id ? { ...u, desativado: desativar } : u));
    } catch (error: any) { toast.error(error.message || 'Erro ao atualizar usuário'); } finally { setTogglingAtivo(false); }
  };

  // === COMMISSION ===
  const openComissaoDialog = (userItem: UserWithRole) => {
    setComissaoUser(userItem); setNovoPercentual(String(getPercentualAtual(userItem.id)));
    setDataInicioVigencia(new Date()); setComissaoDialogOpen(true);
  };

  const openHistoricoDialog = (userItem: UserWithRole) => { setHistoricoUser(userItem); setHistoricoDialogOpen(true); };

  const handleSalvarComissao = async () => {
    if (!comissaoUser || !novoPercentual || !user || !companyId) return;
    const percentual = parseFloat(novoPercentual);
    if (isNaN(percentual) || percentual < 0 || percentual > 100) { toast.error('Percentual deve ser entre 0 e 100'); return; }
    setSavingComissao(true);
    try {
      const dataInicio = format(dataInicioVigencia, 'yyyy-MM-dd');
      const regrasAtuais = regrasComissao[comissaoUser.id] || [];
      const regraAtiva = regrasAtuais.find((r: any) => !r.data_fim_vigencia);
      if (regraAtiva) {
        const fimDate = new Date(dataInicioVigencia);
        fimDate.setDate(fimDate.getDate() - 1);
        await api.from('commission_rule').update({ data_fim_vigencia: format(fimDate, 'yyyy-MM-dd') } as any).eq('id', regraAtiva.id);
      }
      const { error } = await api.from('commission_rule').insert({ usuario_id: comissaoUser.id, company_id: companyId, percentual, data_inicio_vigencia: dataInicio, criado_por: user.id } as any);
      if (error) throw error;
      toast.success(`Comissão de ${percentual}% definida para ${comissaoUser.name || comissaoUser.email}`);
      setComissaoDialogOpen(false); setComissaoUser(null); fetchRegrasComissao();
    } catch (error: any) { toast.error(error.message || 'Erro ao salvar regra de comissão'); } finally { setSavingComissao(false); }
  };

  // === EMPRESA MANAGEMENT ===
  const openEmpresaDialog = (userItem: UserWithRole) => { setEmpresaDialogUser(userItem); setSelectedEmpresaId(''); setSelectedEmpresaRole('seller'); setEmpresaDialogOpen(true); };

  const getUserEmpresas = (userId: string) =>
    userEmpresaLinks.filter(link => link.user_id === userId).map(link => ({ ...link, empresaNome: allEmpresas.find(e => e.id === link.empresa_id)?.name || 'Desconhecida' }));

  const handleVincularEmpresa = async () => {
    if (!empresaDialogUser || !selectedEmpresaId) { toast.error('Selecione uma empresa'); return; }
    setSavingEmpresaLink(true);
    try {
      const { error } = await api.from('company_user').insert({ user_id: empresaDialogUser.id, company_id: selectedEmpresaId, role: selectedEmpresaRole });
      if (error) throw error;
      toast.success('Usuário vinculado à empresa com sucesso!'); fetchUserEmpresaLinks(); setSelectedEmpresaId('');
    } catch (error: any) { toast.error(error.message || 'Erro ao vincular usuário'); } finally { setSavingEmpresaLink(false); }
  };

  const handleDesvincularEmpresa = async (linkId: string) => {
    setUnlinkingId(linkId);
    try {
      const { error } = await api.from('company_user').delete().eq('id', linkId);
      if (error) throw error;
      toast.success('Usuário desvinculado da empresa'); fetchUserEmpresaLinks();
    } catch (error: any) { toast.error(error.message || 'Erro ao desvincular usuário'); } finally { setUnlinkingId(null); }
  };

  // ── UI-only states ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'todos'>('todos');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQuery ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'todos' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === 'admin').length;
  const activeCount = users.filter(u => !u.desativado).length;
  const onlineCount = users.filter(u => u.last_sign_in && new Date(u.last_sign_in) > new Date(Date.now() - 86400000)).length;

  // ── Estilos base ───────────────────────────────────────────────────────────
  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(142,95,207,0.12)', borderRadius: 20,
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 14px', fontSize: 13, border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: 12, background: 'rgba(255,255,255,0.8)', outline: 'none',
    fontFamily: 'Gilroy, sans-serif', color: '#1F2937', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 4, display: 'block', fontFamily: 'Gilroy, sans-serif',
  };

  const modalInputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 13,
    border: '1px solid rgba(142,95,207,0.2)', borderRadius: 12,
    background: 'rgba(255,255,255,0.8)', outline: 'none',
    fontFamily: 'Gilroy, sans-serif', color: '#1F2937', boxSizing: 'border-box',
  };

  const roleBadge = (role: AppRole) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', ...getRoleStyle(role) }}>
      {roleIcons[role]}{roleLabels[role]}
    </span>
  );

  // ── Auth guards ────────────────────────────────────────────────────────────

  if (authLoading || roleLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!hasPermission('canManageUsers')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444', fontFamily: 'Gilroy, sans-serif', marginBottom: 8 }}>Acesso Negado</h1>
          <p style={{ color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>Oasis › Configurações › Usuários</p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy, sans-serif', margin: 0, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Usuários</h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif', margin: '6px 0 0' }}>Gerencie usuários, perfis e permissões</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setLinkDialogOpen(true)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 12, border: '1px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link style={{ width: 14, height: 14 }} /> Vincular
            </button>
            <button onClick={() => setCreateDialogOpen(true)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus style={{ width: 14, height: 14 }} /> + Novo Usuário
            </button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Usuários',     value: users.length,  sub: 'usuários cadastrados',     icon: <Users       style={{ width: 18, height: 18, color: '#8E5FCF' }} />, iconBg: 'rgba(142,95,207,0.12)', borderColor: '#8E5FCF', valueColor: '#8E5FCF' },
            { label: 'Ativos',             value: activeCount,   sub: 'usuários ativos',          icon: <UserCheck   style={{ width: 18, height: 18, color: '#10B981' }} />, iconBg: 'rgba(16,185,129,0.12)',  borderColor: '#10B981', valueColor: '#10B981' },
            { label: 'Administradores',    value: adminCount,    sub: 'com acesso total',         icon: <Shield      style={{ width: 18, height: 18, color: '#F59E0B' }} />, iconBg: 'rgba(245,158,11,0.12)',  borderColor: '#F59E0B', valueColor: '#F59E0B' },
            { label: 'Online agora',       value: onlineCount,   sub: 'usuários online',          icon: <Activity    style={{ width: 18, height: 18, color: '#3B82F6' }} />, iconBg: 'rgba(59,130,246,0.12)',  borderColor: '#3B82F6', valueColor: '#3B82F6' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
              style={{ ...glassCard, padding: 24, borderTop: `4px solid ${card.borderColor}`, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', cursor: 'default' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{card.icon}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy, sans-serif', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 6, fontFamily: 'Gilroy, sans-serif' }}>{card.sub}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937', marginTop: 2, fontFamily: 'Gilroy, sans-serif' }}>{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Search + Filters */}
        <div style={{ ...glassCard, padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar usuário..."
              style={{ ...inputStyle, paddingLeft: 38, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['todos', 'admin', 'manager', 'seller', 'viewer'] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)}
                style={{ padding: '6px 14px', borderRadius: 20, border: filterRole === r ? 'none' : '1px solid rgba(142,95,207,0.2)', background: filterRole === r ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent', color: filterRole === r ? '#fff' : '#6B7280', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', transition: 'all 0.2s', boxShadow: filterRole === r ? '0 4px 12px rgba(142,95,207,0.3)' : 'none' }}>
                {r === 'todos' ? 'Todos' : roleLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* User Grid */}
        {!companyId ? (
          <div style={{ ...glassCard, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Building2 style={{ width: 32, height: 32, color: '#8E5FCF' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>Nenhuma empresa selecionada</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: 0 }}>Selecione uma empresa para visualizar os usuários</p>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 style={{ width: 32, height: 32, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ ...glassCard, padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users style={{ width: 32, height: 32, color: '#8E5FCF' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>Nenhum usuário encontrado</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: '0 0 20px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>Adicione usuários para sua equipe acessar o sistema</p>
            <button onClick={() => setCreateDialogOpen(true)}
              style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Gilroy, sans-serif' }}>
              + Adicionar primeiro usuário
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {filteredUsers.map((userItem, i) => {
              const empresaRole = getUserEmpresaRole(userItem.id);
              const displayRole = empresaRole || userItem.role;
              const link = getUserEmpresaLink(userItem.id);
              const isMe = userItem.id === user.id;
              const isOnline = userItem.last_sign_in && new Date(userItem.last_sign_in) > new Date(Date.now() - 86400000);
              return (
                <motion.div key={userItem.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
                  onMouseEnter={() => setHoveredCard(userItem.id)} onMouseLeave={() => setHoveredCard(null)}
                  style={{ ...glassCard, overflow: 'hidden', transform: hoveredCard === userItem.id ? 'translateY(-4px)' : 'translateY(0)', boxShadow: hoveredCard === userItem.id ? '0 16px 48px rgba(71,17,143,0.12)' : 'none', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column' }}>
                  {/* Top stripe */}
                  <div style={{ height: 6, background: getRoleStripe(displayRole) }} />
                  {/* Body */}
                  <div style={{ padding: '20px 20px 16px', flex: 1 }}>
                    {/* Avatar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: getRoleAvatarBg(displayRole), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', fontFamily: 'Gilroy, sans-serif' }}>{getInitials(userItem.name, userItem.email)}</span>
                        </div>
                        {isOnline && (
                          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: '#10B981', border: '2px solid white' }} />
                        )}
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Gilroy, sans-serif', color: '#1F2937', textAlign: 'center', margin: '10px 0 2px' }}>
                        {userItem.name || userItem.email}
                        {isMe && <span style={{ fontSize: 10, fontWeight: 600, color: '#8E5FCF', background: 'rgba(142,95,207,0.1)', padding: '1px 6px', borderRadius: 99, marginLeft: 6, fontFamily: 'Gilroy, sans-serif' }}>Você</span>}
                      </p>
                      {userItem.name && <p style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif', textAlign: 'center', margin: 0 }}>{userItem.email}</p>}
                      <div style={{ marginTop: 8 }}>
                        {(() => {
                          if (link?.nivel_acesso_id === '__no_access__') return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'Gilroy, sans-serif' }}>
                              <ShieldOff style={{ width: 12, height: 12 }} /> Sem Acesso
                            </span>
                          );
                          if (link?.nivel_acesso_id) {
                            const nivel = niveisAcesso.find(n => n.id === link.nivel_acesso_id);
                            if (nivel) return (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(142,95,207,0.1)', color: '#8E5FCF', border: '1px solid rgba(142,95,207,0.2)', fontFamily: 'Gilroy, sans-serif' }}>
                                <Shield style={{ width: 12, height: 12 }} /> {nivel.name}
                              </span>
                            );
                          }
                          return roleBadge(displayRole);
                        })()}
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(142,95,207,0.08)', margin: '12px 0' }} />
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: 'rgba(142,95,207,0.04)', borderRadius: 10, padding: '8px 12px' }}>
                        <span style={{ ...labelStyle, fontSize: 9, marginBottom: 2 }}>Comissão</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif' }}>{getPercentualAtual(userItem.id)}%</span>
                      </div>
                      <div style={{ background: 'rgba(142,95,207,0.04)', borderRadius: 10, padding: '8px 12px' }}>
                        <span style={{ ...labelStyle, fontSize: 9, marginBottom: 2 }}>Último acesso</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                          {userItem.last_sign_in ? new Date(userItem.last_sign_in).toLocaleDateString('pt-BR') : 'Nunca'}
                        </span>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', background: userItem.desativado ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: userItem.desativado ? '#EF4444' : '#10B981' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: userItem.desativado ? '#EF4444' : '#10B981', display: 'inline-block' }} />
                        {userItem.desativado ? 'Desativado' : 'Ativo'}
                      </span>
                    </div>
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(142,95,207,0.08)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {isMe ? (
                      <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', padding: '6px 0' }}>Conta atual</span>
                    ) : (
                      <>
                        <button onClick={() => openEditDialog(userItem)}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(142,95,207,0.08)', color: '#8E5FCF', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Pencil style={{ width: 10, height: 10 }} /> Editar
                        </button>
                        <button onClick={() => openComissaoDialog(userItem)}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Percent style={{ width: 10, height: 10 }} /> Comissão
                        </button>
                        <button onClick={() => openEmpresaDialog(userItem)}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 style={{ width: 10, height: 10 }} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* NiveisAcessoSection — INALTERADO */}
        <NiveisAcessoSection />

      </div>

      {/* ══ MODAIS ════════════════════════════════════════════════════════════ */}

      {/* Link Existing */}
      <GlassModal open={linkDialogOpen} onClose={() => { setLinkDialogOpen(false); setLinkEmail(''); setLinkRole('seller'); }}>
        <ModalHeader icon={<Search style={{ width: 16, height: 16, color: '#fff' }} />} title="Vincular Usuário Existente" subtitle={`Busque por email e vincule à empresa ${empresaAtiva?.name}`} onClose={() => { setLinkDialogOpen(false); setLinkEmail(''); setLinkRole('seller'); }} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={labelStyle}>Email do usuário</label><input type="email" placeholder="email@exemplo.com" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} style={modalInputStyle} /></div>
          <div>
            <label style={labelStyle}>Papel na empresa</label>
            <Select value={linkRole} onValueChange={v => setLinkRole(v as AppRole)}>
              <SelectTrigger style={{ height: 40, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy, sans-serif' }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Crown style={{ width: 14, height: 14 }} /> Administrador</span></SelectItem>
                <SelectItem value="manager"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield style={{ width: 14, height: 14 }} /> Gerente</span></SelectItem>
                <SelectItem value="seller"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShoppingCart style={{ width: 14, height: 14 }} /> Vendedor</span></SelectItem>
                <SelectItem value="viewer"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Eye style={{ width: 14, height: 14 }} /> Visualizador</span></SelectItem>
              </SelectContent>
            </Select>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, fontFamily: 'Gilroy, sans-serif' }}>{roleDescriptions[linkRole]}</p>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => { setLinkDialogOpen(false); setLinkEmail(''); setLinkRole('seller'); }} disabled={linking} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>Cancelar</button>
          <button onClick={handleLinkExistingUser} disabled={linking || !linkEmail} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: (!linking && linkEmail) ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(142,95,207,0.3)', color: '#fff', cursor: (!linking && linkEmail) ? 'pointer' : 'not-allowed', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            {linking ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Vinculando…</> : <><Link style={{ width: 14, height: 14 }} /> Vincular</>}
          </button>
        </div>
      </GlassModal>

      {/* Create User */}
      <GlassModal open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); resetCreateForm(); }}>
        <ModalHeader icon={<UserPlus style={{ width: 16, height: 16, color: '#fff' }} />} title="Cadastrar Novo Usuário" subtitle={`Criar conta e vincular à empresa ${empresaAtiva?.name}`} onClose={() => { setCreateDialogOpen(false); resetCreateForm(); }} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {emailExistsPrompt && (
            <div style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 6px', fontFamily: 'Gilroy, sans-serif' }}>⚠️ Usuário já existe no sistema.</p>
              <p style={{ fontSize: 12, color: '#B45309', margin: '0 0 10px', fontFamily: 'Gilroy, sans-serif' }}>Deseja vincular este usuário à empresa <strong>{empresaAtiva?.name}</strong> como <strong>{roleLabels[newUserRole]}</strong>?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleLinkFromCreate} disabled={creating} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Gilroy, sans-serif' }}>{creating ? 'Vinculando…' : 'Sim, vincular'}</button>
                <button onClick={() => setEmailExistsPrompt(false)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'transparent', color: '#B45309', cursor: 'pointer', fontSize: 12, fontFamily: 'Gilroy, sans-serif' }}>Cancelar</button>
              </div>
            </div>
          )}
          <div><label style={labelStyle}>Nome (opcional)</label><input placeholder="Nome do usuário" value={newUserNome} onChange={e => setNewUserNome(e.target.value)} style={modalInputStyle} /></div>
          <div><label style={labelStyle}>Email *</label><input type="email" placeholder="email@exemplo.com" value={newUserEmail} onChange={e => { setNewUserEmail(e.target.value); setEmailExistsPrompt(false); }} style={modalInputStyle} /></div>
          <div><label style={labelStyle}>Senha *</label><input type="password" placeholder="Mínimo 6 caracteres" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} style={modalInputStyle} /></div>
          <div>
            <label style={labelStyle}>Nível de acesso *</label>
            <Select value={newUserRole} onValueChange={v => setNewUserRole(v as AppRole)}>
              <SelectTrigger style={{ height: 40, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy, sans-serif' }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="seller">Vendedor</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, fontFamily: 'Gilroy, sans-serif' }}>{roleDescriptions[newUserRole]}</p>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }} disabled={creating} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>Cancelar</button>
          <button onClick={handleCreateUser} disabled={creating || emailExistsPrompt} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: (!creating && !emailExistsPrompt) ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(142,95,207,0.3)', color: '#fff', cursor: (!creating && !emailExistsPrompt) ? 'pointer' : 'not-allowed', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            {creating ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Criando…</> : <><UserPlus style={{ width: 14, height: 14 }} /> Criar Usuário</>}
          </button>
        </div>
      </GlassModal>

      {/* Edit User */}
      <GlassModal open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <ModalHeader icon={<Pencil style={{ width: 16, height: 16, color: '#fff' }} />} title="Editar Usuário" subtitle={`${userToEdit?.name || userToEdit?.email} — ${empresaAtiva?.name}`} onClose={() => setEditDialogOpen(false)} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>Nome</label><input placeholder="Nome do usuário" value={editingNome} onChange={e => setEditingNome(e.target.value)} style={modalInputStyle} /></div>
          <div><label style={labelStyle}>Email</label><p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>{userToEdit?.email}</p></div>
          <div>
            <label style={labelStyle}>Papel nesta empresa</label>
            <Select value={editingNivelAcessoId ? `nivel_${editingNivelAcessoId}` : editingEmpresaRole}
              onValueChange={value => {
                if (value === '__no_access__') { setEditingNivelAcessoId('__no_access__'); setEditingEmpresaRole('viewer'); }
                else if (value.startsWith('nivel_')) { setEditingNivelAcessoId(value.replace('nivel_', '')); setEditingEmpresaRole('viewer'); }
                else { setEditingNivelAcessoId(''); setEditingEmpresaRole(value as AppRole); }
              }}>
              <SelectTrigger style={{ height: 40, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy, sans-serif' }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="seller">Vendedor</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
                {niveisAcesso.length > 0 && (
                  <>
                    <SelectItem value="__no_access__"><span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldOff style={{ width: 14, height: 14 }} /> Sem Acesso</span></SelectItem>
                    {niveisAcesso.map(nivel => (<SelectItem key={nivel.id} value={`nivel_${nivel.id}`}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield style={{ width: 14, height: 14, color: '#8E5FCF' }} /> {nivel.name}</span></SelectItem>))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, fontFamily: 'Gilroy, sans-serif' }}>
              {editingNivelAcessoId === '__no_access__' ? 'O usuário não terá acesso a nenhum módulo.' : editingNivelAcessoId ? 'Permissões definidas pelo nível customizado.' : roleDescriptions[editingEmpresaRole]}
            </p>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={handleToggleAtivo} disabled={togglingAtivo || updating}
            style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: (togglingAtivo || updating) ? 'not-allowed' : 'pointer', fontFamily: 'Gilroy, sans-serif',
              border: userToEdit?.desativado ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
              background: 'transparent', color: userToEdit?.desativado ? '#10B981' : '#EF4444' }}>
            {togglingAtivo ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : userToEdit?.desativado ? <UserCheck style={{ width: 14, height: 14 }} /> : <UserX style={{ width: 14, height: 14 }} />}
            {userToEdit?.desativado ? 'Reativar usuário' : 'Desativar usuário'}
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span aria-label="Por que não é possível excluir usuários" style={{ display: 'inline-flex', cursor: 'help', color: '#9CA3AF' }}>
                <HelpCircle style={{ width: 14, height: 14 }} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" style={{ maxWidth: 280, zIndex: 10000, fontFamily: 'Gilroy, sans-serif', fontSize: 12, lineHeight: 1.5 }}>
              Os usuários não podem ser excluídos, para que não ocorra nenhuma perda ou alteração nos dados passados. Desativar bloqueia o login e mantém todo o histórico; você pode reativar quando quiser.
            </TooltipContent>
          </Tooltip>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => setEditDialogOpen(false)} disabled={updating} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>Cancelar</button>
          <button onClick={handleUpdateUser} disabled={updating} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: !updating ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(142,95,207,0.3)', color: '#fff', cursor: !updating ? 'pointer' : 'not-allowed', fontFamily: 'Gilroy, sans-serif' }}>
            {updating ? 'Salvando…' : 'Salvar Alterações'}
          </button>
        </div>
      </GlassModal>

      {/* Commission */}
      <GlassModal open={comissaoDialogOpen} onClose={() => setComissaoDialogOpen(false)}>
        <ModalHeader icon={<Percent style={{ width: 16, height: 16, color: '#fff' }} />} title="Alterar Comissão" subtitle={`${comissaoUser?.name || comissaoUser?.email}`} onClose={() => setComissaoDialogOpen(false)} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(142,95,207,0.06)' }}>
            <p style={{ fontSize: 12, color: '#8E5FCF', margin: 0, fontFamily: 'Gilroy, sans-serif' }}>A nova comissão será aplicada apenas para vendas a partir da data selecionada.</p>
          </div>
          <div>
            <label style={labelStyle}>Novo Percentual (%)</label>
            <input type="text" inputMode="numeric" placeholder="0,00" value={novoPercentual}
              onChange={e => { const digits = e.target.value.replace(/\D/g, ''); const num = parseInt(digits || '0', 10) / 100; setNovoPercentual(num ? num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''); }}
              style={modalInputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Data de Início da Vigência</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn("w-full justify-start text-left font-normal")} style={{ width: '100%', padding: '9px 14px', borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif', fontSize: 13, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarIcon style={{ width: 16, height: 16, color: '#8E5FCF' }} />
                  {format(dataInicioVigencia, 'dd/MM/yyyy', { locale: ptBR })}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicioVigencia} onSelect={date => date && setDataInicioVigencia(date)} locale={ptBR} className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: 0 }}>
            Percentual atual: <strong style={{ color: '#8E5FCF' }}>{comissaoUser ? getPercentualAtual(comissaoUser.id) : 1}%</strong>
          </p>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(142,95,207,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => setComissaoDialogOpen(false)} disabled={savingComissao} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid rgba(142,95,207,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>Cancelar</button>
          <button onClick={handleSalvarComissao} disabled={savingComissao} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: !savingComissao ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(142,95,207,0.3)', color: '#fff', cursor: !savingComissao ? 'pointer' : 'not-allowed', fontFamily: 'Gilroy, sans-serif' }}>
            {savingComissao ? 'Salvando…' : 'Salvar Comissão'}
          </button>
        </div>
      </GlassModal>

      {/* Commission History */}
      <GlassModal open={historicoDialogOpen} onClose={() => setHistoricoDialogOpen(false)} maxWidth={560}>
        <ModalHeader icon={<History style={{ width: 16, height: 16, color: '#fff' }} />} title="Histórico de Comissão" subtitle={historicoUser?.name || historicoUser?.email} onClose={() => setHistoricoDialogOpen(false)} />
        <div style={{ padding: '20px 24px' }}>
          {historicoUser && regrasComissao[historicoUser.id]?.length > 0 ? (
            <div style={{ background: 'rgba(142,95,207,0.03)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px', gap: 0, padding: '10px 16px', background: 'rgba(142,95,207,0.06)', borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
                {['%', 'Início', 'Fim', 'Status'].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Gilroy, sans-serif' }}>{h}</span>)}
              </div>
              {regrasComissao[historicoUser.id].map((regra: any) => {
                const hoje = new Date().toISOString().split('T')[0];
                const ativa = regra.data_inicio_vigencia <= hoje && (!regra.data_fim_vigencia || regra.data_fim_vigencia >= hoje);
                return (
                  <div key={regra.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px', gap: 0, padding: '10px 16px', borderBottom: '1px solid rgba(142,95,207,0.06)', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{regra.percentual}%</span>
                    <span style={{ fontSize: 13, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>{new Date(regra.data_inicio_vigencia).toLocaleDateString('pt-BR')}</span>
                    <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Gilroy, sans-serif' }}>{regra.data_fim_vigencia ? new Date(regra.data_fim_vigencia).toLocaleDateString('pt-BR') : '—'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif', background: ativa ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: ativa ? '#10B981' : '#6B7280' }}>{ativa ? 'Ativa' : 'Enc.'}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', padding: '20px 0', margin: 0 }}>Nenhuma regra de comissão. Percentual padrão: 1%</p>
          )}
        </div>
      </GlassModal>

      {/* Empresa Management */}
      <GlassModal open={empresaDialogOpen} onClose={() => setEmpresaDialogOpen(false)} maxWidth={560}>
        <ModalHeader icon={<Building2 style={{ width: 16, height: 16, color: '#fff' }} />} title="Gerenciar Empresas" subtitle={`Vínculos de ${empresaDialogUser?.name || empresaDialogUser?.email}`} onClose={() => setEmpresaDialogOpen(false)} />
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Empresas vinculadas</label>
            {empresaDialogUser && getUserEmpresas(empresaDialogUser.id).length === 0 ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: 0 }}>Nenhuma empresa vinculada</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {empresaDialogUser && getUserEmpresas(empresaDialogUser.id).map(ue => (
                  <div key={ue.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(142,95,207,0.12)', background: 'rgba(255,255,255,0.6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 style={{ width: 16, height: 16, color: '#9CA3AF' }} />
                      <span style={{ fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', fontSize: 13 }}>{ue.empresaNome}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif', ...getRoleStyle(ue.role) }}>{roleLabels[ue.role]}</span>
                    </div>
                    <button onClick={() => handleDesvincularEmpresa(ue.id)} disabled={unlinkingId === ue.id}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {unlinkingId === ue.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <><Unlink style={{ width: 12, height: 12 }} /> Desvincular</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid rgba(142,95,207,0.1)', paddingTop: 16 }}>
            <label style={labelStyle}>Vincular a nova empresa</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                <SelectTrigger style={{ flex: 1, height: 40, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy, sans-serif' }}><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {allEmpresas.filter(e => empresaDialogUser && !getUserEmpresas(empresaDialogUser.id).some(ue => ue.empresa_id === e.id)).map(empresa => (
                    <SelectItem key={empresa.id} value={empresa.id}>{empresa.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedEmpresaRole} onValueChange={v => setSelectedEmpresaRole(v as AppRole)}>
                <SelectTrigger style={{ width: 150, height: 40, borderRadius: 12, border: '1px solid rgba(142,95,207,0.2)', background: 'rgba(255,255,255,0.8)', fontFamily: 'Gilroy, sans-serif' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="seller">Vendedor</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button onClick={handleVincularEmpresa} disabled={!selectedEmpresaId || savingEmpresaLink}
              style={{ width: '100%', padding: '9px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: (selectedEmpresaId && !savingEmpresaLink) ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(142,95,207,0.3)', color: '#fff', cursor: (selectedEmpresaId && !savingEmpresaLink) ? 'pointer' : 'not-allowed', fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {savingEmpresaLink ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Vinculando…</> : <><Link style={{ width: 14, height: 14 }} /> Vincular</>}
            </button>
          </div>
        </div>
      </GlassModal>

    </div>
  );
};

export default Usuarios;
