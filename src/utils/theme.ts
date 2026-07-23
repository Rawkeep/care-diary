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
