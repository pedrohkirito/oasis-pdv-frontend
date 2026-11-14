import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';
import { toast } from 'sonner';

// All available modules in the system
export const MODULOS_SISTEMA = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'dashboard_kpis', label: 'KPIs (Faturamento, Ticket, Lucro)', parent: 'dashboard' },
  { id: 'dashboard_fluxo_caixa', label: 'Fluxo de Caixa', parent: 'dashboard' },
  { id: 'dashboard_operacoes_pendentes', label: 'Operações Pendentes', parent: 'dashboard' },
  { id: 'dashboard_contas_vencendo', label: 'Contas Vencendo', parent: 'dashboard' },
  { id: 'dashboard_receber_vencidas', label: 'A Receber Vencidas', parent: 'dashboard' },
  { id: 'dashboard_vendas_recentes', label: 'Vendas Recentes', parent: 'dashboard' },
  { id: 'dashboard_saude_financeira', label: 'Saúde Financeira', parent: 'dashboard' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'orcamentos', label: 'Orçamentos' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'notas_fiscais', label: 'Notas Fiscais' },
  { id: 'operacoes', label: 'Operações' },
  { id: 'contas_pagar', label: 'Contas a Pagar' },
  { id: 'contas_receber', label: 'Contas a Receber' },
  { id: 'fornecedores', label: 'Fornecedores' },
  { id: 'fechamento', label: 'Fechamento Comissões' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'relatorios_graficos', label: 'Gráficos e Análises', parent: 'relatorios' },
  { id: 'relatorios_dre', label: 'DRE', parent: 'relatorios' },
  { id: 'relatorios_curva_abc', label: 'Curva ABC', parent: 'relatorios' },
  { id: 'relatorios_vendas_vendedor', label: 'Vendas por Vendedor', parent: 'relatorios' },
  { id: 'relatorios_vendas_pagamento', label: 'Vendas por Pagamento', parent: 'relatorios' },
  { id: 'relatorios_despesas', label: 'Despesas por Categoria', parent: 'relatorios' },
  { id: 'caixa', label: 'Caixa (PDV)' },
  { id: 'metas', label: 'Metas' },
  { id: 'contas_bancarias', label: 'Contas Bancárias' },
  { id: 'usuarios', label: 'Gerenciamento de Usuários' },
  { id: 'config_fiscal', label: 'Configurações Fiscais' },
  { id: 'pedidos_compra', label: 'Pedidos de Compra' },
] as const;

export type ModuloId = typeof MODULOS_SISTEMA[number]['id'];

export interface PermissaoModulo {
  modulo: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface NivelAcesso {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  is_sistema: boolean;
  created_at: string;
  updated_at: string;
  permissoes: PermissaoModulo[];
}

export interface NivelAcessoInput {
  nome: string;
  descricao?: string;
  permissoes: PermissaoModulo[];
}

export function useNiveisAcesso() {
  const { empresaId } = useEmpresa();
  const [niveis, setNiveis] = useState<NivelAcesso[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNiveis = useCallback(async () => {
    if (!empresaId) {
      setNiveis([]);
      setLoading(false);
      return;
    }

    try {
      const { data: niveisData, error: niveisError } = await supabase
        .from('niveis_acesso')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('is_sistema', { ascending: false })
        .order('nome');

      if (niveisError) throw niveisError;

      if (!niveisData || niveisData.length === 0) {
        setNiveis([]);
        setLoading(false);
        return;
      }

      const nivelIds = niveisData.map(n => n.id);
      const { data: permData, error: permError } = await supabase
        .from('nivel_acesso_permissoes')
        .select('*')
        .in('nivel_acesso_id', nivelIds);

      if (permError) throw permError;

      const niveisComPermissoes: NivelAcesso[] = niveisData.map(nivel => ({
        ...nivel,
        permissoes: (permData || [])
          .filter(p => p.nivel_acesso_id === nivel.id)
          .map(p => ({
            modulo: p.modulo,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          })),
      }));

      setNiveis(niveisComPermissoes);
    } catch (error: any) {
      console.error('Error fetching niveis_acesso:', error);
      toast.error('Erro ao carregar níveis de acesso');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchNiveis();
  }, [fetchNiveis]);

  const createNivel = async (input: NivelAcessoInput): Promise<string | null> => {
    if (!empresaId) return null;

    try {
      const { data: nivel, error: nivelError } = await supabase
        .from('niveis_acesso')
        .insert({
          empresa_id: empresaId,
          nome: input.nome,
          descricao: input.descricao || null,
        })
        .select()
        .single();

      if (nivelError) throw nivelError;

      // Insert permissions
      const permissoes = input.permissoes
        .filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete)
        .map(p => ({
          nivel_acesso_id: nivel.id,
          modulo: p.modulo,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));

      if (permissoes.length > 0) {
        const { error: permError } = await supabase
          .from('nivel_acesso_permissoes')
          .insert(permissoes);
        if (permError) throw permError;
      }

      toast.success(`Nível "${input.nome}" criado com sucesso!`);
      fetchNiveis();
      return nivel.id;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe um nível com este nome nesta empresa');
      } else {
        toast.error(error.message || 'Erro ao criar nível de acesso');
      }
      return null;
    }
  };

  const updateNivel = async (id: string, input: NivelAcessoInput): Promise<boolean> => {
    try {
      const { error: nivelError } = await supabase
        .from('niveis_acesso')
        .update({ nome: input.nome, descricao: input.descricao || null })
        .eq('id', id);

      if (nivelError) throw nivelError;

      // Delete existing permissions and re-insert
      await supabase
        .from('nivel_acesso_permissoes')
        .delete()
        .eq('nivel_acesso_id', id);

      const permissoes = input.permissoes
        .filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete)
        .map(p => ({
          nivel_acesso_id: id,
          modulo: p.modulo,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));

      if (permissoes.length > 0) {
        const { error: permError } = await supabase
          .from('nivel_acesso_permissoes')
          .insert(permissoes);
        if (permError) throw permError;
      }

      toast.success(`Nível "${input.nome}" atualizado com sucesso!`);
      fetchNiveis();
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe um nível com este nome nesta empresa');
      } else {
        toast.error(error.message || 'Erro ao atualizar nível de acesso');
      }
      return false;
    }
  };

  const deleteNivel = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('niveis_acesso')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Nível de acesso excluído com sucesso!');
      fetchNiveis();
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir nível de acesso');
      return false;
    }
  };

  return {
    niveis,
    loading,
    createNivel,
    updateNivel,
    deleteNivel,
    refetch: fetchNiveis,
  };
}
