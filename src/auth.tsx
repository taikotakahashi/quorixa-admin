import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

export type OAuthProvider = "google" | "apple" | "azure";

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithProvider: (provider: OAuthProvider) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return error?.message ?? null;
      },
      async signInWithProvider(provider) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
            scopes: provider === "azure" ? "email openid profile" : undefined,
            queryParams:
              provider === "azure" ? { prompt: "select_account" } : undefined,
          },
        });
        return error?.message ?? null;
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
