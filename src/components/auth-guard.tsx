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
          .single();
        
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

  useEffect(() => {
    if (!checkingRole && user) {
      const isAdminRoute = location.pathname.startsWith("/admin");
      const isDashboardRoute = location.pathname.startsWith("/dashboard");

      if (isAdminRoute && role !== "admin") {
        navigate({ to: "/dashboard" });
      } else if (isDashboardRoute && role === "admin") {
        // Allow admin to see dashboard if they want, but usually redirect to admin
        // navigate({ to: "/admin" });
      }
    }
  }, [role, checkingRole, user, location.pathname, navigate]);

  if (loading || checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Final gate check to prevent flicker before redirect
  const isAdminRoute = location.pathname.startsWith("/admin");
  if (isAdminRoute && role !== "admin") {
    return null;
  }

  return <>{children}</>;
}

