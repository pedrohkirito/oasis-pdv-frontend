import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ShieldPlus, Pencil, Trash2, Loader2, ShieldCheck, Eye, PenLine, Plus, X } from 'lucide-react';
import { useNiveisAcesso, type NivelAcesso, type NivelAcessoInput, MODULOS_SISTEMA } from '@/hooks/useNiveisAcesso';
import { NivelAcessoDialog } from './NivelAcessoDialog';
import { Skeleton } from '@/components/ui/skeleton';

export function NiveisAcessoSection() {
  const { niveis, loading, createNivel, updateNivel, deleteNivel } = useNiveisAcesso();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNivel, setEditingNivel] = useState<NivelAcesso | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nivelToDelete, setNivelToDelete] = useState<NivelAcesso | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = () => {
    setEditingNivel(null);
    setDialogOpen(true);
  };

  const handleEdit = (nivel: NivelAcesso) => {
    setEditingNivel(nivel);
    setDialogOpen(true);
  };

  const handleSave = async (input: NivelAcessoInput) => {
    if (editingNivel) {
      return await updateNivel(editingNivel.id, input);
    } else {
      return await createNivel(input);
    }
  };

  const confirmDelete = (nivel: NivelAcesso) => {
    setNivelToDelete(nivel);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!nivelToDelete) return;
    setDeleting(true);
    await deleteNivel(nivelToDelete.id);
    setDeleting(false);
    setDeleteConfirmOpen(false);
    setNivelToDelete(null);
  };

  const getPermissoesSummary = (nivel: NivelAcesso) => {
    const totalModulos = MODULOS_SISTEMA.length;
    const modulosComAcesso = nivel.permissoes.filter(p => p.can_view).length;
    return `${modulosComAcesso}/${totalModulos} módulos`;
  };

  const getPermissaoIcons = (nivel: NivelAcesso) => {
    const hasView = nivel.permissoes.some(p => p.can_view);
    const hasCreate = nivel.permissoes.some(p => p.can_create);
    const hasEdit = nivel.permissoes.some(p => p.can_edit);
    const hasDelete = nivel.permissoes.some(p => p.can_delete);

    return (
      <div className="flex items-center gap-1.5">
        {hasView && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
            <Eye className="h-3 w-3" /> Ver
          </Badge>
        )}
        {hasCreate && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
            <Plus className="h-3 w-3" /> Criar
          </Badge>
        )}
        {hasEdit && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
            <PenLine className="h-3 w-3" /> Editar
          </Badge>
        )}
        {hasDelete && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
            <X className="h-3 w-3" /> Excluir
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Níveis de Acesso Customizados
              </CardTitle>
              <CardDescription>
                Crie níveis de acesso personalizados com permissões granulares por módulo
              </CardDescription>
            </div>
            <Button onClick={handleCreate} size="sm" className="gap-2">
              <ShieldPlus className="h-4 w-4" />
              Novo Nível
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {niveis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum nível customizado</p>
              <p className="text-sm">Os 4 níveis padrão (Admin, Gerente, Vendedor, Visualizador) estão em uso.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={handleCreate}>
                <ShieldPlus className="h-4 w-4" />
                Criar primeiro nível
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {niveis.map(nivel => (
                  <TableRow key={nivel.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {nivel.name}
                        {nivel.is_sistema && (
                          <Badge variant="secondary" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {nivel.descricao || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getPermissoesSummary(nivel)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getPermissaoIcons(nivel)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(nivel)}
                          disabled={nivel.is_sistema}
                          title={nivel.is_sistema ? 'Níveis do sistema não podem ser editados' : 'Editar'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(nivel)}
                          disabled={nivel.is_sistema}
                          title={nivel.is_sistema ? 'Níveis do sistema não podem ser excluídos' : 'Excluir'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NivelAcessoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nivel={editingNivel}
        onSave={handleSave}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nível de acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o nível <strong>"{nivelToDelete?.name}"</strong>?
              Usuários vinculados a este nível perderão suas permissões customizadas e voltarão ao nível padrão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
