import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, ShoppingCart, Package, UserCircle, FileText,
  Users, BarChart3, Settings, Shield, LogOut, Building2, User, Wrench,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const sections = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/', keywords: ['inicio', 'home', 'painel'] },
  { label: 'Vendas', icon: ShoppingCart, to: '/vendas', keywords: ['venda', 'pedido', 'faturamento'] },
  { label: 'Produtos', icon: Package, to: '/produtos', keywords: ['produto', 'estoque', 'item', 'mercadoria'] },
  { label: 'Serviços', icon: Wrench, to: '/servicos', keywords: ['servico', 'serviço', 'montagem', 'manutencao', 'recorrente'] },
  { label: 'Clientes', icon: UserCircle, to: '/clientes', keywords: ['cliente', 'consumidor', 'cpf'] },
  { label: 'Contas a Pagar', icon: FileText, to: '/contas-a-pagar', keywords: ['conta', 'despesa', 'pagamento', 'boleto'] },
  { label: 'Fornecedores', icon: Users, to: '/fornecedores', keywords: ['fornecedor', 'tax_id', 'compra'] },
  { label: 'Notas Fiscais', icon: FileText, to: '/notas-fiscais', keywords: ['nota', 'nfce', 'fiscal', 'cupom'] },
  { label: 'Relatórios', icon: BarChart3, to: '/relatorios', keywords: ['relatorio', 'grafico', 'analise'] },
  { label: 'Config. Fiscais', icon: Settings, to: '/configuracoes-fiscais', keywords: ['configuracao', 'fiscal', 'certificado'] },
  { label: 'Usuários', icon: Shield, to: '/usuarios', keywords: ['usuario', 'permissao', 'acesso'] },
];

const quickActions = [
  { label: 'Meu Perfil', icon: User, to: '/perfil', keywords: ['perfil', 'conta', 'senha'] },
  { label: 'Trocar Empresa', icon: Building2, to: '/selecionar-empresa', keywords: ['empresa', 'trocar', 'mudar'] },
];

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const runCommand = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar seção, ação ou atalho..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {sections.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.keywords.join(' ')}`}
              onSelect={() => runCommand(() => navigate(item.to))}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações rápidas">
          {quickActions.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.keywords.join(' ')}`}
              onSelect={() => runCommand(() => navigate(item.to))}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
          <CommandItem
            value="sair logout desconectar"
            onSelect={() => runCommand(() => signOut())}
            className="gap-3 cursor-pointer text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
