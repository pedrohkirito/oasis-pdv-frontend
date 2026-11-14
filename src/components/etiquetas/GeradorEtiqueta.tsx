/**
 * GeradorEtiqueta — gera PDF/ZPL para etiquetas de produto.
 * Exporta funções legacy (gerarPDF, gerarZPL, downloadZPL) para ModalEtiquetas
 * e funções novas (gerarPDFNovo, gerarZPLNovo, downloadZPLNovo) para ConfigEtiquetas.
 */
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import type { EtiquetaConfig } from '@/pages/ConfigEtiquetas';
import type { ConfigEtiquetaNova, ProdutoParaEtiqueta } from './types';

// ─── Tipos públicos (legacy, usados por ModalEtiquetas) ───────────────────────

export interface ProdutoEtiqueta {
  id: string;
  nome: string;
  preco: number;
  codigo?: string;
  tamanho?: string;
  codigo_interno?: string;
  quantidade?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPrecoNovo(valor: number, mostrarRS: boolean, mostrarCentavos: boolean): string {
  if (!mostrarCentavos) {
    return (mostrarRS ? 'R$ ' : '') + Math.round(valor).toLocaleString('pt-BR');
  }
  const f = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (mostrarRS ? 'R$ ' : '') + f;
}

function barcodeToBase64(codigo: string, formato: string = 'CODE128'): string | null {
  try {
    const canvas = document.createElement('canvas');
    const jsFormat = formato === 'EAN-13' ? 'EAN13' :
                     formato === 'EAN-8'  ? 'EAN8'  :
                     formato === 'Code39' ? 'CODE39' : 'CODE128';
    JsBarcode(canvas, codigo, {
      format: jsFormat,
      displayValue: false,
      margin: 0,
      width: 1.5,
      height: 40,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── LEGACY: gerarPDF ─────────────────────────────────────────────────────────

const TAMANHOS_LEGACY = {
  pequena: { width: 40,  height: 25, cols: 4, rows: 10 },
  media:   { width: 80,  height: 40, cols: 2, rows: 6  },
  grande:  { width: 100, height: 50, cols: 2, rows: 5  },
} as const;

export async function gerarPDF(
  produtos: ProdutoEtiqueta[],
  config: EtiquetaConfig,
  logoUrl?: string | null,
): Promise<void> {
  const dim = TAMANHOS_LEGACY[config.tamanho_padrao];
  const marginX = 10;
  const marginY = 10;
  const gap = 2;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  let logoBase64: string | null = null;
  if (config.mostrar_logo && logoUrl) {
    logoBase64 = await imageUrlToBase64(logoUrl);
  }

  const lista: ProdutoEtiqueta[] = [];
  for (const p of produtos) {
    const qty = Math.max(1, p.quantidade ?? 1);
    for (let i = 0; i < qty; i++) lista.push(p);
  }

  let col = 0, row = 0;

  for (let idx = 0; idx < lista.length; idx++) {
    const produto = lista[idx];
    if (idx > 0 && col === 0 && row === 0) doc.addPage();

    const x = marginX + col * (dim.width + gap);
    const y = marginY + row * (dim.height + gap);

    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.rect(x, y, dim.width, dim.height);
    doc.setLineDashPattern([], 0);

    const px = x + 2;
    let py = y + 3;

    if (config.mostrar_logo && logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', px, py, 16, 8);
        py += 9.5;
      } catch { /* silent */ }
    }

    if (config.mostrar_nome) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      doc.text(truncate(produto.nome, 22), px, py);
      py += 4;
    }

    if (config.mostrar_tamanho && produto.tamanho) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(produto.tamanho, px, py);
      py += 3.5;
    }

    if (config.mostrar_preco) {
      const fontSizes = { normal: 10, grande: 14, gigante: 18 } as const;
      const fs = fontSizes[config.fonte_preco];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fs);
      doc.setTextColor(0, 0, 0);
      const precoTxt = formatBRL(produto.preco);
      const textW = doc.getStringUnitWidth(precoTxt) * fs / doc.internal.scaleFactor;
      const centroX = x + dim.width / 2 - textW / 2;
      doc.text(precoTxt, Math.max(px, centroX), py);
      py += fs * 0.4 + 2;
    }

    if (config.mostrar_codigo_barras && produto.codigo) {
      const barBase64 = barcodeToBase64(produto.codigo);
      if (barBase64) {
        try {
          doc.addImage(barBase64, 'PNG', px, py, dim.width - 4, 8);
          py += 9;
        } catch { /* silent */ }
      }
    }

    if (config.mostrar_codigo_interno && produto.codigo_interno) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(150, 150, 150);
      doc.text(produto.codigo_interno, px, py);
    }

    col++;
    if (col >= dim.cols) {
      col = 0;
      row++;
      if (row >= dim.rows) { col = 0; row = 0; }
    }
  }

  const dataHoje = new Date().toISOString().slice(0, 10);
  doc.save(`etiquetas-${dataHoje}.pdf`);
}

// ─── LEGACY: gerarZPL / downloadZPL ──────────────────────────────────────────

export function gerarZPL(produto: ProdutoEtiqueta, config: EtiquetaConfig): string {
  const codigo = produto.codigo ?? produto.codigo_interno ?? '000000';
  const nome = truncate(produto.nome, 30);
  const preco = formatBRL(produto.preco);
  const linhas: string[] = ['^XA'];

  if (config.mostrar_codigo_barras) {
    linhas.push(`^FO20,20^BY2^BCN,60,Y,N,N^FD${codigo}^FS`);
  }
  if (config.mostrar_nome) {
    linhas.push(`^FO20,90^A0N,20,20^FD${nome}^FS`);
  }
  if (config.mostrar_tamanho && produto.tamanho) {
    linhas.push(`^FO20,112^A0N,16,16^FD${produto.tamanho}^FS`);
  }
  if (config.mostrar_preco) {
    linhas.push(`^FO20,115^A0N,30,30^FDR$ ${preco}^FS`);
  }
  if (config.mostrar_codigo_interno && produto.codigo_interno) {
    linhas.push(`^FO20,150^A0N,14,14^FD${produto.codigo_interno}^FS`);
  }
  linhas.push('^XZ');
  return linhas.join('\n');
}

export function downloadZPL(produto: ProdutoEtiqueta, config: EtiquetaConfig): void {
  const zpl = gerarZPL(produto, config);
  const blob = new Blob([zpl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etiqueta-${produto.codigo ?? produto.id}.zpl`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── NOVO: gerarPDFNovo ───────────────────────────────────────────────────────

export async function gerarPDFNovo(
  produtos: ProdutoParaEtiqueta[],
  config: ConfigEtiquetaNova,
  layout: string,
): Promise<void> {
  const larguraMM = config.largura;
  const alturaMM = config.altura;

  const pageW = config.tipoPapel === 'Bobina' ? larguraMM + 10 : 210;
  const pageH = config.tipoPapel === 'Bobina' ? 297 : 297;
  const orientation = config.tipoPapel === 'Bobina' ? 'portrait' : 'portrait';

  const doc = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation });

  const marginX = config.margemLateral;
  const marginY = config.margemSuperior;
  const gap = config.espacoEtiquetas;
  const cols = config.colunas;

  // Expande produtos respeitando quantidade
  const lista: ProdutoParaEtiqueta[] = [];
  for (const p of produtos) {
    for (let i = 0; i < p.quantidade; i++) lista.push(p);
  }

  let col = 0, row = 0;

  for (let idx = 0; idx < lista.length; idx++) {
    const produto = lista[idx];

    // Nova página quando necessário
    if (idx > 0) {
      const maxCol = cols;
      const maxRow = config.linhasPorPagina;
      if (col >= maxCol) { col = 0; row++; }
      if (row >= maxRow) { col = 0; row = 0; doc.addPage(); }
    }

    const x = marginX + col * (larguraMM + gap);
    const y = marginY + row * (alturaMM + gap);

    // Borda tracejada
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.2);
    doc.rect(x, y, larguraMM, alturaMM);
    doc.setLineDashPattern([], 0);

    // Padding interno
    const px = x + 2;
    let py = y + 3.5;

    const campos = config.campos;
    const codigoBarras = produto.ean ?? produto.codigo ?? null;

    // Nome
    if (campos.includes('nome')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(config.tamFonte - 1);
      doc.setTextColor(20, 20, 20);
      const nomeStr = truncate(produto.nome, 30);
      const lines = doc.splitTextToSize(nomeStr, larguraMM - 4);
      doc.text(lines.slice(0, 2), px, py);
      py += lines.slice(0, 2).length * (config.tamFonte - 1) * 0.35 + 1.5;
    }

    // SKU / código texto
    if (campos.includes('sku') && produto.codigo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config.tamFonte - 3);
      doc.setTextColor(120, 120, 120);
      doc.text(`SKU: ${produto.codigo}`, px, py);
      py += (config.tamFonte - 3) * 0.35 + 1;
    }

    // Categoria
    if (campos.includes('categoria') && produto.categoria) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config.tamFonte - 3);
      doc.setTextColor(120, 120, 120);
      doc.text(produto.categoria, px, py);
      py += (config.tamFonte - 3) * 0.35 + 1;
    }

    // Tamanho / variação
    if (campos.includes('tamanho') && produto.tamanho) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(config.tamFonte);
      doc.setTextColor(20, 20, 20);
      doc.text(`TAM: ${produto.tamanho}`, px, py);
      py += config.tamFonte * 0.35 + 1.5;
    }

    // Cor
    if (campos.includes('cor') && produto.cor) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config.tamFonte - 2);
      doc.setTextColor(100, 100, 100);
      doc.text(produto.cor, px, py);
      py += (config.tamFonte - 2) * 0.35 + 1;
    }

    // Preço original riscado (promoção)
    if (
      (campos.includes('preco_original') || config.mostrarOriginal) &&
      produto.preco_original && produto.preco_original > produto.preco
    ) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config.tamFonte - 1);
      doc.setTextColor(180, 180, 180);
      const origStr = formatPrecoNovo(produto.preco_original, config.mostrarRS, config.mostrarCentavos);
      doc.text(origStr, px, py);
      // Linha riscada
      const strW = doc.getStringUnitWidth(origStr) * (config.tamFonte - 1) / doc.internal.scaleFactor;
      doc.setLineWidth(0.3);
      doc.setDrawColor(180, 180, 180);
      doc.line(px, py - 0.5, px + strW, py - 0.5);
      py += (config.tamFonte - 1) * 0.35 + 1;
    }

    // Preço principal
    if (campos.includes('preco')) {
      const precoFS = config.tamFonte + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(precoFS);
      doc.setTextColor(0, 0, 0);
      const precoStr = formatPrecoNovo(produto.preco, config.mostrarRS, config.mostrarCentavos);
      const precoW = doc.getStringUnitWidth(precoStr) * precoFS / doc.internal.scaleFactor;
      const precoX = config.alinhPreco === 'center'
        ? x + larguraMM / 2 - precoW / 2
        : config.alinhPreco === 'right'
          ? x + larguraMM - 2 - precoW
          : px;
      doc.text(precoStr, Math.max(px, precoX), py);
      py += precoFS * 0.4 + 1.5;
    }

    // Preço de custo
    if (campos.includes('preco_custo') && produto.preco_custo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config.tamFonte - 3);
      doc.setTextColor(160, 160, 160);
      doc.text(`Custo: ${formatPrecoNovo(produto.preco_custo, true, true)}`, px, py);
      py += (config.tamFonte - 3) * 0.35 + 1;
    }

    // Unidade
    if (campos.includes('unidade') && produto.unidade_comercial) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config.tamFonte - 2);
      doc.setTextColor(100, 100, 100);
      doc.text(produto.unidade_comercial, px, py);
      py += (config.tamFonte - 2) * 0.35 + 1;
    }

    // Código de barras
    if (campos.includes('codigo_barras') && codigoBarras) {
      const barBase64 = barcodeToBase64(codigoBarras, config.tipoCodigo);
      if (barBase64) {
        try {
          const barH = Math.min(10, alturaMM * 0.25);
          const barW = larguraMM - 4;
          doc.addImage(barBase64, 'PNG', px, py, barW, barH);
          py += barH + 0.5;
          if (config.mostrarNumeroCodigo) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(80, 80, 80);
            const cW = doc.getStringUnitWidth(codigoBarras) * 5 / doc.internal.scaleFactor;
            doc.text(codigoBarras, px + barW / 2 - cW / 2, py + 1.5);
          }
        } catch { /* silent */ }
      }
    }

    // Data
    if (campos.includes('data')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(160, 160, 160);
      const dataStr = new Date().toLocaleDateString('pt-BR');
      const dW = doc.getStringUnitWidth(dataStr) * 5 / doc.internal.scaleFactor;
      doc.text(dataStr, x + larguraMM - 2 - dW, y + alturaMM - 2);
    }

    col++;
    if (col >= cols) { col = 0; row++; }
  }

  const dataHoje = new Date().toISOString().slice(0, 10);
  doc.save(`etiquetas-oasis-${dataHoje}.pdf`);
}

// ─── NOVO: gerarZPLNovo ───────────────────────────────────────────────────────

export function gerarZPLNovo(produto: ProdutoParaEtiqueta, config: ConfigEtiquetaNova): string {
  const larguraDots = Math.round(config.largura * 8);
  const alturaDots = Math.round(config.altura * 8);
  const codigo = produto.ean ?? produto.codigo ?? '000000';
  const campos = config.campos;

  const linhas: string[] = [
    '^XA',
    `^PW${larguraDots}`,
    `^LL${alturaDots}`,
  ];

  let y = 20;

  if (campos.includes('nome')) {
    linhas.push(`^FO10,${y}^A0N,20,20^FD${truncate(produto.nome, 30)}^FS`);
    y += 25;
  }
  if (campos.includes('tamanho') && produto.tamanho) {
    linhas.push(`^FO10,${y}^A0N,16,16^FD${produto.tamanho}^FS`);
    y += 20;
  }
  if (campos.includes('sku') && produto.codigo) {
    linhas.push(`^FO10,${y}^A0N,14,14^FDSKU: ${produto.codigo}^FS`);
    y += 18;
  }
  if (campos.includes('preco')) {
    const precoStr = formatPrecoNovo(produto.preco, config.mostrarRS, config.mostrarCentavos);
    linhas.push(`^FO10,${y}^A0N,30,30^FD${precoStr}^FS`);
    y += 36;
  }
  if (campos.includes('codigo_barras') && codigo) {
    const barcodeType = config.tipoCodigo === 'EAN-13' ? 'E' :
                        config.tipoCodigo === 'Code39'  ? '3' : 'C';
    linhas.push(`^FO10,${y}^BY2^B${barcodeType}N,50,${config.mostrarNumeroCodigo ? 'Y' : 'N'},N,N^FD${codigo}^FS`);
  }
  linhas.push('^XZ');
  return linhas.join('\n');
}

export function downloadZPLNovo(produto: ProdutoParaEtiqueta, config: ConfigEtiquetaNova): void {
  const zpl = gerarZPLNovo(produto, config);
  const blob = new Blob([zpl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etiqueta-${produto.codigo ?? produto.ean ?? produto.id}.zpl`;
  a.click();
  URL.revokeObjectURL(url);
}
