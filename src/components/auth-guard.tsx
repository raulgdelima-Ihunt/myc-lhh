import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    async function checkUserRole() {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          setRole(data.role);
        }
      } catch (err) {
        console.error("Error checking role:", err);
      } finally {
        setCheckingRole(false);
      }
    }

    if (!loading) {
      if (!user) {
        navigate({ to: "/" });
      } else {
        checkUserRole();
      }
    }
  }, [user, loading, navigate]);

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isConsultorRoute = location.pathname.startsWith("/consultor");

  useEffect(() => {
    if (checkingRole || !user) return;

    if (isAdminRoute && role !== "admin") {
      navigate({ to: role === "consultor" ? "/consultor" : "/dashboard" });
    } else if (isConsultorRoute && role !== "consultor" && role !== "admin") {
      navigate({ to: "/dashboard" });
    }
  }, [role, checkingRole, user, isAdminRoute, isConsultorRoute, navigate]);

  if (loading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isAdminRoute && role !== "admin") return null;
  if (isConsultorRoute && role !== "consultor" && role !== "admin") return null;

  return <>{children}</>;
}
