import { useState, useEffect } from 'react';
import { useEmpresa } from './useEmpresa';
import type { EtiquetaConfig } from '@/pages/ConfigEtiquetas';

const STORAGE_KEY_PREFIX = 'lafiore-etiqueta-config-';

const DEFAULT_CONFIG: EtiquetaConfig = {
  tamanho_padrao: 'media',
  mostrar_logo: true,
  mostrar_codigo_barras: true,
  mostrar_preco: true,
  mostrar_nome: true,
  mostrar_tamanho: true,
  mostrar_codigo_interno: false,
  fonte_preco: 'grande',
  layout: 'completo',
  tipo_impressora: 'pdf',
  ip_zebra: '',
  qualidade: 'normal',
  margem_superior: 5,
  margem_inferior: 5,
  margem_esquerda: 5,
  margem_direita: 5,
};

export function useEtiquetaConfig() {
  const { empresaId } = useEmpresa();
  const storageKey = STORAGE_KEY_PREFIX + (empresaId ?? 'default');

  const [config, setConfig] = useState<EtiquetaConfig>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setConfig(saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG);
    } catch {
      setConfig(DEFAULT_CONFIG);
    }
  }, [storageKey]);

  return config;
}
