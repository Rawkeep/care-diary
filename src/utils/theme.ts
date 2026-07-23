// Manuelle Theme-Wahl (System / Hell / Dunkel) — als Klasse auf <html>,
// gespeichert in localStorage (keine Gesundheitsdaten).
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'care-diary.theme';

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function applyThemePref(pref: ThemePref): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (pref === 'system') localStorage.removeItem(KEY);
  else {
    localStorage.setItem(KEY, pref);
    root.classList.add(`theme-${pref}`);
  }
}

/** Schriftgröße (Barrierefreiheit) — skaliert die rem-Basis der ganzen App */
export type FontPref = 'normal' | 'large' | 'xlarge';

const FONT_KEY = 'care-diary.fontsize';

export function getFontPref(): FontPref {
  const v = localStorage.getItem(FONT_KEY);
  return v === 'large' || v === 'xlarge' ? v : 'normal';
}

export function applyFontPref(pref: FontPref): void {
  const root = document.documentElement;
  root.classList.remove('font-large', 'font-xlarge');
  if (pref === 'normal') localStorage.removeItem(FONT_KEY);
  else {
    localStorage.setItem(FONT_KEY, pref);
    root.classList.add(`font-${pref}`);
  }
}
