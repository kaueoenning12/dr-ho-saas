import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { useState } from "react";

export function SubscriptionBanner() {
  const { subscription, hasAccess } = useSubscriptionCheck();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || hasAccess) {
    return null;
  }

  if (!subscription) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10 mb-4">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          Assinatura Necessária
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          <div className="flex items-center justify-between gap-4">
            <span>Você precisa de uma assinatura ativa para acessar todos os recursos.</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                asChild
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Link to="/plans">Assinar Agora</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (subscription.isExpired) {
    return (
      <Alert className="border-red-500/50 bg-red-500/10 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200">
          Assinatura Expirada
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          <div className="flex items-center justify-between gap-4">
            <span>Sua assinatura expirou. Renove para continuar acessando todos os recursos.</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                asChild
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Link to="/plans">Renovar Assinatura</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (subscription.daysUntilExpiry <= 7 && subscription.daysUntilExpiry > 0) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10 mb-4">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800 dark:text-orange-200">
          Assinatura Expirando em Breve
        </AlertTitle>
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          <div className="flex items-center justify-between gap-4">
            <span>
              Sua assinatura expira em {subscription.daysUntilExpiry} {subscription.daysUntilExpiry === 1 ? "dia" : "dias"}. 
              Renove agora para não perder o acesso.
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                asChild
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Link to="/plans">Renovar Agora</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (subscription.status === "past_due") {
    return (
      <Alert className="border-red-500/50 bg-red-500/10 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200">
          Pagamento Pendente
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          <div className="flex items-center justify-between gap-4">
            <span>Há um pagamento pendente na sua assinatura. Atualize seu método de pagamento.</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                asChild
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Link to="/billing">Atualizar Pagamento</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}


