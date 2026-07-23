# care-diary

Private, **lokal-first** Gesundheitsverlaufs-Dokumentation für chronisch
Erkrankte und Angehörige. Alle Daten bleiben auf dem Gerät (IndexedDB) —
kein Konto, keine Cloud, kein Egress. Konzept: [`KONZEPT.md`](./KONZEPT.md).

**Leitprinzip: Die App dokumentiert, der Arzt entscheidet.** Keine Diagnosen,
keine Auswertung, keine Therapieempfehlung.

## Sofort nutzen

**➡️ https://rawkeep.github.io/care-diary/** — im Browser öffnen, fertig.
Kein Konto, keine Installation nötig; alle Daten bleiben im Browser des
eigenen Geräts.

Als App aufs Handy: Seite öffnen → Browser-Menü → **„Zum Startbildschirm
hinzufügen"** (iOS: Teilen-Symbol). Danach startet care-diary wie eine
native App und funktioniert auch offline.

> Wichtig: Da alle Daten lokal im Browser liegen, regelmäßig unter
> **Mehr → Export** eine JSON-Sicherung erstellen (z. B. beim Gerätewechsel).

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
- **Ein-Tipp-Einnahme:** je aktivem Medikament ein großer Button auf der
  Startseite — ein Tipp erfasst „jetzt genommen" mit der laut Plan gültigen
  Dosis; Fehltipps sind per **Rückgängig**-Toast sofort korrigierbar.
- **Schnellerfassung** vom Startbildschirm: Einnahme 💊, Ereignis ⚡, Zustand 📝.
- **Akut-Modus:** großer Start-Button mit laufendem Timer; beim Beenden ist
  das Ereignisformular mit Beginn + Dauer vorbefüllt.
- **Epilepsie-Preset:** ILAE-Anfallsarten in Laiensprache, Begleitumstände-
  Checkliste, Aura/Nachphase/Notfallmedikation.
- **Medikamente:** anlegen, Standarddosis, Schema, Notfallmedikation,
  absetzen (Historie bleibt erhalten).
- **Zustands-Skalen** (1–5, je Preset) mit Auffälligkeits-Notiz — bei
  Epilepsie inkl. **Verhalten** und **Aussprache/Sprache**.
- **Gewichts-Erfassung** (⚖️, z. B. zur Beobachtung von Gewichtszunahme
  unter einem Medikament) mit eigener Verlaufskurve.
- **Nebenwirkungs-Notizen je Medikament** („Beobachtete Auffälligkeiten"):
  dokumentierter Verdacht fürs Arztgespräch, erscheint im Arztbericht beim
  jeweiligen Medikament — keine Kausalaussage.
- **Muster sichtbar machen (nur beschreibend):** Tageszeit-Verteilung der
  Ereignisse (nachts/morgens/…, inkl. „aus dem Schlaf heraus"), „X Tage
  ohne Ereignis" auf der Startseite und der Vergleich **Zustand an
  ereignisfreien Tagen vs. Ereignistag + Folgetag** je Parameter.
  Die App zählt und gruppiert nur — die Einordnung gehört ins ärztliche
  Gespräch.
- **Verlauf:** chronologisch nach Tagen gruppiert + Ereignis-Zähler je Art.
- **Foto-Anhänge** an Ereignissen und Zustandseinträgen (Kamera oder Galerie,
  automatisch verkleinert, Vollbild-Ansicht) — z. B. Hautbilder, Befunde,
  Medikamentenpackungen. Fotos bleiben wie alles andere lokal.
- **Verschlüsseltes Backup** (.cdbak): AES-256-GCM mit Passphrase
  (PBKDF2), sicher ablegbar auch in Cloud/Mail; **Wiederherstellen** von
  Backup- und JSON-Dateien direkt in der App (idempotenter Import).
- **JSON-Export** aller Daten (versioniertes Format, inkl. Fotos).
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

Phase 2 (Rest): Audio-Anhänge, Parameter-Überlagerung (nur Darstellung).
Phase 3: Mehrprofil-Ausbau, Capacitor-Builds (iOS/Android, Biometrie),
optionaler E2E-verschlüsselter Sync, weitere Erkrankungs-Presets.
