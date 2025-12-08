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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit } from "lucide-react";
import { HomeAnnouncement } from "@/types/database";
import {
  useCreateHomeAnnouncement,
  useUpdateHomeAnnouncement,
} from "@/hooks/useHomeAnnouncementsQuery";

interface HomeAnnouncementDialogProps {
  announcement?: HomeAnnouncement;
  onSuccess?: () => void;
}

export function HomeAnnouncementDialog({
  announcement,
  onSuccess,
}: HomeAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
    order: 1,
    is_published: true,
  });

  const createMutation = useCreateHomeAnnouncement();
  const updateMutation = useUpdateHomeAnnouncement();

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        order: announcement.order,
        is_published: announcement.is_published,
      });
    } else {
      setFormData({
        title: "",
        content: "",
        priority: "medium",
        order: 1,
        is_published: true,
      });
    }
  }, [announcement, open]);

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      return;
    }

    if (announcement) {
      updateMutation.mutate(
        {
          id: announcement.id,
          updates: formData,
        },
        {
          onSuccess: () => {
            setOpen(false);
            onSuccess?.();
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
      });
    }
  };

  const isEditing = !!announcement;

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
            Novo Aviso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[18px]">
            {isEditing ? "Editar Aviso da Home" : "Criar Novo Aviso da Home"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[14px]">
            {isEditing
              ? "Edite as informações do aviso"
              : "Crie um novo aviso para exibir na tela inicial"}
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
              placeholder="Digite o título do aviso"
              className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content" className="text-foreground font-medium">
              Conteúdo
            </Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Digite o conteúdo do aviso"
              rows={5}
              className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-foreground font-medium">
                Prioridade
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger className="border-cyan/20 focus:ring-cyan/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order" className="text-foreground font-medium">
                Ordem
              </Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order: parseInt(e.target.value) || 1,
                  })
                }
                className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan"
                min="1"
              />
            </div>
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
              !formData.content ||
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

