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
import { Event } from "@/types/database";
import { useCreateEvent, useUpdateEvent } from "@/hooks/useEventsQuery";

interface EventDialogProps {
  event?: Event;
  onSuccess?: () => void;
}

export function EventDialog({ event, onSuccess }: EventDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    is_published: true,
  });

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        is_published: event.is_published,
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      setFormData({
        title: "",
        description: "",
        event_date: today,
        is_published: true,
      });
    }
  }, [event, open]);

  const handleSubmit = () => {
    if (!formData.title || !formData.event_date) {
      return;
    }

    if (event) {
      updateMutation.mutate(
        {
          id: event.id,
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

  const isEditing = !!event;

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
            Novo Evento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[18px]">
            {isEditing ? "Editar Evento" : "Criar Novo Evento"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-[14px]">
            {isEditing
              ? "Edite as informações do evento"
              : "Crie um novo evento para exibir na tela inicial"}
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
              placeholder="Digite o título do evento"
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
              placeholder="Digite a descrição do evento"
              rows={3}
              className="border-cyan/20 focus-visible:ring-cyan/20 focus-visible:border-cyan resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_date" className="text-foreground font-medium">
              Data do Evento
            </Label>
            <Input
              id="event_date"
              type="date"
              value={formData.event_date}
              onChange={(e) =>
                setFormData({ ...formData, event_date: e.target.value })
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
              !formData.event_date ||
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

