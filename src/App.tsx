import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { ToastProvider } from "./components/Toast";
import { Shell } from "./Shell";
import { AccessGate } from "./pages/AccessGate";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { LocationsPage } from "./pages/LocationsPage";
import { TeamPage } from "./pages/TeamPage";
import { InsightsPage } from "./pages/InsightsPage";
import { CaseStudiesPage } from "./pages/CaseStudiesPage";
import { ClientsPage } from "./pages/ClientsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { session, profile, profileError, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-page">
        <div className="muted" style={{ color: "#94a3b8" }}>
          Loading studio…
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  const allowed = profile?.role === "admin" && profile.status === "active" && !profileError;
  if (!allowed) return <AccessGate />;
  return children;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <Protected>
                <Shell>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/locations" element={<LocationsPage />} />
                    <Route path="/team" element={<TeamPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/case-studies" element={<CaseStudiesPage />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/users" element={<UsersPage />} />
                  </Routes>
                </Shell>
              </Protected>
            }
          />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
