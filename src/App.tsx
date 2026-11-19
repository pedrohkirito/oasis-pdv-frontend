import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { UserRoleProvider } from "@/hooks/useUserRole";
import { ThemeProvider } from "@/components/ThemeProvider";
import { EmpresaProvider } from "@/hooks/useEmpresa";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LayoutRoute } from "@/components/layout/LayoutRoute";
import { toast as sonnerToast } from "sonner";
import { handleApiError } from "@/utils/errorHandler";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ContasAPagar from "./pages/ContasAPagar";
import ContasReceber from "./pages/ContasReceber";
import Fornecedores from "./pages/Fornecedores";
import Relatorios from "./pages/Relatorios";
import Vendas from "./pages/Vendas";
import Produtos from "./pages/Produtos";
import Servicos from "./pages/Servicos";
import Clientes from "./pages/Clientes";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import ConfiguracoesFiscais from "./pages/ConfiguracoesFiscais";
import ConfigEtiquetas from "./pages/ConfigEtiquetas";
import ConfigNotificacoes from "./pages/ConfigNotificacoes";
import NotasFiscais from "./pages/NotasFiscais";
import SelecionarEmpresa from "./pages/SelecionarEmpresa";
import Operacoes from "./pages/Operacoes";
import Comissoes from "./pages/Comissoes";
import FechamentoComissoes from "./pages/FechamentoComissoes";
import NotFound from "./pages/NotFound";
import RedefinirSenha from "./pages/RedefinirSenha";
import Landing from "./pages/Landing";
import DemoContasPagar from "./pages/demo/DemoContasPagar";
import DemoDashboard from "./pages/demo/DemoDashboard";
import DemoNotasFiscais from "./pages/demo/DemoNotasFiscais";
import Caixa from "./pages/Caixa";
import HistoricoCaixa from "./pages/HistoricoCaixa";
import ConfigTaxas from "./pages/ConfigTaxas";
import PedidosCompra from "./pages/PedidosCompra";
import Orcamentos from "./pages/Orcamentos";
import Metas from "./pages/Metas";
import ContasBancarias from "./pages/ContasBancarias";
import Conciliacao from "./pages/Conciliacao";
import PlanoContas from "./pages/PlanoContas";
import Balancete from "./pages/Balancete";
import Lancamentos from "./pages/Lancamentos";
import Financeiro from "./pages/Financeiro";
import ConfigImpressora from "./components/impressora/ConfigImpressora";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Erro não capturado:", event.reason);
      const reason = event.reason;
      // Check if it's a API/RLS error
      if (reason && typeof reason === 'object' && (reason.code || reason.message)) {
        if (!handleApiError(reason, "Ocorreu um erro inesperado. Tente novamente.")) {
          sonnerToast.error("Ocorreu um erro inesperado. Tente novamente.");
        }
      } else {
        sonnerToast.error("Ocorreu um erro inesperado. Tente novamente.");
      }
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Erro global:", event.error);
      sonnerToast.error("Ocorreu um erro inesperado. Tente novamente.");
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
  <ThemeProvider defaultTheme="light" storageKey="lafiore-theme">
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <EmpresaProvider>
            <UserRoleProvider>
            <Routes>
              {/* Rotas públicas — sem autenticação */}
              <Route path="/"                        element={<Landing />} />
              <Route path="/demo/contas-a-pagar"     element={<DemoContasPagar />} />
              <Route path="/demo/dashboard"          element={<DemoDashboard />} />
              <Route path="/demo/notas-fiscais"      element={<DemoNotasFiscais />} />
              <Route path="/login"          element={<Auth />} />
              <Route path="/auth"           element={<Auth />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/selecionar-empresa" element={<SelecionarEmpresa />} />

              {/* Rotas protegidas com AppLayout */}
              <Route element={<LayoutRoute />}>
                <Route path="/dashboard" element={<Index />} />
                <Route
                  path="/financeiro"
                  element={
                    <ProtectedRoute requiredPermission="canViewDashboard">
                      <Financeiro />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contas-bancarias"
                  element={
                    <ProtectedRoute requiredPermission="canViewDashboard">
                      <ContasBancarias />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/conciliacao"
                  element={
                    <ProtectedRoute requiredPermission="canViewDashboard">
                      <Conciliacao />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/plano-contas"
                  element={
                    <ProtectedRoute requiredPermission="canViewDashboard">
                      <PlanoContas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/balancete"
                  element={
                    <ProtectedRoute requiredPermission="canViewDashboard">
                      <Balancete />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lancamentos"
                  element={
                    <ProtectedRoute requiredPermission="canViewDashboard">
                      <Lancamentos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contas-a-pagar"
                  element={
                    <ProtectedRoute requiredPermission="canViewContasPagar">
                      <ContasAPagar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contas-receber"
                  element={
                    <ProtectedRoute requiredPermission="canViewContasPagar">
                      <ContasReceber />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fornecedores" 
                  element={
                    <ProtectedRoute requiredPermission="canViewFornecedores">
                      <Fornecedores />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/relatorios" 
                  element={
                    <ProtectedRoute requiredPermission="canViewRelatorios">
                      <Relatorios />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/vendas"
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <Vendas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendas/nova"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Vendas autoOpenNova />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orcamentos"
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <Orcamentos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/metas"
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <Metas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/produtos" 
                  element={
                    <ProtectedRoute requiredPermission="canViewProdutos">
                      <Produtos />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/servicos"
                  element={
                    <ProtectedRoute requiredPermission="canViewServicos">
                      <Servicos />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/clientes" 
                  element={
                    <ProtectedRoute requiredPermission="canViewClientes">
                      <Clientes />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/usuarios" 
                  element={
                    <ProtectedRoute requiredPermission="canManageUsers">
                      <Usuarios />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/perfil" 
                  element={
                    <ProtectedRoute>
                      <Perfil />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/configuracoes-fiscais"
                  element={
                    <ProtectedRoute requiredPermission="canManageUsers">
                      <ConfiguracoesFiscais />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracoes/etiquetas"
                  element={
                    <ProtectedRoute requiredPermission="canManageUsers">
                      <ConfigEtiquetas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracoes/notificacoes"
                  element={
                    <ProtectedRoute requiredPermission="canManageUsers">
                      <ConfigNotificacoes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracoes/taxas"
                  element={
                    <ProtectedRoute requiredPermission="canManageUsers">
                      <ConfigTaxas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracoes/impressora"
                  element={
                    <ProtectedRoute requiredPermission="canManageUsers">
                      <ConfigImpressora />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/notas-fiscais" 
                  element={
                    <ProtectedRoute requiredPermission="canViewRelatorios">
                      <NotasFiscais />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/operacoes" 
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <Operacoes />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/comissoes" 
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <Comissoes />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/fechamento-comissoes"
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <FechamentoComissoes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caixa"
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <Caixa />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caixa/historico"
                  element={
                    <ProtectedRoute requiredPermission="canViewVendas">
                      <HistoricoCaixa />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pedidos-compra"
                  element={
                    <ProtectedRoute requiredPermission="canViewFornecedores">
                      <PedidosCompra />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </UserRoleProvider>
          </EmpresaProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  );
};

export default App;
