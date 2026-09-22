import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ChevronRight, Eye, EyeOff, Lock, Mail, Shield, Users, Zap } from "lucide-react";
import { useAuth } from "../auth";
import { supabase } from "../lib/supabase";
import logo from "../assets/uorixa-logo.png";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.7 7.2l.1.1 6.3 5.3C36.9 41.4 44 36 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.4-.9-2.5-3.8zM14.8 6.5c.6-.8 1.1-1.9.9-3-1 .1-2.1.6-2.8 1.4-.6.7-1.2 1.8-.9 2.9 1.1.1 2.1-.5 2.8-1.3z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

export function LoginPage() {
  const { session, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keep, setKeep] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"in" | "reset" | null>(null);

  if (loading) {
    return (
      <div className="login-page">
        <div className="muted" style={{ color: "#b7bdd6" }}>
          Checking session…
        </div>
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("in");
    setError(null);
    setNotice(null);
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    setBusy(null);
  };

  const onForgot = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email to reset the password.");
      return;
    }
    setBusy("reset");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(null);
    if (resetError) setError(resetError.message);
    else setNotice("Password reset email sent.");
  };

  const unavailable = (message: string) => {
    setError(null);
    setNotice(message);
  };

  return (
    <div className="qx-login">

      <div className="qx-stage">
        <section className="qx-hero">
          <img src={logo} alt="UORIXA" className="qx-logo" />
          <h1>
            Manage
            <span>everything</span>
            in one place
          </h1>
          <p>
            Tasks, teams, goals, and progress.
            <br />
            All you need to move forward.
          </p>
          <ul className="qx-features">
            <li>
              <Zap size={22} strokeWidth={1.6} />
              Productive
            </li>
            <li>
              <Users size={22} strokeWidth={1.6} />
              Collaborative
            </li>
            <li>
              <Shield size={22} strokeWidth={1.6} />
              Secure
            </li>
          </ul>
        </section>

        <form className="qx-card" onSubmit={(e) => void onSubmit(e)}>
          <img src={logo} alt="UORIXA" className="qx-logo qx-logo-card" />
          <h1>Welcome back</h1>
          <p className="qx-lead">Sign in to manage tasks, team, goals, and projects.</p>

          <label className="qx-field">
            <span>Email</span>
            <div className="qx-input">
              <Mail size={16} strokeWidth={1.75} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@yourdomain.com"
                spellCheck={false}
              />
            </div>
          </label>

          <label className="qx-field">
            <span>Password</span>
            <div className="qx-input">
              <Lock size={16} strokeWidth={1.75} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="qx-eye"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
              </button>
            </div>
          </label>

          <div className="qx-row">
            <label className="qx-check">
              <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              <span className="qx-box" aria-hidden="true" />
              Keep me signed in
            </label>
            <button type="button" className="qx-forgot" onClick={() => void onForgot()} disabled={busy !== null}>
              Forgot password?
            </button>
          </div>

          {error && (
            <p className="qx-alert" role="alert">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="qx-note" role="status">
              {notice}
            </p>
          )}

          <button className="qx-submit" type="submit" disabled={busy !== null}>
            {busy === "in" ? "Signing in…" : "Sign in"}
            {busy !== "in" && <ChevronRight size={16} strokeWidth={2} />}
          </button>

          <p className="qx-or">or continue with</p>

          <div className="qx-social">
            <SocialButton label="Continue with Google" onClick={() => unavailable("Use your email and password to sign in.")}>
              <GoogleIcon />
            </SocialButton>
            <SocialButton label="Continue with Apple" onClick={() => unavailable("Use your email and password to sign in.")}>
              <AppleIcon />
            </SocialButton>
            <SocialButton label="Continue with Microsoft" onClick={() => unavailable("Use your email and password to sign in.")}>
              <MicrosoftIcon />
            </SocialButton>
          </div>
        </form>

        <aside className="qx-quote">
          <p>SMALL STEPS</p>
          <strong>BIG PROGRESS</strong>
          <span />
        </aside>
      </div>

      <p className="qx-legal">© 2026 UORIXA. All rights reserved.</p>
    </div>
  );
}

function SocialButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="qx-social-btn" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
