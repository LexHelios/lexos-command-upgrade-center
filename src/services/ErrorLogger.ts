export interface ErrorLog {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  component?: string;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
  sessionId?: string;
  performance?: {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
    navigation?: {
      loadEventEnd?: number;
      domContentLoadedEventEnd?: number;
      firstPaint?: number;
      firstContentfulPaint?: number;
    };
  };
}

export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLog[] = [];
  private readonly MAX_LOGS = 200; // Increased for better debugging
  private sessionId: string;
  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceMonitoring();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Monitor Core Web Vitals
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.info('LCP measured', { 
              value: entry.startTime,
              threshold: 2500 // 2.5 seconds
            }, 'performance');
          }
          if (entry.entryType === 'first-input') {
            const firstInputEntry = entry as any;
            this.info('FID measured', { 
              value: firstInputEntry.processingStart - entry.startTime,
              threshold: 100 // 100ms
            }, 'performance');
          }
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['largest-contentful-paint', 'first-input', 'navigation'] 
      });
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  private getPerformanceData(): ErrorLog['performance'] {
    if (typeof window === 'undefined') return undefined;

    const performance: ErrorLog['performance'] = {};

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      performance.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    // Navigation timing
    if ('navigation' in performance) {
      const navigation = (performance as any).navigation;
      performance.navigation = {
        loadEventEnd: navigation.loadEventEnd,
        domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
        firstPaint: navigation.firstPaint,
        firstContentfulPaint: navigation.firstContentfulPaint
      };
    }

    return performance;
  }

  async logError(error: ErrorLog): Promise<void> {
    try {
      // Enhance error with context
      const enhancedError: ErrorLog = {
        ...error,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        performance: this.getPerformanceData(),
      };

      // Store in memory (circular buffer)
      this.logs.push(enhancedError);
      if (this.logs.length > this.MAX_LOGS) {
        this.logs.shift();
      }

      // Console logging with better formatting
      const logMethod = error.level === 'error' || error.level === 'critical' ? 'error' : 
                       error.level === 'warning' ? 'warn' : 'log';
      
      const logPrefix = `[${error.level.toUpperCase()}] [${enhancedError.timestamp}]`;
      
      if (process.env.NODE_ENV === 'development' || error.level === 'error' || error.level === 'critical') {
        console.group(`${logPrefix} ${error.message}`);
        if (error.component) console.log('Component:', error.component);
        if (error.context) console.log('Context:', error.context);
        if (error.stackTrace) console.log('Stack:', error.stackTrace);
        if (error.performance) console.log('Performance:', error.performance);
        console.groupEnd();
      }

      // In production, send critical errors to monitoring service
      if (error.level === 'critical' && process.env.NODE_ENV === 'production') {
        await this.sendToMonitoringService(enhancedError);
      }

      // Log to localStorage for debugging (limited to last 50 errors)
      this.persistToLocalStorage(enhancedError);

    } catch (loggingError) {
      // Fallback to console if logging system fails
      console.error('Error logging failed:', loggingError);
      console.error('Original error:', error);
    }
  }

  private async sendToMonitoringService(error: ErrorLog): Promise<void> {
    try {
      // In a real implementation, this would send to a monitoring service
      // For now, we'll just log to console
      console.error('CRITICAL ERROR - Would send to monitoring service:', {
        message: error.message,
        component: error.component,
        sessionId: error.sessionId,
        timestamp: error.timestamp
      });
    } catch (error) {
      console.error('Failed to send error to monitoring service:', error);
    }
  }

  private persistToLocalStorage(error: ErrorLog): void {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = 'lexos_error_logs';
      const existingLogs = localStorage.getItem(storageKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Add new error
      logs.push(error);
      
      // Keep only last 50 errors
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to persist error to localStorage:', error);
    }
  }

  // Convenience methods
  async info(message: string, context?: Record<string, unknown>, component?: string): Promise<void> {
    return this.logError({ level: 'info', message, context, component });
  }

  async warning(message: string, context?: Record<string, unknown>, component?: string): Promise<void> {
    return this.logError({ level: 'warning', message, context, component });
  }

  async error(message: string, context?: Record<string, unknown>, component?: string, stackTrace?: string): Promise<void> {
    return this.logError({ level: 'error', message, context, component, stackTrace });
  }

  async critical(message: string, context?: Record<string, unknown>, component?: string, stackTrace?: string): Promise<void> {
    return this.logError({ level: 'critical', message, context, component, stackTrace });
  }

  // For catching and logging JavaScript errors
  setupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise?.toString()
      }, 'global-error-handler', event.reason?.stack);
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      }, 'global-error-handler', event.error?.stack);
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        this.warning('Resource loading error', {
          target: event.target,
          type: (event.target as any).tagName
        }, 'resource-loader');
      }
    }, true);
  }

  // No-op cleanup function (no remote calls needed)
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    // In-memory logs are automatically cleaned up by the circular buffer
    // No need for remote cleanup
    console.log(`Error logger: Keeping last ${this.MAX_LOGS} logs in memory`);
  }

  // Get recent logs for debugging
  getRecentLogs(): ErrorLog[] {
    return [...this.logs];
  }

  // Get logs from localStorage
  getPersistedLogs(): ErrorLog[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const storageKey = 'lexos_error_logs';
      const logs = localStorage.getItem(storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.warn('Failed to get persisted logs:', error);
      return [];
    }
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lexos_error_logs');
    }
  }

  // Get session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Cleanup performance observer
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Export singleton instance for easy use
export const errorLogger = ErrorLogger.getInstance();