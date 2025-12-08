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
import { useSubscriptionPlans } from "@/hooks/useSubscriptionsQuery";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const stripeConfigSchema = z.object({
  environment: z.enum(['test', 'live']),
  publishable_key: z.string().min(1, "Chave pública é obrigatória").regex(/^pk_(test|live)_/, "Formato inválido. Deve começar com pk_test_ ou pk_live_"),
  secret_key: z.string().min(1, "Chave secreta é obrigatória").regex(/^sk_(test|live)_/, "Formato inválido. Deve começar com sk_test_ ou sk_live_"),
  webhook_secret: z.string().optional().refine(
    (val) => !val || val.startsWith('whsec_'),
    "Formato inválido. Deve começar com whsec_"
  ),
  referenced_plan_id: z.string().optional(),
  default_product_id: z.string().optional().refine(
    (val) => !val || val.startsWith('prod_'),
    "Formato inválido. Deve começar com prod_"
  ),
  default_price_id: z.string().optional().refine(
    (val) => !val || val.startsWith('price_'),
    "Formato inválido. Deve começar com price_"
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
  const { data: plans = [] } = useSubscriptionPlans();
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(stripeConfigSchema),
    defaultValues: config ? {
      environment: config.environment,
      publishable_key: config.publishable_key,
      secret_key: config.secret_key,
      webhook_secret: config.webhook_secret || "",
      referenced_plan_id: config.referenced_plan_id || "",
      default_product_id: config.default_product_id || "",
      default_price_id: config.default_price_id || "",
      is_active: config.is_active,
    } : {
      environment: 'test',
      publishable_key: "",
      secret_key: "",
      webhook_secret: "",
      referenced_plan_id: "",
      default_product_id: "",
      default_price_id: "",
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

      const configData = {
        environment: data.environment,
        publishable_key: data.publishable_key.trim(),
        secret_key: data.secret_key.trim(),
        webhook_secret: data.webhook_secret?.trim() || null,
        referenced_plan_id: data.referenced_plan_id?.trim() || null,
        default_product_id: data.default_product_id?.trim() || null,
        default_price_id: data.default_price_id?.trim() || null,
        is_active: data.is_active,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: config.id, updates: configData });
      } else {
        await createMutation.mutateAsync(configData);
      }

      // O trigger do banco de dados irá sincronizar automaticamente quando:
      // - is_active for ativado
      // - default_product_id ou default_price_id mudarem
      // A sincronização será feita apenas no plano referenciado (se houver)
      if (data.is_active) {
        if (data.referenced_plan_id) {
          const selectedPlan = plans.find(p => p.id === data.referenced_plan_id);
          toast.success(
            `Configuração salva e ativada! O plano "${selectedPlan?.name || 'selecionado'}" será sincronizado automaticamente.`
          );
          // Invalidar queries de planos para refetch automático
          queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
        } else {
          toast.success("Configuração salva e ativada! Nenhum plano será sincronizado (nenhum plano foi selecionado).");
        }
      } else {
        toast.success("Configuração salva com sucesso!");
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
              <strong>O que faz:</strong> Usada no frontend para inicializar o Stripe e criar sessões de checkout. Pode ser exposta publicamente. Formato: pk_test_... ou pk_live_...
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
              <strong>O que faz:</strong> Usada nas edge functions para operações no servidor (criar checkout, gerenciar assinaturas, processar webhooks). Deve ser mantida segura. Formato: sk_test_... ou sk_live_...
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
              <strong>O que faz:</strong> Usado para validar que os eventos recebidos realmente vêm do Stripe, garantindo segurança nos webhooks. Obtido após configurar o endpoint de webhook no Stripe. Formato: whsec_...
            </p>
          </div>

          <div>
            <Label htmlFor="referenced_plan_id">Plano Referenciado (Opcional)</Label>
            <select
              {...register("referenced_plan_id")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Nenhum</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {plan.price.toFixed(2)}
                </option>
              ))}
            </select>
            {errors.referenced_plan_id && <p className="text-sm text-red-500">{errors.referenced_plan_id.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              <strong>O que faz:</strong> Define qual plano de assinatura receberá os Product ID e Price ID configurados abaixo. Se deixar vazio (Nenhum), nenhum plano será sincronizado automaticamente.
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
              <strong>O que faz:</strong> ID do produto no Stripe que representa o serviço/plano. Quando você ativar esta configuração, este ID será sincronizado automaticamente para o campo "Stripe Product ID" do plano referenciado acima. Formato: prod_xxxxx
            </p>
          </div>

          <div>
            <Label htmlFor="default_price_id">Price ID Padrão (Opcional)</Label>
            <Input 
              {...register("default_price_id")} 
              placeholder="price_..." 
            />
            {errors.default_price_id && <p className="text-sm text-red-500">{errors.default_price_id.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              <strong>O que faz:</strong> ID do preço no Stripe que define o valor e periodicidade (mensal, anual, etc.) do produto. Quando você ativar esta configuração, este ID será sincronizado automaticamente para o campo "Stripe Price ID" do plano referenciado acima. Formato: price_xxxxx
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

