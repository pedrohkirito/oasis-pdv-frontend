import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';
import { useEmpresa } from '@/hooks/useEmpresa';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof ReturnType<typeof useUserRole>['permissions'];
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ 
  children, 
  requiredPermission,
  allowedRoles 
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasPermission } = useUserRole();
  const { empresaSelecionada, loading: empresaLoading, empresas } = useEmpresa();
  const location = useLocation();

  if (authLoading || roleLoading || empresaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Redirect to empresa selector if multiple companies and none selected
  if (!empresaSelecionada && empresas.length > 1) {
    return <Navigate to="/selecionar-empresa" replace />;
  }

  // Check if user has required role
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Seu nível de acesso: <span className="font-medium capitalize">{role}</span>
          </p>
        </div>
      </div>
    );
  }

  // Check if user has required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
