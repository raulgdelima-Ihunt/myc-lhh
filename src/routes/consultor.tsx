import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";

export const Route = createFileRoute("/consultor")({
  head: () => ({
    meta: [
      { title: "Área do Consultor | MyCareer by LHH" },
      { property: "og:title", content: "Área do Consultor | MyCareer by LHH" },
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
