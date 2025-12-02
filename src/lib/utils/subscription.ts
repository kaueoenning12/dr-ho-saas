/**
 * Utilities for subscription verification
 * Verifica se uma assinatura é válida (paga, não gratuita)
 */

export interface SubscriptionWithPlan {
  id?: string;
  status?: string;
  expires_at?: string | null;
  subscription_plans?: {
    id?: string;
    name?: string;
    price?: number;
  } | null;
  plan_id?: string;
}

/**
 * Verifica se o usuário tem uma assinatura paga válida (não Free)
 * 
 * Regras:
 * - Plano "Free" = sem assinatura válida
 * - Preço = 0 = sem assinatura válida
 * - Status deve ser 'active'
 * - Não deve estar expirada (se tiver expires_at)
 * 
 * @param subscription - Dados da assinatura com plano associado
 * @returns true se tem assinatura paga válida, false caso contrário
 */
export function hasValidPaidSubscription(
  subscription: SubscriptionWithPlan | null | undefined
): boolean {
  // Se não tem assinatura, não tem plano válido
  if (!subscription) {
    return false;
  }

  // Status deve ser 'active'
  if (subscription.status !== 'active') {
    return false;
  }

  // Verificar se está expirada
  if (subscription.expires_at) {
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return false; // Assinatura expirada
    }
  }

  // Free plan ID conhecido: b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5
  const FREE_PLAN_ID = 'b2d1cb5e-e3dd-44c8-a96e-2d35d496a5f5';
  
  // Verificar se o plan_id da assinatura é Free (mesmo que subscription_plans seja null)
  const subscriptionPlanId = subscription.plan_id ? String(subscription.plan_id) : null;
  if (subscriptionPlanId === FREE_PLAN_ID || String(subscriptionPlanId) === String(FREE_PLAN_ID)) {
    return false; // Plano Free = sem assinatura válida
  }

  // Verificar se o plano é Free (gratuito) através dos dados do plano
  const plan = subscription.subscription_plans;
  
  if (!plan) {
    // Se não tem plano associado E não é Free plan ID, não é válido
    // Mas se já verificamos que não é Free plan ID acima, retornar false
    return false;
  }

  // Verificar por ID do plano
  const planId = plan.id ? String(plan.id) : null;
  if (planId === FREE_PLAN_ID || String(planId) === String(FREE_PLAN_ID)) {
    return false; // Plano Free = sem assinatura válida
  }

  // Se o preço é 0 ou o nome é "Free", não é uma assinatura paga válida
  const planName = plan.name?.toLowerCase()?.trim() || '';
  const isFreeByName = planName === 'free' || 
                       planName === 'gratuito' ||
                       planName === 'plano free' ||
                       planName === 'plano gratuito' ||
                       planName.includes('free') ||
                       planName.includes('gratuito');
  
  const isFreeByPrice = plan.price === 0 || plan.price === null || isNaN(Number(plan.price));

  if (isFreeByName || isFreeByPrice) {
    return false; // Plano Free = sem assinatura válida
  }

  // Tem assinatura paga válida
  return true;
}

/**
 * Verifica se o usuário está sem plano (tem apenas Free ou não tem assinatura)
 */
export function hasNoValidSubscription(
  subscription: SubscriptionWithPlan | null | undefined
): boolean {
  return !hasValidPaidSubscription(subscription);
}


