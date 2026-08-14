# Implementation Plan - Candidate Experience & Access Management

Implementing the candidate detail view, automated access creation, role-based login redirection, and the candidate dashboard.

## User Interface

### Admin Candidate Detail (`/admin/candidato/:id`)
- **Header**: Display candidate name, email, area, position level, and assigned consultant.
- **Access Creation**: "Criar acesso" button (visible if email exists).
  - Automatically generates an 8-character alphanumeric temporary password.
  - Calls Supabase `signUp`.
  - Displays password clearly for the admin to copy.
  - Handles "already exists" state.
- **Stats**: Cards for total indications, unique companies, and date of the last indication.
- **Indications Table**: List of candidate's indications (Vaga, Empresa, Data, Resultado, Jobhunter) sorted by date.
- **Navigation**: "Voltar" button to return to the list.

### Candidate Dashboard (`/dashboard`)
- **Header**: "PORTAL DE ACOMPANHAMENTO — LHH" with a logout button.
- **Greeting**: Personal greeting "Olá, [nome do candidato]".
- **Stats**: Summary cards for total indications, different companies, and indications this month.
- **Indications Table**:
  - Columns: Vaga (clickable link if available), Empresa, Data, Resultado.
  - Features: Search by position, filter by month, and filter by company.
- **Empty State**: Friendly message if no indications exist.
- **Footer**: "© 2026 LHH Recruitment Portal".

## Technical Details

### Auth & Routing
- **Login Flow Update**:
  1. Login via `supabase.auth.signInWithPassword`.
  2. Query `user_roles` for 'admin'.
  3. If not admin, verify email exists in `candidatos` table.
  4. Redirect to `/admin`, `/dashboard`, or show "Unauthorized" error.
- **Access Generation**: Generate temporary password using a browser-safe random string utility.
- **Data Fetching**:
  - Add `useCandidato(id)` and `useCandidatoIndicacoes(id)` hooks.
  - Add `useCandidateDashboard(email)` hook for the dashboard view.

### Security
- Protected routes via `AuthGuard`.
- Role/Presence checks on the client side after login.
- RLS policies (already in place) will enforce data boundaries.
