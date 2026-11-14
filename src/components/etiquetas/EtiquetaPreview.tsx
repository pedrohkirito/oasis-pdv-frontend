/**
 * EtiquetaPreview — renderiza uma etiqueta em HTML/CSS proporcional.
 * Usado para preview antes de gerar PDF.
 */
import React from 'react';
import type { EtiquetaConfig } from '@/pages/ConfigEtiquetas';
import type { ProdutoEtiqueta } from './GeradorEtiqueta';

const SCREEN_SIZES = {
  pequena: { width: 160, height: 100 },
  media:   { width: 240, height: 120 },
  grande:  { width: 300, height: 150 },
} as const;

const FONT_SIZE_PRECO = { normal: 14, grande: 18, gigante: 24 } as const;

function SimulatedBarcode({ width }: { width: number }) {
  // Simula código de barras com listras verticais
  return (
    <div style={{
      width: width,
      height: 24,
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
      overflow: 'hidden',
      borderRadius: 1,
    }}>
      {Array.from({ length: Math.floor(width / 2.5) }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i % 3 === 0 ? 2 : 1,
            flexShrink: 0,
            background: i % 4 === 3 ? 'transparent' : '#1F2937',
          }}
        />
      ))}
    </div>
  );
}

interface EtiquetaPreviewProps {
  produto: ProdutoEtiqueta;
  config: EtiquetaConfig;
  logoUrl?: string | null;
  /** Override de tamanho (usa config.tamanho_padrao se omitido) */
  tamanho?: EtiquetaConfig['tamanho_padrao'];
}

export function EtiquetaPreview({ produto, config, logoUrl, tamanho }: EtiquetaPreviewProps) {
  const tam = tamanho ?? config.tamanho_padrao;
  const { width, height } = SCREEN_SIZES[tam];
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div style={{
      width,
      height,
      background: '#fff',
      border: '1px dashed #ccc',
      borderRadius: 4,
      padding: tam === 'pequena' ? '6px 8px' : '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: tam === 'pequena' ? 2 : 4,
      overflow: 'hidden',
      fontFamily: 'sans-serif',
      flexShrink: 0,
      position: 'relative',
    }}>

      {/* Linha superior: logo + nome */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {config.mostrar_logo && logoUrl && (
          <img
            src={logoUrl}
            alt="logo"
            style={{ height: tam === 'grande' ? 20 : 14, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        {config.mostrar_logo && !logoUrl && (
          <div style={{
            height: tam === 'grande' ? 20 : 14,
            width: tam === 'grande' ? 40 : 28,
            background: 'rgba(142,95,207,0.12)',
            borderRadius: 3,
            border: '1px dashed rgba(142,95,207,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 6,
            color: '#8E5FCF',
            flexShrink: 0,
          }}>
            LOGO
          </div>
        )}
        {config.mostrar_nome && (
          <span style={{
            fontSize: tam === 'pequena' ? 7 : tam === 'media' ? 8 : 9,
            fontWeight: 700,
            color: '#1F2937',
            lineHeight: 1.2,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
          }}>
            {produto.nome}
          </span>
        )}
      </div>

      {/* Tamanho / variação */}
      {config.mostrar_tamanho && produto.tamanho && (
        <span style={{ fontSize: 7, color: '#6B7280' }}>
          Tamanho: {produto.tamanho}
        </span>
      )}

      {/* Código de barras simulado */}
      {config.mostrar_codigo_barras && produto.codigo && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <SimulatedBarcode width={width - (tam === 'pequena' ? 20 : 28)} />
          <span style={{ fontSize: 6, color: '#6B7280', letterSpacing: 1 }}>
            {produto.codigo}
          </span>
        </div>
      )}

      {/* Preço em destaque */}
      {config.mostrar_preco && (
        <div style={{
          textAlign: 'center',
          fontWeight: 800,
          fontSize: FONT_SIZE_PRECO[config.fonte_preco],
          color: '#0A0010',
          lineHeight: 1,
          marginTop: 'auto',
        }}>
          {fmtBRL(produto.preco)}
        </div>
      )}

      {/* Código interno */}
      {config.mostrar_codigo_interno && produto.codigo_interno && (
        <span style={{ fontSize: 6, color: '#9CA3AF', marginTop: 1 }}>
          REF: {produto.codigo_interno}
        </span>
      )}
    </div>
  );
}
