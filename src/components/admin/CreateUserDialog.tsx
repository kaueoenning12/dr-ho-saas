import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const userSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  role: z.enum(["user", "admin"]),
});

type FormData = z.infer<typeof userSchema>;

export function CreateUserDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "user" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      console.log("🔵 [ADMIN] Criando usuário:", data.email);

      // 1. Criar usuário com signUp normal
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name },
          emailRedirectTo: undefined,
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não foi criado");

      console.log("✅ [ADMIN] Usuário criado:", authData.user.id);

      // 2. Aguardar trigger criar profile e role padrão
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Atualizar role se for admin
      if (data.role === "admin") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: "admin" })
          .eq("user_id", authData.user.id);

        if (roleError) {
          console.error("⚠️ [ADMIN] Erro ao atualizar role:", roleError);
          toast.warning("Usuário criado mas role não foi atualizado");
        }
      }

      // 4. Criar subscription padrão se não existir
      const { error: subError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: authData.user.id,
          plan_id: null,
          status: "active",
        });

      if (subError) console.error("⚠️ [ADMIN] Erro ao criar subscription:", subError);

      toast.success(`Usuário ${data.email} criado com sucesso!`);
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("❌ [ADMIN] Erro ao criar usuário:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-brand hover:opacity-90">
          <UserPlus className="h-4 w-4 mr-2" />
          Criar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input {...register("email")} type="email" />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input {...register("password")} type="password" />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="role">Função</Label>
            <Select onValueChange={(value) => setValue("role", value as any)} defaultValue="user">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
