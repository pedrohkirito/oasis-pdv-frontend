import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { api, syncEmpresaNaSessao } from '@/lib/api';
import { useAuth } from './useAuth';

interface Empresa {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
}

interface EmpresaContextType {
  empresas: Empresa[];
  empresaAtiva: Empresa | null;
  companyId: string | null;
  loading: boolean;
  empresaSelecionada: boolean;
  setEmpresaAtiva: (empresa: Empresa) => void;
  clearEmpresaAtiva: () => void;
  refetchEmpresas: () => Promise<void>;
}

const EmpresaContext = createContext<EmpresaContextType>({
  empresas: [],
  empresaAtiva: null,
  companyId: null,
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
      const { data, error } = await api.companies();
      if (error) {
        console.error('Error fetching empresas:', error);
      }

      const daApi = (data || []).filter((empresa) => empresa.active !== false);
      const daSessao = api.sessionCompanies();
      const empresasList = daApi.length > 0 ? daApi : daSessao;
      setEmpresas(empresasList);

      const savedId = localStorage.getItem(STORAGE_KEY);
      const savedEmpresa = empresasList.find((empresa) => empresa.id === savedId);

      if (savedEmpresa) {
        setEmpresaAtivaState(savedEmpresa);
        setEmpresaSelecionada(true);
      } else if (empresasList.length === 1) {
        setEmpresaAtivaState(empresasList[0]);
        setEmpresaSelecionada(true);
        syncEmpresaNaSessao(empresasList[0].id);
      } else {
        setEmpresaAtivaState(null);
        setEmpresaSelecionada(false);
      }
    } catch (error) {
      console.error('Error fetching empresas:', error);
      const daSessao = api.sessionCompanies();
      setEmpresas(daSessao);
      if (daSessao.length === 1) {
        setEmpresaAtivaState(daSessao[0]);
        setEmpresaSelecionada(true);
        syncEmpresaNaSessao(daSessao[0].id);
      }
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
      companyId: empresaAtiva?.id ?? null,
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
