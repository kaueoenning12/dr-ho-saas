import { useState } from "react";
import { MoreHorizontal, FilePenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateDocument, useDeleteDocument } from "@/hooks/useDocumentsQuery";
import type { Database } from "@/integrations/supabase/types";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";

type DbDocument = Database["public"]["Tables"]["documents"]["Row"];

interface DocumentActionsDropdownProps {
  document: DbDocument;
  onSuccess?: () => void;
}

export function DocumentActionsDropdown({ document, onSuccess }: DocumentActionsDropdownProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [title, setTitle] = useState(document.title ?? "");
  const [description, setDescription] = useState(document.description ?? "");
  const [category, setCategory] = useState<string>(document.category ?? DOCUMENT_CATEGORIES[1]);
  const [keywords, setKeywords] = useState(
    Array.isArray(document.keywords) ? (document.keywords as string[]).join(", ") : ""
  );
  const [isPremium, setIsPremium] = useState<boolean>(document.is_premium ?? false);
  const [isPublished, setIsPublished] = useState<boolean>(document.is_published ?? true);

  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  const handleSave = () => {
    const updates: Partial<DbDocument> = {
      title,
      description,
      category,
      keywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      is_premium: isPremium,
      is_published: isPublished,
    };

    updateDocument.mutate(
      { id: document.id, updates },
      {
        onSuccess: () => {
          setEditOpen(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleDelete = () => {
    deleteDocument.mutate(document.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onSuccess?.();
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditOpen(true); }}>
            <FilePenLine className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do relatório"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do relatório"
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES
                    .filter((c) => c !== "Todas")
                    .map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Palavras-chave (separadas por vírgula)
              </label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Ex: nr-01, riscos, segurança"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isPremium}
                  onCheckedChange={(checked) => setIsPremium(!!checked)}
                />
                <span className="text-sm text-foreground">Relatório premium</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(!!checked)}
                />
                <span className="text-sm text-foreground">Publicado</span>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={updateDocument.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateDocument.isPending}
            >
              {updateDocument.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o relatório{" "}
              <span className="font-semibold text-foreground">"{document.title}"</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDocument.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteDocument.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


