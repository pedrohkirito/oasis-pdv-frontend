import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Edit3, Save, X, Loader2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface CategoriaDB {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface GerenciarCategoriasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onCategoriasChange: () => void;
  /** Produtos e serviços têm categorias separadas na mesma tabela. */
  tipo?: 'produto' | 'servico';
}

const DEFAULT_COLORS = [
  '#8b5cf6', '#0ea5e9', '#ec4899', '#06b6d4', '#f59e0b',
  '#f97316', '#7c3aed', '#059669', '#10b981', '#6366f1',
  '#2563eb', '#84cc16', '#e11d48', '#14b8a6', '#f43f5e',
];

export const GerenciarCategoriasDialog: React.FC<GerenciarCategoriasDialogProps> = ({
  open,
  onOpenChange,
  empresaId,
  onCategoriasChange,
  tipo = 'produto',
}) => {
  const rotuloItens = tipo === 'servico' ? 'serviço(s)' : 'produto(s)';
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaDB[]>([]);
  const [produtoCount, setProdutoCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCor, setEditCor] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaCor, setNovaCor] = useState(DEFAULT_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchCategorias();
  }, [open, empresaId, tipo]);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await api
        .from('categorias_produto')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', tipo)
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);

      // Count products per category
      const { data: produtos } = await api
        .from('produtos')
        .select('categoria')
        .eq('empresa_id', empresaId)
        .eq('tipo', tipo);

      const counts: Record<string, number> = {};
      (produtos || []).forEach(p => {
        if (p.categoria) {
          counts[p.categoria] = (counts[p.categoria] || 0) + 1;
        }
      });
      setProdutoCount(counts);
    } catch {
      toast({ title: 'Erro ao carregar categorias', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!novaCategoria.trim()) return;
    setSaving(true);
    try {
      const { error } = await api.from('categorias_produto').insert({
        empresa_id: empresaId,
        nome: novaCategoria.trim(),
        cor: novaCor,
        tipo,
      });
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Categoria já existe', variant: 'destructive' });
        } else throw error;
        return;
      }
      setNovaCategoria('');
      setNovaCor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
      setAdding(false);
      fetchCategorias();
      onCategoriasChange();
      toast({ title: 'Categoria criada com sucesso' });
    } catch {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editNome.trim()) return;
    setSaving(true);
    try {
      const cat = categorias.find(c => c.id === id);
      const oldName = cat?.nome;

      const { error } = await api
        .from('categorias_produto')
        .update({ nome: editNome.trim(), cor: editCor })
        .eq('id', id);
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Já existe uma categoria com este nome', variant: 'destructive' });
        } else throw error;
        return;
      }

      // Update products with old category name
      if (oldName && oldName !== editNome.trim()) {
        await api
          .from('produtos')
          .update({ categoria: editNome.trim() })
          .eq('empresa_id', empresaId)
          .eq('tipo', tipo)
          .eq('categoria', oldName);
      }

      setEditingId(null);
      fetchCategorias();
      onCategoriasChange();
      toast({ title: 'Categoria atualizada' });
    } catch {
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (cat: CategoriaDB) => {
    try {
      const { error } = await api
        .from('categorias_produto')
        .update({ ativo: !cat.ativo })
        .eq('id', cat.id);
      if (error) throw error;
      fetchCategorias();
      onCategoriasChange();
      toast({ title: `Categoria ${!cat.ativo ? 'ativada' : 'desativada'}` });
    } catch {
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
    }
  };

  const handleDelete = async (cat: CategoriaDB) => {
    const count = produtoCount[cat.nome] || 0;
    if (count > 0) {
      toast({
        title: 'Não é possível excluir',
        description: `Existem ${count} ${rotuloItens} vinculado(s) a esta categoria.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const { error } = await api
        .from('categorias_produto')
        .delete()
        .eq('id', cat.id);
      if (error) throw error;
      fetchCategorias();
      onCategoriasChange();
      toast({ title: 'Categoria excluída' });
    } catch {
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' });
    }
  };

  const startEdit = (cat: CategoriaDB) => {
    setEditingId(cat.id);
    setEditNome(cat.nome);
    setEditCor(cat.cor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            categorias.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                  !cat.ativo && "opacity-60"
                )}
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      type="color"
                      value={editCor}
                      onChange={(e) => setEditCor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <Input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="h-8 flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleUpdate(cat.id)} disabled={saving}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: cat.cor }}
                    />
                    <span className="flex-1 text-sm font-medium">{cat.nome}</span>
                    <Badge variant="outline" className="text-xs">
                      {produtoCount[cat.nome] || 0} {rotuloItens}
                    </Badge>
                    <Switch
                      checked={cat.ativo}
                      onCheckedChange={() => handleToggleAtivo(cat)}
                      className="scale-75"
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEdit(cat)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteCategoriaButton cat={cat} produtoCount={produtoCount} onDelete={handleDelete} />
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <Separator />

        {adding ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={novaCor}
              onChange={(e) => setNovaCor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            />
            <Input
              placeholder="Nome da categoria"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              className="h-8 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <Button size="sm" onClick={handleAdd} disabled={saving || !novaCategoria.trim()}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNovaCategoria(''); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

function DeleteCategoriaButton({ cat, produtoCount, onDelete }: { cat: CategoriaDB; produtoCount: Record<string, number>; onDelete: (cat: CategoriaDB) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const disabled = (produtoCount[cat.nome] || 0) > 0;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-destructive hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
        disabled={disabled}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{cat.nome}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); onDelete(cat); }} className="border-border bg-background text-foreground hover:bg-accent">
              Sim, excluir
            </Button>
            <Button onClick={() => setConfirmOpen(false)}>
              Não, manter
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
