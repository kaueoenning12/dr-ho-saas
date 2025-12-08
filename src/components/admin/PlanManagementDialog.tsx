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
import { useQueryClient } from "@tanstack/react-query";

const planSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  features: z.string().min(1, "Features são obrigatórias"),
  stripe_product_id: z.string().optional().refine(
    (val) => !val || val.startsWith('prod_'),
    "Formato inválido. Deve começar com prod_"
  ),
  stripe_price_id: z.string().optional().refine(
    (val) => !val || val.startsWith('price_'),
    "Formato inválido. Deve começar com price_"
  ),
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
  const queryClient = useQueryClient();
  
  // Parse features from different possible formats
  const parseFeatures = (features: any): string => {
    if (!features) return "";
    if (Array.isArray(features)) {
      return features.join('\n');
    }
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        if (Array.isArray(parsed)) {
          return parsed.join('\n');
        }
        return features;
      } catch {
        return features;
      }
    }
    return "";
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(planSchema),
    defaultValues: plan ? {
      name: plan.name || "",
      description: plan.description || "",
      price: plan.price?.toString() || "0",
      features: parseFeatures(plan.features),
      stripe_product_id: plan.stripe_product_id || "",
      stripe_price_id: plan.stripe_price_id || "",
    } : {
      name: "",
      description: "",
      price: "",
      features: "",
      stripe_product_id: "",
      stripe_price_id: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      console.log("🔵 [ADMIN] Salvando plano:", {
        name: data.name,
        isEditing,
        planId: plan?.id,
        hasProductId: !!data.stripe_product_id,
        hasPriceId: !!data.stripe_price_id,
      });

      const featuresArray = data.features.split('\n').map(f => f.trim()).filter(Boolean);
      const planData: any = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: parseFloat(data.price),
        features: JSON.stringify(featuresArray),
        stripe_product_id: data.stripe_product_id?.trim() || null,
        stripe_price_id: data.stripe_price_id?.trim() || null,
      };

      // Log detalhado do que está sendo enviado ao banco
      console.log("📤 [ADMIN] Dados que serão salvos no banco:", {
        isEditing,
        planId: plan?.id,
        stripe_product_id_ENVIADO: planData.stripe_product_id || 'NULL/VAZIO',
        stripe_price_id_ENVIADO: planData.stripe_price_id || 'NULL/VAZIO',
        stripe_product_id_TIPO: typeof planData.stripe_product_id,
        stripe_price_id_TIPO: typeof planData.stripe_price_id,
        stripe_product_id_LENGTH: planData.stripe_product_id?.length || 0,
        stripe_price_id_LENGTH: planData.stripe_price_id?.length || 0,
        dadosCompletos: {
          ...planData,
          stripe_product_id: planData.stripe_product_id || null,
          stripe_price_id: planData.stripe_price_id || null,
        },
        timestamp: new Date().toISOString(),
      });

      // Só atualizar is_active se for criação (ao editar, manter o valor atual)
      if (!isEditing) {
        planData.is_active = true;
      }

      if (isEditing) {
        console.log("🔄 [ADMIN] Atualizando plano:", plan.id);
        const { data: updatedPlan, error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", plan.id)
          .select()
          .single();
        
        if (error) {
          console.error("❌ [ADMIN] Erro ao atualizar plano:", error);
          throw new Error(error.message || "Erro ao atualizar plano. Verifique se você tem permissões de administrador.");
        }

        console.log("✅ [ADMIN] Plano atualizado no banco:", {
          id: updatedPlan?.id,
          name: updatedPlan?.name,
          stripe_product_id: updatedPlan?.stripe_product_id || 'NULL',
          stripe_price_id: updatedPlan?.stripe_price_id || 'NULL',
          price: updatedPlan?.price,
          timestamp: new Date().toISOString(),
        });

        // Verificar se os valores foram salvos corretamente
        if (planData.stripe_price_id && updatedPlan?.stripe_price_id !== planData.stripe_price_id) {
          console.error("❌ [ADMIN] DISCREPÂNCIA: Price ID não foi salvo corretamente!", {
            enviado: planData.stripe_price_id,
            retornado: updatedPlan?.stripe_price_id,
          });
          toast.warning("Plano atualizado, mas houve uma discrepância no Price ID. Verifique no banco de dados.");
        } else if (planData.stripe_product_id && updatedPlan?.stripe_product_id !== planData.stripe_product_id) {
          console.error("❌ [ADMIN] DISCREPÂNCIA: Product ID não foi salvo corretamente!", {
            enviado: planData.stripe_product_id,
            retornado: updatedPlan?.stripe_product_id,
          });
          toast.warning("Plano atualizado, mas houve uma discrepância no Product ID. Verifique no banco de dados.");
        } else {
          toast.success("Plano atualizado com sucesso!");
        }
        
        // Invalidar cache do React Query para forçar refetch nos próximos acessos
        console.log("🔄 [ADMIN] Invalidando cache do React Query para planos (após atualização)");
        queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      } else {
        console.log("➕ [ADMIN] Criando novo plano");
        const { data: newPlan, error } = await supabase
          .from("subscription_plans")
          .insert(planData)
          .select()
          .single();
        
        if (error) {
          console.error("❌ [ADMIN] Erro ao criar plano:", error);
          throw new Error(error.message || "Erro ao criar plano. Verifique se você tem permissões de administrador.");
        }

        console.log("✅ [ADMIN] Plano criado no banco:", {
          id: newPlan?.id,
          name: newPlan?.name,
          stripe_product_id: newPlan?.stripe_product_id || 'NULL',
          stripe_price_id: newPlan?.stripe_price_id || 'NULL',
          price: newPlan?.price,
          timestamp: new Date().toISOString(),
        });

        // Verificar se os valores foram salvos corretamente
        if (planData.stripe_price_id && newPlan?.stripe_price_id !== planData.stripe_price_id) {
          console.error("❌ [ADMIN] DISCREPÂNCIA: Price ID não foi salvo corretamente!", {
            enviado: planData.stripe_price_id,
            retornado: newPlan?.stripe_price_id,
          });
          toast.warning("Plano criado, mas houve uma discrepância no Price ID. Verifique no banco de dados.");
        } else if (planData.stripe_product_id && newPlan?.stripe_product_id !== planData.stripe_product_id) {
          console.error("❌ [ADMIN] DISCREPÂNCIA: Product ID não foi salvo corretamente!", {
            enviado: planData.stripe_product_id,
            retornado: newPlan?.stripe_product_id,
          });
          toast.warning("Plano criado, mas houve uma discrepância no Product ID. Verifique no banco de dados.");
        } else {
          toast.success("Plano criado com sucesso!");
        }
        
        // Invalidar cache do React Query para forçar refetch nos próximos acessos
        console.log("🔄 [ADMIN] Invalidando cache do React Query para planos");
        queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      }

      reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("❌ [ADMIN] Erro ao salvar plano:", error);
      const errorMessage = error.message || "Erro ao salvar plano. Por favor, tente novamente.";
      toast.error(errorMessage);
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
              placeholder="Acesso ilimitado&#10;Download de relatórios&#10;Suporte prioritário" 
              rows={6}
            />
            {errors.features && <p className="text-sm text-red-500">{errors.features.message}</p>}
          </div>
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Configurações Stripe</h3>
            <div>
              <Label htmlFor="stripe_product_id">Stripe Product ID (Opcional)</Label>
              <Input 
                {...register("stripe_product_id")} 
                placeholder="prod_..." 
              />
              {errors.stripe_product_id && <p className="text-sm text-red-500">{errors.stripe_product_id.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                ID do produto no Stripe (formato: prod_xxxxx)
              </p>
            </div>
            <div>
              <Label htmlFor="stripe_price_id">Stripe Price ID (Opcional)</Label>
              <Input 
                {...register("stripe_price_id")} 
                placeholder="price_..." 
              />
              {errors.stripe_price_id && <p className="text-sm text-red-500">{errors.stripe_price_id.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                ID do preço no Stripe (formato: price_xxxxx)
              </p>
            </div>
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

