import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Verifica se um documento foi publicado nos últimos 30 dias
 */
export function isDocumentNew(publishedAt: string): boolean {
  const publishedDate = new Date(publishedAt);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return publishedDate >= thirtyDaysAgo;
}

/**
 * Formata uma data para o formato brasileiro
 */
export function formatDateBR(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Calcula dias restantes até uma data
 */
export function daysUntil(dateString: string): number {
  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formata tempo relativo (ex: "2 horas atrás", "1 dia atrás")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 30) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} mês${diffMonths > 1 ? 'es' : ''} atrás`;
}
