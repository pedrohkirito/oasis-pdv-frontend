// ─── ESC/POS Generator ────────────────────────────────────────────────────────
// Suporte: Elgin i8/i9, Epson TM, Bematech, Daruma, Diebold — protocolo universal

export interface DadosEmpresa {
  name: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
}

export interface ItemVenda {
  product_name: string;
  quantidade: number;
  unit_price: number;
  subtotal: number;
}

export interface DadosVenda {
  numero: string;
  data: string;
  itens: ItemVenda[];
  subtotal: number;
  desconto?: number;
  total: number;
  formaPagamento: string;
  operador?: string;
}

export interface DadosNFCe {
  numero: string;
  serie: string;
  chaveAcesso: string;
  dataEmissao: string;
  urlConsulta?: string;
  qrCode?: string;
}

// ─── Constantes ESC/POS ───────────────────────────────────────────────────────

const ESC = '\x1B';
const GS  = '\x1D';
const LF  = '\x0A';

// Comandos base
const INIT          = ESC + '@';               // Inicializar impressora
const BOLD_ON       = ESC + 'E\x01';
const BOLD_OFF      = ESC + 'E\x00';
const ALIGN_LEFT    = ESC + 'a\x00';
const ALIGN_CENTER  = ESC + 'a\x01';
const ALIGN_RIGHT   = ESC + 'a\x02';
const FONT_NORMAL   = GS  + '!\x00';          // Tamanho normal
const FONT_DOUBLE_H = GS  + '!\x10';          // Altura dupla
const FONT_DOUBLE   = GS  + '!\x11';          // Largura e altura dupla
const CUT_FULL      = GS  + 'V\x00';          // Corte total
const CUT_PARTIAL   = GS  + 'V\x01';          // Corte parcial
const OPEN_DRAWER   = ESC + 'p\x00\x19\xFA';  // Abrir gaveta (pino 2)
const LINE_FEED     = LF;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function line(char = '-', width = 48): string {
  return char.repeat(width) + LF;
}

function padRight(text: string, width: number): string {
  return text.substring(0, width).padEnd(width, ' ');
}

function padLeft(text: string, width: number): string {
  return text.substring(0, width).padStart(width, ' ');
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function itemRow(descricao: string, qtd: number, unitario: number, subtotal: number, width = 48): string {
  const valorStr = formatMoeda(subtotal);
  const qtdUnit  = `${qtd}x${formatMoeda(unitario)}`;
  // Linha 1: descricao
  const desc = padRight(descricao, width);
  // Linha 2: qtd x unitario ... subtotal
  const spacer = width - qtdUnit.length - valorStr.length;
  const row2   = qtdUnit + ' '.repeat(Math.max(spacer, 1)) + valorStr;
  return desc + LF + row2.substring(0, width) + LF;
}

function totaisRow(label: string, valor: string, width = 48): string {
  const spacer = width - label.length - valor.length;
  return label + ' '.repeat(Math.max(spacer, 1)) + valor + LF;
}

// ─── QR Code ESC/POS nativo ───────────────────────────────────────────────────

function qrCodeESCPOS(data: string, size = 6): string {
  const dataLen  = data.length + 3;
  const pL       = String.fromCharCode(dataLen & 0xff);
  const pH       = String.fromCharCode((dataLen >> 8) & 0xff);
  const sizeChar = String.fromCharCode(size);

  return (
    // Model: modelo 2
    GS + '(k' + '\x04\x00' + '\x31\x41\x32\x00' +
    // Size
    GS + '(k' + '\x03\x00' + '\x31\x43' + sizeChar +
    // Error correction: M (15%)
    GS + '(k' + '\x03\x00' + '\x31\x45\x31' +
    // Store data
    GS + '(k' + pL + pH + '\x31\x50\x30' + data +
    // Print
    GS + '(k' + '\x03\x00' + '\x31\x51\x30'
  );
}

// ─── Cupom de teste ───────────────────────────────────────────────────────────

export function gerarTesteESCPOS(): string {
  const now = new Date().toLocaleString('pt-BR');
  return (
    INIT +
    ALIGN_CENTER +
    BOLD_ON + FONT_DOUBLE_H +
    'OASIS PDV' + LF +
    FONT_NORMAL + BOLD_OFF +
    'Teste de Impressao' + LF +
    now + LF +
    ALIGN_LEFT +
    line() +
    'Impressora configurada!' + LF +
    'Qualidade: OK' + LF +
    'Comunicacao: OK' + LF +
    line() +
    ALIGN_CENTER +
    '*** FIM DO TESTE ***' + LF +
    LF + LF + LF +
    CUT_PARTIAL
  );
}

// ─── Cupom simples (sem NFC-e) ────────────────────────────────────────────────

export function gerarCupomSimplesESCPOS(empresa: DadosEmpresa, venda: DadosVenda): string {
  const WIDTH = 48;
  const now   = new Date().toLocaleString('pt-BR');

  let doc = INIT;

  // Cabeçalho
  doc += ALIGN_CENTER;
  doc += BOLD_ON + FONT_DOUBLE_H + empresa.name.toUpperCase() + LF + FONT_NORMAL + BOLD_OFF;
  if (empresa.cnpj)     doc += 'CNPJ: ' + empresa.cnpj + LF;
  if (empresa.endereco) doc += empresa.endereco + LF;
  if (empresa.telefone) doc += 'Tel: ' + empresa.telefone + LF;
  doc += LF;

  doc += ALIGN_CENTER + BOLD_ON + '*** CUPOM NAO FISCAL ***' + LF + BOLD_OFF;
  doc += line('=', WIDTH);

  // Dados da venda
  doc += ALIGN_LEFT;
  doc += 'Venda: ' + padLeft(venda.numero, 10) + LF;
  doc += 'Data:  ' + venda.data + LF;
  if (venda.operador) doc += 'Oper.: ' + venda.operador + LF;
  doc += line('-', WIDTH);

  // Itens
  doc += BOLD_ON + padRight('DESCRICAO', WIDTH) + LF + BOLD_OFF;
  doc += padRight('QTD x UNITARIO', 28) + padLeft('TOTAL', 20) + LF;
  doc += line('-', WIDTH);

  for (const item of venda.itens) {
    doc += itemRow(item.product_name, item.quantidade, item.unit_price, item.subtotal, WIDTH);
  }

  doc += line('-', WIDTH);

  // Totais
  doc += totaisRow('Subtotal:', formatMoeda(venda.subtotal), WIDTH);
  if (venda.desconto && venda.desconto > 0) {
    doc += totaisRow('Desconto:', '-' + formatMoeda(venda.desconto), WIDTH);
  }

  doc += BOLD_ON + FONT_DOUBLE_H;
  doc += totaisRow('TOTAL:', formatMoeda(venda.total), WIDTH);
  doc += FONT_NORMAL + BOLD_OFF;

  doc += line('-', WIDTH);
  doc += totaisRow('Pagamento:', venda.formaPagamento, WIDTH);
  doc += line('=', WIDTH);

  // Rodapé
  doc += ALIGN_CENTER;
  doc += 'Obrigado pela preferencia!' + LF;
  doc += 'Volte sempre!' + LF;
  doc += LF;
  doc += now + LF;
  doc += LF + LF + LF;
  doc += CUT_PARTIAL;

  return doc;
}

// ─── DANFE NFC-e ─────────────────────────────────────────────────────────────

export function gerarDANFEESCPOS(
  empresa: DadosEmpresa,
  venda: DadosVenda,
  nfce: DadosNFCe,
): string {
  const WIDTH = 48;
  const now   = new Date().toLocaleString('pt-BR');

  let doc = INIT;

  // Cabeçalho
  doc += ALIGN_CENTER;
  doc += BOLD_ON + FONT_DOUBLE_H + empresa.name.toUpperCase() + LF + FONT_NORMAL + BOLD_OFF;
  if (empresa.cnpj)     doc += 'CNPJ: ' + empresa.cnpj + LF;
  if (empresa.endereco) doc += empresa.endereco + LF;
  if (empresa.telefone) doc += 'Tel: ' + empresa.telefone + LF;
  doc += LF;

  doc += BOLD_ON + 'DANFE NFC-e' + LF + BOLD_OFF;
  doc += 'Documento Auxiliar da Nota Fiscal' + LF;
  doc += 'de Consumidor Eletronica' + LF;
  doc += line('=', WIDTH);

  // Dados NFC-e
  doc += ALIGN_LEFT;
  doc += 'NF-e N.: ' + nfce.numero + '  Serie: ' + nfce.serie + LF;
  doc += 'Emissao: ' + nfce.dataEmissao + LF;
  doc += 'Venda:   ' + venda.numero + LF;
  if (venda.operador) doc += 'Oper.:   ' + venda.operador + LF;
  doc += line('-', WIDTH);

  // Itens
  doc += BOLD_ON + padRight('DESCRICAO', WIDTH) + LF + BOLD_OFF;
  doc += padRight('QTD x UNITARIO', 28) + padLeft('TOTAL', 20) + LF;
  doc += line('-', WIDTH);

  for (const item of venda.itens) {
    doc += itemRow(item.product_name, item.quantidade, item.unit_price, item.subtotal, WIDTH);
  }

  doc += line('-', WIDTH);

  // Totais
  doc += totaisRow('Subtotal:', formatMoeda(venda.subtotal), WIDTH);
  if (venda.desconto && venda.desconto > 0) {
    doc += totaisRow('Desconto:', '-' + formatMoeda(venda.desconto), WIDTH);
  }

  doc += BOLD_ON + FONT_DOUBLE_H;
  doc += totaisRow('TOTAL:', formatMoeda(venda.total), WIDTH);
  doc += FONT_NORMAL + BOLD_OFF;

  doc += line('-', WIDTH);
  doc += totaisRow('Pagamento:', venda.formaPagamento, WIDTH);
  doc += line('=', WIDTH);

  // Chave de acesso
  doc += ALIGN_CENTER;
  doc += BOLD_ON + 'CHAVE DE ACESSO' + LF + BOLD_OFF;
  // Formatar chave em grupos de 4
  const chave = nfce.chaveAcesso.replace(/\D/g, '');
  const grupos: string[] = [];
  for (let i = 0; i < chave.length; i += 4) grupos.push(chave.substring(i, i + 4));
  doc += grupos.join(' ') + LF;
  doc += LF;

  // QR Code
  if (nfce.qrCode) {
    doc += BOLD_ON + 'QR Code NFC-e' + LF + BOLD_OFF;
    doc += qrCodeESCPOS(nfce.qrCode, 6);
    doc += LF;
  }

  if (nfce.urlConsulta) {
    doc += 'Consulte em:' + LF;
    // Quebrar URL em linhas de WIDTH chars
    const url = nfce.urlConsulta;
    for (let i = 0; i < url.length; i += WIDTH) {
      doc += url.substring(i, i + WIDTH) + LF;
    }
    doc += LF;
  }

  // Rodapé
  doc += ALIGN_CENTER;
  doc += 'Obrigado pela preferencia!' + LF;
  doc += now + LF;
  doc += LF + LF + LF;
  doc += CUT_PARTIAL;

  return doc;
}

// ─── Comando abrir gaveta ─────────────────────────────────────────────────────

export function gerarAbrirGaveta(): string {
  return OPEN_DRAWER;
}
