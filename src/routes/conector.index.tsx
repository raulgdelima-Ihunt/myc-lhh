import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Briefcase, Users, LogOut, Search, Pencil, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMyRole } from '@/hooks/use-consultor';
import { useConectorCandidato, useConectorIndicacoes, type ConectorIndicacao } from '@/hooks/use-conector';
import { supabase } from '@/integrations/supabase/client';
import { conectorCandidateProfileFields, indicationEditFields, indicationEditPayload } from '@/lib/portal-editing';
import { formatDateBR, normalizeText, DEFAULT_ACTION_DATE } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export const Route = createFileRoute('/conector/')({
  head: () => ({ meta: [
    { title: 'Minhas Indicações | MyCareer by LHH' },
    { name: 'description', content: 'Consulte e atualize suas indicações de candidatos no MyCareer by LHH.' },
    { property: 'og:title', content: 'Minhas Indicações | MyCareer by LHH' },
    { property: 'og:description', content: 'Consulte e atualize suas indicações de candidatos no MyCareer by LHH.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ConectorDashboard,
});

function ConectorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: role } = useMyRole(user?.id);
  const { data: rows = [], isLoading, error, refetch } = useConectorIndicacoes(user?.id);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ConectorIndicacao | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const { data: profile, isLoading: profileLoading } = useConectorCandidato(profileId ?? undefined);
  const filtered = useMemo(() => {
    const term = normalizeText(search);
    return rows.filter(row => normalizeText(`${row.candidato_nome} ${row.vaga} ${row.empresa}`).includes(term));
  }, [rows, search]);
  const candidateCount = new Set(rows.flatMap(row => row.candidato_id ? [row.candidato_id] : [])).size;
  function edit(row: ConectorIndicacao) {
    setDraft(Object.fromEntries(indicationEditFields.map(([key]) => [key, row[key] ?? ''])));
    setSelected(row);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || saving) return;
    if (!draft['vaga']?.trim() || !draft['empresa']?.trim()) { toast.error('Preencha vaga e empresa.'); return; }
    const payload = indicationEditPayload(draft, selected);
    if (!Object.keys(payload).length) { setSelected(null); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('indicacoes').update(payload).eq('id', selected.id).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Indicação não atualizada.');
      await queryClient.invalidateQueries({ queryKey: ['conector-indicacoes', user?.id] });
      await Promise.all(['candidato-indicacoes', 'consultor-carteira', 'candidate-dashboard'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      setSelected(null);
      toast.success('Indicação atualizada com sucesso');
    } catch { toast.error('Não foi possível salvar a indicação. Tente novamente.'); }
    finally { setSaving(false); }
  }
  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: '/', replace: true });
  }
  return <div className="min-h-screen bg-muted p-4 sm:p-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-4">
          <img src="/logo.svg" alt="MyCareer by LHH" className="h-auto w-[120px]" />
          <div><h1 className="text-2xl font-bold text-foreground">Minhas Indicações</h1><p className="mt-1 text-sm text-muted-foreground">{role?.nome_consultor || user?.email}</p></div>
        </div>
        <Button variant="outline" onClick={logout}><LogOut />Sair</Button>
      </header>
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-muted-foreground">Total de indicações</p><p className="text-3xl font-bold text-primary">{rows.length}</p></div><Briefcase className="text-primary" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-muted-foreground">Candidatos distintos</p><p className="text-3xl font-bold text-primary">{candidateCount}</p></div><Users className="text-primary" /></CardContent></Card>
      </div>
      <section className="bg-background">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-6"><h2 className="text-lg font-semibold">Indicações</h2><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar indicações" placeholder="Buscar candidato, vaga ou empresa..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
        {isLoading ? <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin text-primary" /></div> : error ? <div className="p-12 text-center text-destructive"><p>Não foi possível carregar suas indicações.</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div> : filtered.length ? <Table>
          <TableHeader className="bg-muted"><TableRow>{['Candidato', 'Vaga', 'Empresa', 'Data Ação', 'Resultado', 'Ação Tipo', ''].map((label, index) => <TableHead key={index}>{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.map(row => { const candidatoId = row.candidato_id; return <TableRow key={row.id} className="cursor-pointer hover:bg-accent" onClick={() => edit(row)}>
            <TableCell className="font-medium">{candidatoId ? <button type="button" className="cursor-pointer text-left text-primary hover:underline" title="Ver dados do candidato" onClick={e => { e.stopPropagation(); setProfileId(candidatoId); }}>{row.candidato_nome}</button> : row.candidato_nome}</TableCell>
            <TableCell>{row.vaga_link ? <a href={row.vaga_link} target="_blank" rel="noreferrer" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{row.vaga}</a> : row.vaga}</TableCell>
            <TableCell>{row.empresa}</TableCell><TableCell className="whitespace-nowrap">{formatDateBR(row.data_acao)}</TableCell><TableCell>{row.resultado || '—'}</TableCell><TableCell>{row.acao_tipo || '—'}</TableCell>
            <TableCell><Button variant="ghost" size="icon" aria-label={`Editar indicação ${row.vaga}`} title="Editar indicação" onClick={e => { e.stopPropagation(); edit(row); }}><Pencil /></Button></TableCell>
          </TableRow>; })}</TableBody>
        </Table> : <p className="p-12 text-center text-muted-foreground">Nenhuma indicação encontrada.</p>}
      </section>
      <footer className="py-8 text-center text-xs text-muted-foreground">@2026 LHH MyCareer Portal</footer>
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !saving) setSelected(null); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Indicação</DialogTitle><DialogDescription>{selected?.candidato_nome}</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-6"><div className="grid gap-4 sm:grid-cols-2">
          {indicationEditFields.map(([key, label]) => <label key={key} className={`space-y-1 text-sm font-medium ${key === 'observacoes' ? 'sm:col-span-2' : ''}`}>
            <span>{label}</span>{key === 'observacoes' || key === 'follow_up' ? <Textarea aria-label={label} value={draft[key] ?? ''} disabled={saving} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} /> : <Input aria-label={label} type={key === 'data_acao' || key === 'data_retorno' ? 'date' : 'text'} required={key === 'vaga' || key === 'empresa'} value={draft[key] === DEFAULT_ACTION_DATE ? '' : draft[key] ?? ''} disabled={saving} onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))} />}
          </label>)}
        </div><DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}{saving ? 'Salvando...' : 'Salvar'}</Button></DialogFooter></form>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(profileId)} onOpenChange={open => { if (!open) setProfileId(null); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Users size={18} />Cadastro do Candidato</DialogTitle><DialogDescription>Somente leitura</DialogDescription></DialogHeader>
        {profileLoading ? <div className="p-12 text-center"><Loader2 className="mx-auto animate-spin text-primary" /></div> : profile ? <div className="grid gap-4 sm:grid-cols-2">
          {conectorCandidateProfileFields.map(([key, label]) => <div key={key} className={key === 'observacao' ? 'sm:col-span-2' : ''}>
            <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{label}</p>
            <p className="text-sm font-medium text-foreground">{profile[key] || '—'}</p>
          </div>)}
        </div> : <p className="p-8 text-center text-muted-foreground">Não foi possível carregar os dados deste candidato.</p>}
        <DialogFooter><Button onClick={() => setProfileId(null)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
