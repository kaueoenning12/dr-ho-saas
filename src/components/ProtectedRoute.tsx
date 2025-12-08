import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { SubscriptionRequired } from "@/pages/SubscriptionRequired";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requireSubscription?: boolean;
}

export function ProtectedRoute({ 
  children, 
  adminOnly = false, 
  requireSubscription = true 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasAccess, subscription, isLoading: subscriptionLoading, redirectTo } = useSubscriptionCheck();
  
  // OTIMIZAÇÃO: Renderização otimista - só bloquear se realmente não temos dados do usuário
  // Se temos user, permitir renderização mesmo que ainda esteja carregando dados em background
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se temos user, não bloquear por subscription loading (subscription check é rápido e não crítico)
  // useSubscriptionCheck agora retorna imediatamente se temos dados locais

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // OTIMIZAÇÃO: Não mostrar SubscriptionRequired enquanto está carregando e temos user.subscription
  // Isso previne o flash de "sem plano" durante o carregamento inicial
  if (requireSubscription && !hasAccess) {
    // Se ainda está carregando subscription E temos subscription no user, aguardar conclusão
    if (subscriptionLoading && user?.subscription) {
      // Mostrar loading enquanto verifica, mas não bloquear acesso ainda
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
            <p className="text-muted-foreground">Verificando acesso...</p>
          </div>
        </div>
      );
    }
    // Só mostrar SubscriptionRequired se realmente não tem acesso E não está carregando
    return <SubscriptionRequired />;
  }
  return <>{children}</>;
}