import { ComponentType, lazy } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Enhanced lazy loading with automatic retry mechanism for failed chunk loads
 * Helps recover from temporary network issues or stale cache problems
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  const retryImport = async (retryCount = 0): Promise<{ default: T }> => {
    try {
      return await importFunc();
    } catch (error) {
      // If we've exhausted retries, throw the error
      if (retryCount >= maxRetries) {
        console.error(`Failed to load module after ${maxRetries} retries:`, error);
        throw error;
      }

      // Log retry attempt
      console.warn(`Chunk load failed, retrying (${retryCount + 1}/${maxRetries})...`, error);

      // Wait before retrying with exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, retryDelay * Math.pow(2, retryCount))
      );

      // Retry the import
      return retryImport(retryCount + 1);
    }
  };

  return lazy(() => retryImport());
}
