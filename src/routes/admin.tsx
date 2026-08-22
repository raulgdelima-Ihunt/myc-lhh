import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/components/auth-guard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | MyCareer by LHH" },
      { property: "og:title", content: "Administração | MyCareer by LHH" },
      { property: "og:image", content: "/logo.svg" },
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
