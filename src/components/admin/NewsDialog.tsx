import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit } from "lucide-react";
import { News } from "@/hooks/useNewsQuery";
import { useCreateNews, useUpdateNews } from "@/hooks/useNewsQuery";

interface NewsDialogProps {
  news?: News;
  onSuccess?: () => void;
}

export function NewsDialog({ news, onSuccess }: NewsDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    is_published: true,
  });

  const createMutation = useCreateNews();
  const updateMutation = useUpdateNews();

  useEffect(() => {
    if (news) {
      setFormData({
        title: news.title,
        description: news.description,
        date: news.date.split("T")[0],
        is_published: news.is_published,
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      setFormData({
        title: "",
        description: "",
        date: today,
        is_published: true,
      });
    }
  }, [news, open]);

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.date) {
      return;
    }

    const newsData = {
      ...formData,
      date: new Date(formData.date).toISOString(),
    };

    if (news) {
      updateMutation.mutate(
        {
          id: news.id,
          updates: newsData,
        },
        {
          onSuccess: () => {
            setOpen(false);
            onSuccess?.();
          },
        }
      );
    } else {
      createMutation.mutate(newsData, {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
      });
    }
  };

  const isEditing = !!news;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-gradient-brand hover:opacity-90 text-navy shadow-cyan h-10 px-4 rounded-xl font-medium text-[14px]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Novidade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[18px]">
            {isEditing ? "Editar Novidade" : "Criar Nova Novidade"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[14px]">
            {isEditing
              ? "Edite as informações da novidade"
              : "Crie uma nova novidade para exibir na tela inicial"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground font-medium">
              Título
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Digite o título da novidade"
              className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground font-medium">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Digite a descrição da novidade"
              rows={3}
              className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date" className="text-foreground font-medium">
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.title ||
              !formData.description ||
              !formData.date ||
              createMutation.isPending ||
              updateMutation.isPending
            }
            className="bg-gradient-brand hover:opacity-90 text-navy"
          >
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

