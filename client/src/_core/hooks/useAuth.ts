import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../../lib/api";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type SessionResponse = {
  user?: AuthUser | null;
  session?: { id: string; expiresAt: string } | null;
} | null;

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/get-session"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Unable to read the authentication session.");
      const payload = (await response.json()) as SessionResponse;
      setUser(payload?.user ?? null);
      setError(null);
      return payload?.user ?? null;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("Unable to read the authentication session.");
      setUser(null);
      setError(nextError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    setLogoutPending(true);
    try {
      const response = await fetch(apiUrl("/api/auth/sign-out"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      setUser(null);
      setError(null);
    } finally {
      setLogoutPending(false);
    }
  }, []);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || logoutPending || user || typeof window === "undefined") return;
    const target = redirectPath || "/auth/sign-in";
    if (window.location.pathname !== target) window.location.assign(target);
  }, [redirectOnUnauthenticated, redirectPath, loading, logoutPending, user]);

  return {
    user,
    loading: loading || logoutPending,
    error,
    isAuthenticated: Boolean(user),
    refresh,
    logout,
  };
}
