import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Hook Pluggy — TODO o tráfego com a API Pluggy é proxied via Edge Functions.
 * O navegador nunca recebe a API key (apenas connect tokens efêmeros do widget).
 */
export function usePluggy() {
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)

  /** Solicita um connect token (curto, seguro) para abrir o widget Pluggy. */
  const criarConnectToken = async (): Promise<string | null> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-token')
      if (error) throw error
      return (data?.connectToken as string) ?? null
    } catch (err) {
      console.error('Erro ao obter connect token Pluggy:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Após conectar via Open Finance, dispara a importação dos últimos 90 dias
   * de transações via Edge Function (server-side). A API key Pluggy permanece
   * sempre no servidor.
   */
  const importarTransacoesPluggy = async (
    itemId: string,
    contaBancariaId: string,
    empresaId: string,
  ): Promise<{ importadas: number; saldo: number | null; error?: string }> => {
    setImportando(true)
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: {
          itemId,
          contaId: contaBancariaId,
          empresaId,
        },
      })
      if (error) {
        return { importadas: 0, saldo: null, error: error.message }
      }
      return {
        importadas: data?.importadas ?? 0,
        saldo: data?.saldoAtual ?? null,
        error: data?.error,
      }
    } catch (err) {
      console.error('Erro ao importar transações Pluggy:', err)
      return { importadas: 0, saldo: null, error: (err as Error).message }
    } finally {
      setImportando(false)
    }
  }

  /** Sincronização recorrente — mesma rota server-side. */
  const sincronizarTransacoes = async (
    itemId: string,
    contaBancariaId: string,
    empresaId: string,
  ) => importarTransacoesPluggy(itemId, contaBancariaId, empresaId)

  return {
    loading,
    importando,
    criarConnectToken,
    importarTransacoesPluggy,
    sincronizarTransacoes,
  }
}
