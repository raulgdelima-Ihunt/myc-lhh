import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Eye, EyeOff, Lock, Mail } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-mail ou senha incorretos");
      setLoading(false);
    } else {
      navigate({ to: "/admin" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mb-4">
            <Briefcase size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            PORTAL DE ACOMPANHAMENTO — LHH
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
          >
            {loading ? "Acessando..." : "Acessar Portal"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <a href="#" className="text-indigo-600 hover:underline">
            Esqueci minha senha
          </a>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-gray-500">
          <p>Acesso exclusivo para clientes LHH</p>
          <p className="mt-2 text-xs">© 2026 LHH Recruitment Portal</p>
        </div>
      </div>
    </div>
  );
}
