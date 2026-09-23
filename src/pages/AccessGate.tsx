import { useAuth } from "../auth";
import logo from "../assets/uorixa-logo.png";

export function AccessGate() {
  const { profile, profileError, session, signOut } = useAuth();
  const email = profile?.email || session?.user.email || "";
  const disabled = profile?.status === "disabled";

  const title = profileError
    ? "Account check failed"
    : disabled
      ? "Account disabled"
      : "Waiting for approval";

  const message = profileError
    ? profileError
    : disabled
      ? "An administrator disabled this account. You cannot open the studio until it is enabled again."
      : "This account is signed in, including with Google, but it is not an administrator yet. An administrator has to grant access before you can open the studio.";

  return (
    <div className="qx-login">
      <div className="qx-stage">
        <section className="qx-card qx-gate">
          <img src={logo} alt="UORIXA" className="qx-logo qx-logo-card" />
          <h1>{title}</h1>
          <p className="qx-lead">{message}</p>
          {email ? <p className="qx-hint">{email}</p> : null}
          <button type="button" className="qx-submit" onClick={() => void signOut()}>
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
