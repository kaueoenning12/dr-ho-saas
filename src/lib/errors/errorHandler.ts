import { AppError, ErrorCode } from './AppError';
import { supabase } from '@/integrations/supabase/client';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  reportError?: boolean;
  fallbackMessage?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error with options
   */
  public async handle(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): Promise<AppError> {
    const {
      showToast = true,
      logError = true,
      reportError = true,
      fallbackMessage = 'Ocorreu um erro inesperado',
    } = options;

    // Convert unknown error to AppError
    const appError = AppError.fromUnknown(error);

    // Log error if requested
    if (logError) {
      this.logError(appError);
    }

    // Report error if requested and should be reported
    if (reportError && appError.shouldReport()) {
      this.reportError(appError);
    }

    // Show toast if requested
    if (showToast) {
      this.showErrorToast(appError);
    }

    return appError;
  }

  /**
   * Handle async operation with error handling
   */
  public async handleAsync<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.handle(error, options);
      return null;
    }
  }

  /**
   * Handle async operation with fallback
   */
  public async handleAsyncWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    options: ErrorHandlerOptions = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      await this.handle(error, options);
      return fallback;
    }
  }

  /**
   * Log error to console and database
   */
  private logError(error: AppError): void {
    console.error('🚨 [ERROR]', error.toJSON());

    // Log to database for monitoring
    this.logErrorToDatabase(error).catch(console.error);
  }

  /**
   * Log error to database
   */
  private async logErrorToDatabase(error: AppError): Promise<void> {
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'error_occurred',
        p_resource_type: 'error',
        p_resource_id: error.code,
        p_details: {
          error_message: error.message,
          error_code: error.code,
          status_code: error.statusCode,
          severity: error.getSeverity(),
          context: error.context,
          stack: error.stack,
        },
      });
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  }

  /**
   * Report error to external monitoring service
   */
  private reportError(error: AppError): void {
    // TODO: Integrate with Sentry or similar service
    console.warn('📊 [MONITORING] Error should be reported:', {
      code: error.code,
      severity: error.getSeverity(),
      context: error.context,
    });
  }

  /**
   * Show error toast to user
   */
  private showErrorToast(error: AppError): void {
    // Import toast dynamically to avoid circular dependencies
    import('sonner').then(({ toast }) => {
      const userMessage = error.getUserMessage();
      const severity = error.getSeverity();

      switch (severity) {
        case 'critical':
          toast.error(userMessage, {
            duration: 10000,
            description: 'Se o problema persistir, entre em contato conosco.',
          });
          break;
        case 'high':
          toast.error(userMessage, {
            duration: 8000,
          });
          break;
        case 'medium':
          toast.warning(userMessage, {
            duration: 6000,
          });
          break;
        case 'low':
          toast.info(userMessage, {
            duration: 4000,
          });
          break;
      }
    }).catch(console.error);
  }

  /**
   * Create error boundary handler for React components
   */
  public createErrorBoundaryHandler() {
    return (error: Error, errorInfo: any) => {
      const appError = AppError.fromUnknown(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });

      this.handle(appError, {
        showToast: true,
        logError: true,
        reportError: true,
      });
    };
  }

  /**
   * Handle network errors specifically
   */
  public handleNetworkError(error: any, context: ErrorContext = {}): AppError {
    const appError = new AppError(
      'Erro de conexão. Verifique sua internet e tente novamente.',
      ErrorCode.NETWORK_ERROR,
      0,
      context
    );

    this.handle(appError);
    return appError;
  }

  /**
   * Handle validation errors
   */
  public handleValidationError(
    message: string,
    field?: string,
    context: ErrorContext = {}
  ): AppError {
    const appError = new AppError(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      { ...context, field }
    );

    this.handle(appError);
    return appError;
  }

  /**
   * Handle subscription errors
   */
  public handleSubscriptionError(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ): AppError {
    const appError = new AppError(message, code, 403, context);

    this.handle(appError, {
      showToast: true,
      logError: true,
      reportError: false, // Don't report subscription errors as they're expected
    });

    return appError;
  }

  /**
   * Clear error queue
   */
  public clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  } {
    const stats = {
      totalErrors: this.errorQueue.length,
      errorsByCode: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
    };

    this.errorQueue.forEach(error => {
      stats.errorsByCode[error.code] = (stats.errorsByCode[error.code] || 0) + 1;
      stats.errorsBySeverity[error.getSeverity()] = (stats.errorsBySeverity[error.getSeverity()] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (error: unknown, options?: ErrorHandlerOptions) => 
  errorHandler.handle(error, options);

export const handleAsync = <T>(
  operation: () => Promise<T>,
  options?: ErrorHandlerOptions
) => errorHandler.handleAsync(operation, options);

export const handleAsyncWithFallback = <T>(
  operation: () => Promise<T>,
  fallback: T,
  options?: ErrorHandlerOptions
) => errorHandler.handleAsyncWithFallback(operation, fallback, options);

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handle(event.error, {
      showToast: true,
      logError: true,
      reportError: true,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(event.reason, {
      showToast: true,
      logError: true,
      reportError: true,
    });
  });
}












