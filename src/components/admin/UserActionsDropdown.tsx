import { MoreHorizontal, UserCog, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserActionsDropdownProps {
  userId: string;
  userName: string;
  currentRole: AppRole;
  onSuccess?: () => void;
}

export function UserActionsDropdown({ 
  userId, 
  userName, 
  currentRole, 
  onSuccess 
}: UserActionsDropdownProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleRole = async () => {
    setLoading(true);
    try {
      const newRole: AppRole = currentRole === "admin" ? "user" : "admin";
      
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(`Role de ${userName} alterado para ${newRole === "admin" ? "Administrador" : "Usuário"}`);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao alterar role: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Delete user roles first
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Delete profile (cascades to subscriptions)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast.success(`Usuário ${userName} deletado com sucesso`);
      setShowDeleteDialog(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao deletar usuário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleRole} disabled={loading}>
            <UserCog className="h-4 w-4 mr-2" />
            {currentRole === "admin" ? "Tornar Usuário" : "Tornar Admin"}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)} 
            disabled={loading}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar Usuário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o usuário <strong>{userName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

