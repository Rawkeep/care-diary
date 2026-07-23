// UI-Zustand (Zustand-Store). Fachdaten liegen ausschließlich in Dexie —
// hier nur Navigations-/Sitzungszustand. activeProfileId wird als unkritischer
// Zeiger in localStorage gehalten (keine Gesundheitsdaten).
import { create } from 'zustand';
import { hasPin } from '../utils/pin';

export type View = 'home' | 'history' | 'meds' | 'more';
export type FormKind = 'intake' | 'event' | 'observation' | 'weight' | null;

/** Berichtszeitraum als lokale Day-Keys (YYYY-MM-DD, inklusiv) */
export interface ReportRange {
  from: string;
  to: string;
}

/** Bestätigungs-Toast, optional mit Rückgängig-Aktion (Ein-Tipp-Erfassung) */
export interface Toast {
  /** eindeutig je Anzeige — steuert den Auto-Dismiss-Timer */
  id: number;
  message: string;
  undo?: () => void | Promise<void>;
}

interface AppState {
  view: View;
  activeProfileId: string | null;
  /** Offenes Erfassungsformular (Modal) */
  openForm: FormKind;
  /** Laufender Akut-Timer (ISO-Start) — überlebt Navigation innerhalb der Sitzung */
  acuteStartedAt: string | null;
  /**
   * Während des Akut-Timers aufgenommene Medien (Video/Foto) — werden beim
   * Speichern des Ereignisses als Anhänge übernommen. Nur im Speicher:
   * ein App-Neustart während des Ereignisses verwirft sie.
   */
  acuteMedia: File[];
  /** PIN-Sperre aktiv? Beim Start gesperrt, wenn eine PIN gesetzt ist. */
  locked: boolean;
  /** Offener Arztbericht (null = keiner) */
  reportRange: ReportRange | null;
  /** Aktueller Bestätigungs-Toast (null = keiner) */
  toast: Toast | null;
  /** Umfeld-Bericht (Schule/Betreuung/Familie) geöffnet? */
  careReportOpen: boolean;
  setView: (v: View) => void;
  setActiveProfile: (id: string) => void;
  setOpenForm: (f: FormKind) => void;
  startAcute: () => void;
  clearAcute: () => void;
  addAcuteMedia: (files: File[]) => void;
  lock: () => void;
  unlock: () => void;
  openReport: (r: ReportRange) => void;
  closeReport: () => void;
  showToast: (message: string, undo?: Toast['undo']) => void;
  clearToast: () => void;
  openCareReport: () => void;
  closeCareReport: () => void;
}

const PROFILE_KEY = 'care-diary.activeProfileId';

export const useAppStore = create<AppState>((set) => ({
  view: 'home',
  activeProfileId: localStorage.getItem(PROFILE_KEY),
  openForm: null,
  acuteStartedAt: null,
  acuteMedia: [],
  locked: hasPin(),
  reportRange: null,
  toast: null,
  careReportOpen: false,
  setView: (view) => set({ view }),
  setActiveProfile: (id) => {
    localStorage.setItem(PROFILE_KEY, id);
    set({ activeProfileId: id });
  },
  setOpenForm: (openForm) => set({ openForm }),
  startAcute: () => set({ acuteStartedAt: new Date().toISOString(), acuteMedia: [] }),
  clearAcute: () => set({ acuteStartedAt: null, acuteMedia: [] }),
  addAcuteMedia: (files) => set((s) => ({ acuteMedia: [...s.acuteMedia, ...files] })),
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
  openReport: (reportRange) => set({ reportRange }),
  closeReport: () => set({ reportRange: null }),
  showToast: (message, undo) => set({ toast: { id: Date.now(), message, undo } }),
  clearToast: () => set({ toast: null }),
  openCareReport: () => set({ careReportOpen: true }),
  closeCareReport: () => set({ careReportOpen: false }),
}));
