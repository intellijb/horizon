export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    factor = 2,
    onRetry,
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const totalDelay = delay + jitter;
      
      await sleep(totalDelay);
    }
  }
  
  throw lastError || new Error('Retry failed');
}

export class ExponentialBackoff {
  private attempt: number = 0;
  private readonly maxAttempts: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly factor: number;
  
  constructor(
    maxAttempts: number = 5,
    initialDelay: number = 1000,
    maxDelay: number = 30000,
    factor: number = 2
  ) {
    this.maxAttempts = maxAttempts;
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
    this.factor = factor;
  }
  
  get canRetry(): boolean {
    return this.attempt < this.maxAttempts;
  }
  
  get nextDelay(): number {
    if (!this.canRetry) {
      return 0;
    }
    
    const delay = Math.min(
      this.initialDelay * Math.pow(this.factor, this.attempt),
      this.maxDelay
    );
    
    // Add jitter
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }
  
  async wait(): Promise<void> {
    if (!this.canRetry) {
      throw new Error('Maximum retry attempts exceeded');
    }
    
    const delay = this.nextDelay;
    this.attempt++;
    await sleep(delay);
  }
  
  reset(): void {
    this.attempt = 0;
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}