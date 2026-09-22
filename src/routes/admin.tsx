import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | MyCareer by LHH" },
      { name: "description", content: "Área administrativa do Portal MyCareer by LHH." },
      { property: "og:title", content: "Administração | MyCareer by LHH" },
      { property: "og:description", content: "Área administrativa do Portal MyCareer by LHH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}
