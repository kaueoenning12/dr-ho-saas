/**
 * Global Error Handler
 * Configura handlers globais para capturar todos os erros da aplicação
 */

import { logJavaScriptError, logPromiseRejection, logConsoleError } from "./errorLogger";

let isInitialized = false;

/**
 * Inicializa os handlers globais de erro
 */
export function initializeErrorHandlers(): void {
  if (isInitialized) {
    return; // Evitar múltiplas inicializações
  }

  isInitialized = true;

  // Handler para erros JavaScript não capturados
  window.addEventListener("error", (event) => {
    const error = event.error || new Error(event.message);
    const errorMessage = error?.message || event.message || "";
    
    // Suprimir erros de refresh token inválido do Supabase
    if (
      errorMessage.includes("Invalid Refresh Token") ||
      errorMessage.includes("Refresh Token Not Found") ||
      errorMessage.includes("AuthApiError")
    ) {
      // Verificar se é especificamente o erro de refresh token
      const errorString = error?.toString() || "";
      if (
        errorString.includes("Invalid Refresh Token") ||
        errorString.includes("Refresh Token Not Found")
      ) {
        event.preventDefault();
        return;
      }
    }
    
    logJavaScriptError(error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: event.type,
    });
  });

  // Handler para Promise rejeitadas não tratadas
  window.addEventListener("unhandledrejection", (event) => {
    // Suprimir erros de refresh token inválido do Supabase
    const error = event.reason;
    const errorMessage = error?.message || error?.toString() || "";
    
    if (
      errorMessage.includes("Invalid Refresh Token") ||
      errorMessage.includes("Refresh Token Not Found")
    ) {
      // Prevenir que o erro seja logado
      event.preventDefault();
      return;
    }
    
    logPromiseRejection(event);
  });

  // Interceptar console.error
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMessage = args[0]?.toString() || "";
    const errorObject = args[0];
    
    // Suprimir erros específicos do Supabase relacionados a refresh token inválido
    const isInvalidRefreshTokenError = 
      errorMessage.includes("Invalid Refresh Token") ||
      errorMessage.includes("Refresh Token Not Found") ||
      (errorObject && typeof errorObject === 'object' && 'message' in errorObject && 
       (errorObject.message?.includes("Invalid Refresh Token") || 
        errorObject.message?.includes("Refresh Token Not Found")));
    
    // Não logar esse erro específico
    if (isInvalidRefreshTokenError) {
      return; // Silenciosamente ignorar
    }
    
    // Chamar o console.error original para outros erros
    originalConsoleError.apply(console, args);
    
    // Enviar para o webhook (apenas se não for um erro já tratado)
    // Evitar duplicação de erros do ErrorBoundary
    if (
      !errorMessage.includes("ErrorBoundary caught an error") &&
      !errorMessage.includes("Failed to log error to webhook")
    ) {
      logConsoleError(errorMessage, ...args.slice(1));
    }
  };

  // Interceptar console.warn para erros críticos
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    originalConsoleWarn.apply(console, args);
    
    // Enviar warnings críticos para o webhook
    const warningMessage = args[0]?.toString() || "";
    if (
      warningMessage.includes("Error") ||
      warningMessage.includes("Failed") ||
      warningMessage.includes("Exception")
    ) {
      logConsoleError(`WARNING: ${warningMessage}`, ...args.slice(1));
    }
  };
}


