import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Upload, FileCode, AlertCircle, CheckCircle2, Loader2, Package, AlertTriangle, RefreshCw, Layers, Pencil, X, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface ProdutoXml {
  code: string;
  ean: string;
  name: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  precoVenda: number;
  origem: string;
  selected: boolean;
  isDuplicate?: boolean;
  existingProductId?: string;
  existingStock?: number;
  existingPreco?: number;
  existingCodigo?: string | null;
  predictedCodigo?: string | null;
}

interface FornecedorXml {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  endereco: string;
  cidade: string;
  estado: string;
}

interface DestinatarioXml {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  codigoMunicipio: string;
}

export type { ProdutoXml, FornecedorXml, DestinatarioXml };

interface XmlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (produtos: ProdutoXml[], updateExisting: boolean, mergeStock: boolean, fornecedor?: FornecedorXml, destinatario?: DestinatarioXml) => Promise<void>;
  existingCodes: string[];
  existingProducts: { id: string; code: string | null; name: string; ean: string | null; codigo_fornecedor: string | null; estoque: number | null; preco: number | null }[];
}

const parseXmlNFe = (xmlContent: string): { produtos: ProdutoXml[]; fornecedor?: FornecedorXml; destinatario?: DestinatarioXml } => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Erro ao processar XML: arquivo inválido');
  }

  // Extract emitente (supplier) info
  const emit = xmlDoc.querySelector('emit');
  let fornecedor: FornecedorXml | undefined;
  if (emit) {
    const getEmitText = (selector: string): string => {
      return emit.querySelector(selector)?.textContent?.trim() || '';
    };
    const enderEmit = emit.querySelector('enderEmit');
    const getEnderText = (selector: string): string => {
      return enderEmit?.querySelector(selector)?.textContent?.trim() || '';
    };
    const cnpj = getEmitText('CNPJ');
    const razaoSocial = getEmitText('xNome');
    if (cnpj && razaoSocial) {
      fornecedor = {
        cnpj,
        razaoSocial,
        nomeFantasia: getEmitText('xFant') || razaoSocial,
        inscricaoEstadual: getEmitText('IE'),
        endereco: [getEnderText('xLgr'), getEnderText('nro')].filter(Boolean).join(', '),
        cidade: getEnderText('xMun'),
        estado: getEnderText('UF'),
      };
    }
  }

  // Extract destinatário (buyer / own company) info
  const dest = xmlDoc.querySelector('dest');
  let destinatario: DestinatarioXml | undefined;
  if (dest) {
    const getDestText = (selector: string): string => {
      return dest.querySelector(selector)?.textContent?.trim() || '';
    };
    const enderDest = dest.querySelector('enderDest');
    const getEnderDestText = (selector: string): string => {
      return enderDest?.querySelector(selector)?.textContent?.trim() || '';
    };
    const cnpjDest = getDestText('CNPJ');
    const razaoSocialDest = getDestText('xNome');
    if (cnpjDest && razaoSocialDest) {
      destinatario = {
        cnpj: cnpjDest,
        razaoSocial: razaoSocialDest,
        inscricaoEstadual: getDestText('IE'),
        logradouro: getEnderDestText('xLgr'),
        numero: getEnderDestText('nro'),
        complemento: getEnderDestText('xCpl'),
        bairro: getEnderDestText('xBairro'),
        cidade: getEnderDestText('xMun'),
        estado: getEnderDestText('UF'),
        cep: getEnderDestText('CEP'),
        codigoMunicipio: getEnderDestText('cMun'),
      };
    }
  }

  const produtos: ProdutoXml[] = [];
  const detElements = xmlDoc.querySelectorAll('det');
  
  if (detElements.length === 0) {
    throw new Error('Nenhum produto encontrado no XML');
  }

  detElements.forEach((det) => {
    const prod = det.querySelector('prod');
    if (!prod) return;

    const getTextContent = (element: Element | null, selector: string): string => {
      const el = element?.querySelector(selector);
      return el?.textContent?.trim() || '';
    };

    const code = getTextContent(prod, 'cProd');
    const ean = getTextContent(prod, 'cEAN') || getTextContent(prod, 'cEANTrib') || '';
    const name = getTextContent(prod, 'xProd');
    const ncm = getTextContent(prod, 'NCM');
    const cfop = getTextContent(prod, 'CFOP');
    const unidade = getTextContent(prod, 'uCom') || getTextContent(prod, 'uTrib') || 'UN';
    const quantidade = parseFloat(getTextContent(prod, 'qCom') || getTextContent(prod, 'qTrib')) || 1;
    const valorUnitario = parseFloat(getTextContent(prod, 'vUnCom') || getTextContent(prod, 'vUnTrib')) || 0;
    const valorTotal = parseFloat(getTextContent(prod, 'vProd')) || valorUnitario * quantidade;
    
    const icms = det.querySelector('imposto ICMS');
    let origem = '0';
    if (icms) {
      const icmsChild = icms.firstElementChild;
      if (icmsChild) {
        origem = getTextContent(icmsChild, 'orig') || '0';
      }
    }

    if (name) {
      produtos.push({
        code,
        ean: ean && ean !== 'SEM GTIN' ? ean : '',
        name,
        ncm,
        cfop,
        unidade: unidade.toUpperCase(),
        quantidade,
        valorUnitario,
        valorTotal,
        precoVenda: 0,
        origem,
        selected: true
      });
    }
  });

  return { produtos, fornecedor, destinatario };
};

export const XmlImportDialog: React.FC<XmlImportDialogProps> = ({
  open,
  onOpenChange,
  onImport,
  existingCodes,
  existingProducts
}) => {
  const [produtos, setProdutos] = useState<ProdutoXml[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [mergeStock, setMergeStock] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', valorUnitario: '', precoVenda: '', ncm: '', cfop: '', unidade: '' });
  const [fornecedorXml, setFornecedorXml] = useState<FornecedorXml | undefined>(undefined);
  const [destinatarioXml, setDestinatarioXml] = useState<DestinatarioXml | undefined>(undefined);
  const checkDuplicates = useCallback((parsedProdutos: ProdutoXml[]) => {
    // Find the current max numeric code to predict next codes for new products
    let maxCode = 0;
    existingCodes.forEach(code => {
      const num = parseInt(code, 10);
      if (!isNaN(num) && num > maxCode) maxCode = num;
    });

    let nextCodeCounter = maxCode;

    return parsedProdutos.map(produto => {
      // Detectar duplicados: EAN > codigo_fornecedor (cProd) > name
      const existingProduct = existingProducts.find(ep => {
        // Match by EAN first (if both have EAN)
        if (produto.ean && ep.ean && produto.ean === ep.ean) return true;
        // Match by codigo_fornecedor (cProd from XML)
        if (produto.code && ep.codigo_fornecedor && produto.code === ep.codigo_fornecedor) return true;
        // Fallback: match by name
        if (ep.name && produto.name && ep.name.toLowerCase().trim() === produto.name.toLowerCase().trim()) return true;
        return false;
      });

      let predictedCodigo: string | null = null;
      if (!existingProduct) {
        nextCodeCounter++;
        predictedCodigo = String(nextCodeCounter).padStart(6, '0');
      }

      return {
        ...produto,
        isDuplicate: !!existingProduct,
        existingProductId: existingProduct?.id,
        existingStock: existingProduct?.estoque ?? 0,
        existingPreco: existingProduct?.preco ?? 0,
        existingCodigo: existingProduct?.code ?? null,
        predictedCodigo,
        precoVenda: existingProduct?.preco ?? 0,
        selected: true
      };
    });
  }, [existingProducts, existingCodes]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { produtos: parsedProdutos, fornecedor, destinatario } = parseXmlNFe(content);
        const produtosComDuplicados = checkDuplicates(parsedProdutos);
        setProdutos(produtosComDuplicados);
        setFornecedorXml(fornecedor);
        setDestinatarioXml(destinatario);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
        setProdutos([]);
        setFornecedorXml(undefined);
        setDestinatarioXml(undefined);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo');
      setProdutos([]);
    };
    reader.readAsText(file);
  }, [checkDuplicates]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    maxFiles: 1
  });

  const toggleProduto = (index: number) => {
    setProdutos(prev => prev.map((p, i) => 
      i === index ? { ...p, selected: !p.selected } : p
    ));
  };

  const toggleAll = (selected: boolean) => {
    setProdutos(prev => prev.map(p => ({ ...p, selected })));
  };

  const startEditing = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const produto = produtos[index];
    setEditForm({
      code: produto.code,
      name: produto.name,
      valorUnitario: produto.valorUnitario.toString(),
      precoVenda: produto.precoVenda.toString(),
      ncm: produto.ncm,
      cfop: produto.cfop,
      unidade: produto.unidade
    });
    setEditingIndex(index);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(null);
    setEditForm({ code: '', name: '', valorUnitario: '', precoVenda: '', ncm: '', cfop: '', unidade: '' });
  };

  const saveEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingIndex === null) return;
    
    setProdutos(prev => prev.map((p, i) => 
      i === editingIndex 
        ? { 
            ...p, 
            code: editForm.code || p.code,
            name: editForm.name || p.name,
            valorUnitario: parseFloat(editForm.valorUnitario) || p.valorUnitario,
            precoVenda: parseFloat(editForm.precoVenda) || p.precoVenda,
            ncm: editForm.ncm,
            cfop: editForm.cfop || p.cfop,
            unidade: editForm.unidade || p.unidade
          } 
        : p
    ));
    setEditingIndex(null);
    setEditForm({ code: '', name: '', valorUnitario: '', precoVenda: '', ncm: '', cfop: '', unidade: '' });
  };

  const handleImport = async () => {
    const selectedProdutos = produtos.filter(p => p.selected);
    if (selectedProdutos.length === 0) return;

    setImporting(true);
    try {
      await onImport(selectedProdutos, updateExisting, mergeStock, fornecedorXml, destinatarioXml);
      setProdutos([]);
      setFileName(null);
      setUpdateExisting(false);
      setMergeStock(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar produtos');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setProdutos([]);
    setError(null);
    setFileName(null);
    setUpdateExisting(false);
    setMergeStock(false);
    setEditingIndex(null);
    setEditForm({ code: '', name: '', valorUnitario: '', precoVenda: '', ncm: '', cfop: '', unidade: '' });
    setFornecedorXml(undefined);
    setDestinatarioXml(undefined);
    onOpenChange(false);
  };

  const handlePrecoVendaChange = (index: number, value: string) => {
    setProdutos(prev => prev.map((p, i) => 
      i === index ? { ...p, precoVenda: parseFloat(value) || 0 } : p
    ));
  };

  const selectedCount = produtos.filter(p => p.selected).length;
  const duplicateCount = produtos.filter(p => p.isDuplicate).length;
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Importar Produtos do XML
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              produtos.length > 0 && "py-3"
            )}
          >
            <input {...getInputProps()} />
            {produtos.length === 0 ? (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste um arquivo XML ou clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Suporta XML de NF-e e NFC-e
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{fileName}</span>
                <span className="text-xs text-muted-foreground">
                  (clique para trocar)
                </span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Fornecedor extraído */}
          {fornecedorXml && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  Fornecedor: {fornecedorXml.nomeFantasia || fornecedorXml.razaoSocial}
                </p>
                <p className="text-xs text-muted-foreground">
                  CNPJ: {fornecedorXml.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                  {fornecedorXml.cidade && ` · ${fornecedorXml.cidade}/${fornecedorXml.estado}`}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">Auto-cadastro</Badge>
            </div>
          )}

          {/* Destinatário extraído */}
          {destinatarioXml && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  Destinatário: {destinatarioXml.razaoSocial}
                </p>
                <p className="text-xs text-muted-foreground">
                  CNPJ: {destinatarioXml.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                  {destinatarioXml.cidade && ` · ${destinatarioXml.cidade}/${destinatarioXml.estado}`}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">Dados fiscais</Badge>
            </div>
          )}

          {/* Products List */}
          {produtos.length > 0 && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCount === produtos.length}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedCount} de {produtos.length} produtos selecionados
                  </span>
                </div>
                <div className="flex gap-2">
                  {duplicateCount > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {duplicateCount} duplicado{duplicateCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    <Package className="h-3 w-3 mr-1" />
                    {produtos.length} produtos encontrados
                  </Badge>
                </div>
              </div>

              {duplicateCount > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-600" />
                      <Label htmlFor="update-existing" className="text-sm text-amber-800 cursor-pointer">
                        Atualizar produtos existentes (duplicados)
                      </Label>
                    </div>
                    <Switch
                      id="update-existing"
                      checked={updateExisting}
                      onCheckedChange={setUpdateExisting}
                    />
                  </div>
                  
                  {updateExisting && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-600" />
                        <Label htmlFor="merge-stock" className="text-sm text-amber-800 cursor-pointer">
                          Somar quantidade do XML ao estoque atual
                        </Label>
                      </div>
                      <Switch
                        id="merge-stock"
                        checked={mergeStock}
                        onCheckedChange={setMergeStock}
                      />
                    </div>
                  )}
                </div>
              )}

              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-2 space-y-2">
                  {produtos.map((produto, index) => (
                    <Card
                      key={index}
                      className={cn(
                        "transition-colors",
                        editingIndex !== index && "cursor-pointer",
                        produto.selected ? "bg-primary/5 border-primary/30" : "opacity-60",
                        produto.isDuplicate && "border-amber-300 bg-amber-50/50",
                        editingIndex === index && "ring-2 ring-primary"
                      )}
                      onClick={() => editingIndex !== index && toggleProduto(index)}
                    >
                      <CardContent className="p-3">
                        {editingIndex === index ? (
                          // Modo de edição
                          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Editando produto</span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditing}>
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" onClick={saveEditing}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Código</Label>
                                <Input 
                                  value={editForm.code}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, code: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Unidade</Label>
                                <Input 
                                  value={editForm.unidade}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, unidade: e.target.value.toUpperCase() }))}
                                  className="h-8 text-sm"
                                  placeholder="UN, KG, CX..."
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Nome</Label>
                                <Input 
                                  value={editForm.name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Custo (NF)</Label>
                                <Input 
                                  type="text"
                                  inputMode="numeric"
                                  value={editForm.valorUnitario ? Number(editForm.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    const num = parseInt(digits || '0', 10) / 100;
                                    setEditForm(prev => ({ ...prev, valorUnitario: num.toString() }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Preço de Venda</Label>
                                <Input 
                                  type="text"
                                  inputMode="numeric"
                                  value={editForm.precoVenda ? Number(editForm.precoVenda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    const num = parseInt(digits || '0', 10) / 100;
                                    setEditForm(prev => ({ ...prev, precoVenda: num.toString() }));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">NCM</Label>
                                <Input 
                                  value={editForm.ncm}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, ncm: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">CFOP</Label>
                                <Input 
                                  value={editForm.cfop}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, cfop: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Modo visualização
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={produto.selected}
                              onCheckedChange={() => toggleProduto(index)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="font-medium text-sm truncate">{produto.name}</p>
                                  {produto.isDuplicate && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-100 text-xs shrink-0">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Duplicado
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Custo</p>
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                      {formatCurrency(produto.valorUnitario)}
                                    </span>
                                  </div>
                                  <div className="text-right flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Venda</p>
                                      <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={produto.precoVenda ? produto.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                        onChange={(e) => {
                                          const digits = e.target.value.replace(/\D/g, '');
                                          const num = parseInt(digits || '0', 10) / 100;
                                          handlePrecoVendaChange(index, num.toString());
                                        }}
                                        className="h-7 w-24 text-xs text-right font-semibold"
                                        placeholder="0,00"
                                      />
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={(e) => startEditing(index, e)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {produto.isDuplicate && produto.existingCodigo ? (
                                  <Badge variant="outline" className="text-xs">
                                    Cód: {produto.existingCodigo}
                                  </Badge>
                                ) : produto.predictedCodigo ? (
                                  <Badge variant="outline" className="text-xs">
                                    Cód: {produto.predictedCodigo}
                                  </Badge>
                                ) : null}
                                {!produto.isDuplicate && produto.code && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Cód. Fornecedor: {produto.code}
                                  </Badge>
                                )}
                                {produto.ncm && (
                                  <Badge variant="outline" className="text-xs">
                                    NCM: {produto.ncm}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {produto.unidade}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  CFOP: {produto.cfop}
                                </Badge>
                              </div>
                              {produto.isDuplicate && (
                                <div className="mt-2 space-y-1">
                                  {updateExisting && mergeStock ? (
                                    <div className="flex items-center gap-2 p-2 rounded bg-amber-100/80 border border-amber-200">
                                      <Layers className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <div className="text-xs text-amber-800">
                                        <span className="font-medium">Preview de estoque:</span>
                                        <span className="ml-2">
                                          {produto.existingStock ?? 0} atual + {produto.quantidade} XML = 
                                          <span className="font-bold text-amber-900 ml-1">
                                            {(produto.existingStock ?? 0) + produto.quantidade}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  ) : updateExisting ? (
                                    <p className="text-xs text-amber-600">
                                      Estoque atual ({produto.existingStock ?? 0}) será mantido. Outros dados serão atualizados.
                                    </p>
                                  ) : (
                                    <p className="text-xs text-amber-600">
                                      Este código já existe. Ative 'Atualizar produtos existentes' para atualizar.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {selectedCount} {selectedCount === 1 ? 'Produto' : 'Produtos'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
