# Plan - Secure User Roles and Polishing

Implement strict RLS policies for `user_roles` to prevent self-assignment and update the "Create Access" flow to use the privileged server-side client.

## User Review Required

> [!IMPORTANT]
> The security fixes require running a database migration to reset RLS policies on the `user_roles` table.

- **Security Policy Change**: Do you confirm that only the `service_role` (backend) should be able to create or modify user roles? (Authenticated users will still be able to read their own roles).

## Proposed Changes

### Database & Security
- Run migration to drop all existing policies on `user_roles`.
- Create `select_own_role` policy for `authenticated` (SELECT only).
- Create `service_manages_roles` policy for `service_role` (ALL).
- Remove any generic `INSERT`/`UPDATE` grants for `authenticated` on `user_roles`.

### Backend Implementation
- Create `src/lib/auth.functions.ts` to host a secure `createCandidateAccess` server function.
- This function will use `supabaseAdmin` to:
    1. Perform `auth.admin.createUser` (or `signUp` if preferred, but `admin` is safer for pre-confirmed users).
    2. Insert the 'user' role into `user_roles`.
- Update `src/routes/admin.candidato.$id.tsx` to call this new server function instead of using the client-side `supabase.auth.signUp`.

### UI Polishing
- Clean up `src/routes/index.tsx` by removing the instruction text from the body (it seems the user wants it gone or replaced, interpreting the prompt as a request to clean up the landing page).
- Ensure navigation and role-based redirects are robust.

## Technical Details
- **Migration**:
  ```sql
  DROP POLICY IF EXISTS "user_reads_own_role" ON user_roles;
  DROP POLICY IF EXISTS "anyone_authenticated_reads_own_role" ON user_roles;
  DROP POLICY IF EXISTS "service_role_full_access" ON user_roles;
  DROP POLICY IF EXISTS "admin_all_user_roles" ON user_roles;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_roles;

  CREATE POLICY "select_own_role" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "service_manages_roles" ON user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```
- **Server Function**: Using `createServerFn` with `supabaseAdmin` imported inside the handler to prevent client-side leakage.
