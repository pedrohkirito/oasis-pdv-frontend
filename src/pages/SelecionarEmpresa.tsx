import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useAuth } from '@/hooks/useAuth';
import { Building2, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SelecionarEmpresa = () => {
  const { empresas, setEmpresaAtiva, loading } = useEmpresa();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (empresa: typeof empresas[0]) => {
    setEmpresaAtiva(empresa);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header sutil */}
      <div className="flex justify-end p-4">
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 -mt-16">
        <div className="w-full max-w-lg space-y-8">
          {/* Título */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Olá, {user?.user_metadata?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-muted-foreground">
              Selecione a empresa que deseja acessar
            </p>
          </div>

          {/* Cards de empresas */}
          <div className="space-y-3">
            {empresas.map((empresa, index) => (
              <button
                key={empresa.id}
                onClick={() => handleSelect(empresa)}
                className={cn(
                  "liquid-glass-white w-full group relative p-5",
                  "flex items-center gap-4 text-left",
                  "hover:border-primary/40 hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                )}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Logo ou ícone */}
                <div className="flex-shrink-0">
                  {empresa.logo_url ? (
                    <img
                      src={empresa.logo_url}
                      alt={empresa.name}
                      className="h-12 w-12 rounded-lg object-contain bg-muted p-1"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {empresa.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base truncate">
                    {empresa.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Acessar painel
                  </p>
                </div>

                {/* Seta */}
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelecionarEmpresa;
