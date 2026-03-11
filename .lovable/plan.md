

## Plan: Improve Dark Mode Text Visibility

The main issue is that several CSS variables and component-level text colors are too dim in dark mode. Here's what needs to change:

### 1. Update Dark Mode CSS Variables (`src/index.css`)
- **`--muted-foreground`**: Change from `220 10% 75%` to `220 10% 90%` — this affects all `text-muted-foreground` usage across the app (labels, subtitles, placeholders, helper text)
- **`--secondary-foreground`**: Ensure it's `0 0% 100%` (already is)

### 2. Component-Level Fixes
Several components use `text-primary` which in dark mode is golden yellow (`45 95% 55%`). Some elements use `text-accent-foreground` or other non-white colors. Key fixes:

- **PlayerManager**: Jersey number badge uses `text-primary` — switch to `dark:text-white`
- **StandingsView**: `text-success` and `text-destructive` for W/L columns are fine for contrast, but `text-accent` for points could use a brighter shade — already golden, acceptable
- **LoginPage**: Already uses appropriate foreground colors

### 3. Files to Edit
- `src/index.css` — bump `--muted-foreground` lightness in `.dark` block
- `src/components/PlayerManager.tsx` — jersey badge dark mode text
- `src/components/TeamManager.tsx` — minor text adjustments
- `src/components/PoolManager.tsx` — pool heading text
- `src/components/PlayoffBracket.tsx` — bracket text

This is a minimal, targeted change — raising the muted-foreground lightness will fix the majority of dim text across all pages (Scoreboard, Standings, Fixtures, etc.) in one go.

