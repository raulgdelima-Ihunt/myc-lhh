import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AuthGuard } from '@/components/auth-guard';

export const Route = createFileRoute('/conector')({
  head: () => ({ meta: [
    { title: 'Área do Conector | MyCareer by LHH' },
    { name: 'description', content: 'Indicações de mercado do conector MyCareer by LHH.' },
    { property: 'og:title', content: 'Área do Conector | MyCareer by LHH' },
    { property: 'og:description', content: 'Indicações de mercado do conector MyCareer by LHH.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ConectorLayout,
});
function ConectorLayout() { return <AuthGuard><Outlet /></AuthGuard>; }