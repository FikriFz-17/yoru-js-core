"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export interface AuthContextType<TUser = any> {
  token: string | null;
  user: TUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: TUser | null) => void;
  logout: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
  storageKey?: string;
}

const AuthContext = createContext<AuthContextType<any> | undefined>(undefined);

const isBrowser = typeof window !== "undefined";

export const AuthProvider = <TUser = any>({
  children,
  storageKey = "token",
}: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<TUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userStorageKey = `${storageKey}_user`;

  // 1. Inisialisasi token & user dari storage saat pertama kali dimuat (SSR Safe)
  useEffect(() => {
    if (isBrowser) {
      try {
        const savedToken = localStorage.getItem(storageKey);
        const savedUser = localStorage.getItem(userStorageKey);

        if (savedToken) setToken(savedToken);
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch (err) {
        console.warn("[Yoru Auth] Gagal membaca storage:", err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [storageKey, userStorageKey]);

  // 2. Sinkronisasi perubahan token & user ke storage
  useEffect(() => {
    if (!isBrowser || isLoading) return;

    try {
      if (token) {
        localStorage.setItem(storageKey, token);
      } else {
        localStorage.removeItem(storageKey);
      }

      if (user) {
        localStorage.setItem(userStorageKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(userStorageKey);
      }
    } catch (err) {
      console.warn("[Yoru Auth] Gagal menyimpan ke storage:", err);
    }
  }, [token, user, storageKey, userStorageKey, isLoading]);

  const login = useCallback((newToken: string, newUser?: TUser | null) => {
    setToken(newToken);
    if (newUser !== undefined) {
      setUser(newUser);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // 3. Event listener auto-logout jika interceptor API menangkap HTTP 401
  useEffect(() => {
    if (!isBrowser) return;

    const handleUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [logout]);

  // 4. Memoize context value agar tidak memicu re-render yang tidak perlu
  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
    }),
    [token, user, isLoading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = <TUser = any>(): AuthContextType<TUser> => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "[Yoru Auth] useAuth must be used within an <AuthProvider>."
    );
  }
  return context as AuthContextType<TUser>;
};

// Helper trigger unauthorized untuk axios / fetch interceptor
export const triggerUnauthorized = () => {
  if (isBrowser) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
};
