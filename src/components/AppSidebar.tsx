import { useState } from "react";
import { LayoutDashboard, Receipt, Users, FileBarChart, ShoppingCart, Package, FileText, ClipboardList, DollarSign, Lock, Settings2, ChevronDown, Tag, Bell, CreditCard, TrendingUp, ScrollText } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import lafioreLogo from '@/assets/lafiore-logo.jpg';
import { useUserRole } from '@/hooks/useUserRole';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

// Permissão exigida para cada rota (null = acessível a todos os autenticados)
const allMenuItems: Array<{
  title: string;
  url: string;
  icon: React.ElementType;
  permission: string | null;
}> = [
  { title: "Dashboard",         url: "/dashboard",             icon: LayoutDashboard, permission: null },
  { title: "Vendas",            url: "/vendas",                icon: ShoppingCart,    permission: 'canViewVendas' },
  { title: "Orçamentos",        url: "/orcamentos",            icon: ScrollText,      permission: null },
  { title: "Produtos",          url: "/produtos",              icon: Package,         permission: 'canViewProdutos' },
  { title: "Clientes",          url: "/clientes",              icon: Users,           permission: 'canViewClientes' },
  { title: "Comissões",         url: "/comissoes",             icon: DollarSign,      permission: 'canViewVendas' },
  { title: "Notas Fiscais",     url: "/notas-fiscais",         icon: FileText,        permission: 'canViewRelatorios' },
  { title: "Operações",         url: "/operacoes",             icon: ClipboardList,   permission: 'canViewVendas' },
  { title: "Contas a Pagar",    url: "/contas-a-pagar",        icon: Receipt,         permission: 'canViewContasPagar' },
  { title: "Contas a Receber",  url: "/contas-receber",        icon: TrendingUp,      permission: null },
  { title: "Fornecedores",      url: "/fornecedores",          icon: Users,           permission: 'canViewFornecedores' },
  { title: "Fechamento",        url: "/fechamento-comissoes",  icon: Lock,            permission: 'canViewRelatorios' },
  { title: "Relatórios",        url: "/relatorios",            icon: FileBarChart,    permission: 'canViewRelatorios' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { permissions, loading } = useUserRole();
  const isCollapsed = state === "collapsed";

  const [configAberto, setConfigAberto] = useState(
    location.pathname.includes('/config')
  );

  const isActive = (path: string) => location.pathname === path;
  const configAtivo = location.pathname.includes('/config');

  const menuItems = allMenuItems.filter(item => {
    if (!item.permission) return true;
    return permissions[item.permission as keyof typeof permissions];
  });


  return (
    <Sidebar collapsible="icon" className="bg-sidebar">
      <SidebarHeader className="bg-background border-b border-border p-4">
        <div className="flex items-center justify-center">
          <img
            src={lafioreLogo}
            alt="La Fiore Store"
            className="h-14 w-auto flex-shrink-0 invert dark:invert-0"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground uppercase text-xs tracking-wider">
            {!isCollapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* Itens principais */}
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="text-foreground/70 hover:text-foreground hover:bg-muted data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Item Configurações com submenu */}
              {!isCollapsed && (
                <SidebarMenuItem>
                  <button
                    onClick={() => setConfigAberto(!configAberto)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                      configAtivo
                        ? 'text-primary font-semibold bg-primary/5'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings2 size={20} strokeWidth={1.5} />
                      <span className="font-medium">Configurações</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${configAberto ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div className={`overflow-hidden transition-all duration-200 ${configAberto ? 'max-h-80' : 'max-h-0'}`}>
                    <div className="pl-8 pt-1 flex flex-col gap-1">

                      <Link
                        to="/configuracoes-fiscais"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          isActive('/configuracoes-fiscais')
                            ? 'text-primary font-semibold bg-primary/5'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        <FileText size={15} strokeWidth={1.5} />
                        Fiscal
                      </Link>

                      <Link
                        to="/configuracoes/etiquetas"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          isActive('/configuracoes/etiquetas')
                            ? 'text-primary font-semibold bg-primary/5'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        <Tag size={15} strokeWidth={1.5} />
                        Etiquetas
                      </Link>

                      <Link
                        to="/configuracoes/notificacoes"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          isActive('/configuracoes/notificacoes')
                            ? 'text-primary font-semibold bg-primary/5'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        <Bell size={15} strokeWidth={1.5} />
                        Notificações
                      </Link>

                      <Link
                        to="/configuracoes/taxas"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                          isActive('/configuracoes/taxas')
                            ? 'text-primary font-semibold bg-primary/5'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                        }`}
                      >
                        <CreditCard size={15} strokeWidth={1.5} />
                        Taxas Maquininha
                      </Link>

                      {permissions.canManageUsers && (
                        <Link
                          to="/usuarios"
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                            isActive('/usuarios')
                              ? 'text-primary font-semibold bg-primary/5'
                              : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                          }`}
                        >
                          <Users size={15} strokeWidth={1.5} />
                          Usuários
                        </Link>
                      )}

                    </div>
                  </div>
                </SidebarMenuItem>
              )}

              {/* Configurações colapsada — só ícone com tooltip */}
              {isCollapsed && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={configAtivo}
                    tooltip="Configurações"
                    className="text-foreground/70 hover:text-foreground hover:bg-muted data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  >
                    <Link to="/configuracoes-fiscais">
                      <Settings2 className="h-5 w-5" />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
