// ─── Modelos pré-definidos ────────────────────────────────────────────────────

export interface ModeloEtiqueta {
  id: string;
  nome: string;
  descricao: string;
  largura: number;  // mm
  altura: number;   // mm
  campos: string[];
  layout: string;
}

export const MODELOS_ETIQUETA: ModeloEtiqueta[] = [
  {
    id: 'simples',
    nome: 'Simples',
    descricao: 'Nome e preço',
    largura: 40, altura: 25,
    campos: ['nome', 'preco'],
    layout: 'simples',
  },
  {
    id: 'padrao',
    nome: 'Padrão',
    descricao: 'Nome, preço e código de barras',
    largura: 80, altura: 40,
    campos: ['nome', 'codigo_barras', 'preco'],
    layout: 'padrao',
  },
  {
    id: 'completo',
    nome: 'Completo',
    descricao: 'Todas as informações',
    largura: 100, altura: 50,
    campos: ['nome', 'sku', 'codigo_barras', 'preco', 'preco_custo', 'categoria'],
    layout: 'completo',
  },
  {
    id: 'roupas',
    nome: 'Moda/Roupas',
    descricao: 'Com tamanho e cor',
    largura: 50, altura: 30,
    campos: ['nome', 'preco', 'tamanho', 'cor', 'codigo_barras'],
    layout: 'roupas',
  },
  {
    id: 'promocao',
    nome: 'Promoção',
    descricao: 'Destaca preço original e novo',
    largura: 80, altura: 50,
    campos: ['nome', 'preco_original', 'preco', 'desconto_pct', 'codigo_barras'],
    layout: 'promocao',
  },
  {
    id: 'gondola',
    nome: 'Gôndola',
    descricao: 'Para prateleiras de loja',
    largura: 100, altura: 30,
    campos: ['nome', 'preco', 'unidade', 'codigo_barras'],
    layout: 'gondola',
  },
  {
    id: 'qrcode',
    nome: 'Com QR Code',
    descricao: 'QR Code para catálogo online',
    largura: 60, altura: 60,
    campos: ['nome', 'preco', 'qrcode', 'codigo_barras'],
    layout: 'qrcode',
  },
  {
    id: 'bobina',
    nome: 'Bobina 40mm',
    descricao: 'Para impressoras térmicas',
    largura: 40, altura: 20,
    campos: ['nome', 'preco', 'codigo_barras'],
    layout: 'bobina',
  },
];

// ─── Configuração nova (página ConfigEtiquetas redesenhada) ───────────────────

export interface ConfigEtiquetaNova {
  modeloId: string;
  largura: number;
  altura: number;
  campos: string[];
  fonte: string;
  tamFonte: number;
  alinhPreco: 'left' | 'center' | 'right';
  mostrarRS: boolean;
  mostrarCentavos: boolean;
  mostrarOriginal: boolean;
  mostrarDesconto: boolean;
  tipoCodigo: 'Code128' | 'EAN-13' | 'EAN-8' | 'Code39' | 'QR';
  mostrarNumeroCodigo: boolean;
  tipoPapel: 'A4' | 'Carta' | 'Bobina' | 'Personalizado';
  colunas: number;
  linhasPorPagina: number;
  margemSuperior: number;
  margemInferior: number;
  margemLateral: number;
  espacoEtiquetas: number;
  formatoSaida: 'PDF' | 'ZPL' | 'EPL' | 'PNG';
  larguraBobina: '40mm' | '58mm' | '80mm';
  obsPersonalizada: string;
}

export const CONFIG_NOVA_PADRAO: ConfigEtiquetaNova = {
  modeloId: 'padrao',
  largura: 80,
  altura: 40,
  campos: ['nome', 'codigo_barras', 'preco'],
  fonte: 'Arial',
  tamFonte: 10,
  alinhPreco: 'center',
  mostrarRS: true,
  mostrarCentavos: true,
  mostrarOriginal: false,
  mostrarDesconto: false,
  tipoCodigo: 'Code128',
  mostrarNumeroCodigo: true,
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

// ─── Produto para etiquetas ───────────────────────────────────────────────────

export interface ProdutoParaEtiqueta {
  id: string;
  nome: string;
  preco: number;
  preco_custo?: number | null;
  codigo?: string | null;   // código interno / SKU
  ean?: string | null;      // código de barras EAN
  categoria?: string | null;
  unidade_comercial?: string | null;
  tamanho?: string | null;
  cor?: string | null;
  preco_original?: number | null;
  quantidade: number;        // cópias a imprimir
}

// ─── Todos os campos disponíveis ──────────────────────────────────────────────

export const CAMPOS_DISPONIVEIS: { id: string; label: string }[] = [
  { id: 'nome',         label: 'Nome do produto'        },
  { id: 'preco',        label: 'Preço de venda'          },
  { id: 'preco_custo',  label: 'Preço de custo'          },
  { id: 'codigo_barras',label: 'Código de barras (EAN/SKU)' },
  { id: 'qrcode',       label: 'QR Code'                 },
  { id: 'sku',          label: 'Código SKU (texto)'       },
  { id: 'categoria',    label: 'Categoria'               },
  { id: 'marca',        label: 'Marca/Fabricante'        },
  { id: 'tamanho',      label: 'Tamanho/Variação'        },
  { id: 'cor',          label: 'Cor'                     },
  { id: 'unidade',      label: 'Unidade (UN, KG, CX…)'  },
  { id: 'validade',     label: 'Validade'                },
  { id: 'lote',         label: 'Lote'                    },
  { id: 'empresa',      label: 'Nome da empresa'         },
  { id: 'logo',         label: 'Logo da empresa'         },
  { id: 'site',         label: 'Site/Instagram'          },
  { id: 'data',         label: 'Data de impressão'       },
  { id: 'obs',          label: 'Observação personalizada'},
];
