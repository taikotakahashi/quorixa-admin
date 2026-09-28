import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  notify_email?: boolean;
  notify_push?: boolean;
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

const profileSelect = "id, email, full_name, role, status, notify_email, notify_push";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const clearProfile = () => {
      profileUserIdRef.current = null;
      setProfile(null);
      setProfileError(null);
    };

    const fetchProfile = (userId: string, gateUi: boolean) => {
      if (gateUi) setLoading(true);
      // Defer so we never call Supabase from inside onAuthStateChange sync work.
      setTimeout(() => {
        void supabase
          .from("profiles")
          .select(profileSelect)
          .eq("id", userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!active) return;
            const nextProfile = (data as Profile | null) ?? null;
            profileUserIdRef.current = nextProfile?.id ?? userId;
            setProfile(nextProfile);
            setProfileError(error?.message ?? null);
            setLoading(false);
          });
      }, 0);
    };

    const applySession = (next: Session | null, gateUi: boolean) => {
      setSession(next);
      if (!next) {
        clearProfile();
        setLoading(false);
        return;
      }
      const userId = next.user.id;
      if (profileUserIdRef.current === userId) {
        setLoading(false);
        return;
      }
      fetchProfile(userId, gateUi);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      applySession(data.session, true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;

      if (event === "SIGNED_OUT" || !next) {
        applySession(null, false);
        return;
      }

      // Tab focus / JWT refresh — update session only; keep the shell mounted.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(next);
        setLoading(false);
        return;
      }

      // INITIAL_SESSION / SIGNED_IN: gate UI only when we still need this user's profile.
      const needsProfile = profileUserIdRef.current !== next.user.id;
      applySession(next, needsProfile);
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
