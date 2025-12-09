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
    
    logJavaScriptError(error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: event.type,
    });
  });

  // Handler para Promise rejeitadas não tratadas
  window.addEventListener("unhandledrejection", (event) => {
    logPromiseRejection(event);
  });

  // Interceptar console.error
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Chamar o console.error original
    originalConsoleError.apply(console, args);
    
    // Enviar para o webhook (apenas se não for um erro já tratado)
    // Evitar duplicação de erros do ErrorBoundary
    const errorMessage = args[0]?.toString() || "";
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


