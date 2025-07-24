/**
 * Comprehensive validation utilities for data sanitization and validation
 */

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationUtils {
  
  // String validation
  static validateString(value: unknown, fieldName: string, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}): string {
    const { required = false, minLength = 0, maxLength = Infinity, pattern, allowEmpty = true } = options;

    if (value === null || value === undefined) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return '';
    }

    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    const trimmed = value.trim();

    if (!allowEmpty && trimmed.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
    }

    if (trimmed.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters`, fieldName);
    }

    if (pattern && !pattern.test(trimmed)) {
      throw new ValidationError(`${fieldName} format is invalid`, fieldName);
    }

    return trimmed;
  }

  // Number validation
  static validateNumber(value: unknown, fieldName: string, options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}): number {
    const { required = false, min = -Infinity, max = Infinity, integer = false } = options;

    if (value === null || value === undefined) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return 0;
    }

    const num = Number(value);

    if (isNaN(num)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName);
    }

    if (!isFinite(num)) {
      throw new ValidationError(`${fieldName} must be a finite number`, fieldName);
    }

    if (integer && !Number.isInteger(num)) {
      throw new ValidationError(`${fieldName} must be an integer`, fieldName);
    }

    if (num < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName);
    }

    if (num > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max}`, fieldName);
    }

    return num;
  }

  // Email validation
  static validateEmail(email: unknown, required: boolean = false): string {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return this.validateString(email, 'email`, {
      required,
      maxLength: 320,
      pattern: emailPattern
    });
  }

  // URL validation
  static validateUrl(url: unknown, required: boolean = false): string {
    const urlString = this.validateString(url, 'URL`, { required, maxLength: 2048 });
    
    if (urlString && !this.isValidUrl(urlString)) {
      throw new ValidationError('Invalid URL format', 'url');
    }
    
    return urlString;
  }

  private static isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // Object validation
  static validateObject(value: unknown, fieldName: string, required: boolean = false): object {
    if (value === null || value === undefined) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return {};
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an object`, fieldName);
    }

    return value;
  }

  // Array validation
  static validateArray(value: unknown, fieldName: string, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    elementValidator?: (element: unknown, index: number) => unknown;
  } = {}): unknown[] {
    const { required = false, minLength = 0, maxLength = Infinity, elementValidator } = options;

    if (value === null || value === undefined) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return [];
    }

    if (!Array.isArray(value)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName);
    }

    if (value.length < minLength) {
      throw new ValidationError(`${fieldName} must have at least ${minLength} items`, fieldName);
    }

    if (value.length > maxLength) {
      throw new ValidationError(`${fieldName} must have no more than ${maxLength} items`, fieldName);
    }

    if (elementValidator) {
      return value.map((element, index) => {
        try {
          return elementValidator(element, index);
        } catch (error) {
          throw new ValidationError(`${fieldName}[${index}]: ${error.message}`, fieldName);
        }
      });
    }

    return value;
  }

  // Boolean validation
  static validateBoolean(value: unknown, fieldName: string, required: boolean = false): boolean {
    if (value === null || value === undefined) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, fieldName);
      }
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    throw new ValidationError(`${fieldName} must be a boolean value`, fieldName);
  }

  // Sanitization utilities
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  static sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') return '';
    
    return filename
      .split('').filter(char => char.charCodeAt(0) >= 0x20 || char.charCodeAt(0) === 0x09 || char.charCodeAt(0) === 0x0A || char.charCodeAt(0) === 0x0D).join('') // Remove control characters except tab, newline, carriage return
      .replace(/[<>:"/\\|?*]/g, '') // Remove other invalid filename characters
      .replace(/^\.+/, '') // Remove leading dots
      .trim()
      .substring(0, 255); // Limit length
  }

  static sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/['";\\]/g, '') // Remove SQL injection characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments start
      .replace(/\*\//g, '') // Remove SQL block comments end
      .trim();
  }

  // Rate limiting validation
  static validateRateLimit(
    requests: number,
    timeWindow: number,
    maxRequests: number,
    identifier: string
  ): boolean {
    // This would typically integrate with a rate limiting service
    // For now, just validate the parameters
    if (requests > maxRequests) {
      throw new ValidationError(
        `Rate limit exceeded for ${identifier}: ${requests}/${maxRequests} requests in ${timeWindow}ms`,
        'rate_limit'
      );
    }
    return true;
  }

  // Complex validation for AI-related inputs
  static validateAIPrompt(prompt: unknown): string {
    const validatedPrompt = this.validateString(prompt, 'prompt`, {
      required: true,
      minLength: 1,
      maxLength: 50000,
      allowEmpty: false
    });

    // Additional AI-specific validations
    if (validatedPrompt.length > 32000) {
      console.warn('Prompt is very long and may be truncated by some AI models');
    }

    // Check for potential prompt injection attempts
    const suspiciousPatterns = [
      /ignore\s+(previous|all)\s+instructions/i,
      /system\s*:\s*/i,
      /\[INST\]/i,
      /<\|.*?\|>/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(validatedPrompt)) {
        console.warn('Prompt contains potentially suspicious patterns');
        break;
      }
    }

    return validatedPrompt;
  }

  static validateModelName(model: unknown): string {
    return this.validateString(model, 'model`, {
      required: true,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\-_.\/]+$/
    });
  }

  static validateApiKey(apiKey: unknown): string {
    return this.validateString(apiKey, 'API key', {
      required: true,
      minLength: 10,
      maxLength: 500
    });
  }

  // UUID validation
  static validateUUID(uuid: unknown, required: boolean = false): string {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return this.validateString(uuid, 'UUID', {
      required,
      pattern: uuidPattern
    });
  }
}