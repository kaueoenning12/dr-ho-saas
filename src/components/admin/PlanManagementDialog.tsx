import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const planSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  features: z.string().min(1, "Features são obrigatórias"),
});

type FormData = z.infer<typeof planSchema>;

interface PlanManagementDialogProps {
  plan?: any; // For editing
  onSuccess?: () => void;
}

export function PlanManagementDialog({ plan, onSuccess }: PlanManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!plan;
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(planSchema),
    defaultValues: plan ? {
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      features: Array.isArray(plan.features) ? plan.features.join('\n') : plan.features,
    } : {
      name: "",
      description: "",
      price: "",
      features: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      console.log("🔵 [ADMIN] Salvando plano:", data.name);

      const featuresArray = data.features.split('\n').map(f => f.trim()).filter(Boolean);
      const planData = {
        name: data.name,
        description: data.description || null,
        price: parseFloat(data.price),
        features: JSON.stringify(featuresArray),
        is_active: true,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", plan.id);
        
        if (error) throw error;
        toast.success("Plano atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert(planData);
        
        if (error) throw error;
        toast.success("Plano criado com sucesso!");
      }

      reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("❌ [ADMIN] Erro ao salvar plano:", error);
      toast.error(error.message || "Erro ao salvar plano");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="sm">Editar</Button>
        ) : (
          <Button className="bg-gradient-brand hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Criar Plano
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Plano" : "Criar Novo Plano"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Plano</Label>
            <Input {...register("name")} placeholder="Ex: Premium, Enterprise" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea {...register("description")} placeholder="Breve descrição do plano" rows={2} />
          </div>
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input {...register("price")} type="number" step="0.01" placeholder="29.90" />
            {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
          </div>
          <div>
            <Label htmlFor="features">Features (uma por linha)</Label>
            <Textarea 
              {...register("features")} 
              placeholder="Acesso ilimitado&#10;Download de documentos&#10;Suporte prioritário" 
              rows={6}
            />
            {errors.features && <p className="text-sm text-red-500">{errors.features.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Plano"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

