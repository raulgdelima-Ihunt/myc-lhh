import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portal MyCareer by LHH" },
      { name: "description", content: "Acompanhe suas indicações de mercado em tempo real. Acesso exclusivo para clientes LHH." },
      { property: "og:title", content: "Portal MyCareer by LHH" },
      { property: "og:description", content: "Acompanhe suas indicações de mercado em tempo real." },
      { property: "og:image", content: "/logo.svg" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://myc-lhh.lovable.app" },
      { property: "og:site_name", content: "MyCareer by LHH" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Portal MyCareer by LHH" },
      { name: "twitter:description", content: "Acompanhe suas indicações de mercado em tempo real." },
      { name: "twitter:image", content: "/logo.svg" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("type") === "recovery") {
      setIsRecoverySession(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDebugInfo("");

    const cleanEmail = email.trim().toLowerCase();

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setDebugInfo(`Auth: erro (${error.message}) | Candidato encontrado: - | Redirecionando para: -`);
      setError("E-mail ou senha incorretos");
      setLoading(false);
    } else {
      // Check user role to decide redirect
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleData?.role === "admin") {
        setDebugInfo("Auth: sucesso | Perfil: admin | Redirecionando para: /admin");
        navigate({ to: "/admin" });
      } else if (roleData?.role === "consultor") {
        setDebugInfo("Auth: sucesso | Perfil: consultor | Redirecionando para: /consultor");
        navigate({ to: "/consultor" });
      } else {
        // Case-insensitive candidate lookup (spreadsheet e-mails vary in casing/spacing)
        const { data: candidateData } = await supabase
          .from("candidatos")
          .select("id")
          .ilike("email", cleanEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (candidateData) {
          setDebugInfo("Auth: sucesso | Candidato encontrado: sim | Redirecionando para: /dashboard");
          navigate({ to: "/dashboard" });
        } else {
          setDebugInfo(
            `Auth: sucesso | Candidato encontrado: não (${cleanEmail}) | Redirecionando para: -`,
          );
          setError("Acesso não autorizado. Entre em contato com seu consultor.");
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    }
  };

  const handleSendRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRecoveryMessage("");
    setRecoveryLoading(true);

    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: window.location.origin,
    });

    if (recoveryError) {
      setError("Não foi possível enviar o link de recuperação. Tente novamente.");
    } else {
      setRecoveryMessage("Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
    }

    setRecoveryLoading(false);
  };

  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRecoveryMessage("");

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setRecoveryLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError("Não foi possível redefinir a senha. Solicite um novo link.");
    } else {
      setRecoveryMessage("Senha redefinida com sucesso. Faça login com a nova senha.");
      setIsRecoverySession(false);
      setNewPassword("");
      setConfirmPassword("");
      window.history.replaceState(null, "", window.location.pathname);
      await supabase.auth.signOut();
    }

    setRecoveryLoading(false);
  };

  return (
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

        {isRecoverySession ? (
          <form onSubmit={handleUpdateRecoveredPassword} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <Input
                  type="password"
                  placeholder="Nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="py-2.5 pl-10 pr-4"
                  required
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="py-2.5 pl-10 pr-4"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {recoveryMessage && <p className="text-sm text-[#4CAF50]">{recoveryMessage}</p>}

            <Button type="submit" disabled={recoveryLoading} className="w-full rounded-[6px]">
              {recoveryLoading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="py-2.5 pl-10 pr-4"
                required
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-2.5 pl-10 pr-10"
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-[6px]"
          >
            {loading ? "Acessando..." : "Acessar Portal"}
          </Button>
        </form>
        )}

        {!isRecoverySession && (
          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword((current) => !current);
                setError("");
                setRecoveryMessage("");
                setRecoveryEmail(email);
              }}
              className="text-primary hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        )}

        {showForgotPassword && !isRecoverySession && (
          <form onSubmit={handleSendRecoveryEmail} className="mt-4 space-y-3 rounded-lg border border-border bg-[#F5F5F5] p-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                type="email"
                placeholder="Digite seu e-mail"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" disabled={recoveryLoading} className="w-full rounded-[6px]">
              {recoveryLoading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            {recoveryMessage && <p className="text-xs leading-relaxed text-[#4CAF50]">{recoveryMessage}</p>}
          </form>
        )}

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-gray-500">
          <p>Acesso exclusivo para clientes LHH</p>
          <p className="mt-2 text-xs">© 2026 LHH Recruitment Portal</p>
        </div>
      </div>
    </div>
  );
}
