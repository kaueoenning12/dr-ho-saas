import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DocumentService } from "@/lib/services/documentService";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  keywords?: string[] | null;
  pdf_url?: string | null;
};

export function DocumentEditDialog({ doc, onSuccess }: { doc: Doc; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description || "");
  const [category, setCategory] = useState(doc.category);
  const [keywords, setKeywords] = useState((doc.keywords || []).join(", "));
  const [pdfUrl, setPdfUrl] = useState(doc.pdf_url || "");

  const handleSave = async () => {
    setLoading(true);
    try {
      await DocumentService.updateDocument(doc.id, {
        title,
        description: description || null,
        category,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        pdf_url: pdfUrl || null,
      });
      toast({ title: "Documento atualizado" });
      setOpen(false);
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar documento", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Editar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label className="text-sm">Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Palavras-chave (separadas por vírgula)</Label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">URL do PDF</Label>
            <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




