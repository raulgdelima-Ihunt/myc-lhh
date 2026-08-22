# Plan - Enhanced Indications Import and Matching

Refine the indications import process to ensure only relevant sheets are processed, improve name matching accuracy, and provide a manual vinculation interface for unmatched records.

## User Review Required

> [!IMPORTANT]
> The manual vinculation interface will allow you to link spreadsheet names to database candidates or ignore them (for non-candidate staff).

## Technical Details

### 1. Sheet Selection Logic
- Process only sheets containing at least 3 mandatory columns: "AÇÃO/Indicação", "POSIÇÃO/Vagas", and "EMPRESA/Consultoria".
- Add a debug section to the UI listing processed and ignored sheets (with reasons).

### 2. Advanced Name Matching
- **Agressive Normalization**: Remove double spaces, trim, remove diacritics (accents), and lowercase.
- **3-Step Matching**:
    1. Exact match by `referral_id`.
    2. Exact match by `nome_normalizado`.
    3. Partial match: comparing the first two words of the name.
- **Manual Vinculation**:
    - For unmatched names, calculate similarity using word-based comparison.
    - Display the 3 most similar candidates as suggestions in a dropdown.
    - Provide an "Ignorar" option for staff names.

### 3. UI/UX Enhancements
- Update `ImportIndicacoesModal` to include the "Vincular manualmente" section.
- Display similarity scores or status in the preview.

## Implementation Steps

### Database & Helpers
1. Add `levenshtein` or word-overlap helper in `src/lib/string-utils.ts`.

### Component Refactor (`src/components/admin/import-indicacoes-modal.tsx`)
1. Update `handleFileChange` with the new sheet filtering logic.
2. Implement the 3-step matching algorithm.
3. Update `previewData` state to store suggestions and vinculation status.
4. Add the manual vinculation UI section.
5. Update `handleConfirmImport` to respect manual vinculations and ignores.
