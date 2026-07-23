# care-diary — MVP-Gerüst

Private, **lokal-first** Gesundheitsverlaufs-Dokumentation für chronisch
Erkrankte und Angehörige. Alle Daten bleiben auf dem Gerät (IndexedDB) —
kein Konto, keine Cloud, kein Egress. Konzept: [`../konzepte/gesundheits-doku-app/KONZEPT.md`](../konzepte/gesundheits-doku-app/KONZEPT.md).

**Leitprinzip: Die App dokumentiert, der Arzt entscheidet.** Keine Diagnosen,
keine Auswertung, keine Therapieempfehlung.

## Stack

React 18 · Vite · TypeScript (strict) · Zustand · Dexie (IndexedDB) · PWA
(Manifest + Service Worker). Deutsche UI, englische Identifier.

## Kommandos

```bash
npm install
npm run dev          # http://localhost:5180
npm run build        # Typecheck + Production-Build (dist/)
npm run typecheck
npm test             # Vitest (Aggregations-Kern)
```

## Was die App schon kann (Phase 1 + 2, Auszug)

- **Profil-Setup** (auch für betreute Person/Kind, optional Geburtsdatum),
  Epilepsie-Modul aktivierbar.
- **Schnellerfassung** vom Startbildschirm: Einnahme 💊, Ereignis ⚡, Zustand 📝.
- **Akut-Modus:** großer Start-Button mit laufendem Timer; beim Beenden ist
  das Ereignisformular mit Beginn + Dauer vorbefüllt.
- **Epilepsie-Preset:** ILAE-Anfallsarten in Laiensprache, Begleitumstände-
  Checkliste, Aura/Nachphase/Notfallmedikation.
- **Medikamente:** anlegen, Standarddosis, Schema, Notfallmedikation,
  absetzen (Historie bleibt erhalten).
- **Zustands-Skalen** (1–5, je Preset) mit Auffälligkeits-Notiz.
- **Verlauf:** chronologisch nach Tagen gruppiert + Ereignis-Zähler je Art.
- **JSON-Export** aller Daten (versioniertes Format).
- **Offline:** PWA mit Service Worker, installierbar.
- **Arztbericht:** druckbarer Verlaufsbericht (Browser-Druck → PDF, komplett
  lokal) mit Ereignis-Zählern, **Anfallskalender** (Monatsraster wie der
  Papier-Anfallskalender), Medikationsverlauf, Zustands-Kennzahlen,
  Bemerkungen und offenen Fragen — wählbarer Zeitraum (4 Wochen bis gesamt).
- **Dosisänderungs-Plan** je Medikament (z. B. **stufenweises Herabsetzen**):
  ärztlich verordnete Stufen mit „gültig ab"-Datum dokumentieren; die
  Einnahme-Erfassung übernimmt automatisch die zum Zeitpunkt gültige Dosis.
  Die App rechnet bewusst keine Pläne aus — sie bildet die Verordnung ab.
- **Lebens-Historie:** Meilensteine, Diagnosen, Klinikaufenthalte und
  Arzttermine rückwirkend nachtragen (auch mit ungefährem Datum), ab Geburt.
- **Fragen-Merkliste** für den nächsten Termin (erscheint im Arztbericht).
- **App-Sperre (PIN):** Zugriffsschutz auf geteilten Geräten (gesalzener
  SHA-256-Hash, keine Klartext-PIN; bewusst kein Verschlüsselungsersatz).

## Struktur

```
src/db/         Datenmodell (models.ts = Vertrag) + Dexie-Schema
src/presets/    Erkrankungs-Presets (Epilepsie, generisch)
src/store/      UI-Zustand (Zustand) — Fachdaten nur in Dexie
src/utils/      Datums- und Aggregations-Helfer (getestet)
src/views/      Heute, Verlauf, Medikamente, Mehr, Profil-Setup
src/components/ Modal, EntryList, Erfassungsformulare
tests/          Vitest (Aggregations-Kern)
```

## Nächste Schritte (siehe Konzept §10)

Phase 2 (Rest): Foto-/Audio-Anhänge, Parameter-Überlagerung (nur Darstellung).
Phase 3: Mehrprofil-Ausbau, Capacitor-Builds (iOS/Android, Biometrie),
optionaler E2E-verschlüsselter Sync, weitere Erkrankungs-Presets.
Umzug in eigenes Repo `Rawkeep/care-diary` sobald verfügbar.
