import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useEmpresa } from './useEmpresa';

export interface ProdutoAtributo {
  id: string;
  company_id: string;
  name: string;
  kind: 'tamanho' | 'color' | 'numeracao' | 'outro';
  valores: string[];
  created_at: string;
}

export interface ProdutoVariacao {
  id: string;
  produto_id: string;
  company_id: string;
  sku: string | null;
  atributos: Record<string, string>;
  preco: number | null;
  preco_custo: number | null;
  estoque: number;
  estoque_minimo: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProdutoVariacoes(productId?: string) {
  const { companyId } = useEmpresa();
  const [variacoes, setVariacoes] = useState<ProdutoVariacao[]>([]);
  const [atributos, setAtributos] = useState<ProdutoAtributo[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarVariacoes = async () => {
    if (!productId) return;
    const { data } = await api
      .from('product_variant')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .order('created_at');
    setVariacoes((data as ProdutoVariacao[]) || []);
    setLoading(false);
  };

  const buscarAtributos = async () => {
    if (!companyId) return;
    const { data } = await api
      .from('product_attribute')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    setAtributos((data as ProdutoAtributo[]) || []);
  };

  const criarVariacao = async (variacao: Partial<ProdutoVariacao>) => {
    const { data, error } = await api
      .from('product_variant')
      .insert({ ...variacao, produto_id: productId, company_id: companyId })
      .select()
      .single();
    if (!error) buscarVariacoes();
    return { data, error };
  };

  const atualizarVariacao = async (id: string, updates: Partial<ProdutoVariacao>) => {
    const { error } = await api
      .from('product_variant')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) buscarVariacoes();
    return { error };
  };

  const atualizarEstoque = async (id: string, quantidade: number) => {
    const { error } = await api
      .from('product_variant')
      .update({ estoque: quantidade, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) buscarVariacoes();
    return { error };
  };

  const excluirVariacao = async (id: string) => {
    await api
      .from('product_variant')
      .update({ active: false })
      .eq('id', id);
    buscarVariacoes();
  };

  const gerarVariacoes = async (
    atributosConfig: { name: string; valores: string[] }[],
    precoBase: number,
    precoCustoBase: number
  ) => {
    // Gera todas as combinações possíveis
    const combinacoes = atributosConfig.reduce(
      (acc, atributo) => {
        if (acc.length === 0) {
          return atributo.valores.map(v => ({ [atributo.name]: v }));
        }
        return acc.flatMap(combo =>
          atributo.valores.map(v => ({ ...combo, [atributo.name]: v }))
        );
      },
      [] as Record<string, string>[]
    );

    const novasVariacoes = combinacoes.map(attrs => ({
      produto_id: productId,
      company_id: companyId,
      atributos: attrs,
      preco: precoBase,
      preco_custo: precoCustoBase,
      estoque: 0,
      active: true,
      sku: Object.values(attrs).join('-').toUpperCase(),
    }));

    const { error } = await api.from('product_variant').insert(novasVariacoes);
    if (!error) buscarVariacoes();
    return { error };
  };

  const criarAtributo = async (name: string, kind: ProdutoAtributo['kind'], valores: string[]) => {
    const { data, error } = await api
      .from('product_attribute')
      .insert({ name, kind, valores, company_id: companyId })
      .select()
      .single();
    if (!error) buscarAtributos();
    return { data, error };
  };

  useEffect(() => {
    if (companyId) {
      buscarAtributos();
      if (productId) buscarVariacoes();
      else setLoading(false);
    }
  }, [companyId, productId]); // eslint-disable-line react-hooks/exhaustive-deps

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
