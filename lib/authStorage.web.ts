const memory = new Map<string, string>();

export const authStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') return memory.get(key) ?? null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') memory.set(key, value);
    else window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') memory.delete(key);
    else window.localStorage.removeItem(key);
  },
};

export const detectSessionInUrl = true;
