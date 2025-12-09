/**
 * Error Logger Service
 * Envia erros para o webhook do Grupo NexusMind
 */

const WEBHOOK_URL = "https://webhook.gruponexusmind.com.br/webhook/error";

interface ErrorData {
  message: string;
  stack?: string;
  name?: string;
  componentStack?: string;
  errorInfo?: any;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  userId?: string;
  userEmail?: string;
  errorType?: string;
  additionalData?: Record<string, any>;
}

/**
 * Envia erro para o webhook
 */
export async function logErrorToWebhook(errorData: ErrorData): Promise<void> {
  try {
    // Preparar dados do erro
    const payload = {
      message: errorData.message || "Erro desconhecido",
      stack: errorData.stack,
      name: errorData.name || "Error",
      componentStack: errorData.componentStack,
      errorInfo: errorData.errorInfo,
      url: errorData.url || window.location.href,
      userAgent: errorData.userAgent || navigator.userAgent,
      timestamp: errorData.timestamp || new Date().toISOString(),
      userId: errorData.userId,
      userEmail: errorData.userEmail,
      errorType: errorData.errorType || "unknown",
      additionalData: errorData.additionalData || {},
      environment: {
        online: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      },
    };

    // Enviar para o webhook
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to send error to webhook:", response.status, response.statusText);
    }
  } catch (error) {
    // Se falhar ao enviar, apenas logar no console
    // Não queremos criar um loop infinito de erros
    console.error("Failed to log error to webhook:", error);
  }
}

/**
 * Extrai informações do usuário do localStorage ou contexto
 */
function getUserInfo(): { userId?: string; userEmail?: string } {
  try {
    // Tentar obter do localStorage (se disponível)
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      return {
        userId: user.id,
        userEmail: user.email,
      };
    }
    
    // Tentar obter do sessionStorage
    const sessionUserData = sessionStorage.getItem("user");
    if (sessionUserData) {
      const user = JSON.parse(sessionUserData);
      return {
        userId: user.id,
        userEmail: user.email,
      };
    }
  } catch (error) {
    // Ignorar erros ao ler localStorage/sessionStorage
  }
  return {};
}

/**
 * Loga um erro JavaScript
 */
export function logJavaScriptError(
  error: Error | string,
  errorInfo?: any,
  additionalData?: Record<string, any>
): void {
  const errorObj = typeof error === "string" ? new Error(error) : error;
  const userInfo = getUserInfo();

  logErrorToWebhook({
    message: errorObj.message,
    stack: errorObj.stack,
    name: errorObj.name,
    errorInfo,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: userInfo.userId,
    userEmail: userInfo.userEmail,
    errorType: "javascript",
    additionalData,
  });
}

/**
 * Loga um erro do React (ErrorBoundary)
 */
export function logReactError(
  error: Error,
  errorInfo: any,
  additionalData?: Record<string, any>
): void {
  const userInfo = getUserInfo();

  logErrorToWebhook({
    message: error.message,
    stack: error.stack,
    name: error.name,
    componentStack: errorInfo?.componentStack,
    errorInfo: errorInfo,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: userInfo.userId,
    userEmail: userInfo.userEmail,
    errorType: "react",
    additionalData,
  });
}

/**
 * Loga um erro de Promise rejeitada
 */
export function logPromiseRejection(
  event: PromiseRejectionEvent,
  additionalData?: Record<string, any>
): void {
  const error = event.reason;
  const userInfo = getUserInfo();

  const errorData: ErrorData = {
    message: typeof error === "string" ? error : error?.message || "Unhandled Promise Rejection",
    stack: typeof error === "object" && error?.stack ? error.stack : undefined,
    name: typeof error === "object" && error?.name ? error.name : "PromiseRejection",
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: userInfo.userId,
    userEmail: userInfo.userEmail,
    errorType: "promise_rejection",
    additionalData: {
      ...additionalData,
      reason: typeof error === "object" ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : error,
    },
  };

  logErrorToWebhook(errorData);
}

/**
 * Loga um erro de console.error
 */
export function logConsoleError(
  message: string,
  ...args: any[]
): void {
  const userInfo = getUserInfo();

  logErrorToWebhook({
    message: typeof message === "string" ? message : JSON.stringify(message),
    stack: new Error().stack,
    name: "ConsoleError",
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: userInfo.userId,
    userEmail: userInfo.userEmail,
    errorType: "console_error",
    additionalData: {
      args: args.map(arg => 
        typeof arg === "object" ? JSON.stringify(arg, Object.getOwnPropertyNames(arg)) : String(arg)
      ),
    },
  });
}

