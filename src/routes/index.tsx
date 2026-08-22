import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet";


import { useState } from "react";
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
      // Check user role to decide redirect
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (roleData?.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        // If not admin, check if candidate exists
        const { data: candidateData } = await supabase
          .from("candidatos")
          .select("id")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();


        if (candidateData) {
          navigate({ to: "/dashboard" });
        } else {
          setError("Acesso não autorizado. Entre em contato com seu consultor.");
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Portal MyCareer by LHH</title>
        <meta name="description" content="Acompanhe suas indicações de mercado em tempo real. Acesso exclusivo para clientes LHH." />
        <meta property="og:title" content="Portal MyCareer by LHH" />
        <meta property="og:description" content="Acompanhe suas indicações de mercado em tempo real." />
        <meta property="og:image" content="/logo.svg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://myc-lhh.lovable.app" />
        <meta property="og:site_name" content="MyCareer by LHH" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Portal MyCareer by LHH" />
        <meta name="twitter:description" content="Acompanhe suas indicações de mercado em tempo real." />
        <meta name="twitter:image" content="/logo.svg" />
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100">
        <div className="mb-8 text-center">
          <div className="mb-6 flex flex-col items-center">
            <img 
              src="/logo.svg" 
              alt="MyCareer by LHH" 
              className="w-[200px] h-auto mb-2" 
            />
            <p className="text-sm font-semibold text-[#666666]">Portal de Acompanhamento</p>
          </div>
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
                className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                className="w-full rounded-lg border border-border py-2.5 pl-10 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[6px] bg-primary py-2.5 font-semibold text-white transition hover:bg-[#5A2574] disabled:opacity-70"
          >
            {loading ? "Acessando..." : "Acessar Portal"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <a href="#" className="text-primary hover:underline">
            Esqueci minha senha
          </a>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-gray-500">
          <p>Acesso exclusivo para clientes LHH</p>
          <p className="mt-2 text-xs">© 2026 LHH Recruitment Portal</p>
        </div>
      </div>
    </>
  );
}
