export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Subscription errors
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CHECKOUT_SESSION_FAILED = 'CHECKOUT_SESSION_FAILED',
  
  // Document errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_ACCESS_DENIED = 'DOCUMENT_ACCESS_DENIED',
  DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_USER_DATA = 'INVALID_USER_DATA',
  
  // System errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  userId?: string;
  resourceId?: string;
  action?: string;
  timestamp?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: any;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };
    this.isOperational = isOperational;

    // Ensure the stack trace points to the caller
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create a user-friendly error message
   */
  public getUserMessage(): string {
    const userMessages: Record<ErrorCode, string> = {
      [ErrorCode.UNAUTHORIZED]: 'Você precisa fazer login para acessar esta página.',
      [ErrorCode.FORBIDDEN]: 'Você não tem permissão para realizar esta ação.',
      [ErrorCode.INVALID_CREDENTIALS]: 'Email ou senha incorretos. Tente novamente.',
      [ErrorCode.SESSION_EXPIRED]: 'Sua sessão expirou. Faça login novamente.',
      
      [ErrorCode.SUBSCRIPTION_REQUIRED]: 'Você precisa de uma assinatura ativa para acessar este conteúdo.',
      [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Sua assinatura expirou. Renove agora para continuar.',
      [ErrorCode.SUBSCRIPTION_CANCELLED]: 'Sua assinatura foi cancelada. Reative para continuar.',
      [ErrorCode.PAYMENT_FAILED]: 'Falha no pagamento. Verifique seus dados e tente novamente.',
      [ErrorCode.CHECKOUT_SESSION_FAILED]: 'Erro ao processar pagamento. Tente novamente.',
      
      [ErrorCode.DOCUMENT_NOT_FOUND]: 'Documento não encontrado.',
      [ErrorCode.DOCUMENT_ACCESS_DENIED]: 'Você não tem acesso a este documento.',
      [ErrorCode.DOCUMENT_UPLOAD_FAILED]: 'Erro ao fazer upload do documento.',
      
      [ErrorCode.USER_NOT_FOUND]: 'Usuário não encontrado.',
      [ErrorCode.USER_ALREADY_EXISTS]: 'Já existe um usuário com este email.',
      [ErrorCode.INVALID_USER_DATA]: 'Dados do usuário inválidos.',
      
      [ErrorCode.NETWORK_ERROR]: 'Erro de conexão. Verifique sua internet e tente novamente.',
      [ErrorCode.SERVER_ERROR]: 'Erro interno do servidor. Tente novamente mais tarde.',
      [ErrorCode.VALIDATION_ERROR]: 'Dados inválidos. Verifique os campos e tente novamente.',
      [ErrorCode.UNKNOWN_ERROR]: 'Ocorreu um erro inesperado. Tente novamente.',
    };

    return userMessages[this.code] || this.message;
  }

  /**
   * Get error severity level
   */
  public getSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<ErrorCode, 'low' | 'medium' | 'high' | 'critical'> = {
      [ErrorCode.UNAUTHORIZED]: 'medium',
      [ErrorCode.FORBIDDEN]: 'medium',
      [ErrorCode.INVALID_CREDENTIALS]: 'low',
      [ErrorCode.SESSION_EXPIRED]: 'low',
      
      [ErrorCode.SUBSCRIPTION_REQUIRED]: 'medium',
      [ErrorCode.SUBSCRIPTION_EXPIRED]: 'high',
      [ErrorCode.SUBSCRIPTION_CANCELLED]: 'high',
      [ErrorCode.PAYMENT_FAILED]: 'high',
      [ErrorCode.CHECKOUT_SESSION_FAILED]: 'high',
      
      [ErrorCode.DOCUMENT_NOT_FOUND]: 'low',
      [ErrorCode.DOCUMENT_ACCESS_DENIED]: 'medium',
      [ErrorCode.DOCUMENT_UPLOAD_FAILED]: 'medium',
      
      [ErrorCode.USER_NOT_FOUND]: 'low',
      [ErrorCode.USER_ALREADY_EXISTS]: 'low',
      [ErrorCode.INVALID_USER_DATA]: 'low',
      
      [ErrorCode.NETWORK_ERROR]: 'medium',
      [ErrorCode.SERVER_ERROR]: 'critical',
      [ErrorCode.VALIDATION_ERROR]: 'low',
      [ErrorCode.UNKNOWN_ERROR]: 'high',
    };

    return severityMap[this.code] || 'medium';
  }

  /**
   * Check if error should be reported to monitoring service
   */
  public shouldReport(): boolean {
    const severity = this.getSeverity();
    return severity === 'high' || severity === 'critical';
  }

  /**
   * Convert to JSON for logging
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }

  /**
   * Create AppError from unknown error
   */
  public static fromUnknown(error: unknown, context: ErrorContext = {}): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorCode.UNKNOWN_ERROR,
        500,
        context,
        false
      );
    }

    return new AppError(
      'An unknown error occurred',
      ErrorCode.UNKNOWN_ERROR,
      500,
      context,
      false
    );
  }

  /**
   * Create AppError from Supabase error
   */
  public static fromSupabaseError(error: any, context: ErrorContext = {}): AppError {
    const message = error.message || 'Database error';
    const code = error.code || 'UNKNOWN_ERROR';
    
    // Map Supabase error codes to our error codes
    const codeMap: Record<string, ErrorCode> = {
      'PGRST116': ErrorCode.DOCUMENT_NOT_FOUND,
      '23505': ErrorCode.USER_ALREADY_EXISTS,
      '23503': ErrorCode.VALIDATION_ERROR,
      '42501': ErrorCode.FORBIDDEN,
      '42P01': ErrorCode.SERVER_ERROR,
    };

    const mappedCode = codeMap[code] || ErrorCode.SERVER_ERROR;
    const statusCode = error.status || 500;

    return new AppError(message, mappedCode, statusCode, context);
  }

  /**
   * Create AppError from Stripe error
   */
  public static fromStripeError(error: any, context: ErrorContext = {}): AppError {
    const message = error.message || 'Payment error';
    const type = error.type || 'unknown';
    
    // Map Stripe error types to our error codes
    const typeMap: Record<string, ErrorCode> = {
      'card_error': ErrorCode.PAYMENT_FAILED,
      'invalid_request_error': ErrorCode.VALIDATION_ERROR,
      'api_error': ErrorCode.SERVER_ERROR,
      'authentication_error': ErrorCode.UNAUTHORIZED,
      'rate_limit_error': ErrorCode.SERVER_ERROR,
    };

    const mappedCode = typeMap[type] || ErrorCode.PAYMENT_FAILED;
    const statusCode = error.statusCode || 400;

    return new AppError(message, mappedCode, statusCode, context);
  }
}












