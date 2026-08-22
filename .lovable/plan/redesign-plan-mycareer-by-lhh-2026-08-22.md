# Redesign Plan - MyCareer by LHH

Redesign the portal to align with the visual identity of the MyCareer by LHH official site (#6B2D8B purple, #E91E63 magenta, Montserrat font).

## User Review Required

> [!IMPORTANT]
> This redesign focuses on the visual layer (CSS and components). No database schemas or import logic will be changed.

- **Color Palette**: Switching from Violet/Lavender to Deep Purple (#6B2D8B) and Magenta (#E91E63).
- **Typography**: Importing 'Montserrat' from Google Fonts and applying it globally.
- **Login Page**: Replacing icons with stylized text "my career by LHH".

## Proposed Changes

### Global Styles and Theme
- Update `src/styles.css` with the new color palette using `oklch` values (mapped from the requested hex codes).
- Add Google Fonts import for Montserrat in `src/routes/__root.tsx`.
- Configure global `border-radius` (8px for cards, 6px for buttons) and `box-shadow`.

### Components and Routes
- **Login (`src/routes/index.tsx`)**:
  - Implement stylized "my career by LHH" logo.
  - Update buttons and input focus states to #6B2D8B.
  - Apply white card with 0 2px 8px shadow.
- **Admin Layout and Dashboard (`src/routes/admin.tsx`, `src/routes/admin.index.tsx`)**:
  - Redesign header with white background and #E0E0E0 border.
  - Update summary cards and table styles (alternating rows, purple hover).
  - Use #6B2D8B for primary buttons and #4CAF50 for "active" status badges.
- **Candidate Dashboard (`src/routes/dashboard.tsx`)**:
  - Header with #6B2D8B background and white text.
  - Apply colored left borders to summary cards (#6B2D8B, #4CAF50, #E91E63).
  - Update table links and status badges (Entrevista -> Green, CV Enviado -> Purple).
- **Candidate Detail (`src/routes/admin.candidato.$id.tsx`)**:
  - Card layouts with #F5F5F5 background for data fields.
  - Amber/Yellow theme for the temporary password card.

## Technical Details
- Color conversion:
  - #6B2D8B -> oklch(0.38 0.16 302.6)
  - #E91E63 -> oklch(0.59 0.23 0.8)
  - #2D1B4E -> oklch(0.23 0.08 296.6)
- Utility classes: Use shadcn-like semantic tokens in `styles.css` so `bg-primary` automatically uses the new purple.
- Clean up: Search for and remove any hardcoded `violet-600`, `indigo-600`, or diagnostic debug text.
