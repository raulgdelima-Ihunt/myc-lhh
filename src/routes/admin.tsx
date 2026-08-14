import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { LogOut, User } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <User size={16} className="mr-1.5" />
                <span>Logado como: {user?.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <LogOut size={18} className="mr-2" />
              Sair
            </button>
          </div>
          
          <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500">Conteúdo administrativo em breve.</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
