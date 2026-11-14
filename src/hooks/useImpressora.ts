import { useState, useCallback, useEffect } from 'react';
import {
  gerarTesteESCPOS,
  gerarCupomSimplesESCPOS,
  gerarDANFEESCPOS,
  gerarAbrirGaveta,
  DadosEmpresa,
  DadosVenda,
  DadosNFCe,
} from '../utils/escpos';

declare global {
  interface Window {
    qz: any;
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusImpressora = 'desconectado' | 'conectando' | 'conectado' | 'erro';

export interface ConfigImpressoraState {
  impressoraNome: string;
  larguraPapel: 80 | 58;
  imprimirAposVenda: boolean;
  imprimirAposNFCe: boolean;
  abrirGavetaAposVenda: boolean;
}

const CONFIG_KEY = 'oasis_impressora_config';

const defaultConfig: ConfigImpressoraState = {
  impressoraNome: '',
  larguraPapel: 80,
  imprimirAposVenda: false,
  imprimirAposNFCe: true,
  abrirGavetaAposVenda: false,
};

function loadConfig(): ConfigImpressoraState {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {}
  return defaultConfig;
}

function saveConfig(cfg: ConfigImpressoraState) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImpressora() {
  const [status, setStatus]               = useState<StatusImpressora>('desconectado');
  const [impressoras, setImpressoras]     = useState<string[]>([]);
  const [erro, setErro]                   = useState<string | null>(null);
  const [qzDisponivel, setQzDisponivel]   = useState(false);
  const [config, setConfigState]          = useState<ConfigImpressoraState>(loadConfig);

  // ── Detectar QZ Tray ────────────────────────────────────────────────────────

  useEffect(() => {
    const check = () => {
      if (typeof window.qz !== 'undefined') {
        setQzDisponivel(true);
      }
    };
    check();
    // QZ Tray pode carregar um pouco depois
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ── Persistir config ─────────────────────────────────────────────────────────

  const setConfig = useCallback((partial: Partial<ConfigImpressoraState>) => {
    setConfigState(prev => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  // ── Traduzir erros técnicos do QZ ────────────────────────────────────────────

  const traduzirErro = (e: any): string => {
    const msg: string = e?.message ?? '';
    if (msg.includes('closed unexpectedly') || msg.includes('ECONNREFUSED') || msg.includes('socket'))
      return 'QZ Tray não está aberto. Abra o QZ Tray e tente novamente.';
    if (msg.toLowerCase().includes('timeout') || msg.includes('Timeout'))
      return 'QZ Tray demorou para responder. Verifique se está instalado e aberto.';
    if (msg.includes('certificate') || msg.includes('Certificate'))
      return 'Erro de certificado QZ Tray. Reabra o QZ Tray e tente novamente.';
    return 'Erro ao conectar ao QZ Tray. Verifique se está instalado e em execução.';
  };

  // ── Conectar ─────────────────────────────────────────────────────────────────

  const conectar = useCallback(async (): Promise<boolean> => {
    if (!window.qz) {
      setErro('QZ Tray não está aberto. Abra o QZ Tray e tente novamente.');
      setStatus('erro');
      return false;
    }

    try {
      setStatus('conectando');
      setErro(null);

      if (!window.qz.websocket.isActive()) {
        // Configuração para desenvolvimento/localhost (sem certificado)
        window.qz.security.setCertificatePromise((resolve: (v: string) => void) => resolve(''));
        window.qz.security.setSignatureAlgorithm('SHA512');
        window.qz.security.setSignaturePromise(
          (_toSign: string) => (resolve: (v: string) => void) => resolve('')
        );

        await Promise.race([
          window.qz.websocket.connect(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ]);
      }

      const lista: string[] = await window.qz.printers.find();
      setImpressoras(lista);
      setStatus('conectado');
      return true;
    } catch (e: any) {
      setErro(traduzirErro(e));
      setStatus('erro');
      return false;
    }
  }, []);

  // ── Desconectar ───────────────────────────────────────────────────────────────

  const desconectar = useCallback(async () => {
    try {
      if (window.qz?.websocket?.isActive()) {
        await window.qz.websocket.disconnect();
      }
    } catch {}
    setStatus('desconectado');
    setImpressoras([]);
  }, []);

  // ── Selecionar impressora ─────────────────────────────────────────────────────

  const selecionarImpressora = useCallback((nome: string) => {
    setConfig({ impressoraNome: nome });
  }, [setConfig]);

  // ── Enviar dados para impressora ──────────────────────────────────────────────

  const imprimir = useCallback(async (dados: string): Promise<void> => {
    if (!window.qz) throw new Error('QZ Tray não disponível');
    if (!config.impressoraNome) throw new Error('Nenhuma impressora selecionada');

    const printer = window.qz.configs.create(config.impressoraNome);
    const printData = [{ type: 'raw', format: 'plain', data: dados }];
    await window.qz.print(printer, printData);
  }, [config.impressoraNome]);

  // ── Testar impressora ─────────────────────────────────────────────────────────

  const testarImpressora = useCallback(async (): Promise<void> => {
    const dados = gerarTesteESCPOS();
    await imprimir(dados);
  }, [imprimir]);

  // ── Imprimir DANFE NFC-e ──────────────────────────────────────────────────────

  const imprimirDANFE = useCallback(async (
    empresa: DadosEmpresa,
    venda: DadosVenda,
    nfce: DadosNFCe,
  ): Promise<void> => {
    const dados = gerarDANFEESCPOS(empresa, venda, nfce);
    await imprimir(dados);
  }, [imprimir]);

  // ── Imprimir cupom simples ────────────────────────────────────────────────────

  const imprimirCupomSimples = useCallback(async (
    empresa: DadosEmpresa,
    venda: DadosVenda,
  ): Promise<void> => {
    const dados = gerarCupomSimplesESCPOS(empresa, venda);
    await imprimir(dados);
  }, [imprimir]);

  // ── Abrir gaveta ──────────────────────────────────────────────────────────────

  const abrirGaveta = useCallback(async (): Promise<void> => {
    const dados = gerarAbrirGaveta();
    await imprimir(dados);
  }, [imprimir]);

  return {
    // Estado
    status,
    impressoras,
    impressoraAtiva: config.impressoraNome,
    erro,
    qzDisponivel,
    config,
    // Ações
    conectar,
    desconectar,
    selecionarImpressora,
    testarImpressora,
    imprimirDANFE,
    imprimirCupomSimples,
    abrirGaveta,
    setConfig,
  };
}
