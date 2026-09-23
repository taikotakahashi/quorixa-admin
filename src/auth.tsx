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

export type OAuthProvider = "google";

export type AccountRole = "admin" | "member";
export type AccountStatus = "pending" | "active" | "disabled";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AccountRole;
  status: AccountStatus;
};

type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (fullName: string, email: string, password: string) => Promise<string | null>;
  signInWithProvider: (provider: OAuthProvider) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

const profileSelect = "id, email, full_name, role, status";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = (next: Session | null) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }
      const userId = next.user.id;
      setLoading(true);
      setTimeout(() => {
        void supabase
          .from("profiles")
          .select(profileSelect)
          .eq("id", userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!active) return;
            setProfile((data as Profile | null) ?? null);
            setProfileError(error?.message ?? null);
            setLoading(false);
          });
      }, 0);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (active) load(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) load(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      profile,
      profileError,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return error?.message ?? null;
      },
      async signUp(fullName, email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) return error.message;
        if (!data.session) return "CONFIRM";
        return null;
      },
      async signInWithProvider(provider) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
            queryParams: { prompt: "select_account" },
          },
        });
        return error?.message ?? null;
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, profileError, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
