import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useToast } from '@/hooks/use-toast';
import {
  Tag, Printer, Settings, Package, Palette, Check,
  Search, ChevronRight, Minus, Plus, X, Download, FileCode,
  RefreshCw, Layers,
} from 'lucide-react';
import {
  MODELOS_ETIQUETA,
  CONFIG_NOVA_PADRAO,
  CAMPOS_DISPONIVEIS,
  type ConfigEtiquetaNova,
  type ModeloEtiqueta,
  type ProdutoParaEtiqueta,
} from '@/components/etiquetas/types';
import { EtiquetaScaled, ModeloThumbnail } from '@/components/etiquetas/EtiquetaRenderer';
import { gerarPDFNovo, gerarZPLNovo, downloadZPLNovo } from '@/components/etiquetas/GeradorEtiqueta';

// ─── Re-export legacy EtiquetaConfig para compatibilidade com ModalEtiquetas ──

export interface EtiquetaConfig {
  tamanho_padrao: 'pequena' | 'media' | 'grande';
  mostrar_logo: boolean;
  mostrar_codigo_barras: boolean;
  mostrar_preco: boolean;
  mostrar_nome: boolean;
  mostrar_tamanho: boolean;
  mostrar_codigo_interno: boolean;
  fonte_preco: 'normal' | 'grande' | 'gigante';
  layout: 'simples' | 'completo' | 'minimalista';
  tipo_impressora: 'pdf' | 'zebra' | 'escpos';
  ip_zebra: string;
  qualidade: 'rascunho' | 'normal' | 'alta';
  margem_superior: number;
  margem_inferior: number;
  margem_esquerda: number;
  margem_direita: number;
}

export const DEFAULT_CONFIG: EtiquetaConfig = {
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

// ─── Produto do banco ─────────────────────────────────────────────────────────

interface ProdutoBD {
  id: string;
  nome: string;
  preco: number;
  preco_custo?: number | null;
  estoque_atual?: number | null;
  codigo?: string | null;
  ean?: string | null;
  categoria?: string | null;
  unidade_comercial?: string | null;
  ativo?: boolean | null;
}

// ─── Estilos base ─────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(142,95,207,0.12)',
  borderRadius: 20,
  padding: 24,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  border: '1px solid rgba(142,95,207,0.2)',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.85)',
  outline: 'none',
  fontFamily: 'Gilroy, sans-serif',
  color: '#1F2937',
  boxSizing: 'border-box',
};

const labelSt: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
  display: 'block',
  fontFamily: 'Gilroy, sans-serif',
};

// ─── Toggle Oasis ─────────────────────────────────────────────────────────────

function OasisToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 99,
        background: checked ? '#8E5FCF' : '#D1D5DB',
        cursor: 'pointer', transition: 'background 0.2s',
        position: 'relative', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

// ─── Pill button ──────────────────────────────────────────────────────────────

function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 10,
        border: active ? 'none' : '1px solid rgba(142,95,207,0.2)',
        background: active ? 'linear-gradient(135deg,#47118F,#8E5FCF)' : 'rgba(255,255,255,0.8)',
        color: active ? '#fff' : '#6B7280',
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
        fontFamily: 'Gilroy, sans-serif', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'oasis_etiqueta_config_nova_';

function salvarConfig(empresaId: string, config: ConfigEtiquetaNova) {
  try {
    localStorage.setItem(STORAGE_PREFIX + empresaId, JSON.stringify(config));
  } catch { /* silent */ }
}

function carregarConfig(empresaId: string): ConfigEtiquetaNova {
  try {
    const s = localStorage.getItem(STORAGE_PREFIX + empresaId);
    if (s) return { ...CONFIG_NOVA_PADRAO, ...JSON.parse(s) };
  } catch { /* silent */ }
  return { ...CONFIG_NOVA_PADRAO };
}

// ─── PRODUTO DEMO para preview ────────────────────────────────────────────────

const PRODUTO_DEMO: ProdutoParaEtiqueta = {
  id: 'demo',
  nome: 'Camiseta Básica Algodão',
  preco: 79.90,
  preco_custo: 32.00,
  codigo: '000123',
  ean: '7891234567890',
  categoria: 'Roupas',
  unidade_comercial: 'UN',
  tamanho: 'M',
  cor: 'Azul',
  preco_original: 109.90,
  quantidade: 1,
};

// ─── TAB 1: Selecionar Produtos ───────────────────────────────────────────────

function TabProdutos({
  produtos,
  loading,
  selecionados,
  setSelecionados,
  busca,
  setBusca,
  filtroCategoria,
  setFiltroCategoria,
  filtroEstoque,
  setFiltroEstoque,
  categorias,
  onProximo,
}: {
  produtos: ProdutoBD[];
  loading: boolean;
  selecionados: Record<string, number>;
  setSelecionados: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  busca: string;
  setBusca: (v: string) => void;
  filtroCategoria: string;
  setFiltroCategoria: (v: string) => void;
  filtroEstoque: 'todos' | 'com' | 'sem';
  setFiltroEstoque: (v: 'todos' | 'com' | 'sem') => void;
  categorias: string[];
  onProximo: () => void;
}) {
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.codigo ?? '').toLowerCase().includes(busca.toLowerCase()) ||
        (p.ean ?? '').includes(busca);
      const matchCat = !filtroCategoria || p.categoria === filtroCategoria;
      const matchEstq = filtroEstoque === 'todos' ? true : true; // estoque_atual não disponível no schema
      return matchBusca && matchCat && matchEstq;
    });
  }, [produtos, busca, filtroCategoria, filtroEstoque]);

  const totalSelecionados = Object.keys(selecionados).length;
  const totalEtiquetas = Object.values(selecionados).reduce((s, q) => s + q, 0);

  function toggleProduto(id: string) {
    setSelecionados(prev => {
      if (prev[id] !== undefined) {
        const next = { ...prev }; delete next[id]; return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setQtd(id: string, qtd: number) {
    setSelecionados(prev => prev[id] !== undefined ? { ...prev, [id]: Math.max(1, Math.min(999, qtd)) } : prev);
  }

  function selecionarTodos() {
    const all: Record<string, number> = {};
    produtosFiltrados.forEach(p => { all[p.id] = selecionados[p.id] ?? 1; });
    setSelecionados(all);
  }

  function limparSelecao() {
    setSelecionados({});
  }

  function selecionarPorEstoque() {
    const all: Record<string, number> = {};
    produtosFiltrados.forEach(p => {
      const est = p.estoque_atual ?? 1;
      if (est > 0) all[p.id] = est;
    });
    setSelecionados(all);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Busca e filtros */}
      <div style={{ ...glass, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#8E5FCF' }} />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, código ou EAN…"
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
          {/* Categoria */}
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {/* Estoque pills */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ ...labelSt, marginBottom: 0, marginRight: 4 }}>Estoque:</span>
          {(['todos', 'com', 'sem'] as const).map(v => (
            <Pill key={v} active={filtroEstoque === v} onClick={() => setFiltroEstoque(v)}
              label={v === 'todos' ? 'Todos' : v === 'com' ? 'Com estoque' : 'Sem estoque'} />
          ))}
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={selecionarTodos} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.3)', background: 'transparent', color: '#8E5FCF', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
          Selecionar todos
        </button>
        <button onClick={limparSelecao} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.3)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
          Limpar seleção
        </button>
        <button onClick={selecionarPorEstoque} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(142,95,207,0.3)', background: 'transparent', color: '#8E5FCF', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
          1 por unidade em estoque
        </button>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto', fontFamily: 'Gilroy, sans-serif' }}>
          {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      <div style={{ ...glass, padding: 0, overflow: 'hidden', maxHeight: 460, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <RefreshCw style={{ width: 24, height: 24, color: '#8E5FCF', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', fontSize: 14 }}>
            Nenhum produto encontrado
          </div>
        ) : (
          produtosFiltrados.map((p, idx) => {
            const sel = selecionados[p.id] !== undefined;
            return (
              <div
                key={p.id}
                onClick={() => toggleProduto(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 16px',
                  borderBottom: idx < produtosFiltrados.length - 1 ? '1px solid rgba(142,95,207,0.06)' : 'none',
                  background: sel ? 'rgba(142,95,207,0.05)' : 'transparent',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: sel ? 'none' : '2px solid rgba(142,95,207,0.3)',
                  background: sel ? '#8E5FCF' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {sel && <Check style={{ width: 11, height: 11, color: '#fff' }} />}
                </div>

                {/* Ícone produto */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(142,95,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package style={{ width: 16, height: 16, color: '#8E5FCF' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nome}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
                    {p.codigo ? `SKU: ${p.codigo}` : ''}
                    {p.codigo && p.categoria ? '  ·  ' : ''}
                    {p.categoria ?? ''}
                  </p>
                </div>

                {/* Preço */}
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif', flexShrink: 0 }}>
                  {p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>

                {/* Qtd */}
                {sel && (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={() => setQtd(p.id, (selecionados[p.id] ?? 1) - 1)}
                      style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(142,95,207,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E5FCF' }}>
                      <Minus style={{ width: 10, height: 10 }} />
                    </button>
                    <input
                      type="number" min={1} max={999}
                      value={selecionados[p.id] ?? 1}
                      onChange={e => setQtd(p.id, parseInt(e.target.value) || 1)}
                      style={{ width: 44, height: 26, textAlign: 'center', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 7, fontSize: 12, fontFamily: 'Gilroy, sans-serif', outline: 'none' }}
                    />
                    <button onClick={() => setQtd(p.id, (selecionados[p.id] ?? 1) + 1)}
                      style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(142,95,207,0.3)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E5FCF' }}>
                      <Plus style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé sticky */}
      <div style={{
        ...glass,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', bottom: 0,
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
            {totalSelecionados} produto{totalSelecionados !== 1 ? 's' : ''} selecionado{totalSelecionados !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', marginLeft: 8 }}>
            · {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''} no total
          </span>
        </div>
        <button
          onClick={onProximo}
          disabled={totalSelecionados === 0}
          style={{
            padding: '9px 20px', borderRadius: 12, border: 'none',
            background: totalSelecionados > 0 ? 'linear-gradient(135deg,#47118F,#8E5FCF)' : '#E5E7EB',
            color: totalSelecionados > 0 ? '#fff' : '#9CA3AF',
            cursor: totalSelecionados > 0 ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 700, fontFamily: 'Gilroy, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          Próximo — Escolher Modelo <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

// ─── TAB 2: Modelo de Etiqueta ────────────────────────────────────────────────

function TabModelo({
  config,
  setConfig,
  modeloAtivo,
  produtoDemo,
}: {
  config: ConfigEtiquetaNova;
  setConfig: (c: ConfigEtiquetaNova) => void;
  modeloAtivo: ModeloEtiqueta;
  produtoDemo: ProdutoParaEtiqueta;
}) {
  const set = <K extends keyof ConfigEtiquetaNova>(k: K, v: ConfigEtiquetaNova[K]) =>
    setConfig({ ...config, [k]: v });

  function toggleCampo(id: string) {
    const next = config.campos.includes(id)
      ? config.campos.filter(c => c !== id)
      : [...config.campos, id];
    set('campos', next);
  }

  function selecionarModelo(modelo: ModeloEtiqueta) {
    setConfig({
      ...config,
      modeloId: modelo.id,
      largura: modelo.largura,
      altura: modelo.altura,
      campos: modelo.campos,
    });
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Esquerda: configurações */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Grid de modelos */}
        <div style={glass}>
          <p style={{ ...labelSt, marginBottom: 16 }}>Modelos prontos</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {MODELOS_ETIQUETA.map(modelo => {
              const ativo = config.modeloId === modelo.id;
              return (
                <div
                  key={modelo.id}
                  onClick={() => selecionarModelo(modelo)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: 16, borderRadius: 16, cursor: 'pointer',
                    border: ativo ? '2px solid #8E5FCF' : '1px solid rgba(142,95,207,0.12)',
                    background: ativo ? 'rgba(142,95,207,0.06)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: ativo
                      ? '0 0 0 3px rgba(142,95,207,0.15)'
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease', position: 'relative',
                    minHeight: 200, justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => {
                    if (!ativo) {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(71,17,143,0.1)';
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = ativo
                      ? '0 0 0 3px rgba(142,95,207,0.15)'
                      : '0 2px 8px rgba(0,0,0,0.04)';
                  }}
                >
                  {ativo && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#8E5FCF', color: '#fff',
                      fontSize: 9, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 99,
                    }}>✓ Selecionado</span>
                  )}
                  {/* Área de thumbnail */}
                  <ModeloThumbnail modeloId={modelo.id} layout={modelo.layout} />
                  {/* Texto do modelo */}
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: ativo ? '#8E5FCF' : '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                      {modelo.nome}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.3, fontFamily: 'Gilroy, sans-serif' }}>
                      {modelo.descricao}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#8E5FCF', fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                      {modelo.largura}×{modelo.altura}mm
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tamanho personalizado */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(142,95,207,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={labelSt}>Largura (mm)</label>
              <input type="number" min={10} max={300} value={config.largura}
                onChange={e => set('largura', Number(e.target.value))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelSt}>Altura (mm)</label>
              <input type="number" min={10} max={300} value={config.altura}
                onChange={e => set('altura', Number(e.target.value))}
                style={inputStyle} />
            </div>
            <button
              onClick={() => setConfig({ ...config, modeloId: 'custom' })}
              style={{
                padding: '9px 14px', borderRadius: 10, border: '1px dashed rgba(142,95,207,0.4)',
                background: 'transparent', color: '#8E5FCF', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              Personalizar
            </button>
          </div>
        </div>

        {/* Campos disponíveis */}
        <div style={glass}>
          <p style={{ ...labelSt, marginBottom: 12 }}>Campos disponíveis</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {CAMPOS_DISPONIVEIS.map(campo => (
              <div key={campo.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: '1px solid rgba(142,95,207,0.05)',
              }}>
                <label style={{ fontSize: 13, color: '#374151', fontFamily: 'Gilroy, sans-serif', cursor: 'pointer', paddingRight: 12 }}>
                  {campo.label}
                </label>
                <OasisToggle checked={config.campos.includes(campo.id)} onChange={() => toggleCampo(campo.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de código de barras */}
        <div style={glass}>
          <p style={{ ...labelSt, marginBottom: 10 }}>Tipo de código de barras</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {(['Code128', 'EAN-13', 'EAN-8', 'Code39', 'QR'] as const).map(tipo => (
              <Pill key={tipo} active={config.tipoCodigo === tipo} onClick={() => set('tipoCodigo', tipo)} label={tipo} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
            <label style={{ fontSize: 13, color: '#374151', fontFamily: 'Gilroy, sans-serif' }}>
              Mostrar número abaixo
            </label>
            <OasisToggle checked={config.mostrarNumeroCodigo} onChange={v => set('mostrarNumeroCodigo', v)} />
          </div>
        </div>
      </div>

      {/* Direita: preview sticky */}
      <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 20 }}>
        <div style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(142,95,207,0.12)',
          borderRadius: 20,
          padding: 20,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
              Preview ao vivo
            </span>
            <span style={{
              fontSize: 11, background: 'rgba(142,95,207,0.1)', color: '#8E5FCF',
              padding: '2px 8px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif', fontWeight: 700,
              animation: 'pulse 2s infinite',
            }}>
              ● Tempo real
            </span>
          </div>

          {/* Área da etiqueta */}
          <div style={{
            background: 'white',
            border: '2px dashed rgba(142,95,207,0.2)',
            borderRadius: 12,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            marginBottom: 12,
          }}>
            <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
              <EtiquetaScaled
                produto={produtoDemo}
                config={config}
                layout={modeloAtivo.layout}
                maxWidth={230}
                maxHeight={150}
                showBorder
              />
            </div>
          </div>

          {/* Info */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif' }}>
              <strong style={{ color: '#8E5FCF' }}>{modeloAtivo.nome}</strong>
              {' · '}{config.largura}×{config.altura}mm
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
              {config.campos.length} campo{config.campos.length !== 1 ? 's' : ''} ativo{config.campos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Configurações ─────────────────────────────────────────────────────

function TabConfiguracoes({
  config,
  setConfig,
}: {
  config: ConfigEtiquetaNova;
  setConfig: (c: ConfigEtiquetaNova) => void;
}) {
  const set = <K extends keyof ConfigEtiquetaNova>(k: K, v: ConfigEtiquetaNova[K]) =>
    setConfig({ ...config, [k]: v });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      {/* Papel */}
      <div style={glass}>
        <p style={{ ...labelSt, marginBottom: 14 }}>Papel e impressão</p>
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>Tipo de papel</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['A4', 'Carta', 'Bobina', 'Personalizado'] as const).map(t => (
              <Pill key={t} active={config.tipoPapel === t} onClick={() => set('tipoPapel', t)} label={t} />
            ))}
          </div>
        </div>

        {(config.tipoPapel === 'A4' || config.tipoPapel === 'Carta') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, paddingTop: 12 }}>
            <div>
              <label style={labelSt}>Colunas</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4].map(n => (
                  <button key={n} onClick={() => set('colunas', n)} style={{
                    width: 36, height: 34, borderRadius: 8,
                    border: config.colunas === n ? 'none' : '1px solid rgba(142,95,207,0.2)',
                    background: config.colunas === n ? 'linear-gradient(135deg,#47118F,#8E5FCF)' : 'rgba(255,255,255,0.8)',
                    color: config.colunas === n ? '#fff' : '#6B7280',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Gilroy, sans-serif',
                  }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelSt}>Linhas/página</label>
              <input type="number" min={1} max={30} value={config.linhasPorPagina}
                onChange={e => set('linhasPorPagina', Number(e.target.value))}
                style={{ ...inputStyle, padding: '6px 10px' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelSt}>Margens (mm)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div>
                  <label style={{ ...labelSt, fontSize: 9 }}>Superior</label>
                  <input type="number" min={0} max={50} value={config.margemSuperior}
                    onChange={e => set('margemSuperior', Number(e.target.value))}
                    style={{ ...inputStyle, padding: '5px 8px', textAlign: 'center' }} />
                </div>
                <div>
                  <label style={{ ...labelSt, fontSize: 9 }}>Inferior</label>
                  <input type="number" min={0} max={50} value={config.margemInferior}
                    onChange={e => set('margemInferior', Number(e.target.value))}
                    style={{ ...inputStyle, padding: '5px 8px', textAlign: 'center' }} />
                </div>
                <div>
                  <label style={{ ...labelSt, fontSize: 9 }}>Lateral</label>
                  <input type="number" min={0} max={50} value={config.margemLateral}
                    onChange={e => set('margemLateral', Number(e.target.value))}
                    style={{ ...inputStyle, padding: '5px 8px', textAlign: 'center' }} />
                </div>
              </div>
            </div>
            <div>
              <label style={labelSt}>Espaço entre etiquetas (mm)</label>
              <input type="number" min={0} max={20} value={config.espacoEtiquetas}
                onChange={e => set('espacoEtiquetas', Number(e.target.value))}
                style={{ ...inputStyle, padding: '5px 8px', textAlign: 'center' }} />
            </div>
          </div>
        )}

        {config.tipoPapel === 'Bobina' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelSt}>Largura da bobina</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['40mm', '58mm', '80mm'] as const).map(l => (
                <Pill key={l} active={config.larguraBobina === l} onClick={() => set('larguraBobina', l)} label={l} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Formato de saída */}
      <div style={glass}>
        <p style={{ ...labelSt, marginBottom: 12 }}>Formato de saída</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['PDF', 'ZPL', 'EPL', 'PNG'] as const).map(f => (
            <Pill key={f} active={config.formatoSaida === f} onClick={() => set('formatoSaida', f)} label={f} />
          ))}
        </div>
        {config.formatoSaida === 'ZPL' && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
            ZPL gera código para impressoras Zebra. Será baixado como arquivo .zpl.
          </p>
        )}
      </div>

      {/* Fonte */}
      <div style={glass}>
        <p style={{ ...labelSt, marginBottom: 14 }}>Fonte e aparência</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelSt}>Família de fonte</label>
            <select value={config.fonte} onChange={e => set('fonte', e.target.value)} style={inputStyle}>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Courier, monospace">Courier</option>
              <option value="Georgia, serif">Times/Georgia</option>
              <option value="Gilroy, sans-serif">Gilroy</option>
            </select>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...labelSt, marginBottom: 0 }}>Tamanho</label>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#47118F,#8E5FCF)', padding: '2px 8px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif' }}>
                {config.tamFonte}px
              </span>
            </div>
            <input type="range" min={6} max={16} value={config.tamFonte}
              onChange={e => set('tamFonte', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#8E5FCF', marginTop: 4 }} />
          </div>
        </div>

        {/* Alinhamento */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>Alinhamento do preço</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a} onClick={() => set('alinhPreco', a)} style={{
                flex: 1, padding: '7px', borderRadius: 10,
                border: config.alinhPreco === a ? 'none' : '1px solid rgba(142,95,207,0.2)',
                background: config.alinhPreco === a ? '#8E5FCF' : 'rgba(255,255,255,0.8)',
                color: config.alinhPreco === a ? '#fff' : '#6B7280',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
              }}>
                {a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Moeda */}
      <div style={glass}>
        <p style={{ ...labelSt, marginBottom: 12 }}>Moeda e preço</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {([
            ['mostrarRS',        'Mostrar símbolo R$'],
            ['mostrarCentavos',  'Mostrar centavos'],
            ['mostrarOriginal',  'Mostrar preço original riscado (promoção)'],
            ['mostrarDesconto',  'Mostrar % de desconto'],
          ] as [keyof ConfigEtiquetaNova, string][]).map(([k, label]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(142,95,207,0.05)' }}>
              <label style={{ fontSize: 13, color: '#374151', fontFamily: 'Gilroy, sans-serif' }}>{label}</label>
              <OasisToggle checked={config[k] as boolean} onChange={v => set(k, v as never)} />
            </div>
          ))}
        </div>
      </div>

      {/* Observação personalizada */}
      <div style={glass}>
        <p style={{ ...labelSt, marginBottom: 10 }}>Observação personalizada</p>
        <textarea
          value={config.obsPersonalizada}
          onChange={e => set('obsPersonalizada', e.target.value)}
          placeholder="Texto livre que aparecerá na etiqueta quando o campo 'obs' estiver ativo…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>
    </div>
  );
}

// ─── TAB 4: Imprimir ──────────────────────────────────────────────────────────

function TabImprimir({
  config,
  modeloAtivo,
  produtosParaImprimir,
  gerando,
  setGerando,
}: {
  config: ConfigEtiquetaNova;
  modeloAtivo: ModeloEtiqueta;
  produtosParaImprimir: ProdutoParaEtiqueta[];
  gerando: boolean;
  setGerando: (v: boolean) => void;
}) {
  const totalEtiquetas = produtosParaImprimir.reduce((s, p) => s + p.quantidade, 0);

  async function handleGerarPDF() {
    if (!produtosParaImprimir.length) return;
    setGerando(true);
    try {
      await gerarPDFNovo(produtosParaImprimir, config, modeloAtivo.layout);
    } finally {
      setGerando(false);
    }
  }

  function handleExportarZPL() {
    produtosParaImprimir.forEach(p => downloadZPLNovo(p, config));
  }

  function handleImprimir() {
    window.print();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      {/* Resumo */}
      <div style={{ ...glass, background: 'linear-gradient(135deg, rgba(142,95,207,0.06), rgba(71,17,143,0.04))' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Produtos', valor: produtosParaImprimir.length },
            { label: 'Etiquetas', valor: totalEtiquetas },
            { label: 'Modelo', valor: modeloAtivo.nome },
            { label: 'Formato', valor: `${config.tipoPapel} · ${config.colunas} col · ${config.formatoSaida}` },
            { label: 'Tamanho', valor: `${config.largura}×${config.altura}mm` },
          ].map(item => (
            <div key={item.label}>
              <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>
                {item.valor}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Prévia das etiquetas */}
      {produtosParaImprimir.length > 0 ? (
        <div style={{ ...glass, padding: 20 }}>
          <p style={{ ...labelSt, marginBottom: 16 }}>Prévia de impressão</p>
          <div style={{
            maxHeight: 480, overflowY: 'auto',
            display: 'flex', flexWrap: 'wrap', gap: 6,
            background: '#f5f5f5', borderRadius: 12, padding: 16,
          }}>
            {produtosParaImprimir.flatMap((p, pi) =>
              Array.from({ length: p.quantidade }, (_, qi) => (
                <div key={`${pi}-${qi}`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <EtiquetaScaled
                    produto={p}
                    config={config}
                    layout={modeloAtivo.layout}
                    maxWidth={180}
                    maxHeight={100}
                    showBorder
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div style={{ ...glass, textAlign: 'center', padding: 48, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>
          Nenhum produto selecionado. Volte à aba "Selecionar Produtos".
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={handleGerarPDF}
          disabled={gerando || !produtosParaImprimir.length}
          style={{
            padding: '11px 24px', borderRadius: 12, border: 'none',
            background: !produtosParaImprimir.length ? '#E5E7EB' : 'linear-gradient(135deg,#47118F,#8E5FCF)',
            color: !produtosParaImprimir.length ? '#9CA3AF' : '#fff',
            cursor: !produtosParaImprimir.length ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'Gilroy, sans-serif',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {gerando ? (
            <><RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Gerando PDF…</>
          ) : (
            <><Download style={{ width: 16, height: 16 }} /> Baixar PDF</>
          )}
        </button>

        <button
          onClick={handleImprimir}
          disabled={!produtosParaImprimir.length}
          style={{
            padding: '11px 24px', borderRadius: 12,
            border: '1px solid rgba(142,95,207,0.3)',
            background: 'rgba(255,255,255,0.7)',
            color: '#8E5FCF', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'Gilroy, sans-serif',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <Printer style={{ width: 16, height: 16 }} /> Imprimir agora
        </button>

        {config.formatoSaida === 'ZPL' && (
          <button
            onClick={handleExportarZPL}
            disabled={!produtosParaImprimir.length}
            style={{
              padding: '11px 24px', borderRadius: 12,
              border: '1px solid rgba(156,163,175,0.4)',
              background: 'rgba(255,255,255,0.7)',
              color: '#6B7280', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'Gilroy, sans-serif',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <FileCode style={{ width: 16, height: 16 }} /> Exportar ZPL
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'produtos',    icon: Package,  label: 'Selecionar Produtos' },
  { id: 'modelo',     icon: Palette,  label: 'Modelo de Etiqueta' },
  { id: 'config',     icon: Settings, label: 'Configurações' },
  { id: 'imprimir',   icon: Printer,  label: 'Imprimir' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function ConfigEtiquetas() {
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const storageKey = STORAGE_PREFIX + (empresaId ?? 'default');

  // Config nova
  const [config, setConfigState] = useState<ConfigEtiquetaNova>(() =>
    carregarConfig(empresaId ?? 'default'),
  );

  useEffect(() => {
    setConfigState(carregarConfig(empresaId ?? 'default'));
  }, [empresaId]);

  function setConfig(c: ConfigEtiquetaNova) {
    setConfigState(c);
    salvarConfig(empresaId ?? 'default', c);
  }

  // Tab ativa
  const [tabAtiva, setTabAtiva] = useState<TabId>('produtos');

  // Produtos selecionados: id → quantidade
  const [selecionados, setSelecionados] = useState<Record<string, number>>({});

  // Produtos do banco
  const [produtos, setProdutos] = useState<ProdutoBD[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'com' | 'sem'>('todos');

  // Estado imprimir
  const [gerando, setGerando] = useState(false);

  // Carrega produtos
  useEffect(() => {
    if (!empresaId) return;
    setLoadingProdutos(true);
    api
      .from('produtos')
      .select('id, nome, preco, preco_custo:custo, estoque_atual:estoque, codigo, ean, categoria, unidade_comercial, ativo')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'produto')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        setProdutos((data as unknown as ProdutoBD[]) ?? []);
        setLoadingProdutos(false);
      });
  }, [empresaId]);

  // Categorias únicas
  const categorias = useMemo(() => {
    const set = new Set(produtos.map(p => p.categoria).filter(Boolean) as string[]);
    return [...set].sort();
  }, [produtos]);

  // Modelo ativo
  const modeloAtivo: ModeloEtiqueta = useMemo(() => {
    return MODELOS_ETIQUETA.find(m => m.id === config.modeloId) ?? MODELOS_ETIQUETA[1];
  }, [config.modeloId]);

  // Produtos para imprimir
  const produtosParaImprimir = useMemo<ProdutoParaEtiqueta[]>(() => {
    return Object.entries(selecionados).map(([id, qtd]) => {
      const p = produtos.find(x => x.id === id);
      if (!p) return null;
      return {
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        preco_custo: p.preco_custo,
        codigo: p.codigo,
        ean: p.ean,
        categoria: p.categoria,
        unidade_comercial: p.unidade_comercial,
        quantidade: qtd,
      } satisfies ProdutoParaEtiqueta;
    }).filter(Boolean) as ProdutoParaEtiqueta[];
  }, [selecionados, produtos]);

  // Demo produto para preview (primeiro selecionado ou padrão)
  const produtoDemo: ProdutoParaEtiqueta = useMemo(() => {
    return produtosParaImprimir[0] ?? PRODUTO_DEMO;
  }, [produtosParaImprimir]);

  const totalEtiquetas = Object.values(selecionados).reduce((s, q) => s + q, 0);

  function handleSalvar() {
    salvarConfig(empresaId ?? 'default', config);
    toast({ title: 'Configurações salvas', description: 'Layout de etiqueta atualizado com sucesso.' });
  }

  async function handleImprimirRapido() {
    if (!produtosParaImprimir.length) {
      toast({ title: 'Nenhum produto selecionado', description: 'Selecione produtos na aba "Selecionar Produtos".', variant: 'destructive' });
      return;
    }
    setGerando(true);
    try {
      await gerarPDFNovo(produtosParaImprimir, config, modeloAtivo.layout);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 32px 80px' }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}
        >
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>
              Oasis › Etiquetas de Produto
            </p>
            <h1 style={{
              fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy, sans-serif', margin: 0,
              background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Etiquetas de Produto
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif', margin: '6px 0 0' }}>
              Configure e imprima etiquetas
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {/* Badge resumo */}
            {totalEtiquetas > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: 'rgba(142,95,207,0.08)', border: '1px solid rgba(142,95,207,0.15)' }}>
                <Tag style={{ width: 14, height: 14, color: '#8E5FCF' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#8E5FCF', fontFamily: 'Gilroy, sans-serif' }}>
                  {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <button
              onClick={handleImprimirRapido}
              disabled={gerando || !produtosParaImprimir.length}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none',
                background: !produtosParaImprimir.length ? '#E5E7EB' : 'linear-gradient(135deg,#47118F,#8E5FCF)',
                color: !produtosParaImprimir.length ? '#9CA3AF' : '#fff',
                cursor: !produtosParaImprimir.length ? 'not-allowed' : 'pointer',
                fontFamily: 'Gilroy, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Printer style={{ width: 14, height: 14 }} />
              {gerando ? 'Gerando…' : 'Imprimir Selecionados'}
            </button>
            <button
              onClick={handleSalvar}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 12,
                border: '1px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)', color: '#8E5FCF', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif',
              }}
            >
              Salvar Config.
            </button>
          </div>
        </motion.div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            display: 'flex', gap: 0, marginBottom: 28,
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)',
            borderRadius: 16, padding: 4,
            border: '1px solid rgba(142,95,207,0.1)',
            width: 'fit-content',
          }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const ativa = tabAtiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabAtiva(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 12, border: 'none',
                  background: ativa ? 'linear-gradient(135deg,#47118F,#8E5FCF)' : 'transparent',
                  color: ativa ? '#fff' : '#6B7280',
                  cursor: 'pointer', fontSize: 13, fontWeight: ativa ? 700 : 600,
                  fontFamily: 'Gilroy, sans-serif', transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {tab.label}
                {tab.id === 'produtos' && Object.keys(selecionados).length > 0 && (
                  <span style={{
                    background: ativa ? 'rgba(255,255,255,0.25)' : '#8E5FCF',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 99,
                  }}>
                    {Object.keys(selecionados).length}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* ── Conteúdo das tabs ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabAtiva}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tabAtiva === 'produtos' && (
              <TabProdutos
                produtos={produtos}
                loading={loadingProdutos}
                selecionados={selecionados}
                setSelecionados={setSelecionados}
                busca={busca}
                setBusca={setBusca}
                filtroCategoria={filtroCategoria}
                setFiltroCategoria={setFiltroCategoria}
                filtroEstoque={filtroEstoque}
                setFiltroEstoque={setFiltroEstoque}
                categorias={categorias}
                onProximo={() => setTabAtiva('modelo')}
              />
            )}
            {tabAtiva === 'modelo' && (
              <TabModelo
                config={config}
                setConfig={setConfig}
                modeloAtivo={modeloAtivo}
                produtoDemo={produtoDemo}
              />
            )}
            {tabAtiva === 'config' && (
              <TabConfiguracoes config={config} setConfig={setConfig} />
            )}
            {tabAtiva === 'imprimir' && (
              <TabImprimir
                config={config}
                modeloAtivo={modeloAtivo}
                produtosParaImprimir={produtosParaImprimir}
                gerando={gerando}
                setGerando={setGerando}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Print CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media print {
          body > *:not(#area-impressao) { display: none !important; }
          #area-impressao { display: flex !important; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
