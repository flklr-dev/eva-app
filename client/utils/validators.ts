export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  // Validate email format
  email: (email: string): ValidationResult => {
    if (!email.trim()) {
      return { isValid: false, error: 'Email is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true };
  },

  // Validate password (simple: min 6 chars)
  password: (password: string): ValidationResult => {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }
    return { isValid: true };
  },

  // Validate name (not too strict)
  name: (name: string): ValidationResult => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { isValid: false, error: 'Name is required' };
    }
    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters' };
    }
    if (trimmedName.length > 50) {
      return { isValid: false, error: 'Name must be less than 50 characters' };
    }
    return { isValid: true };
  },
};
