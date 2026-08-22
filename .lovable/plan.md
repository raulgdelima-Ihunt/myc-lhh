# Plan: Expand Database Schema and Update Excel Import Logic

We need to update the database schema, expand the Excel import logic to support both old and new formats (including the `referral_id` column), and update the candidate detail page to display new fields.

## User Review Required

> [!IMPORTANT]
> - The new import logic uses `referral_id` as the primary deduplication key if present, falling back to `nome_normalizado`.
> - The parser will automatically detect the format based on the presence of the `REFERRAL` column.

## Technical Details

### 1. Database Schema Migration
Execute SQL to add new columns to `candidatos` and `indicacoes` tables.
- **Table `candidatos`**: `referral_id` (unique), `distribuicao`, `idade`, `linkedin`, `inicio_programa`, `termino_programa`, `status_programa`, `ultima_posicao`, `posicoes_alvo`, `ultimo_segmento`, `ultima_empresa`, `segmento_alvo`, `pretensao_salarial`, `mobilidade`, `local_residencia`, `empresas_alvo`, `observacao`.
- **Table `indicacoes`**: `origem`, `linkedin_candidato`, `data_retorno`, `follow_up`, `observacoes`.

### 2. Update `candidatos` Import Logic (`src/components/admin/import-modal.tsx`)
- Implement flexible column detection (case-insensitive, trim, contains).
- Add support for new column mappings (REFERRAL, NOME, DISTRIBUIÇÃO, etc.).
- Maintain compatibility with the old "Assessorado" format.
- Add "LHH" filter for the "Parceiro" column if it exists.
- Implement deduplication logic: `referral_id` primary, `nome_normalizado` fallback.

### 3. Update `indicacoes` Import Logic (`src/components/admin/import-indicacoes-modal.tsx`)
- Update column mapping (REFERRAL, NOME, AÇÃO, POSIÇÃO, etc.).
- Update vincular (linking) logic: Prioritize `referral_id` mapping, fallback to `nome_normalizado`.
- Support multiple sheets where "Cliente" or "NOME" is present.
- Implement deduplication: `UNIQUE(candidato_id, vaga, empresa, data_acao)`.

### 4. Update UI Components
- **Candidate Details (`src/routes/admin.candidato.$id.tsx`)**: 
  - Show new fields in "Dados pessoais" and "Perfil profissional" sections.
- **Import Previews**: Update sample tables to show new columns.

### 5. Type Definitions
- Update `Database` types in `src/integrations/supabase/types.ts` to reflect schema changes.

## Security
- Existing RLS policies remain in place.
- Candidate access creation continues to use `supabaseAdmin` (service role) via server functions.
