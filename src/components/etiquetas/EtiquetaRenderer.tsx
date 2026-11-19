/**
 * EtiquetaRenderer — renderiza uma etiqueta em HTML/CSS no tamanho natural.
 * Use EtiquetaScaled para exibição em previews com CSS transform.
 */
import React from 'react';
import type { ConfigEtiquetaNova, ProdutoParaEtiqueta } from './types';

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => Math.round(mm * MM_TO_PX);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPreco(valor: number, rs: boolean, centavos: boolean): string {
  if (!centavos) return (rs ? 'R$ ' : '') + Math.round(valor).toLocaleString('pt-BR');
  const f = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (rs ? 'R$ ' : '') + f;
}

function desconto(original: number, atual: number) {
  return Math.round((1 - atual / original) * 100);
}

// ─── Barcode simulado — usa width 100% para centralizar corretamente ──────────

function Barcode({ code, height = 28 }: { code: string; height?: number }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <div
        style={{
          width: '100%',
          height,
          background: [
            'repeating-linear-gradient(',
            '90deg,',
            '#000 0px, #000 2px,',
            'transparent 2px, transparent 4px,',
            '#000 4px, #000 5.5px,',
            'transparent 5.5px, transparent 8px,',
            '#000 8px, #000 9px,',
            'transparent 9px, transparent 12px',
            ')',
          ].join(''),
          borderRadius: 1,
        }}
      />
      <span
        style={{
          fontSize: 6.5,
          letterSpacing: 0.5,
          color: '#333',
          width: '100%',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        {code}
      </span>
    </div>
  );
}

// ─── QR Code simulado ─────────────────────────────────────────────────────────

function QRCode({ size }: { size: number }) {
  const cells = 9;
  const cell = size / cells;
  const pattern = [
    [1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0],
    [1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,0,1,1],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells}, ${cell}px)`, gap: 0, flexShrink: 0 }}>
      {pattern.flat().map((v, i) => (
        <div key={i} style={{ width: cell, height: cell, background: v ? '#000' : '#fff' }} />
      ))}
    </div>
  );
}

// ─── Container base de etiqueta ───────────────────────────────────────────────

const BASE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '100%',
  padding: '5px 6px',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

// ─── Layouts ──────────────────────────────────────────────────────────────────

function Simples({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  return (
    <div style={{ ...BASE, justifyContent: 'center', gap: 4 }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: fs, fontWeight: 700, textAlign: 'center', width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, fontFamily: c.fonte }}>
          {p.name}
        </p>
      )}
      {c.campos.includes('price') && (
        <p style={{ margin: 0, fontSize: fs + 5, fontWeight: 900, textAlign: 'center', width: '100%', lineHeight: 1, fontFamily: c.fonte }}>
          {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
        </p>
      )}
    </div>
  );
}

function Padrao({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  return (
    <div style={{ ...BASE }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: fs, fontWeight: 700, textAlign: 'center', width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, fontFamily: c.fonte }}>
          {p.name}
        </p>
      )}
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Barcode code={code} height={26} />
        </div>
      )}
      {c.campos.includes('price') && (
        <p style={{ margin: 0, fontSize: fs + 4, fontWeight: 900, textAlign: 'center', width: '100%', lineHeight: 1, fontFamily: c.fonte }}>
          {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
        </p>
      )}
    </div>
  );
}

function Completo({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  return (
    <div style={{ ...BASE, alignItems: 'flex-start' }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: fs, fontWeight: 700, lineHeight: 1.2, width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: c.fonte }}>
          {p.name}
        </p>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', width: '100%' }}>
        {c.campos.includes('sku') && p.code && (
          <span style={{ fontSize: fs - 2, color: '#777', fontFamily: c.fonte }}>SKU: {p.code}</span>
        )}
        {c.campos.includes('category') && p.categoria && (
          <span style={{ fontSize: fs - 2, color: '#777', fontFamily: c.fonte }}>{p.categoria}</span>
        )}
      </div>
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '100%' }}>
          <Barcode code={code} height={22} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
        {c.campos.includes('price') && (
          <p style={{ margin: 0, fontSize: fs + 4, fontWeight: 900, lineHeight: 1, fontFamily: c.fonte }}>
            {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
          </p>
        )}
        {c.campos.includes('preco_custo') && p.preco_custo && (
          <p style={{ margin: 0, fontSize: fs - 2, color: '#999', fontFamily: c.fonte }}>
            Custo: {fmtPreco(p.preco_custo, true, true)}
          </p>
        )}
      </div>
    </div>
  );
}

function Roupas({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  return (
    <div style={{ ...BASE }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: fs, fontWeight: 700, textAlign: 'center', width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, fontFamily: c.fonte }}>
          {p.name}
        </p>
      )}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
        {c.campos.includes('tamanho') && p.tamanho && (
          <span style={{ fontSize: fs + 2, fontWeight: 700, background: '#000', color: '#fff',
            padding: '1px 5px', borderRadius: 2, fontFamily: c.fonte }}>
            {p.tamanho}
          </span>
        )}
        {c.campos.includes('color') && p.cor && (
          <span style={{ fontSize: fs - 1, color: '#555', fontFamily: c.fonte }}>{p.cor}</span>
        )}
      </div>
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '100%' }}>
          <Barcode code={code} height={22} />
        </div>
      )}
      {c.campos.includes('price') && (
        <p style={{ margin: 0, fontSize: fs + 4, fontWeight: 900, textAlign: 'center', width: '100%', lineHeight: 1, fontFamily: c.fonte }}>
          {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
        </p>
      )}
    </div>
  );
}

function Promocao({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  const orig = p.preco_original ?? p.preco * 1.3;
  const pct = desconto(orig, p.preco);
  return (
    <div style={{ ...BASE }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: fs, fontWeight: 700, textAlign: 'center', width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, fontFamily: c.fonte }}>
          {p.name}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        {(c.campos.includes('preco_original') || c.mostrarOriginal) && (
          <span style={{ fontSize: fs, textDecoration: 'line-through', color: '#999', fontFamily: c.fonte }}>
            {fmtPreco(orig, c.mostrarRS, c.mostrarCentavos)}
          </span>
        )}
        {(c.campos.includes('desconto_pct') || c.mostrarDesconto) && (
          <span style={{ fontSize: fs - 1, background: '#e00', color: '#fff',
            padding: '1px 4px', borderRadius: 3, fontFamily: c.fonte, fontWeight: 700 }}>
            -{pct}%
          </span>
        )}
      </div>
      {c.campos.includes('price') && (
        <p style={{ margin: 0, fontSize: fs + 7, fontWeight: 900, color: '#e00',
          textAlign: 'center', width: '100%', lineHeight: 1, fontFamily: c.fonte }}>
          {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
        </p>
      )}
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '100%' }}>
          <Barcode code={code} height={20} />
        </div>
      )}
    </div>
  );
}

function Gondola({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  return (
    <div style={{ ...BASE, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0, paddingRight: 6 }}>
        {c.campos.includes('name') && (
          <p style={{ margin: 0, fontSize: fs, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: c.fonte }}>
            {p.name}
          </p>
        )}
        {c.campos.includes('unidade') && p.unidade_comercial && (
          <span style={{ fontSize: fs - 2, color: '#666', fontFamily: c.fonte }}>{p.unidade_comercial}</span>
        )}
        {c.campos.includes('price') && (
          <p style={{ margin: 0, fontSize: fs + 3, fontWeight: 900, lineHeight: 1, fontFamily: c.fonte }}>
            {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
          </p>
        )}
      </div>
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '35%', flexShrink: 0 }}>
          <Barcode code={code} height={32} />
        </div>
      )}
    </div>
  );
}

function ComQR({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  const qrSize = 36;
  return (
    <div style={{ ...BASE }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: fs, fontWeight: 700, textAlign: 'center', width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, fontFamily: c.fonte }}>
          {p.name}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        {c.campos.includes('qrcode') && <QRCode size={qrSize} />}
        {c.campos.includes('price') && (
          <p style={{ margin: 0, fontSize: fs + 3, fontWeight: 900, textAlign: 'center', lineHeight: 1, fontFamily: c.fonte }}>
            {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
          </p>
        )}
      </div>
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '100%' }}>
          <Barcode code={code} height={16} />
        </div>
      )}
    </div>
  );
}

function Bobina({ p, c, fs }: { p: ProdutoParaEtiqueta; c: ConfigEtiquetaNova; fs: number }) {
  const code = p.ean ?? p.code;
  return (
    <div style={{ ...BASE, padding: '3px 4px' }}>
      {c.campos.includes('name') && (
        <p style={{ margin: 0, fontSize: Math.max(6, fs - 1), fontWeight: 700, textAlign: 'center', width: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
          fontFamily: 'Courier, monospace', textTransform: 'uppercase' }}>
          {p.name.slice(0, 22)}
        </p>
      )}
      {c.campos.includes('price') && (
        <p style={{ margin: 0, fontSize: Math.max(7, fs + 1), fontWeight: 900, textAlign: 'center',
          width: '100%', lineHeight: 1, fontFamily: 'Courier, monospace' }}>
          {fmtPreco(p.preco, c.mostrarRS, c.mostrarCentavos)}
        </p>
      )}
      {c.campos.includes('codigo_barras') && code && (
        <div style={{ width: '100%' }}>
          <Barcode code={code} height={20} />
        </div>
      )}
    </div>
  );
}

// ─── EtiquetaRenderer — renderiza no tamanho natural (mm → px) ────────────────

interface EtiquetaRendererProps {
  produto: ProdutoParaEtiqueta;
  config: ConfigEtiquetaNova;
  layout: string;
  showBorder?: boolean;
}

export function EtiquetaRenderer({ produto, config, layout, showBorder = true }: EtiquetaRendererProps) {
  const w = mmToPx(config.largura);
  const h = mmToPx(config.altura);
  const fs = config.tamFonte;

  const props = { p: produto, c: config, fs };

  let conteudo: React.ReactNode;
  switch (layout) {
    case 'simples':  conteudo = <Simples  {...props} />; break;
    case 'padrao':   conteudo = <Padrao   {...props} />; break;
    case 'completo': conteudo = <Completo {...props} />; break;
    case 'roupas':   conteudo = <Roupas   {...props} />; break;
    case 'promocao': conteudo = <Promocao {...props} />; break;
    case 'gondola':  conteudo = <Gondola  {...props} />; break;
    case 'qrcode':   conteudo = <ComQR    {...props} />; break;
    case 'bobina':   conteudo = <Bobina   {...props} />; break;
    default:         conteudo = <Padrao   {...props} />; break;
  }

  return (
    <div
      style={{
        width: w,
        height: h,
        background: 'white',
        border: showBorder ? '1px solid #D1D5DB' : 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: config.fonte,
        flexShrink: 0,
      }}
    >
      {conteudo}
    </div>
  );
}

// ─── EtiquetaScaled — wrapper com CSS transform para exibição em previews ──────
//     Mantém as proporções corretas sem distorção.

interface EtiquetaScaledProps {
  produto: ProdutoParaEtiqueta;
  config: ConfigEtiquetaNova;
  layout: string;
  maxWidth: number;
  maxHeight: number;
  showBorder?: boolean;
}

export function EtiquetaScaled({
  produto,
  config,
  layout,
  maxWidth,
  maxHeight,
  showBorder = true,
}: EtiquetaScaledProps) {
  const naturalW = mmToPx(config.largura);
  const naturalH = mmToPx(config.altura);
  const scale = Math.min(maxWidth / naturalW, maxHeight / naturalH, 1);
  const scaledW = Math.round(naturalW * scale);
  const scaledH = Math.round(naturalH * scale);

  return (
    // Wrapper com o tamanho visual final (scaled)
    <div
      style={{
        width: scaledW,
        height: scaledH,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Inner no tamanho natural, escalado com CSS transform */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        <EtiquetaRenderer
          produto={produto}
          config={config}
          layout={layout}
          showBorder={showBorder}
        />
      </div>
    </div>
  );
}

// ─── ModeloThumbnail — miniatura para os cards de seleção ─────────────────────

const DEMO_PRODUTO: ProdutoParaEtiqueta = {
  id: 'demo',
  name: 'Camiseta Básica',
  preco: 49.90,
  preco_custo: 25.00,
  code: '000123',
  ean: '7891234567890',
  categoria: 'Roupas',
  unidade_comercial: 'UN',
  tamanho: 'M',
  cor: 'Azul',
  preco_original: 69.90,
  quantidade: 1,
};

const MODELO_DEFAULTS: Record<string, { largura: number; altura: number; campos: string[] }> = {
  simples:  { largura: 40,  altura: 25, campos: ['name', 'price'] },
  padrao:   { largura: 80,  altura: 40, campos: ['name', 'codigo_barras', 'price'] },
  completo: { largura: 100, altura: 50, campos: ['name', 'sku', 'codigo_barras', 'price', 'preco_custo', 'category'] },
  roupas:   { largura: 50,  altura: 30, campos: ['name', 'price', 'tamanho', 'color', 'codigo_barras'] },
  promocao: { largura: 80,  altura: 50, campos: ['name', 'preco_original', 'price', 'desconto_pct', 'codigo_barras'] },
  gondola:  { largura: 100, altura: 30, campos: ['name', 'price', 'unidade', 'codigo_barras'] },
  qrcode:   { largura: 60,  altura: 60, campos: ['name', 'price', 'qrcode', 'codigo_barras'] },
  bobina:   { largura: 40,  altura: 20, campos: ['name', 'price', 'codigo_barras'] },
};

const BASE_CONFIG: Omit<ConfigEtiquetaNova, 'modeloId' | 'largura' | 'altura' | 'campos'> = {
  fonte: 'Arial',
  tamFonte: 10,
  alinhPreco: 'center',
  mostrarRS: true,
  mostrarCentavos: true,
  mostrarOriginal: true,
  mostrarDesconto: true,
  tipoCodigo: 'Code128',
  mostrarNumeroCodigo: false,
  tipoPapel: 'A4',
  colunas: 3,
  linhasPorPagina: 7,
  margemSuperior: 10,
  margemInferior: 10,
  margemLateral: 10,
  espacoEtiquetas: 2,
  formatoSaida: 'PDF',
  larguraBobina: '80mm',
  obsPersonalizada: '',
};

export function ModeloThumbnail({ modeloId, layout }: { modeloId: string; layout: string }) {
  const mc = MODELO_DEFAULTS[modeloId] ?? MODELO_DEFAULTS.padrao;
  const config: ConfigEtiquetaNova = { ...BASE_CONFIG, modeloId, ...mc };

  return (
    <div
      style={{
        width: '100%',
        minHeight: 80,
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      <EtiquetaScaled
        produto={DEMO_PRODUTO}
        config={config}
        layout={layout}
        maxWidth={160}
        maxHeight={80}
        showBorder
      />
    </div>
  );
}
