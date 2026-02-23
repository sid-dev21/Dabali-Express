const AUTH_TOKEN_KEY = 'auth_token';
const CURRENT_USER_KEY = 'current_user';

const getSession = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocal = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const authStorage = {
  getToken(): string | null {
    return getSession()?.getItem(AUTH_TOKEN_KEY) || null;
  },

  setToken(token: string): void {
    getSession()?.setItem(AUTH_TOKEN_KEY, token);
  },

  getCurrentUserRaw(): string | null {
    return getSession()?.getItem(CURRENT_USER_KEY) || null;
  },

  setCurrentUserRaw(rawUser: string): void {
    getSession()?.setItem(CURRENT_USER_KEY, rawUser);
  },

  clearSession(): void {
    getSession()?.removeItem(AUTH_TOKEN_KEY);
    getSession()?.removeItem(CURRENT_USER_KEY);
  },

  clearLegacyLocalStorage(): void {
    getLocal()?.removeItem(AUTH_TOKEN_KEY);
    getLocal()?.removeItem(CURRENT_USER_KEY);
  },
};

