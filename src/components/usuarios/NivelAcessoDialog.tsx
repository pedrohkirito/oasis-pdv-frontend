import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldCheck } from 'lucide-react';
import { MODULOS_SISTEMA, type NivelAcesso, type NivelAcessoInput, type PermissaoModulo } from '@/hooks/useNiveisAcesso';

interface NivelAcessoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nivel?: NivelAcesso | null;
  onSave: (input: NivelAcessoInput) => Promise<boolean | string | null>;
}

function buildInitialPermissoes(existing?: PermissaoModulo[]): PermissaoModulo[] {
  return MODULOS_SISTEMA.map(m => {
    const found = existing?.find(p => p.modulo === m.id);
    return {
      modulo: m.id,
      can_view: found?.can_view ?? false,
      can_create: found?.can_create ?? false,
      can_edit: found?.can_edit ?? false,
      can_delete: found?.can_delete ?? false,
    };
  });
}

export function NivelAcessoDialog({ open, onOpenChange, nivel, onSave }: NivelAcessoDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [permissoes, setPermissoes] = useState<PermissaoModulo[]>(buildInitialPermissoes());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (nivel) {
        setNome(nivel.nome);
        setDescricao(nivel.descricao || '');
        setPermissoes(buildInitialPermissoes(nivel.permissoes));
      } else {
        setNome('');
        setDescricao('');
        setPermissoes(buildInitialPermissoes());
      }
    }
  }, [open, nivel]);

  const togglePermission = (modulo: string, field: keyof Omit<PermissaoModulo, 'modulo'>) => {
    setPermissoes(prev => {
      // Find children of this module
      const childIds = MODULOS_SISTEMA
        .filter(m => 'parent' in m && (m as any).parent === modulo)
        .map(m => m.id);

      return prev.map(p => {
        // Handle the toggled module itself
        if (p.modulo === modulo) {
          const updated = { ...p, [field]: !p[field] };
          if (field !== 'can_view' && updated[field]) {
            updated.can_view = true;
          }
          if (field === 'can_view' && !updated.can_view) {
            updated.can_create = false;
            updated.can_edit = false;
            updated.can_delete = false;
          }
          return updated;
        }
        // Cascade: if parent view is being disabled, disable children too
        if (field === 'can_view' && childIds.includes(p.modulo as any)) {
          const parentWillBeOff = !prev.find(x => x.modulo === modulo)![field];
          // parentWillBeOff means the parent was ON and is being toggled OFF
          if (!parentWillBeOff) {
            // parent is turning off
            return { ...p, can_view: false, can_create: false, can_edit: false, can_delete: false };
          }
        }
        return p;
      });
    });
  };

  const toggleAllView = (checked: boolean) => {
    setPermissoes(prev =>
      prev.map(p => ({
        ...p,
        can_view: checked,
        can_create: checked ? p.can_create : false,
        can_edit: checked ? p.can_edit : false,
        can_delete: checked ? p.can_delete : false,
      }))
    );
  };

  const toggleAllColumn = (field: 'can_create' | 'can_edit' | 'can_delete', checked: boolean) => {
    setPermissoes(prev =>
      prev.map(p => ({
        ...p,
        [field]: checked,
        can_view: checked ? true : p.can_view,
      }))
    );
  };

  const allChecked = (field: keyof Omit<PermissaoModulo, 'modulo'>) =>
    permissoes.every(p => p[field]);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const result = await onSave({ nome: nome.trim(), descricao: descricao.trim() || undefined, permissoes });
      if (result !== false && result !== null) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!nivel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {isEditing ? 'Editar Nível de Acesso' : 'Novo Nível de Acesso'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Edite o nome e as permissões deste nível de acesso.'
              : 'Defina um nome e selecione quais telas e ações este nível pode acessar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Supervisor, Auxiliar..."
                value={nome}
                onChange={e => setNome(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Breve descrição do nível"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Matriz de Permissões</Label>
            <ScrollArea className="h-[400px] border rounded-lg">
              <table className="w-full text-sm">
                 <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <tr className="border-b">
                    <th className="text-left px-3 py-2.5 font-medium">Módulo</th>
                    <th className="text-center px-2 py-2.5 font-medium w-24">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-destructive">Não Ver</span>
                        <Checkbox
                          checked={permissoes.every(p => !p.can_view)}
                          onCheckedChange={c => toggleAllView(!c)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <span>Ver</span>
                        <Checkbox
                          checked={allChecked('can_view')}
                          onCheckedChange={c => toggleAllView(!!c)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <span>Criar</span>
                        <Checkbox
                          checked={allChecked('can_create')}
                          onCheckedChange={c => toggleAllColumn('can_create', !!c)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <span>Editar</span>
                        <Checkbox
                          checked={allChecked('can_edit')}
                          onCheckedChange={c => toggleAllColumn('can_edit', !!c)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    </th>
                    <th className="text-center px-2 py-2.5 font-medium w-20">
                      <div className="flex flex-col items-center gap-1">
                        <span>Excluir</span>
                        <Checkbox
                          checked={allChecked('can_delete')}
                          onCheckedChange={c => toggleAllColumn('can_delete', !!c)}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                {MODULOS_SISTEMA.map((modulo, idx) => {
                    const perm = permissoes.find(p => p.modulo === modulo.id)!;
                    const isBlocked = !perm.can_view;
                    const isChild = 'parent' in modulo;
                    // Check if parent is blocked (for child modules)
                    const parentPerm = isChild ? permissoes.find(p => p.modulo === (modulo as any).parent) : null;
                    const parentBlocked = parentPerm ? !parentPerm.can_view : false;
                    return (
                      <tr key={modulo.id} className={cn(
                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                        parentBlocked && isChild ? 'opacity-40' : ''
                      )}>
                        <td className={cn(
                          'px-3 py-2 font-medium',
                          isChild && 'pl-8 text-xs',
                          isBlocked ? 'text-muted-foreground line-through' : ''
                        )}>
                          {isChild && <span className="text-muted-foreground mr-1">└</span>}
                          {modulo.label}
                        </td>
                        <td className="text-center px-2 py-2">
                          <Checkbox
                            checked={isBlocked}
                            onCheckedChange={() => {
                              if (!isBlocked) {
                                togglePermission(modulo.id, 'can_view');
                              }
                            }}
                            disabled={parentBlocked && isChild}
                            className="border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                          />
                        </td>
                        <td className="text-center px-2 py-2">
                          <Checkbox
                            checked={perm.can_view}
                            onCheckedChange={() => togglePermission(modulo.id, 'can_view')}
                            disabled={parentBlocked && isChild}
                          />
                        </td>
                        <td className="text-center px-2 py-2">
                          <Checkbox
                            checked={perm.can_create}
                            onCheckedChange={() => togglePermission(modulo.id, 'can_create')}
                            disabled={(parentBlocked && isChild) || isChild}
                          />
                        </td>
                        <td className="text-center px-2 py-2">
                          <Checkbox
                            checked={perm.can_edit}
                            onCheckedChange={() => togglePermission(modulo.id, 'can_edit')}
                            disabled={(parentBlocked && isChild) || isChild}
                          />
                        </td>
                        <td className="text-center px-2 py-2">
                          <Checkbox
                            checked={perm.can_delete}
                            onCheckedChange={() => togglePermission(modulo.id, 'can_delete')}
                            disabled={(parentBlocked && isChild) || isChild}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !nome.trim()}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
            ) : isEditing ? 'Salvar Alterações' : 'Criar Nível'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
