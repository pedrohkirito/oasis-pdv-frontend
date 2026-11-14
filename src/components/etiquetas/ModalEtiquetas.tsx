/**
 * ModalEtiquetas — modal em 3 passos para gerar etiquetas de produtos.
 * Não altera nenhuma lógica de listagem/queries existente.
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Printer, Download, ChevronLeft, ChevronRight, FileCode, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useEtiquetaConfig } from '@/hooks/useEtiquetaConfig';
import { useEmpresa } from '@/hooks/useEmpresa';
import { gerarPDF, downloadZPL } from './GeradorEtiqueta';
import type { ProdutoEtiqueta } from './GeradorEtiqueta';
import { EtiquetaPreview } from './EtiquetaPreview';
import type { EtiquetaConfig } from '@/pages/ConfigEtiquetas';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProdutoLista {
  id: string;
  nome: string;
  preco: number;
  codigo: string | null;
  ean: string | null;
  unidade_comercial: string | null;
  codigo_interno?: string | null;
  tem_variacoes?: boolean | null;
}

interface VariacaoEtiqueta {
  id: string;
  atributos: Record<string, string>;
  preco: number | null;
  estoque: number;
}

interface ModalEtiquetasProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produtos: ProdutoLista[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TAMANHO_LABELS: Record<EtiquetaConfig['tamanho_padrao'], string> = {
  pequena: 'Pequena (40×25)',
  media:   'Média (80×40)',
  grande:  'Grande (100×50)',
};

const STEP_LABELS = ['Selecionar produtos', 'Configuração', 'Preview & Download'];

// ─── Componente principal ─────────────────────────────────────────────────────

export function ModalEtiquetas({ open, onOpenChange, produtos }: ModalEtiquetasProps) {
  const configSalva = useEtiquetaConfig();
  const { empresaAtiva } = useEmpresa();

  // Passo atual: 0 = seleção, 1 = config, 2 = preview
  const [step, setStep] = useState(0);

  // ── Estado passo 1 ───────────────────────────────────────────────────────
  // selecionados: chave pode ser "produtoId" ou "produtoId__variacaoId"
  const [selecionados, setSelecionados] = useState<Record<string, number>>({}); // chave → quantidade
  const [variacoesPorProduto, setVariacoesPorProduto] = useState<Record<string, VariacaoEtiqueta[]>>({});
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Carrega variações de produtos que tem_variacoes ao montar
  useEffect(() => {
    const produtosComVar = produtos.filter(p => p.tem_variacoes);
    if (!produtosComVar.length) return;
    Promise.all(
      produtosComVar.map(p =>
        supabase
          .from('produto_variacoes')
          .select('id, atributos, preco, estoque')
          .eq('produto_id', p.id)
          .eq('ativo', true)
          .order('created_at')
          .then(({ data }) => ({ id: p.id, variacoes: (data as VariacaoEtiqueta[]) || [] }))
      )
    ).then(results => {
      const mapa: Record<string, VariacaoEtiqueta[]> = {};
      results.forEach(r => { mapa[r.id] = r.variacoes; });
      setVariacoesPorProduto(mapa);
    });
  }, [produtos]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleProduto = (id: string) => {
    setSelecionados((prev) => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  };

  const setQtd = (id: string, qtd: number) => {
    if (selecionados[id] === undefined) return;
    setSelecionados((prev) => ({ ...prev, [id]: Math.max(1, Math.min(100, qtd)) }));
  };

  const toggleTodos = () => {
    // Considera apenas produtos sem variações para o toggle global
    const simples = produtos.filter(p => !p.tem_variacoes || !(variacoesPorProduto[p.id]?.length));
    const simplesIds = simples.map(p => p.id);
    const todosSelecionados = simplesIds.every(id => selecionados[id] !== undefined);
    if (todosSelecionados && simplesIds.length > 0) {
      setSelecionados({});
    } else {
      const all: Record<string, number> = {};
      simples.forEach((p) => { all[p.id] = selecionados[p.id] ?? 1; });
      setSelecionados(all);
    }
  };

  const totalEtiquetas = Object.values(selecionados).reduce((s, q) => s + q, 0);
  const totalSelecionados = Object.keys(selecionados).length;

  // ── Estado passo 2 ───────────────────────────────────────────────────────
  const [usarConfigSalva, setUsarConfigSalva] = useState(true);
  const [tamanhoLocal, setTamanhoLocal] = useState<EtiquetaConfig['tamanho_padrao']>(configSalva.tamanho_padrao);
  const [camposLocal, setCamposLocal] = useState<Pick<EtiquetaConfig, 'mostrar_logo' | 'mostrar_codigo_barras' | 'mostrar_preco' | 'mostrar_nome' | 'mostrar_tamanho' | 'mostrar_codigo_interno'>>({
    mostrar_logo:           configSalva.mostrar_logo,
    mostrar_codigo_barras:  configSalva.mostrar_codigo_barras,
    mostrar_preco:          configSalva.mostrar_preco,
    mostrar_nome:           configSalva.mostrar_nome,
    mostrar_tamanho:        configSalva.mostrar_tamanho,
    mostrar_codigo_interno: configSalva.mostrar_codigo_interno,
  });

  const configEfetiva: EtiquetaConfig = usarConfigSalva
    ? { ...configSalva, tamanho_padrao: tamanhoLocal }
    : { ...configSalva, tamanho_padrao: tamanhoLocal, ...camposLocal };

  // ── Estado passo 3 ───────────────────────────────────────────────────────
  const [gerando, setGerando] = useState(false);

  // Lista completa para geração
  const produtosParaGerar = useMemo<ProdutoEtiqueta[]>(() => {
    return Object.entries(selecionados).map(([chave, qtd]) => {
      const [produtoId, variacaoId] = chave.split('__');
      const p = produtos.find((x) => x.id === produtoId)!;
      if (!p) return null;
      if (variacaoId) {
        const v = (variacoesPorProduto[produtoId] ?? []).find(vv => vv.id === variacaoId);
        const label = v ? Object.values(v.atributos).join(' / ') : '';
        return {
          id: chave,
          nome: label ? `${p.nome} | ${label.split(' / ').join(' | ')}` : p.nome,
          preco: v?.preco ?? p.preco,
          codigo: p.ean ?? p.codigo ?? undefined,
          codigo_interno: p.codigo ?? p.codigo_interno ?? undefined,
          tamanho: label || undefined,
          quantidade: qtd,
        };
      }
      return {
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        codigo: p.ean ?? p.codigo ?? undefined,
        codigo_interno: p.codigo ?? p.codigo_interno ?? undefined,
        tamanho: p.unidade_comercial ?? undefined,
        quantidade: qtd,
      };
    }).filter(Boolean) as ProdutoEtiqueta[];
  }, [selecionados, produtos, variacoesPorProduto]);

  // Primeiro produto selecionado para preview
  const primeiroProduto = useMemo<ProdutoEtiqueta | null>(() => {
    return produtosParaGerar[0] ?? null;
  }, [produtosParaGerar]);

  // ── Ações ────────────────────────────────────────────────────────────────
  const handleGerarPDF = async () => {
    setGerando(true);
    try {
      await gerarPDF(produtosParaGerar, configEfetiva, empresaAtiva?.logo_url ?? null);
    } finally {
      setGerando(false);
    }
  };

  const handleExportarZPL = () => {
    produtosParaGerar.forEach((p) => downloadZPL(p, configEfetiva));
  };

  const handleClose = () => {
    setSelecionados({});
    setStep(0);
    onOpenChange(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Etiquetas</DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-4">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center',
                  i === step ? 'bg-primary text-white' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}>
                  {i + 1}
                </div>
                <span className={cn('text-xs hidden sm:inline', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={cn('flex-1 h-px', i < step ? 'bg-primary/30' : 'bg-muted')} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── PASSO 1: Seleção ────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={toggleTodos}
                className="text-sm text-primary hover:underline font-medium"
              >
                {Object.keys(selecionados).length === produtos.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              <span className="text-xs text-muted-foreground">
                {totalSelecionados > 0
                  ? `${totalSelecionados} produto${totalSelecionados > 1 ? 's' : ''} · ${totalEtiquetas} etiqueta${totalEtiquetas > 1 ? 's' : ''} no total`
                  : 'Nenhum produto selecionado'}
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-1 pr-1">
              {produtos.map((p) => {
                const temVar = p.tem_variacoes && (variacoesPorProduto[p.id]?.length ?? 0) > 0;
                const variacoes = variacoesPorProduto[p.id] ?? [];
                const expandido = !!expandidos[p.id];

                if (temVar) {
                  // Produto com variações — mostra expandir/recolher
                  return (
                    <div key={p.id} className="border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="flex items-center gap-3 px-3 py-2.5 w-full hover:bg-muted/40 transition-colors"
                        onClick={() => setExpandidos(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                      >
                        <div className="text-muted-foreground">
                          {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {variacoes.length} variação(ões)
                          </p>
                        </div>
                      </button>
                      {expandido && (
                        <div className="border-t divide-y bg-muted/10">
                          {variacoes.map(v => {
                            const chave = `${p.id}__${v.id}`;
                            const sel = selecionados[chave] !== undefined;
                            const label = Object.values(v.atributos).join(' / ');
                            const semEst = v.estoque === 0;
                            return (
                              <div
                                key={v.id}
                                className={cn(
                                  'flex items-center gap-3 px-4 py-2 transition-colors',
                                  semEst ? 'opacity-50' : 'cursor-pointer hover:bg-muted/30',
                                  sel && 'bg-primary/5',
                                )}
                                onClick={() => {
                                  if (semEst) return;
                                  setSelecionados(prev => {
                                    if (prev[chave] !== undefined) {
                                      const next = { ...prev }; delete next[chave]; return next;
                                    }
                                    return { ...prev, [chave]: 1 };
                                  });
                                }}
                              >
                                <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', sel ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                                  {sel && <div className="w-2 h-2 rounded-sm bg-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground">{label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(v.preco ?? p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    {semEst ? ' · Sem estoque' : ` · ${v.estoque} em estoque`}
                                  </p>
                                </div>
                                {sel && (
                                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <button type="button" className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs hover:bg-muted"
                                      onClick={() => setQtd(chave, (selecionados[chave] ?? 1) - 1)}>−</button>
                                    <Input type="number" min={1} max={100} value={selecionados[chave] ?? 1}
                                      onChange={e => setQtd(chave, parseInt(e.target.value) || 1)}
                                      className="w-14 h-6 text-center text-xs px-1" />
                                    <button type="button" className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs hover:bg-muted"
                                      onClick={() => setQtd(chave, (selecionados[chave] ?? 1) + 1)}>+</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Produto simples (sem variações)
                const sel = selecionados[p.id] !== undefined;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer',
                      sel ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/20 hover:bg-muted/40',
                    )}
                    onClick={() => toggleProduto(p.id)}
                  >
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0', sel ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                      {sel && <div className="w-2 h-2 rounded-sm bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {p.ean && ` · EAN: ${p.ean}`}
                        {!p.ean && p.codigo && ` · Cód: ${p.codigo}`}
                      </p>
                    </div>
                    {sel && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs hover:bg-muted"
                          onClick={() => setQtd(p.id, (selecionados[p.id] ?? 1) - 1)}>−</button>
                        <Input type="number" min={1} max={100} value={selecionados[p.id] ?? 1}
                          onChange={(e) => setQtd(p.id, parseInt(e.target.value) || 1)}
                          className="w-14 h-6 text-center text-xs px-1" />
                        <button type="button" className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs hover:bg-muted"
                          onClick={() => setQtd(p.id, (selecionados[p.id] ?? 1) + 1)}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PASSO 2: Configuração ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Seletor de tamanho */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Tamanho da etiqueta</p>
              <div className="flex gap-2">
                {(['pequena', 'media', 'grande'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTamanhoLocal(t)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all',
                      tamanhoLocal === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {TAMANHO_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle configurações salvas */}
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Usar configurações salvas</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Campos definidos em Configurações → Etiquetas
                </p>
              </div>
              <Switch
                checked={usarConfigSalva}
                onCheckedChange={setUsarConfigSalva}
              />
            </div>

            {/* Campos inline quando desativado */}
            {!usarConfigSalva && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Campos a exibir
                </p>
                {(
                  [
                    ['mostrar_logo',           'Logo da empresa'],
                    ['mostrar_nome',            'Nome do produto'],
                    ['mostrar_tamanho',         'Tamanho / variação'],
                    ['mostrar_codigo_barras',   'Código de barras'],
                    ['mostrar_preco',           'Preço em destaque'],
                    ['mostrar_codigo_interno',  'Código interno'],
                  ] as [keyof typeof camposLocal, string][]
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                    <Switch
                      id={key}
                      checked={camposLocal[key]}
                      onCheckedChange={(v) => setCamposLocal((prev) => ({ ...prev, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PASSO 3: Preview & Download ─────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            {primeiroProduto ? (
              <>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Preview</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Mostrando etiqueta com dados de: <strong>{primeiroProduto.nome}</strong>
                  </p>
                  <div className="flex justify-center p-4 bg-muted/30 rounded-xl border border-border">
                    <EtiquetaPreview
                      produto={primeiroProduto}
                      config={configEfetiva}
                      logoUrl={empresaAtiva?.logo_url}
                      tamanho={tamanhoLocal}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <p className="text-sm text-foreground">
                    <strong>{totalSelecionados}</strong> produto{totalSelecionados > 1 ? 's' : ''} ·{' '}
                    <strong>{totalEtiquetas}</strong> etiqueta{totalEtiquetas > 1 ? 's' : ''} no total ·{' '}
                    Tamanho: <strong>{TAMANHO_LABELS[tamanhoLocal]}</strong>
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={handleGerarPDF}
                    disabled={gerando}
                  >
                    {gerando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Gerando PDF…
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Baixar PDF
                      </>
                    )}
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleExportarZPL}>
                          <FileCode className="w-4 h-4 mr-2" />
                          Exportar ZPL
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Para impressoras Zebra</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum produto selecionado.
              </p>
            )}
          </div>
        )}

        {/* ── Navegação ──────────────────────────────────────────────────── */}
        <div className="flex justify-between pt-4 border-t border-border mt-2">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? handleClose() : setStep((s) => s - 1))}
            className="gap-1"
          >
            {step === 0 ? 'Cancelar' : <><ChevronLeft className="w-4 h-4" /> Voltar</>}
          </Button>
          {step < 2 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && totalSelecionados === 0}
              className="gap-1"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
