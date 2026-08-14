# Portal de Acompanhamento LHH - Implementation Plan

We will build a Recruitment Tracking Portal with authentication using Lovable Cloud (Supabase).

## User Features

- **Authentication**: Secure login and logout using email and password.
- **Role-based Navigation**: 
  - Admin users land on a dedicated admin panel.
  - Candidate users land on a candidate dashboard.
- **Route Protection**: Unauthorized users are redirected to the login page.

## Technical Details

- **Framework**: TanStack Start v1 (React 19, TanStack Router).
- **Styling**: Tailwind CSS v4 with violet/lavanda theme.
- **Backend/Auth**: Lovable Cloud (Supabase Auth).

## Implementation Steps

### 1. Project Setup
- [ ] Initialize Supabase client.
- [ ] Install `lucide-react` for icons.

### 2. Authentication Logic
- [ ] Create `src/hooks/use-auth.tsx` to manage session state.
- [ ] Create `src/components/auth-guard.tsx` for route protection.

### 3. Routes & Pages
- [ ] **Login Page** (`src/routes/index.tsx`):
  - LHH branding, briefcase icon, email/password form, "Acessar Portal" button.
- [ ] **Admin Page** (`src/routes/admin.tsx`):
  - Protected page showing logged-in email and logout button.
- [ ] **Candidate Dashboard** (`src/routes/dashboard.tsx`):
  - Protected page showing logged-in email and logout button.

### 4. Layout & Theming
- [ ] Update `src/styles.css` with violet/indigo colors.
- [ ] Configure `src/routes/__root.tsx`.
