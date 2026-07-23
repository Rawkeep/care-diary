# Native Builds (iOS/Android) — Fahrplan

Die Web-App bleibt die eine Quelle. Capacitor verpackt das Build-Ergebnis
(`dist/`) als native App — damit werden möglich, was die PWA nicht kann:

- **Echte Erinnerungen** auch bei geschlossener App (Local Notifications,
  kein Server nötig — passt zum Zero-Cloud-Prinzip).
- **Biometrie** (Face ID / Fingerabdruck) statt PIN.
- App-Store-/Play-Store-Verteilung.

Die Capacitor-Konfiguration liegt bereits im Repo (`capacitor.config.ts`,
App-ID `de.rawkeep.carediary`). Die restlichen Schritte brauchen einen
Rechner mit den nativen SDKs:

## Android (benötigt Android Studio)

```bash
npm install
npm run build
npx cap add android          # erzeugt android/ (einmalig)
npx cap sync android         # kopiert dist/ + Plugins
npx cap open android         # öffnet Android Studio → Run/Build
```

## iOS (benötigt macOS + Xcode)

```bash
npm install
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios             # öffnet Xcode → Signing einrichten → Run
```

## Erinnerungen nativ (nächster Schritt nach dem ersten Build)

```bash
npm i @capacitor/local-notifications
npx cap sync
```

Dann in der App die Slot-Zeiten (8/13/19 Uhr, `src/utils/reminders.ts`)
als geplante Local Notifications registrieren — komplett offline, ohne
Push-Server. Der bestehende `ReminderManager` bleibt der Web-Fallback.

## Grundsätze (gelten auch nativ)

- Kein Cloud-Egress, keine Konten — alle Daten bleiben auf dem Gerät.
- IndexedDB funktioniert in Capacitor-WebViews unverändert; vor dem
  ersten nativen Rollout trotzdem Backup/Restore einmal durchtesten.
