import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";

export const Route = createFileRoute("/consultor")({
  head: () => ({
    meta: [
      { title: "Área do Consultor | MyCareer by LHH" },
      { name: "description", content: "Carteira de candidatos e indicações do consultor." },
      { property: "og:title", content: "Área do Consultor | MyCareer by LHH" },
      { property: "og:description", content: "Carteira de candidatos e indicações do consultor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsultorLayout,
});

function ConsultorLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}
