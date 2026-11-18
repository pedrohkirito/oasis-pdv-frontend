import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { useEmpresa } from './useEmpresa';

export type AppRole = 'admin' | 'gerente' | 'vendedor' | 'visualizador';

interface RolePermissions {
  canViewDashboard: boolean;
  canViewVendas: boolean;
  canCreateVendas: boolean;
  canEditVendas: boolean;
  canDeleteVendas: boolean;
  canViewProdutos: boolean;
  canManageProdutos: boolean;
  canViewClientes: boolean;
  canManageClientes: boolean;
  canViewFornecedores: boolean;
  canManageFornecedores: boolean;
  canViewContasPagar: boolean;
  canManageContasPagar: boolean;
  canViewRelatorios: boolean;
  canManageUsers: boolean;
}

// Define permissions for each role
const rolePermissions: Record<AppRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewVendas: true,
    canCreateVendas: true,
    canEditVendas: true,
    canDeleteVendas: true,
    canViewProdutos: true,
    canManageProdutos: true,
    canViewClientes: true,
    canManageClientes: true,
    canViewFornecedores: true,
    canManageFornecedores: true,
    canViewContasPagar: true,
    canManageContasPagar: true,
    canViewRelatorios: true,
    canManageUsers: true,
  },
  gerente: {
    canViewDashboard: true,
    canViewVendas: true,
    canCreateVendas: true,
    canEditVendas: true,
    canDeleteVendas: true,
    canViewProdutos: true,
    canManageProdutos: true,
    canViewClientes: true,
    canManageClientes: true,
    canViewFornecedores: true,
    canManageFornecedores: true,
    canViewContasPagar: true,
    canManageContasPagar: true,
    canViewRelatorios: true,
    canManageUsers: false,
  },
  vendedor: {
    canViewDashboard: true,
    canViewVendas: true,
    canCreateVendas: true,
    canEditVendas: true,
    canDeleteVendas: true,
    canViewProdutos: true,
    canManageProdutos: true,
    canViewClientes: true,
    canManageClientes: true,
    canViewFornecedores: false,
    canManageFornecedores: false,
    canViewContasPagar: false,
    canManageContasPagar: false,
    canViewRelatorios: false,
    canManageUsers: false,
  },
  visualizador: {
    canViewDashboard: true,
    canViewVendas: true,
    canCreateVendas: false,
    canEditVendas: false,
    canDeleteVendas: false,
    canViewProdutos: true,
    canManageProdutos: false,
    canViewClientes: true,
    canManageClientes: false,
    canViewFornecedores: false,
    canManageFornecedores: false,
    canViewContasPagar: false,
    canManageContasPagar: false,
    canViewRelatorios: false,
    canManageUsers: false,
  },
};

interface CustomPermission {
  modulo: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Map custom module permissions to the legacy RolePermissions interface
function mapCustomToLegacy(custom: CustomPermission[]): RolePermissions {
  const find = (mod: string) => custom.find(c => c.modulo === mod);
  return {
    canViewDashboard: find('dashboard')?.can_view ?? false,
    canViewVendas: find('vendas')?.can_view ?? false,
    canCreateVendas: find('vendas')?.can_create ?? false,
    canEditVendas: find('vendas')?.can_edit ?? false,
    canDeleteVendas: find('vendas')?.can_delete ?? false,
    canViewProdutos: find('produtos')?.can_view ?? false,
    canManageProdutos: find('produtos')?.can_edit ?? false,
    canViewClientes: find('clientes')?.can_view ?? false,
    canManageClientes: find('clientes')?.can_edit ?? false,
    canViewFornecedores: find('fornecedores')?.can_view ?? false,
    canManageFornecedores: find('fornecedores')?.can_edit ?? false,
    canViewContasPagar: find('contas_pagar')?.can_view ?? false,
    canManageContasPagar: find('contas_pagar')?.can_edit ?? false,
    canViewRelatorios: find('relatorios')?.can_view ?? false,
    canManageUsers: find('usuarios')?.can_edit ?? false,
  };
}

interface UserRoleContextType {
  role: AppRole | null;
  loading: boolean;
  permissions: RolePermissions;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canViewModule: (moduleId: string) => boolean;
  refetchRole: () => Promise<void>;
  customPermissions: CustomPermission[] | null;
}

const defaultPermissions: RolePermissions = {
  canViewDashboard: false,
  canViewVendas: false,
  canCreateVendas: false,
  canEditVendas: false,
  canDeleteVendas: false,
  canViewProdutos: false,
  canManageProdutos: false,
  canViewClientes: false,
  canManageClientes: false,
  canViewFornecedores: false,
  canManageFornecedores: false,
  canViewContasPagar: false,
  canManageContasPagar: false,
  canViewRelatorios: false,
  canManageUsers: false,
};

const defaultContextValue: UserRoleContextType = {
  role: null,
  loading: true,
  permissions: defaultPermissions,
  hasPermission: () => false,
  canViewModule: () => true,
  refetchRole: async () => {},
  customPermissions: null,
};

const UserRoleContext = createContext<UserRoleContextType>(defaultContextValue);

export const UserRoleProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { empresaId, loading: empresaLoading } = useEmpresa();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [customPerms, setCustomPermissions] = useState<CustomPermission[] | null>(null);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setCustomPermissions(null);
      setLoading(false);
      return;
    }

    try {
      // First try to get role from user_empresas (context-aware per empresa)
      if (empresaId) {
        const { data: empresaRole, error: empresaError } = await api
          .from('user_empresas')
          .select('role, nivel_acesso_id')
          .eq('user_id', user.id)
          .eq('empresa_id', empresaId)
          .single();

        if (!empresaError && empresaRole) {
          setRole((empresaRole.role as AppRole) || null);

          // If user has "__no_access__" level, block all permissions
          if (empresaRole.nivel_acesso_id === '__no_access__') {
            setCustomPermissions([]);
            setLoading(false);
            return;
          }

          // If user has custom access level, fetch its permissions
          if (empresaRole.nivel_acesso_id) {
            const { data: permData } = await api
              .from('nivel_acesso_permissoes')
              .select('modulo, can_view, can_create, can_edit, can_delete')
              .eq('nivel_acesso_id', empresaRole.nivel_acesso_id);

            if (permData) {
              setCustomPermissions(permData);
            }
          } else {
            setCustomPermissions(null);
          }

          setLoading(false);
          return;
        }
      }

      // Fallback to global user_roles table
      const { data, error } = await api
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole || null);
      }
      setCustomPermissions(null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
      setCustomPermissions(null);
    } finally {
      setLoading(false);
    }
  }, [user, empresaId]);

  useEffect(() => {
    if (!authLoading && !empresaLoading) {
      fetchRole();
    }
  }, [authLoading, empresaLoading, fetchRole]);

  // Use custom permissions if available, otherwise use role-based defaults
  const permissions = customPerms
    ? mapCustomToLegacy(customPerms)
    : (role ? rolePermissions[role] : defaultPermissions);

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission] ?? false;
  };

  // Check if user can view a specific sub-module (for granular chart permissions)
  // If no custom permissions are set, default to true (role-based access handles the parent)
  const canViewModule = (moduleId: string): boolean => {
    if (!customPerms) return true; // No custom level = default role behavior
    const perm = customPerms.find(c => c.modulo === moduleId);
    if (!perm) return true; // Module not configured = allowed by default
    return perm.can_view;
  };

  return (
    <UserRoleContext.Provider value={{ 
      role, 
      loading: loading || authLoading || empresaLoading, 
      permissions, 
      hasPermission,
      canViewModule,
      refetchRole: fetchRole,
      customPermissions: customPerms,
    }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  return context;
};
