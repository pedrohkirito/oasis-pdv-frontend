import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from './useEmpresa';

export interface ProdutoAtributo {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: 'tamanho' | 'cor' | 'numeracao' | 'outro';
  valores: string[];
  created_at: string;
}

export interface ProdutoVariacao {
  id: string;
  produto_id: string;
  empresa_id: string;
  sku: string | null;
  atributos: Record<string, string>;
  preco: number | null;
  preco_custo: number | null;
  estoque: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useProdutoVariacoes(produtoId?: string) {
  const { empresaId } = useEmpresa();
  const [variacoes, setVariacoes] = useState<ProdutoVariacao[]>([]);
  const [atributos, setAtributos] = useState<ProdutoAtributo[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarVariacoes = async () => {
    if (!produtoId) return;
    const { data } = await supabase
      .from('produto_variacoes')
      .select('*')
      .eq('produto_id', produtoId)
      .eq('ativo', true)
      .order('created_at');
    setVariacoes((data as ProdutoVariacao[]) || []);
    setLoading(false);
  };

  const buscarAtributos = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('produto_atributos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    setAtributos((data as ProdutoAtributo[]) || []);
  };

  const criarVariacao = async (variacao: Partial<ProdutoVariacao>) => {
    const { data, error } = await supabase
      .from('produto_variacoes')
      .insert({ ...variacao, produto_id: produtoId, empresa_id: empresaId })
      .select()
      .single();
    if (!error) buscarVariacoes();
    return { data, error };
  };

  const atualizarVariacao = async (id: string, updates: Partial<ProdutoVariacao>) => {
    const { error } = await supabase
      .from('produto_variacoes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) buscarVariacoes();
    return { error };
  };

  const atualizarEstoque = async (id: string, quantidade: number) => {
    const { error } = await supabase
      .from('produto_variacoes')
      .update({ estoque: quantidade, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) buscarVariacoes();
    return { error };
  };

  const excluirVariacao = async (id: string) => {
    await supabase
      .from('produto_variacoes')
      .update({ ativo: false })
      .eq('id', id);
    buscarVariacoes();
  };

  const gerarVariacoes = async (
    atributosConfig: { nome: string; valores: string[] }[],
    precoBase: number,
    precoCustoBase: number
  ) => {
    // Gera todas as combinações possíveis
    const combinacoes = atributosConfig.reduce(
      (acc, atributo) => {
        if (acc.length === 0) {
          return atributo.valores.map(v => ({ [atributo.nome]: v }));
        }
        return acc.flatMap(combo =>
          atributo.valores.map(v => ({ ...combo, [atributo.nome]: v }))
        );
      },
      [] as Record<string, string>[]
    );

    const novasVariacoes = combinacoes.map(attrs => ({
      produto_id: produtoId,
      empresa_id: empresaId,
      atributos: attrs,
      preco: precoBase,
      preco_custo: precoCustoBase,
      estoque: 0,
      ativo: true,
      sku: Object.values(attrs).join('-').toUpperCase(),
    }));

    const { error } = await supabase.from('produto_variacoes').insert(novasVariacoes);
    if (!error) buscarVariacoes();
    return { error };
  };

  const criarAtributo = async (nome: string, tipo: ProdutoAtributo['tipo'], valores: string[]) => {
    const { data, error } = await supabase
      .from('produto_atributos')
      .insert({ nome, tipo, valores, empresa_id: empresaId })
      .select()
      .single();
    if (!error) buscarAtributos();
    return { data, error };
  };

  useEffect(() => {
    if (empresaId) {
      buscarAtributos();
      if (produtoId) buscarVariacoes();
      else setLoading(false);
    }
  }, [empresaId, produtoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    variacoes,
    atributos,
    loading,
    criarVariacao,
    atualizarVariacao,
    atualizarEstoque,
    excluirVariacao,
    gerarVariacoes,
    criarAtributo,
    buscarVariacoes,
    buscarAtributos,
  };
}
