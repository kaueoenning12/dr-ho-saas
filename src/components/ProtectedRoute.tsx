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
  
  // Show loading state while checking auth and subscription
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Check subscription access for protected resources
  if (requireSubscription && !hasAccess) {
    return <SubscriptionRequired />;
  }
  return <>{children}</>;
}