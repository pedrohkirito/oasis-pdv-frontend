import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { api, syncEmpresaNaSessao } from '@/lib/api';
import { useAuth } from './useAuth';

interface Empresa {
  id: string;
  nome: string;
  logo_url: string | null;
  ativo: boolean;
}

interface EmpresaContextType {
  empresas: Empresa[];
  empresaAtiva: Empresa | null;
  empresaId: string | null;
  loading: boolean;
  empresaSelecionada: boolean;
  setEmpresaAtiva: (empresa: Empresa) => void;
  clearEmpresaAtiva: () => void;
  refetchEmpresas: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresas: [],
  empresaAtiva: null,
  empresaId: null,
  loading: true,
  empresaSelecionada: false,
  setEmpresaAtiva: () => {},
  clearEmpresaAtiva: () => {},
  refetchEmpresas: async () => {},
});

const STORAGE_KEY = 'lafiore-empresa-ativa';

export const EmpresaProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaAtiva, setEmpresaAtivaState] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(false);

  const fetchEmpresas = useCallback(async () => {
    if (!user) {
      setEmpresas([]);
      setEmpresaAtivaState(null);
      setEmpresaSelecionada(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await api
        .from('empresas')
        .select('*')
        .eq('ativo', true);

      if (error) {
        console.error('Error fetching empresas:', error);
        setEmpresas([]);
        setLoading(false);
        return;
      }

      const empresasList = (data || []) as Empresa[];
      setEmpresas(empresasList);

      // Restaurar empresa ativa do localStorage
      const savedId = localStorage.getItem(STORAGE_KEY);
      const savedEmpresa = empresasList.find(e => e.id === savedId);

      if (savedEmpresa) {
        setEmpresaAtivaState(savedEmpresa);
        setEmpresaSelecionada(true);
      } else if (empresasList.length === 1) {
        // Auto-select if only one company
        setEmpresaAtivaState(empresasList[0]);
        localStorage.setItem(STORAGE_KEY, empresasList[0].id);
        setEmpresaSelecionada(true);
      }
      // If multiple and no saved, don't auto-select — show selector
    } catch (error) {
      console.error('Error fetching empresas:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchEmpresas();
    }
  }, [authLoading, fetchEmpresas]);

  const setEmpresaAtiva = (empresa: Empresa) => {
    setEmpresaAtivaState(empresa);
    setEmpresaSelecionada(true);
    localStorage.setItem(STORAGE_KEY, empresa.id);
    syncEmpresaNaSessao(empresa.id);
  };

  const clearEmpresaAtiva = () => {
    setEmpresaAtivaState(null);
    setEmpresaSelecionada(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <EmpresaContext.Provider value={{
      empresas,
      empresaAtiva,
      empresaId: empresaAtiva?.id ?? null,
      loading: loading || authLoading,
      empresaSelecionada,
      setEmpresaAtiva,
      clearEmpresaAtiva,
      refetchEmpresas: fetchEmpresas,
    }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => {
  return useContext(EmpresaContext);
};
