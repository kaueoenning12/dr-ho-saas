import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { useStripeConfigs, useUpdateStripeConfig, useCreateStripeConfig } from "@/hooks/useStripeConfig";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const stripeConfigSchema = z.object({
  environment: z.enum(['test', 'live']),
  publishable_key: z.string().min(1, "Chave pública é obrigatória").regex(/^pk_(test|live)_/, "Formato inválido. Deve começar com pk_test_ ou pk_live_"),
  secret_key: z.string().min(1, "Chave secreta é obrigatória").regex(/^sk_(test|live)_/, "Formato inválido. Deve começar com sk_test_ ou sk_live_"),
  webhook_secret: z.string().optional().refine(
    (val) => !val || val.startsWith('whsec_'),
    "Formato inválido. Deve começar com whsec_"
  ),
  default_product_id: z.string().optional().refine(
    (val) => !val || val.startsWith('prod_'),
    "Formato inválido. Deve começar com prod_"
  ),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof stripeConfigSchema>;

interface StripeConfigDialogProps {
  config?: any; // For editing
  onSuccess?: () => void;
}

export function StripeConfigDialog({ config, onSuccess }: StripeConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!config;
  const { refetch } = useStripeConfigs();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(stripeConfigSchema),
    defaultValues: config ? {
      environment: config.environment,
      publishable_key: config.publishable_key,
      secret_key: config.secret_key,
      webhook_secret: config.webhook_secret || "",
      default_product_id: config.default_product_id || "",
      is_active: config.is_active,
    } : {
      environment: 'test',
      publishable_key: "",
      secret_key: "",
      webhook_secret: "",
      default_product_id: "",
      is_active: false,
    },
  });

  const updateMutation = useUpdateStripeConfig();
  const createMutation = useCreateStripeConfig();

  const isActive = watch('is_active');
  const environment = watch('environment');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      console.log("🔵 [ADMIN] Salvando configuração Stripe:", data.environment);

      const newDefaultProductId = data.default_product_id?.trim() || null;
      const oldDefaultProductId = config?.default_product_id || null;
      const defaultProductIdChanged = newDefaultProductId !== oldDefaultProductId && newDefaultProductId !== null;

      const configData = {
        environment: data.environment,
        publishable_key: data.publishable_key.trim(),
        secret_key: data.secret_key.trim(),
        webhook_secret: data.webhook_secret?.trim() || null,
        default_product_id: newDefaultProductId,
        is_active: data.is_active,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: config.id, updates: configData });
      } else {
        await createMutation.mutateAsync(configData);
      }

      // Se default_product_id foi alterado e está ativo, atualizar planos que não têm stripe_product_id
      if (defaultProductIdChanged && data.is_active) {
        try {
          console.log("🔄 [ADMIN] Atualizando planos com default_product_id:", newDefaultProductId);
          
          // Primeiro, buscar planos que precisam ser atualizados
          const { data: plansToUpdate, error: fetchError } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("is_active", true)
            .or("stripe_product_id.is.null,stripe_product_id.eq.");

          if (fetchError) {
            console.error("❌ [ADMIN] Erro ao buscar planos:", fetchError);
            toast.warning("Configuração salva, mas houve um erro ao buscar planos. O trigger do banco tentará atualizar.");
          } else if (plansToUpdate && plansToUpdate.length > 0) {
            // Atualizar os planos encontrados
            const planIds = plansToUpdate.map(p => p.id);
            const { data: updatedPlans, error: updateError } = await supabase
              .from("subscription_plans")
              .update({ 
                stripe_product_id: newDefaultProductId,
                updated_at: new Date().toISOString()
              })
              .in("id", planIds)
              .select();

            if (updateError) {
              console.error("❌ [ADMIN] Erro ao atualizar planos:", updateError);
              toast.warning("Configuração salva, mas houve um erro ao atualizar os planos automaticamente. O trigger do banco tentará atualizar.");
            } else {
              const updatedCount = updatedPlans?.length || 0;
              console.log(`✅ [ADMIN] ${updatedCount} plano(s) atualizado(s) com product_id:`, newDefaultProductId);
              toast.success(`Configuração salva! ${updatedCount} plano(s) atualizado(s) automaticamente com o Product ID padrão.`);
              
              // Invalidar queries de planos para refetch automático
              queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
            }
          } else {
            console.log("ℹ️ [ADMIN] Nenhum plano precisa ser atualizado (todos já possuem product_id)");
            toast.success("Configuração salva! Todos os planos já possuem Product ID configurado.");
          }
        } catch (syncError: any) {
          console.error("❌ [ADMIN] Erro ao sincronizar planos:", syncError);
          toast.warning("Configuração salva, mas houve um erro ao sincronizar os planos. O trigger do banco tentará atualizar.");
        }
      }

      // Se está ativando esta configuração, desativar outras do mesmo ambiente
      if (data.is_active) {
        // Isso será feito via trigger ou manualmente
        // Por enquanto, apenas avisar o admin
        toast.info("Lembre-se: apenas uma configuração pode estar ativa por vez. Desative outras se necessário.");
      }

      reset();
      setOpen(false);
      refetch();
      onSuccess?.();
    } catch (error: any) {
      console.error("❌ [ADMIN] Erro ao salvar configuração Stripe:", error);
      toast.error(error.message || "Erro ao salvar configuração");
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
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurar Stripe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Configuração Stripe (${config.environment})` : "Nova Configuração Stripe"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="environment">Ambiente</Label>
            <select
              {...register("environment")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isEditing}
            >
              <option value="test">Test (Desenvolvimento)</option>
              <option value="live">Live (Produção)</option>
            </select>
            {errors.environment && <p className="text-sm text-red-500">{errors.environment.message}</p>}
          </div>

          <div>
            <Label htmlFor="publishable_key">Chave Pública (Publishable Key)</Label>
            <Input 
              {...register("publishable_key")} 
              type="password"
              placeholder={environment === 'test' ? 'pk_test_...' : 'pk_live_...'} 
            />
            {errors.publishable_key && <p className="text-sm text-red-500">{errors.publishable_key.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Formato: pk_test_... ou pk_live_...
            </p>
          </div>

          <div>
            <Label htmlFor="secret_key">Chave Secreta (Secret Key)</Label>
            <Input 
              {...register("secret_key")} 
              type="password"
              placeholder={environment === 'test' ? 'sk_test_...' : 'sk_live_...'} 
            />
            {errors.secret_key && <p className="text-sm text-red-500">{errors.secret_key.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Formato: sk_test_... ou sk_live_... (mantida segura no banco)
            </p>
          </div>

          <div>
            <Label htmlFor="webhook_secret">Webhook Secret (Opcional)</Label>
            <Input 
              {...register("webhook_secret")} 
              type="password"
              placeholder="whsec_..." 
            />
            {errors.webhook_secret && <p className="text-sm text-red-500">{errors.webhook_secret.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Formato: whsec_... (obtido após configurar webhook no Stripe)
            </p>
          </div>

          <div>
            <Label htmlFor="default_product_id">Product ID Padrão (Opcional)</Label>
            <Input 
              {...register("default_product_id")} 
              placeholder="prod_..." 
            />
            {errors.default_product_id && <p className="text-sm text-red-500">{errors.default_product_id.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Product ID padrão do Stripe (formato: prod_xxxxx). Usado como fallback se o plano não tiver stripe_product_id configurado.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Ativar esta configuração</Label>
              <p className="text-xs text-muted-foreground">
                Apenas uma configuração pode estar ativa por vez
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Configuração"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

