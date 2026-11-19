import { useState, useMemo } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProdutoVariacoes, ProdutoVariacao } from '@/hooks/useProdutoVariacoes';
import { toast } from '@/components/ui/use-toast';

// ─── Mapeamento de cores conhecidas ─────────────────────────────────────────

const COR_MAP: Record<string, string> = {
  preto: '#000000',
  branco: '#FFFFFF',
  azul: '#3B82F6',
  vermelho: '#EF4444',
  rosa: '#EC4899',
  verde: '#22C55E',
  amarelo: '#EAB308',
  bege: '#D4B896',
  cinza: '#6B7280',
  marrom: '#92400E',
  laranja: '#F97316',
  roxo: '#8B5CF6',
};

function corHex(name: string): string | null {
  return COR_MAP[name.toLowerCase().trim()] ?? null;
}

// ─── Chips selecionáveis ─────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
  color,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border transition-all ${
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
      }`}
    >
      {color && (
        <span
          className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface GradeVariacoesProps {
  productId: string;
  precoBase: number;
  precoCustoBase: number;
}

// ─── Tamanhos e sugestões padrão ─────────────────────────────────────────────

const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Único'];
const CORES_SUGERIDAS = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde', 'Amarelo', 'Bege'];
const NUMERACOES_SUGERIDAS = ['34', '36', '38', '40', '42', '44'];

// ─── Componente principal ────────────────────────────────────────────────────

export function GradeVariacoes({ productId, precoBase, precoCustoBase }: GradeVariacoesProps) {
  const {
    variacoes,
    loading,
    gerarVariacoes,
    atualizarVariacao,
    excluirVariacao,
  } = useProdutoVariacoes(productId);

  // ── Estado: seleção de tamanhos ──
  const [tamanhosSel, setTamanhosSel] = useState<string[]>([]);
  const [tamanhoCustom, setTamanhoCustom] = useState('');

  // ── Estado: cores ──
  const [coresSel, setCoresSel] = useState<string[]>([]);
  const [corInput, setCorInput] = useState('');

  // ── Estado: numeração ──
  const [numSel, setNumSel] = useState<string[]>([]);
  const [numInput, setNumInput] = useState('');

  // ── Estado: edições inline ──
  const [edicoes, setEdicoes] = useState<Record<string, Partial<ProdutoVariacao>>>({});
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  // ── Preview das combinações ──
  const preview = useMemo(() => {
    const grupos: { name: string; valores: string[] }[] = [];
    if (tamanhosSel.length) grupos.push({ name: 'Tamanho', valores: tamanhosSel });
    if (coresSel.length) grupos.push({ name: 'Cor', valores: coresSel });
    if (numSel.length) grupos.push({ name: 'Numeração', valores: numSel });

    if (!grupos.length) return [];

    return grupos.reduce(
      (acc, g) => {
        if (!acc.length) return g.valores.map(v => ({ [g.name]: v }));
        return acc.flatMap(combo => g.valores.map(v => ({ ...combo, [g.name]: v })));
      },
      [] as Record<string, string>[]
    );
  }, [tamanhosSel, coresSel, numSel]);

  // ── Helpers de toggle ──
  function toggleTamanho(v: string) {
    setTamanhosSel(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
  }
  function toggleCor(v: string) {
    setCoresSel(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
  }
  function toggleNum(v: string) {
    setNumSel(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
  }

  function adicionarTamanhoCustom() {
    const v = tamanhoCustom.trim().toUpperCase();
    if (v && !tamanhosSel.includes(v)) setTamanhosSel(prev => [...prev, v]);
    setTamanhoCustom('');
  }
  function adicionarCor() {
    const v = corInput.trim();
    if (v && !coresSel.includes(v)) setCoresSel(prev => [...prev, v]);
    setCorInput('');
  }
  function adicionarNum() {
    const v = numInput.trim();
    if (v && !numSel.includes(v)) setNumSel(prev => [...prev, v]);
    setNumInput('');
  }

  // ── Gerar variações ──
  async function handleGerar() {
    const grupos: { name: string; valores: string[] }[] = [];
    if (tamanhosSel.length) grupos.push({ name: 'Tamanho', valores: tamanhosSel });
    if (coresSel.length) grupos.push({ name: 'Cor', valores: coresSel });
    if (numSel.length) grupos.push({ name: 'Numeração', valores: numSel });

    if (!grupos.length) {
      toast({ title: 'Selecione ao menos um atributo', variant: 'destructive' });
      return;
    }

    if (
      variacoes.length > 0 &&
      !window.confirm(
        `Isso vai adicionar ${preview.length} nova(s) variação(ões). Confirmar?`
      )
    ) {
      return;
    }

    setGerando(true);
    const { error } = await gerarVariacoes(grupos, precoBase, precoCustoBase);
    setGerando(false);

    if (error) {
      toast({ title: 'Erro ao gerar variações', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${preview.length} variação(ões) geradas!` });
      setTamanhosSel([]);
      setCoresSel([]);
      setNumSel([]);
    }
  }

  // ── Edição inline ──
  function editarCampo(id: string, campo: keyof ProdutoVariacao, valor: unknown) {
    setEdicoes(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }));
  }

  function valorEdicao<K extends keyof ProdutoVariacao>(
    variacao: ProdutoVariacao,
    campo: K
  ): ProdutoVariacao[K] {
    const ed = edicoes[variacao.id];
    return (ed && campo in ed ? ed[campo] : variacao[campo]) as ProdutoVariacao[K];
  }

  async function salvarAlteracoes() {
    setSalvando(true);
    const ids = Object.keys(edicoes);
    for (const id of ids) {
      await atualizarVariacao(id, edicoes[id]);
    }
    setEdicoes({});
    setSalvando(false);
    toast({ title: 'Alterações salvas!' });
  }

  const temEdicoes = Object.keys(edicoes).length > 0;
  const estoqueTotal = variacoes.reduce((s, v) => s + (v.estoque ?? 0), 0);
  const semEstoque = variacoes.filter(v => (v.estoque ?? 0) === 0).length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── SEÇÃO 1: Gerar grade ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gerar Grade de Variações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Tamanhos */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Tamanhos</p>
            <div className="flex flex-wrap gap-2">
              {TAMANHOS_PADRAO.map(t => (
                <Chip
                  key={t}
                  label={t}
                  selected={tamanhosSel.includes(t)}
                  onClick={() => toggleTamanho(t)}
                />
              ))}
              {tamanhosSel
                .filter(t => !TAMANHOS_PADRAO.includes(t))
                .map(t => (
                  <Chip
                    key={t}
                    label={t}
                    selected
                    onClick={() => toggleTamanho(t)}
                  />
                ))}
            </div>
            <div className="flex gap-2 max-w-xs">
              <Input
                placeholder="Tamanho personalizado"
                value={tamanhoCustom}
                onChange={e => setTamanhoCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adicionarTamanhoCustom()}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={adicionarTamanhoCustom}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Cores */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Cores</p>
            <div className="flex flex-wrap gap-2">
              {CORES_SUGERIDAS.map(c => (
                <Chip
                  key={c}
                  label={c}
                  selected={coresSel.includes(c)}
                  onClick={() => toggleCor(c)}
                  color={corHex(c)}
                />
              ))}
              {coresSel
                .filter(c => !CORES_SUGERIDAS.includes(c))
                .map(c => (
                  <Chip
                    key={c}
                    label={c}
                    selected
                    onClick={() => toggleCor(c)}
                    color={corHex(c)}
                  />
                ))}
            </div>
            <div className="flex gap-2 max-w-xs">
              <Input
                placeholder="Outra cor..."
                value={corInput}
                onChange={e => setCorInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adicionarCor()}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={adicionarCor}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Numeração */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Numeração</p>
            <div className="flex flex-wrap gap-2">
              {NUMERACOES_SUGERIDAS.map(n => (
                <Chip
                  key={n}
                  label={n}
                  selected={numSel.includes(n)}
                  onClick={() => toggleNum(n)}
                />
              ))}
              {numSel
                .filter(n => !NUMERACOES_SUGERIDAS.includes(n))
                .map(n => (
                  <Chip key={n} label={n} selected onClick={() => toggleNum(n)} />
                ))}
            </div>
            <div className="flex gap-2 max-w-xs">
              <Input
                placeholder="Outro número..."
                value={numInput}
                onChange={e => setNumInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adicionarNum()}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={adicionarNum}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-sm font-medium">
                Serão geradas <span className="text-primary">{preview.length}</span> variações:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preview.slice(0, 20).map((combo, i) => (
                  <span
                    key={i}
                    className="text-xs bg-background border rounded px-2 py-0.5 text-muted-foreground"
                  >
                    {Object.values(combo).join(' / ')}
                  </span>
                ))}
                {preview.length > 20 && (
                  <span className="text-xs text-muted-foreground">
                    +{preview.length - 20} mais...
                  </span>
                )}
              </div>
            </div>
          )}

          <Button onClick={handleGerar} disabled={gerando || preview.length === 0}>
            {gerando ? 'Gerando...' : 'Gerar Variações'}
          </Button>
        </CardContent>
      </Card>

      {/* ── SEÇÃO 2: Tabela de variações ── */}
      {!loading && variacoes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Variações cadastradas ({variacoes.length})
            </CardTitle>
            {temEdicoes && (
              <Button size="sm" onClick={salvarAlteracoes} disabled={salvando}>
                <Save className="h-4 w-4 mr-1.5" />
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Atributos</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Preço</th>
                    <th className="px-3 py-2 text-left">Custo</th>
                    <th className="px-3 py-2 text-center">Estoque</th>
                    <th className="px-3 py-2 text-center">Mín.</th>
                    <th className="px-3 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {variacoes.map(variacao => {
                    const estoque = Number(valorEdicao(variacao, 'stock') ?? 0);
                    const estoqueMin = Number(valorEdicao(variacao, 'minimum_stock') ?? 0);
                    const preco = valorEdicao(variacao, 'price');
                    const precoCusto = valorEdicao(variacao, 'preco_custo');
                    const baixoEstoque = estoque <= estoqueMin;

                    return (
                      <tr key={variacao.id} className="border-b last:border-0 hover:bg-muted/20">

                        {/* Atributos */}
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(variacao.atributos).map(([k, v]) => {
                              const hex = corHex(v);
                              return (
                                <Badge
                                  key={k}
                                  variant="secondary"
                                  className="text-xs gap-1"
                                  style={
                                    hex
                                      ? {
                                          backgroundColor: hex + '22',
                                          borderColor: hex + '66',
                                          color: hex === '#FFFFFF' ? '#374151' : hex,
                                        }
                                      : {}
                                  }
                                >
                                  {hex && (
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0 border border-black/10"
                                      style={{ backgroundColor: hex }}
                                    />
                                  )}
                                  {v}
                                </Badge>
                              );
                            })}
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-3 py-2">
                          <Input
                            value={(valorEdicao(variacao, 'sku') as string) ?? ''}
                            onChange={e => editarCampo(variacao.id, 'sku', e.target.value)}
                            className="h-7 w-28 text-xs"
                          />
                        </td>

                        {/* Preço */}
                        <td className="px-3 py-2">
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              R$
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={preco ?? ''}
                              onChange={e =>
                                editarCampo(variacao.id, 'price', parseFloat(e.target.value))
                              }
                              className={`h-7 pl-7 text-xs ${
                                preco !== precoBase ? 'text-primary font-semibold' : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Preço Custo */}
                        <td className="px-3 py-2">
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              R$
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={precoCusto ?? ''}
                              onChange={e =>
                                editarCampo(variacao.id, 'preco_custo', parseFloat(e.target.value))
                              }
                              className={`h-7 pl-7 text-xs ${
                                precoCusto !== precoCustoBase
                                  ? 'text-primary font-semibold'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Estoque */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                editarCampo(variacao.id, 'stock', Math.max(0, estoque - 1))
                              }
                              className="w-6 h-6 rounded border text-xs hover:bg-muted flex items-center justify-center"
                            >
                              −
                            </button>
                            <Input
                              type="number"
                              value={estoque}
                              onChange={e =>
                                editarCampo(
                                  variacao.id,
                                  'stock',
                                  Math.max(0, parseInt(e.target.value) || 0)
                                )
                              }
                              className={`h-7 w-14 text-center text-xs ${
                                baixoEstoque ? 'text-red-600 font-semibold border-red-300' : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                editarCampo(variacao.id, 'stock', estoque + 1)
                              }
                              className="w-6 h-6 rounded border text-xs hover:bg-muted flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Estoque mínimo */}
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={estoqueMin}
                            onChange={e =>
                              editarCampo(
                                variacao.id,
                                'minimum_stock',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-14 text-center text-xs mx-auto"
                          />
                        </td>

                        {/* Ações */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => excluirVariacao(variacao.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <span>
                Estoque total:{' '}
                <span className="font-semibold text-foreground">{estoqueTotal} unidades</span>
              </span>
              <span>
                Variações sem estoque:{' '}
                <span className={`font-semibold ${semEstoque > 0 ? 'text-red-500' : 'text-foreground'}`}>
                  {semEstoque}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
