import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, LayoutDashboard, FileText, Users, BarChart3,
  ShoppingCart, Package, UserCircle, Settings, Building2,
  ChevronLeft, ChevronRight, Search, ClipboardList, DollarSign,
  Lock, Bell, Menu, UserCog, Settings2, ChevronDown, Tag, Banknote, CalendarDays, CreditCard, ShoppingBag, TrendingUp, ScrollText, Target, Landmark, GitMerge, BarChart2, Printer, ListTree, Scale, BookOpen, Wrench,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useEmpresa } from '@/hooks/useEmpresa';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CommandMenu } from '@/components/CommandMenu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

// ─── Navegação agrupada ──────────────────────────────────────────────────────

const navGroups = [
  {
    label: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'canViewDashboard' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/caixa',           label: 'Caixa',             icon: Banknote,      permission: 'canViewVendas'    },
      { to: '/caixa/historico', label: 'Histórico de Caixas', icon: CalendarDays,  permission: 'canViewVendas'    },
      { to: '/vendas',       label: 'Vendas',      icon: ShoppingCart, permission: 'canViewVendas'   },
      { to: '/orcamentos',   label: 'Orçamentos',  icon: ScrollText,   permission: 'canViewVendas'   },
      { to: '/metas',        label: 'Metas',       icon: Target,       permission: 'canViewVendas'   },
      { to: '/produtos',     label: 'Produtos',    icon: Package,      permission: 'canViewProdutos' },
      { to: '/servicos',     label: 'Serviços',    icon: Wrench,       permission: 'canViewServicos' },
      { to: '/clientes',  label: 'Clientes',   icon: UserCircle,    permission: 'canViewClientes'  },
      { to: '/operacoes', label: 'Operações',  icon: ClipboardList, permission: 'canViewVendas'    },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/financeiro',            label: 'Central Financeira', icon: BarChart2,  permission: 'canViewDashboard'    },
      { to: '/contas-bancarias',      label: 'Contas',           icon: Landmark,    permission: 'canViewDashboard'    },
      { to: '/conciliacao',           label: 'Conciliação',      icon: GitMerge,    permission: 'canViewDashboard'    },
      { to: '/plano-contas',         label: 'Plano de Contas', icon: ListTree,    permission: 'canViewDashboard'    },
      { to: '/balancete',            label: 'Balancete',       icon: Scale,       permission: 'canViewDashboard'    },
      { to: '/lancamentos',          label: 'Lançamentos',     icon: BookOpen,    permission: 'canViewDashboard'    },
      { to: '/contas-a-pagar',       label: 'Contas a Pagar',   icon: FileText,    permission: 'canViewContasPagar'  },
      { to: '/contas-receber',        label: 'Contas a Receber', icon: TrendingUp,  permission: 'canViewDashboard'    },
      { to: '/fornecedores',         label: 'Fornecedores',     icon: Users,       permission: 'canViewFornecedores' },
      { to: '/pedidos-compra',       label: 'Pedidos de Compra', icon: ShoppingBag, permission: 'canViewFornecedores' },
      { to: '/comissoes',            label: 'Comissões',      icon: DollarSign,  permission: 'canViewVendas'       },
      { to: '/fechamento-comissoes', label: 'Fechamento',     icon: Lock,        permission: 'canViewVendas'       },
    ],
  },
  {
    label: 'Fiscal & Analytics',
    items: [
      { to: '/notas-fiscais', label: 'Notas Fiscais', icon: FileText,  permission: 'canViewVendas'    },
      { to: '/relatorios',    label: 'Relatórios',    icon: BarChart3, permission: 'canViewRelatorios'},
    ],
  },
] as const;

const roleLabels: Record<string, string> = {
  admin:        'Administrador',
  gerente:      'Gerente',
  vendedor:     'Vendedor',
  visualizador: 'Visualizador',
};

// ─── Componente de item de navegação ────────────────────────────────────────

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  collapsed: boolean;
}

function NavItem({ to, label, icon: Icon, isActive, collapsed }: NavItemProps) {
  const link = (
    <Link
      to={to}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200',
        isActive
          ? 'font-semibold text-[#6A39AD]'
          : 'font-medium text-text-secondary rounded-xl',
        collapsed && 'justify-center px-0 rounded-xl',
      )}
      style={isActive && !collapsed ? {
        background: 'linear-gradient(135deg, rgba(142,95,207,0.1), rgba(185,135,255,0.06))',
        borderLeft: '3px solid #8E5FCF',
        borderRadius: '0 12px 12px 0',
        paddingLeft: '10px',
      } : undefined}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(142,95,207,0.05)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
      }}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ─── Sidebar content (reutilizável em desktop + mobile drawer) ───────────────

interface SidebarContentProps {
  collapsed: boolean;
  onCollapse?: () => void;
  onNavClick?: () => void;
}

function SidebarContent({ collapsed, onCollapse, onNavClick }: SidebarContentProps) {
  const { user, signOut } = useAuth();
  const { role, hasPermission } = useUserRole();
  const { empresas, empresaAtiva, setEmpresaAtiva, clearEmpresaAtiva } = useEmpresa();
  const location = useLocation();
  const navigate = useNavigate();

  const [configAberto, setConfigAberto] = React.useState(
    location.pathname.includes('/config')
  );

  const getUserInitials = () => {
    const name = user?.user_metadata?.name;
    if (name) return name.substring(0, 2).toUpperCase();
    if (!user?.email) return '?';
    return user.email.substring(0, 2).toUpperCase();
  };

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex h-full flex-col">
      {/* ── Logo + toggle ─────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-[64px] px-4',
        collapsed ? 'justify-center' : 'justify-between',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            {empresaAtiva?.logo_url ? (
              <img src={empresaAtiva.logo_url} alt={empresaAtiva.name} className="h-8 w-auto" />
            ) : (
              <img src="/images/oasis-logo-white.svg" alt="Oasis" className="h-10 w-auto" />
            )}
          </div>
        )}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors duration-200"
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />
            }
          </button>
        )}
      </div>

      {/* ── Seletor de empresa (multi-tenant) ────────────────────── */}
      {!collapsed && empresas.length > 1 && (
        <div className="px-3 py-2">
          <select
            value={empresaAtiva?.id || ''}
            onChange={(e) => {
              const emp = empresas.find(em => em.id === e.target.value);
              if (emp) setEmpresaAtiva(emp);
            }}
            className="w-full text-xs font-medium bg-primary/5 border border-border rounded-lg px-2 py-1.5 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Navegação ─────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => hasPermission(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className={cn(gi > 0 && 'pt-2')}>
              {!collapsed && group.label && (
                <p
                  className="select-none"
                  style={{
                    color: '#9CA3AF', fontSize: '0.65rem', letterSpacing: '0.12em',
                    fontWeight: 700, textTransform: 'uppercase', padding: '16px 16px 6px',
                  }}
                >
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <Separator className="my-2 opacity-40" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => (
                  <div key={item.to} onClick={onNavClick}>
                    <NavItem
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      isActive={location.pathname === item.to}
                      collapsed={collapsed}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── Configurações com submenu ──────────────────────────── */}
        {!collapsed && (
          <div className="pt-2">
            <p
              className="select-none"
              style={{
                color: '#9CA3AF', fontSize: '0.65rem', letterSpacing: '0.12em',
                fontWeight: 700, textTransform: 'uppercase', padding: '16px 16px 6px',
              }}
            >
              Configurações
            </p>
            <button
              onClick={() => setConfigAberto(!configAberto)}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 w-full rounded-xl font-medium',
                location.pathname.includes('/config')
                  ? 'text-[#6A39AD] font-semibold'
                  : 'text-text-secondary hover:text-foreground',
              )}
              onMouseEnter={(e) => {
                if (!location.pathname.includes('/config'))
                  (e.currentTarget as HTMLElement).style.background = 'rgba(142,95,207,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!location.pathname.includes('/config'))
                  (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              <Settings2 className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left truncate">Configurações</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 transition-transform duration-200', configAberto && 'rotate-180')}
              />
            </button>

            <div className={cn('overflow-hidden transition-all duration-200', configAberto ? 'max-h-80' : 'max-h-0')}>
              <div className="pl-8 pt-1 flex flex-col gap-0.5 pb-1">
                <Link
                  to="/configuracoes-fiscais"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
                    location.pathname === '/configuracoes-fiscais'
                      ? 'text-[#6A39AD] font-semibold bg-primary/5'
                      : 'text-text-secondary hover:text-foreground hover:bg-primary/5',
                  )}
                >
                  <FileText className="h-[15px] w-[15px] shrink-0" />
                  Fiscal
                </Link>
                <Link
                  to="/configuracoes/etiquetas"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
                    location.pathname === '/configuracoes/etiquetas'
                      ? 'text-[#6A39AD] font-semibold bg-primary/5'
                      : 'text-text-secondary hover:text-foreground hover:bg-primary/5',
                  )}
                >
                  <Tag className="h-[15px] w-[15px] shrink-0" />
                  Etiquetas
                </Link>
                <Link
                  to="/configuracoes/notificacoes"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
                    location.pathname === '/configuracoes/notificacoes'
                      ? 'text-[#6A39AD] font-semibold bg-primary/5'
                      : 'text-text-secondary hover:text-foreground hover:bg-primary/5',
                  )}
                >
                  <Bell className="h-[15px] w-[15px] shrink-0" />
                  Notificações
                </Link>
                <Link
                  to="/configuracoes/taxas"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
                    location.pathname === '/configuracoes/taxas'
                      ? 'text-[#6A39AD] font-semibold bg-primary/5'
                      : 'text-text-secondary hover:text-foreground hover:bg-primary/5',
                  )}
                >
                  <CreditCard className="h-[15px] w-[15px] shrink-0" />
                  Taxas Maquininha
                </Link>
                <Link
                  to="/configuracoes/impressora"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
                    location.pathname === '/configuracoes/impressora'
                      ? 'text-[#6A39AD] font-semibold bg-primary/5'
                      : 'text-text-secondary hover:text-foreground hover:bg-primary/5',
                  )}
                >
                  <Printer className="h-[15px] w-[15px] shrink-0" />
                  Impressora
                </Link>
                {hasPermission('canManageUsers') && (
                  <Link
                    to="/usuarios"
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150',
                      location.pathname === '/usuarios'
                        ? 'text-[#6A39AD] font-semibold bg-primary/5'
                        : 'text-text-secondary hover:text-foreground hover:bg-primary/5',
                    )}
                  >
                    <Users className="h-[15px] w-[15px] shrink-0" />
                    Usuários
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configurações colapsado — só ícone */}
        {collapsed && (
          <div className="pt-2">
            <Separator className="my-2 opacity-40" />
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/configuracoes-fiscais"
                  className={cn(
                    'flex items-center justify-center px-0 py-2.5 rounded-xl transition-all duration-200',
                    location.pathname.includes('/config')
                      ? 'text-[#6A39AD]'
                      : 'text-text-secondary hover:text-foreground',
                  )}
                  onMouseEnter={(e) => {
                    if (!location.pathname.includes('/config'))
                      (e.currentTarget as HTMLElement).style.background = 'rgba(142,95,207,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!location.pathname.includes('/config'))
                      (e.currentTarget as HTMLElement).style.background = '';
                  }}
                >
                  <Settings2 className="h-[18px] w-[18px] shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium text-xs">
                Configurações
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </nav>

      {/* ── Rodapé: ThemeToggle + Avatar ──────────────────────────── */}
      <div className="p-3 space-y-1">
        {/* Theme toggle */}
        <div className={cn(
          'flex items-center px-2 py-1',
          collapsed ? 'justify-center' : 'justify-between',
        )}>
          {!collapsed && (
            <span className="text-xs text-text-secondary font-medium">Tema</span>
          )}
          <ThemeToggle />
        </div>

        {/* User avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'w-full flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors duration-200 group',
              collapsed && 'justify-center px-2',
            )}>
              <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border group-hover:ring-primary/30 transition-all duration-200">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-semibold truncate text-foreground leading-tight">
                    {user?.user_metadata?.name || user?.email?.split('@')[0]}
                  </p>
                  {role && (
                    <p className="text-[11px] text-text-secondary truncate leading-tight mt-0.5">
                      {roleLabels[role] || role}
                    </p>
                  )}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl shadow-lg" align="end" side="right">
            <DropdownMenuLabel className="font-normal pb-2">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {user?.user_metadata?.name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                {role && (
                  <span className="inline-flex mt-1 w-fit text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {roleLabels[role]}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link to="/perfil">
              <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                <UserCog className="h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
            </Link>
            <Link to="/configuracoes-fiscais">
              <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            </Link>
            {empresas.length > 1 && (
              <DropdownMenuItem
                className="cursor-pointer rounded-lg gap-2"
                onClick={() => { clearEmpresaAtiva(); navigate('/selecionar-empresa'); }}
              >
                <Building2 className="h-4 w-4" />
                Trocar Empresa
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer rounded-lg gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── AppLayout principal ─────────────────────────────────────────────────────

export function AppLayout({ children, actions }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { empresaAtiva } = useEmpresa();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  // ⌘K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(open => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const getUserInitials = () => {
    const name = user?.user_metadata?.name;
    if (name) return name.substring(0, 2).toUpperCase();
    if (!user?.email) return '?';
    return user.email.substring(0, 2).toUpperCase();
  };

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Orb decorativo global ───────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-100px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(142,95,207,0.18), transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Sidebar desktop ───────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-30 hidden md:flex flex-col',
          'transition-all duration-300 ease-in-out',
          'bg-sidebar',
          collapsed ? 'w-[64px]' : 'w-[240px]',
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed(c => !c)}
        />
      </aside>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300 ease-in-out',
        'md:ml-[240px]',
        collapsed && 'md:ml-[64px]',
      )}>

        {/* ── Header ────────────────────────────────────────────── */}
        <header className={cn(
          'sticky top-0 z-20 h-[64px] flex items-center justify-between px-4 md:px-6',
          'bg-card/95 backdrop-blur-md',
        )}>
          {/* Esquerda: hamburger (mobile) + search */}
          <div className="flex items-center gap-3">
            {/* Hamburger mobile */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9 rounded-xl"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] p-0 bg-sidebar border-0">
                <SidebarContent
                  collapsed={false}
                  onNavClick={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* Search */}
            <button
              onClick={() => setCommandOpen(true)}
              className={cn(
                'flex items-center gap-2 text-sm text-text-secondary',
                'hover:text-foreground transition-colors duration-200',
                'bg-surface-bg hover:bg-primary/5 rounded-xl px-3 py-2',
                'border border-border hover:border-primary/30',
              )}
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Direita: actions + notificações + avatar */}
          <div className="flex items-center gap-2">
            {actions}

            {/* Notificações */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative" aria-label="Notificações">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white leading-none">
                  3
                </span>
              </Button>
            </div>

            {/* Avatar dropdown (header) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 hover:bg-primary/5 transition-colors duration-200 group">
                  <Avatar className="h-8 w-8 ring-2 ring-border group-hover:ring-primary/30 transition-all duration-200">
                    <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground leading-tight max-w-[120px] truncate">
                      {user?.user_metadata?.name || user?.email?.split('@')[0]}
                    </span>
                    {role && (
                      <span className="text-[10px] text-text-secondary leading-tight">
                        {roleLabels[role] || role}
                      </span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl shadow-lg" align="end">
                <DropdownMenuLabel className="font-normal pb-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {user?.user_metadata?.name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link to="/perfil">
                  <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                    <UserCog className="h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                </Link>
                <Link to="/configuracoes-fiscais">
                  <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer rounded-lg gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

        {/* ── Page content ────────────────────────────────────────── */}
        <main className="app-content flex-1 bg-background text-foreground" key={empresaAtiva?.id} style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
