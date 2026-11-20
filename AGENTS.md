<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Connector indication reads use a paginated browser hook and client-side candidate-name join under existing RLS; never use privileged clients for this dashboard.
- Staff editors construct changed-field updates from explicit allowlists in portal-editing; identity, ownership and unrelated candidate fields must not enter save payloads.
- Staff route permissions and role home destinations share portal-editing helpers to keep connector/admin/consultant routing consistent.
