"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  clearStoredToken,
  getStoredToken,
  loginUser,
  registerUser,
  setStoredToken,
} from "./api";

interface AuthState {
  token: string | null;
  email: string | null;
  /** True until the stored token has been read from localStorage on mount. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const EMAIL_STORAGE_KEY = "gabriel_email";

interface StoredAuth {
  token: string | null;
  email: string | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // null = "haven't read localStorage yet" (isLoading). Reading it in an
  // effect rather than a useState initializer avoids a server/client
  // hydration mismatch, since localStorage doesn't exist during SSR.
  const [stored, setStored] = useState<StoredAuth | null>(null);

  useEffect(() => {
    // Synchronizing with an external system (localStorage) on mount - the
    // documented valid use of an effect, per https://react.dev/learn/you-might-not-need-an-effect.
    // Can't read it in the useState initializer instead: localStorage doesn't
    // exist during SSR, so that would cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored({ token: getStoredToken(), email: localStorage.getItem(EMAIL_STORAGE_KEY) });
  }, []);

  const isLoading = stored === null;
  const token = stored?.token ?? null;
  const email = stored?.email ?? null;

  function persist(newToken: string, newEmail: string) {
    setStoredToken(newToken);
    localStorage.setItem(EMAIL_STORAGE_KEY, newEmail);
    setStored({ token: newToken, email: newEmail });
  }

  async function login(loginEmail: string, password: string) {
    const auth = await loginUser(loginEmail, password);
    persist(auth.token, auth.email);
  }

  async function register(registerEmail: string, password: string) {
    const auth = await registerUser(registerEmail, password);
    persist(auth.token, auth.email);
  }

  function logout() {
    clearStoredToken();
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    setStored({ token: null, email: null });
  }

  return (
    <AuthContext.Provider value={{ token, email, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
