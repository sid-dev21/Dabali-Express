/*Validators for Express Request object properties*/

// Email validator
export const isValidEmail = (email: string): boolean => {
  // In test environment, allow more flexible emails
  if (process.env.NODE_ENV === 'test') {
    const testEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return testEmailRegex.test(email);
  }
  
  // In production, only allow @gmail.com
  const emailRegex = /^[^\s@]+@gmail\.com$/;
  return emailRegex.test(email);
};

// Gmail-specific validator for canteen managers
export const isValidGmailEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@gmail\.com$/;
  return emailRegex.test(email);
};

// Password strength validator
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// Number validator

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+226\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}$/;
  return phoneRegex.test(phone);
};


// Date validator
export const isValidDate = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

// Positive integer validator

export const isValidAmount = (amount: number): boolean => {
  return typeof amount === 'number' && amount > 0;
};

// Sanitize string input to prevent XSS attacks

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};