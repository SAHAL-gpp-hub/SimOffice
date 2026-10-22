/**
 * Phase 0 cosmetic catalog — the single source of truth for valid appearance values.
 *
 * Mirrors server/src/roster-entries/roster-entries.service.ts VALID_COLOR_SCHEMES.
 * Growing the catalog is a content change; the server allow-list must be updated
 * in sync (API Spec §11.1, DBD §3.5, API Spec §17 sign-off item).
 *
 * Phase 0 scope: color scheme + name tag ONLY.
 * No hats, outfits, or accessories (PRD §9.2 MVP, UIUXD v2.1 SCR-07).
 */

export interface ColorSchemeOption {
  id: string;           // stored in roster_entries.appearance.colorScheme
  label: string;        // human-readable label shown in the swatch grid
  hex: string;          // used to tint the character mesh and render the swatch
  darkText: boolean;    // true → use dark label on swatch, false → light label
}

export const COLOR_SCHEMES: ColorSchemeOption[] = [
  { id: 'bright-blue',      label: 'Blue',      hex: '#3B8BEB', darkText: false },
  { id: 'coral-red',        label: 'Red',       hex: '#E85454', darkText: false },
  { id: 'forest-green',     label: 'Green',     hex: '#3DA05A', darkText: false },
  { id: 'golden-yellow',    label: 'Yellow',    hex: '#F5C842', darkText: true  },
  { id: 'lavender-purple',  label: 'Purple',    hex: '#9B6DCC', darkText: false },
  { id: 'ocean-teal',       label: 'Teal',      hex: '#2AA5A0', darkText: false },
  { id: 'rose-pink',        label: 'Pink',      hex: '#E06B9A', darkText: false },
  { id: 'slate-grey',       label: 'Grey',      hex: '#7A8A99', darkText: false },
];

export interface AppearanceSelection {
  colorScheme: string;
}

/** Returns the ColorSchemeOption for a given id, or undefined if not found. */
export function findColorScheme(id: string): ColorSchemeOption | undefined {
  return COLOR_SCHEMES.find((c) => c.id === id);
}
