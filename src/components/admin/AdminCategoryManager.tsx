import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDocumentCategories, useCreateDocumentCategory, useUpdateDocumentCategory, useDeleteDocumentCategory } from "@/hooks/useDocumentCategories";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AdminCategoryManager() {
  const { data: categories = [], isLoading } = useDocumentCategories();
  const createCategory = useCreateDocumentCategory();
  const updateCategory = useUpdateDocumentCategory();
  const deleteCategory = useDeleteDocumentCategory();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newCategoryName.trim()) return;
    createCategory.mutate(newCategoryName, {
      onSuccess: () => setNewCategoryName(""),
    });
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateCategory.mutate(
      { id: editingId, name: editingName },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingName("");
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    deleteCategory.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  return (
    <Card className="mt-6 border border-cyan/10 shadow-elegant">
      <CardHeader className="px-4 sm:px-6 py-4 border-b border-cyan/10">
        <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
          Categorias de Relatórios
        </CardTitle>
        <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
          Crie, renomeie e remova categorias usadas para organizar os relatórios.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Input
            placeholder="Nova categoria (ex: Procedimentos)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="h-10 text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={!newCategoryName.trim() || createCategory.isPending}
            className="h-10 gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando categorias...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-3 py-2 rounded-md border border-cyan/10 hover:bg-cyan/5 transition-colors"
              >
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateCategory.isPending || !editingName.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(cat.id, cat.name || "")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600"
                        onClick={() => setDeleteId(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta categoria? Categorias em uso por relatórios não poderão ser removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCategory.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteCategory.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCategory.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}


