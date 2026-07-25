# Design-System care-diary

**Haltung:** Die App begleitet Menschen an schlechten Tagen — nachts nach einem
Anfall, im Wartezimmer, mit einem Kind auf dem Arm. Sie darf nicht laut sein
und nicht nach Aufmerksamkeit fragen. Ruhe ist hier kein Stilmittel, sondern
Funktion (KONZEPT.md §7).

Alles Visuelle steckt in `src/index.css` (Tokens + Bausteine). Ansichten
komponieren nur; sie definieren keine eigenen Maße.

---

## 1. Die fünf Regeln

1. **Eine Rahmen-Ebene.** Eine Karte (`.card`) trägt den Rahmen; alles darin
   ist Fläche (`.panel`, `.subpanel`), kein zweiter Kasten. Verschachtelte
   Rahmen waren die größte Unruhe im alten Layout — bis zu drei Ebenen
   übereinander. Ein Sicherheitsnetz (`.card .card`) macht aus einer
   verschachtelten Karte automatisch eine Fläche.
2. **Schatten sind Bedeutung.** Nur was schwebt oder gedrückt wird, hat einen:
   Navigation, Modal, Toast, Primärknopf, Akut-Knopf, aktives Segment. Karten
   und Flächen tragen eine 1-px-Haarlinie, keinen Schatten.
3. **Eine Typo-Skala** (`--t-xs` … `--t-xl`, fünf Stufen). Vorher: 25
   verschiedene Größen, oft 0,02 rem auseinander — Unterschiede, die niemand
   als Absicht liest.
4. **Eine Sprache je Bedienelement.** Segment-Umschalter für „entweder-oder",
   Chip für Filter/Kurzaktion, Knopf für die Hauptaktion, Icon-Knopf für
   Nebenaktionen. Vorher gab es fünf Dialekte für dieselbe Sache.
5. **Farbe trägt Dringlichkeit** — Akzent für „jetzt dran", Danger für
   „überfällig". Nie Ausrufezeichen, nie Blinken, keine Wertung.

## 2. Tokens

| Gruppe | Werte | Verwendung |
|--------|-------|-----------|
| Abstände | `--s1: 4px` … `--s6: 32px` | Padding, Gaps, Margins — nichts dazwischen |
| Typo | `--t-xs .75` · `--t-sm .82` · `--t-md .94` · `--t-lg 1.05` · `--t-xl 1.6rem` | Tags/Meta · Sekundär/Kartentitel · Fließtext/Knöpfe · Namen/Modaltitel · große Zahlen |
| Radien | `--r-sm 10` · `--r-md 14` · `--r-lg 18` · `--r-pill` | Felder · Flächen/Knöpfe · Karten · Chips/Tags |
| Elevation | `--shadow-1`, `--shadow-2` | angehoben · schwebend |
| Farbe | `--bg` `--surface` `--surface-2` `--text` `--text-dim` `--border` `--accent(-strong/-soft)` `--danger(-soft)` | hell und dunkel identisch benannt |

Die Schriftgröße der ganzen App skaliert über die rem-Basis
(`:root.font-large` / `.font-xlarge`) — deshalb sind alle Typo-Tokens relativ.

## 3. Bausteine

| Klasse | Rolle |
|--------|------|
| `.card` | Abschnitt mit Rahmen. Titel `h2` klein, ruhig, **keine Versalien**. |
| `.panel` (alt: `.med-card`) | Fläche innerhalb einer Karte. `.is-urgent` = Danger-Kante links. |
| `.subpanel` | Aufgeklappter Editor innerhalb einer Fläche (hebt sich durch Helligkeit ab). |
| `details.group` | Aufklappbarer Bereich (Plan, Mehr). |
| `details.explain` | Erklärung auf Abruf statt Textwand auf Vorrat. |
| `.segmented` (alt: `.tabs`, `.chip-row`) | Genau eine Auswahl, gleich breite Segmente in einer Spur. |
| `.chip` / `.chips`, `.chip-grid` | Filter und Kurzaktionen. |
| `.btn` (+ `.secondary` `.quiet` `.danger`), `.btn-row` | Hauptaktionen; `.btn-row` stellt sie nebeneinander statt gestapelt. |
| `.icon-btn` | Nebenaktion an einer Zeile (löschen, bestätigen) — immer mit `aria-label`. |
| `.tag` (+ `.quiet` `.danger`) | Statuszeichen (Dosis, Dringlichkeit, Zähler). |
| `.entry` (+ `.flat`) | Verlaufszeile mit farbiger Kante je Art; `.flat` für Zeilen in Karten. |
| `.toggle-row` | Zeile mit Schalter (Modul-Auswahl). |
| `.row`, `.row-fields`, `.tight`, `.flush` | Layout-Helfer statt Inline-Styles. |

## 4. Bildsprache

**SVG-Icons für Bedienung, Emoji nur als Inhaltsmarker.**

- Das Icon-Set (`src/components/icons.tsx`) ist ein 24er-Raster, Stroke 2,
  `currentColor` — es nimmt automatisch die Textfarbe an und bleibt in beiden
  Themes stimmig.
- Emoji bleiben genau dort, wo sie **Inhalt** sind und von Dritten gelesen
  werden: Arzt-/Umfeld-Bericht, Notfallkarte, Ernährungs-Haltung in Berichten,
  Arten in der Lebens-Historie. Dort helfen sie Laien und drucken mit.
- In der App-Bedienung (Knöpfe, Chips, Listen, Karten) stehen Icons. Wo ein
  Symbol nichts erklärt, steht **keins** — „Letzte 4 Wochen" braucht kein 📄.

## 5. Sprache

- Deutsch, warm, nüchtern; Sie-Form vermeiden, direkt ansprechen.
- **Grammatik zählt:** Zeitangaben nach Präpositionen im Dativ
  (`fmtDaysDative`: „in 5 Tagen", „seit 8 Tagen"), im Nominativ ohne
  (`fmtDays`: „noch 5 Tage"). Vorher stand überall „in 5 Tage".
- Titel sind **kurz und handlungsorientiert**: „Blutbild vereinbaren", nicht
  „Kontrolle fällig: Blutbild / Laborkontrolle — Kontrolle unter …".
  `shortSubject()` in `utils/agenda.ts` schneidet Klammer-Zusätze und Beisätze
  weg; die Vollform steht im Plan.
- Keine Wertung, kein Druck: „3 Tage nichts erfasst" ist okay und wird nicht
  kommentiert.

## 6. Barrierefreiheit

- Touchziele ≥ 38 px, Hauptaktionen volle Breite (Daumen).
- Jeder Icon-Knopf hat ein `aria-label`; Icons selbst sind `aria-hidden`.
- Sichtbarer Fokusring (`:focus-visible`), `prefers-reduced-motion` respektiert.
- Drei Schriftgrößen; alle Maße relativ, damit die App mitwächst.
- Hell **und** dunkel sind gleichwertig getestet (Screenshots bei 320/390 px).

## 7. Bevor du Design änderst

1. Gibt es den Baustein schon? Dann benutze ihn statt eines Inline-Styles.
2. Braucht es wirklich einen neuen Rahmen — oder reicht eine Fläche?
3. Passt der Wert in die Skala? Wenn nein: warum nicht (und ist das der
   bessere Wert für **alle** Stellen)?
4. Verifiziere hell und dunkel bei 320 px und 390 px, bevor du fertig sagst.
