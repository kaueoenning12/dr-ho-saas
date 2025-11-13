import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DocumentService } from "@/lib/services/documentService";
import { DocumentEditDialog } from "./DocumentEditDialog";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  keywords?: string[] | null;
  pdf_url?: string | null;
  is_published?: boolean;
};

export function DocumentActions({ doc, onChanged }: { doc: Doc; onChanged: () => void }) {
  const { toast } = useToast();
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await DocumentService.deleteDocument(doc.id);
      toast({ title: "Documento removido" });
      setOpenDelete(false);
      onChanged();
    } catch (e: any) {
      toast({ title: "Erro ao remover documento", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DocumentEditDialog doc={doc} onSuccess={onChanged} />
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">Remover</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover "{doc.title}"? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDelete(false)} disabled={loading}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? "Removendo..." : "Remover"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




