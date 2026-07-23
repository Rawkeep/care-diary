# Konzept: Gesundheitsverlaufs-Dokumentation für chronisch Erkrankte

**Arbeitstitel:** `care-diary` (Alternativen: VitaLog, Verlaufsbuch, Symptom-Keeper)
**Status:** Konzeptphase · Entwurf v0.1 · 2026-07-23
**Autor:** Rawkeep (Konzept erstellt mit Claude)
**Sprache:** Deutsche UI, Code/Identifier Englisch (Rawkeep-Konvention)

---

## 1. Vision & Problem

Chronisch erkrankte Menschen und ihre Angehörigen tragen die Hauptlast der
Krankheitsbeobachtung — zu Hause, im Alltag, zwischen den Arztterminen.
Genau diese Beobachtungen sind aber oft **die entscheidende Grundlage für
ärztliche Therapieentscheidungen**: Was Patient:innen berichten, bestimmt
maßgeblich Diagnose-Feinjustierung, Medikamenteneinstellung und Empfehlung.

Heute passiert diese Dokumentation lückenhaft: Zettel, Erinnerung aus dem
Gedächtnis („Wie oft hatte er im März Anfälle? Drei? Fünf?"), verstreute
Notizen-Apps. Beim Arzttermin fehlen dann Details, Zeiträume verschwimmen,
Zusammenhänge (z. B. Medikamentenwechsel ↔ Nebenwirkung ↔ Anfallshäufigkeit)
gehen verloren.

**Die App schließt diese Lücke:** eine intuitive, überall verfügbare,
private Dokumentations-App, mit der Patient:innen und Angehörige den
Gesundheitsverlauf lückenlos festhalten — von Geburt an, wenn gewünscht —
und daraus auf Knopfdruck eine strukturierte, arzttaugliche Zusammenfassung
erzeugen.

**Leitprinzip (Rawkeep-DNA):** *Die App dokumentiert, der Arzt entscheidet.*
Keine Diagnosen, keine Therapieempfehlungen, keine Interpretation durch die
App — nur saubere, vollständige, durchsuchbare Beobachtungsdaten. Das ist
zugleich das wichtigste regulatorische Abgrenzungsmerkmal (→ §8).

---

## 2. Zielgruppen & Personas

| Persona | Situation | Kernbedürfnis |
|---------|-----------|---------------|
| **Patient:in (Erwachsen, chronisch krank)** | z. B. Epilepsie, Migräne, Rheuma, CED, Diabetes | Schnelle Selbst-Doku im Alltag, Überblick über eigenen Verlauf |
| **Angehörige:r / Elternteil** | dokumentiert für ein Kind (ggf. ab Geburt) oder pflegebedürftige Person | Fremd-Doku für eine andere Person, komplette Entwicklungshistorie, mehrere Beobachter (beide Eltern, Betreuung) |
| **Ärzt:in (indirekt)** | 10–15 Min. Sprechstunde, braucht komprimierte Fakten | Strukturierter Verlaufsbericht statt anekdotischer Erinnerung: Häufigkeiten, Zeitreihen, Medikationshistorie |

**Leuchtturm-Anwendungsfall: Epilepsie / Anfallsleiden.**
Ein breites, teils wenig erforschtes Gebiet, in dem die Anamnese fast
vollständig auf Beobachtungen von Patient:innen und Angehörigen beruht
(Anfälle passieren selten in der Praxis). Anfallsart, -dauer, -häufigkeit,
Begleitumstände und Medikamentenwirkung sind genau die Daten, die zu Hause
entstehen — und heute am schlechtesten dokumentiert werden. Das
Epilepsie-Modul (→ §4) ist deshalb der Startpunkt; die Architektur bleibt
aber generisch für alle chronischen Erkrankungen.

---

## 3. Kernfunktionen

### 3.1 Medikamenten-Dokumentation
- Medikamentenliste je Profil: Name, Wirkstoff, Dosis, Einheit, Einnahmeschema.
- **Einnahme-Log:** wann, was, wie viel — inkl. „ausgelassen" / „verspätet" /
  „erbrochen" (bei Kindern relevant).
- Bedarfs-/Notfallmedikation gesondert erfassbar (z. B. bei Anfällen).
- Medikationshistorie: Beginn, Dosisänderungen, Absetzen — als Zeitachse,
  damit Wirkungs-/Nebenwirkungszeiträume sichtbar werden.
- Optionale lokale Erinnerungen (Notification, kein Server nötig).

### 3.2 Ereignis-Dokumentation (Anfälle & Episoden)
- Ereignistypen konfigurierbar (Anfall, Migräneattacke, Schub, Sturz, …).
- Je Ereignis: Zeitpunkt, **Dauer** (Start/Stopp-Timer für die Akutsituation),
  **Art/Ausprägung**, Schweregrad, Begleitumstände, Freitext.
- **Zähler-Logik:** wie oft, welche Art, wie lange — automatisch aggregiert
  (Tag/Woche/Monat), als Kalender- und Trendansicht.

### 3.3 Zustands- & Symptom-Dokumentation
- Täglicher/situativer **Allgemeinzustand** auf einfachen Skalen
  (z. B. 1–5: Energie, Stimmung, Schlaf, Appetit, Schmerz) — frei
  konfigurierbare Parameter je Erkrankung.
- **Verbesserung/Verschlechterung/Auffälligkeit** als schnelle Markierung
  („heute auffällig: …") mit Freitext, Foto (z. B. Hautbild), Sprachnotiz.
- Nebenwirkungs-Beobachtungen explizit einem Medikament zuordenbar
  (Beobachtung, keine Kausalaussage der App).

### 3.4 Komplette Historie („von Beginn an")
- **Lebens-Timeline** je Profil: von Geburt (oder Diagnosezeitpunkt) an —
  Meilensteine, Diagnosen, Krankenhausaufenthalte, Untersuchungen,
  Entwicklungsschritte (bei Kindern), Impfungen, Therapiewechsel.
- Rückwirkende Erfassung möglich (Altdaten nachtragen, auch ungefähre Daten:
  „ca. Sommer 2019").
- Dokumente/Befunde als Anhänge (Foto/PDF) an Timeline-Einträge.

### 3.5 Arztbesuch-Modus (der eigentliche Payoff)
- **Report-Generator:** Zeitraum wählen → strukturierter Bericht als PDF
  (lokal erzeugt): Ereignis-Häufigkeiten, Medikationsverlauf,
  Zustands-Trends, Auffälligkeiten, chronologisches Protokoll.
- **Fragen-Merkliste** für den Termin („beim nächsten Arztbesuch ansprechen").
- **Termin-Nachbereitung:** Arztaussagen/Anweisungen als Timeline-Eintrag.
- Übergabe: PDF zeigen, ausdrucken, per eigenem Kanal teilen — die App
  selbst verschickt nichts (privacy by design).

### 3.6 Parameter-Ansicht (Zusammenhänge sichtbar machen)
- Überlagerte Zeitreihen: z. B. Anfallshäufigkeit über Medikationsphasen,
  Schlafqualität vs. Ereignisse, Zustand vs. Dosisänderung.
- **Bewusst nur Darstellung, keine Auswertung:** die App zeigt Kurven
  nebeneinander, zieht aber keine Schlüsse („Korrelation erkennen" bleibt
  Mensch und Arzt überlassen). Das hält die App aus der
  Medizinprodukt-Zone (→ §8) und aus der Pseudo-Diagnostik heraus.

---

## 4. Spezialmodul Epilepsie (Anfallstagebuch)

Aufsatz auf die generischen Ereignisse (3.2), mit Fachtiefe:

- **Anfallsarten** als vordefinierte, laienverständliche Auswahl, gemappt
  auf die ILAE-Klassifikation (fokal bewusst / fokal nicht bewusst /
  tonisch-klonisch / Absence / myoklonisch / atonisch / unklassifiziert) —
  mit Klartext-Beschreibungen statt Fachjargon zur Auswahlhilfe.
- **Phasen erfassbar:** Aura/Vorboten, Anfall (Dauer!), Nachphase
  (postiktal: Schlaf, Verwirrtheit, Dauer bis „wieder da").
- **Akut-Modus:** ein großer Button startet Timer + Minimalprotokoll —
  Angehörige haben in der Situation keine Hand für Formulare. Details
  werden *danach* in Ruhe ergänzt.
- **Mögliche Begleitumstände** als Checkliste (Schlafmangel, Fieber/Infekt,
  Stress, vergessene Einnahme, Flackerlicht, Zyklus, …) — dokumentiert
  Umstände, behauptet keine Trigger-Kausalität.
- **Notfallmedikation** (z. B. gegeben ja/nein, Uhrzeit) im Akutprotokoll.
- **Anfallskalender** (Monatsraster mit Markierungen) — das Format, das
  Neurolog:innen aus Papier-Anfallskalendern kennen; im Report enthalten.
- Optional: Video-Anhang an ein Ereignis (Ärzt:innen bitten häufig um
  Videos) — bleibt lokal auf dem Gerät.

Weitere Erkrankungs-Presets (Migräne, CED, Rheuma, Diabetes-Begleitdoku)
folgen demselben Muster: Preset = Ereignistypen + Parameter + Checklisten.
**Ein Datenmodell, viele Presets** — kein Fork pro Krankheit.

---

## 5. Grundprinzipien (nicht verhandelbar)

1. **Privat-first / lokal-first.** Alle Gesundheitsdaten (DSGVO Art. 9!)
   bleiben auf dem Gerät. Kein Konto-Zwang, kein Cloud-Zwang, kein Tracking,
   keine externen Requests zur Laufzeit (wie EAP/RAQ, OrgMind, GroundedRAG).
2. **Die App dokumentiert, der Arzt entscheidet.** Keine Diagnose, keine
   Therapieempfehlung, keine automatische Interpretation.
3. **Erfassung in Sekunden.** Jede Kern-Doku (Einnahme, Ereignis, Zustand)
   in ≤ 3 Taps aus dem Homescreen. Was mühsam ist, wird nicht benutzt —
   und eine Lücken-Doku ist für Ärzt:innen fast wertlos.
4. **Offline immer voll funktionsfähig.** Krankenhaus-Keller, Flugmodus,
   schlechtes Land-Netz — Doku darf nie an Konnektivität scheitern.
5. **Daten gehören den Nutzer:innen.** Voller Export (JSON + PDF) jederzeit;
   Löschen heißt Löschen.
6. **Mehrere Profile, mehrere Beobachter.** Ein Elternteil-Gerät kann
   mehrere Kinder führen; perspektivisch können zwei Geräte dasselbe Profil
   pflegen (→ Sync, Phase 3).

---

## 6. Datenmodell (Kern-Entitäten)

```
Profile        — Person (selbst oder betreute Person), Geburtsdatum, Diagnosen
Condition      — Erkrankung je Profil (aktiviert Presets, z. B. Epilepsie)
Medication     — Medikament: Wirkstoff, Dosis, Schema, gültig von/bis
Intake         — Einnahme-Ereignis: Zeitpunkt, Menge, Status (genommen/ausgelassen/…)
Event          — Ereignis: Typ, Start, Dauer, Ausprägung, Schweregrad,
                 Phasen, Begleitumstände[], Notfallmedikation?, Freitext
Observation    — Zustands-/Symptomwert: Parameter, Skalenwert/Zahl, Zeitpunkt
Note           — Freitext/Foto/Audio/Video-Anhang, optional verknüpft
TimelineEntry  — Historien-Eintrag: Meilenstein, Diagnose, Klinik, Arzttermin
Report         — generierter Bericht: Zeitraum, Inhalt-Snapshot, erzeugt am
```

Alles ist zeitgestempelt, einem Profil zugeordnet und **append-korrigierbar**
(Korrekturen erzeugen keine stillen Überschreibungen — Verlässlichkeit der
Doku ist das Produkt). IDs deterministisch/UUID, Export-Format versioniert.

---

## 7. UX-Leitlinien

- **Schnellerfassung zuerst:** Startbildschirm = 3 große Aktionen
  („💊 Einnahme", „⚡ Ereignis", „📝 Zustand") + heutiger Tagesüberblick.
- **Ein-Hand-Bedienung, große Touchziele** — oft wird nebenbei dokumentiert
  (Kind auf dem Arm, unterwegs, nachts).
- **Akut vs. Ruhe trennen:** im Akutfall Minimal-Erfassung (Timer + Typ),
  Vervollständigung später mit sanfter Erinnerung („Ereignis von 14:32
  vervollständigen?").
- **Sprachnotiz als Erfassungs-Turbo** — reden ist schneller als tippen,
  besonders direkt nach einem Ereignis.
- **Deutsch, warm, nüchtern.** Keine Gamification, keine Streaks, kein
  Schuldgefühl bei Doku-Lücken („3 Tage nichts erfasst" ist okay).
- **Dark Mode** (nächtliche Erfassung) und Barrierearmut (Kontraste,
  Schriftgrößen, Screenreader-Labels) von Anfang an.
- **App-Sperre** (PIN/Biometrie) — Gesundheitsdaten auf einem Familiengerät.

---

## 8. Recht & Regulatorik (früh ernst nehmen)

- **Medizinprodukt-Abgrenzung (MDR 2017/745):** Reine Dokumentations-/
  Tagebuch-Apps ohne Diagnose-, Berechnungs- oder Therapieentscheidungs-
  Funktion gelten regelmäßig **nicht** als Medizinprodukt. Die Grenze ist
  scharf zu halten: keine Risiko-Scores, keine „Warnung: Anfallsgefahr",
  keine Dosisrechner, keine Vorhersagen. Genau deshalb ist §3.6 bewusst
  „nur Darstellung". Vor Launch einmal fachanwaltlich bestätigen lassen.
- **DSGVO:** Gesundheitsdaten = Art.-9-Daten. Lokal-first minimiert das
  Thema radikal (keine Verarbeitung durch uns als Anbieter, solange kein
  Sync-Dienst existiert). Sobald Sync kommt: E2E-Verschlüsselung,
  EU-Hosting, AVV, DSFA.
- **Kein Ersatz für ärztlichen Rat** — klarer Disclaimer in App & Stores.
- **DiGA (Digitale Gesundheitsanwendung) als spätere Option:** Ein
  Anfallstagebuch könnte perspektivisch DiGA-fähig sein (Erstattung durch
  Krankenkassen) — das ist aber ein eigenes, aufwendiges Verfahren
  (Medizinprodukt Klasse I/IIa nötig!) und **explizit nicht MVP**. Das
  Konzept hält sich den Weg offen, ohne ihn jetzt zu bezahlen.

---

## 9. Technik-Empfehlung

Empfehlung entlang der bewährten Rawkeep-Muster (lokal-first, offline,
CDN-frei), aber mobil-first gedacht:

| Ebene | Empfehlung | Begründung |
|-------|-----------|------------|
| **App-Typ** | **PWA (installierbar) + Capacitor-Wrapper** für App-Stores | „Einfach zur Hand, überall funktionsfähig" = Smartphone. PWA deckt Web+Android gut ab; Capacitor (bereits bei smart-meal im Einsatz) bringt iOS/Store-Präsenz, lokale Notifications und Biometrie-Sperre ohne zweiten Codebase. |
| **Frontend** | React 18 + Vite + TypeScript (strict) | Team-erprobter Stack (OrgMind, circle-keeper, smart-meal). Für eine formular- und listenlastige App mit vielen Ansichten ist Komponenten-Struktur dem Vanilla-Ansatz von EAP überlegen. |
| **State** | Zustand (Store) | Leichtgewichtig, bewährt im eigenen Ökosystem. |
| **Persistenz** | **IndexedDB via Dexie** (nicht localStorage) | Gesundheitshistorien über Jahre + Foto/Audio/Video-Anhänge sprengen localStorage (5 MB). Dexie liefert Indizes für Zeitbereichs-Queries (Reports!) und Migrationspfade. |
| **PDF-Report** | Lokal im Client (z. B. pdfmake / eigene Print-CSS-Route) | Kein Server, kein Egress — Bericht entsteht auf dem Gerät. |
| **Charts** | Recharts (Trends) — bewusst simpel | Zeitreihen + Kalenderraster reichen; keine Finanzchart-Lib nötig. |
| **Backend (MVP)** | **Keines.** | Lokal-first konsequent: v1 kommt ohne Server aus. Das ist zugleich das stärkste Datenschutz-Argument im Gesundheitskontext. |
| **Sync (Phase 3)** | Optionaler E2E-verschlüsselter Sync (z. B. CRDT-basiert, Server sieht nur Ciphertext) | Erst wenn Mehr-Geräte-Bedarf real ist. Architektur-Vorsorge: alle Entitäten mit UUID + Änderungszeitstempel (CRDT-freundlich) von Anfang an. |
| **Tests** | Vitest (Logik: Aggregationen, Report-Inhalte, Datenmigrationen) + Playwright (Kernflüsse) | Die Zähl-/Aggregationslogik ist das fachliche Herz — deterministisch und testbar halten („Code entscheidet"). |
| **KI (später, optional)** | Lokal via Ollama o. ä.: Sprachnotiz→Strukturvorschlag, Freitext→Zusammenfassungs-*Entwurf* | Streng nach Hausprinzip: LLM schlägt vor (markiert als Entwurf), Mensch bestätigt, nie Cloud-Pflicht, nie Interpretation von Medizindaten. Kein MVP-Bestandteil. |

**Bewusst nicht:** eigene Cloud-DB in v1, Wearable-Integrationen (Scope-
Falle), Social-/Community-Features, jegliche Analyse-„Intelligenz".

---

## 10. Roadmap (Empfehlung)

**Phase 1 — MVP „Das verlässliche Tagebuch" (Kern, ~6–8 Wochen Solo-Dev):**
Profile · Medikamente + Einnahme-Log · Ereignisse mit Epilepsie-Preset
(inkl. Akut-Timer) · Zustands-Skalen · Tages-/Kalenderansicht ·
JSON-Export · PWA offline · App-Sperre.

**Phase 2 — „Der Arzttermin" (der Payoff):**
PDF-Report-Generator + Anfallskalender-Ansicht · Fragen-Merkliste ·
Timeline/Historie mit Nachtragen ab Geburt · Foto/Audio-Anhänge ·
Parameter-Überlagerung (nur Darstellung).

**Phase 3 — „Familie & Geräte":**
Mehrere Profile ausgereift · Capacitor-Builds für iOS/Android ·
optionaler E2E-Sync zwischen Geräten · weitere Erkrankungs-Presets
(Migräne, CED, …) · lokale KI-Erfassungshilfen.

**Validierung parallel ab Phase 1:** 3–5 betroffene Familien /
Patient:innen als Pilotnutzer (aus dem Umfeld), plus 1–2 Ärzt:innen
(Neurologie/Pädiatrie) nur zur Frage: *„Welcher Report hilft Ihnen in
10 Minuten Sprechstunde wirklich?"* — der Report ist das Produkt; sein
Format sollte von Ärzt:innen mitgeprägt sein.

---

## 11. Risiken & offene Fragen

- **Doku-Müdigkeit:** größtes Produktrisiko. Gegenmittel: radikale
  Erfassungs-Einfachheit (§7), keine Pflichtfelder außer Zeitpunkt+Typ.
- **Scope-Explosion** („noch ein Parameter, noch eine Krankheit"):
  Preset-Architektur (§4) diszipliniert halten; MVP = Epilepsie-Preset + generisch.
- **Geräteverlust = Datenverlust** (lokal-first-Kehrseite): früh lokale
  Backup-Datei (verschlüsselter Export) anbieten; Sync erst Phase 3.
- **Namensfindung & Markenprüfung** offen (`care-diary` ist Arbeitstitel).
- **Eigenes Repo:** Konzept liegt vorerst hier; bei Start der Umsetzung
  eigenes Repo `Rawkeep/care-diary` anlegen und dieses Dokument mitnehmen.

---

## 12. Empfehlung (Kurzfassung)

1. **Bauen** — der Fall ist stark: echter Bedarf (selbst erlebbar), klare
   Lücke zwischen Papier-Anfallskalender und überladenen Gesundheits-Apps,
   und er passt exakt zur Rawkeep-DNA (lokal, DSGVO, „Code entscheidet").
2. **Mit Epilepsie-Anfallstagebuch als Leuchtturm starten**, aber auf dem
   generischen Ereignis-/Parameter-Modell — eine App, viele Erkrankungen.
3. **Streng dokumentierend bleiben** (keine Diagnose/Analyse) — aus
   Produkt-, Ethik- und MDR-Gründen gleichermaßen.
4. **Ohne Backend launchen** (PWA + IndexedDB, später Capacitor) — schnellster
   Weg zum MVP und das beste Datenschutzversprechen der Kategorie.
5. **Den Arzt-Report als eigentliches Produkt behandeln** und sein Format
   früh mit echten Ärzt:innen validieren.
