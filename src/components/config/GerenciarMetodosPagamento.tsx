import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MetodoPagamento {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
}

const METODOS_PADRAO = ['Dinheiro', 'PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito'];

export default function GerenciarMetodosPagamento({ onMetodosChange }: { onMetodosChange?: () => void }) {
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const [metodos, setMetodos] = useState<MetodoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  const fetchMetodos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    const { data, error } = await api
      .from('metodos_pagamento')
      .select('id, nome, tipo, ativo')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar métodos:', error);
      setMetodos([]);
    } else {
      setMetodos((data as MetodoPagamento[]) || []);
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetchMetodos();
  }, [fetchMetodos]);

  const seedDefaults = useCallback(async () => {
    if (!empresaId || metodos.length > 0) return;

    for (const nome of METODOS_PADRAO) {
      const tipo = nome.includes('Cartão') ? 'cartao' : nome.toLowerCase();
      await api.from('metodos_pagamento').insert({
        empresa_id: empresaId,
        nome,
        tipo,
        ativo: true,
      } as any);
    }
    fetchMetodos();
  }, [empresaId, metodos.length, fetchMetodos]);

  useEffect(() => {
    if (!loading && metodos.length === 0 && empresaId) {
      seedDefaults();
    }
  }, [loading, metodos.length, empresaId, seedDefaults]);

  const handleAdicionar = async () => {
    if (!empresaId || !novoNome.trim()) return;
    setAdicionando(true);

    const { error } = await api.from('metodos_pagamento').insert({
      empresa_id: empresaId,
      nome: novoNome.trim(),
      tipo: 'outro',
      ativo: true,
    } as any);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Método já existe', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Método adicionado!' });
      setNovoNome('');
      fetchMetodos();
      onMetodosChange?.();
    }
    setAdicionando(false);
  };

  const handleToggle = async (metodo: MetodoPagamento) => {
    const { error } = await api
      .from('metodos_pagamento')
      .update({ ativo: !metodo.ativo, updated_at: new Date().toISOString() } as any)
      .eq('id', metodo.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      setMetodos(prev => prev.map(m => m.id === metodo.id ? { ...m, ativo: !m.ativo } : m));
      onMetodosChange?.();
    }
  };

  const handleExcluir = async (metodo: MetodoPagamento) => {
    const { error } = await api
      .from('metodos_pagamento')
      .delete()
      .eq('id', metodo.id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Método excluído!' });
      setMetodos(prev => prev.filter(m => m.id !== metodo.id));
      onMetodosChange?.();
    }
  };

  const isPadrao = (nome: string) => METODOS_PADRAO.includes(nome);

  return (
    <Card data-state="static">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Métodos de Pagamento
        </CardTitle>
        <CardDescription>
          Cadastre, ative/desative ou exclua os métodos de pagamento disponíveis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar novo */}
        <div className="flex items-end gap-2 w-full">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Novo método</Label>
            <Input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Ex: Crediário, Cheque..."
              onKeyDown={e => e.key === 'Enter' && handleAdicionar()}
              className="w-full"
            />
          </div>
          <Button onClick={handleAdicionar} disabled={adicionando || !novoNome.trim()} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {metodos.map(metodo => (
              <div
                key={metodo.id}
                className={`flex items-center justify-between p-3 rounded-lg border border-border !transform-none !transition-none ${
                  metodo.ativo ? 'bg-card' : 'bg-muted/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{metodo.nome}</span>
                  {isPadrao(metodo.nome) && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">padrão</Badge>
                  )}
                  {!metodo.ativo && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">inativo</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggle(metodo)}
                    title={metodo.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {metodo.ativo ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir método?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir "{metodo.nome}"? Essa ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <Button variant="outline" onClick={() => handleExcluir(metodo)} className="border-border bg-background text-foreground hover:bg-accent">
                          Sim, excluir
                        </Button>
                        <AlertDialogCancel>Não, manter</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {metodos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum método cadastrado.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
