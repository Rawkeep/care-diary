// Umfeld-Bericht: „So könnt ihr … unterstützen" — für Schule, Betreuung,
// Familie und Freunde. Ziel ist Verständnis und Teamwork, nicht Medizin:
// Laiensprache, Erste-Hilfe-Grundregeln, was hilft/was vermeiden.
// Datensparsamkeit per Schalter — Stimmungs-Skalen, Gewicht und
// Nebenwirkungen erscheinen hier grundsätzlich NICHT (das gehört zum Arzt).
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { CareInfo, Profile } from '../db/models';
import { nowIso } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { useAppStore } from '../store/appStore';
import { inDayRange } from '../utils/aggregate';
import { daysSinceLastEvent } from '../utils/correlation';
import { dayKeyDaysAgo, fmtDayKey, localDayKey } from '../utils/date';

const DEFAULTS: Omit<CareInfo, 'profileId' | 'updatedAt'> = {
  includeFrequency: false,
  includeEventTypes: true,
  includeTriggers: false,
  includeEmergencyMeds: true,
};

export function CareReport({ profile, preset }: { profile: Profile; preset: ConditionPreset }) {
  const { closeCareReport } = useAppStore();
  const [editing, setEditing] = useState(true);

  // null = „kein Datensatz vorhanden" (undefined hieße: lädt noch)
  const stored = useLiveQuery(
    async () => (await db.careInfo.get(profile.id)) ?? null,
    [profile.id]
  );
  const events = useLiveQuery(
    () => db.events.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  if (stored === undefined || !events || !medications) return null;
  const info: CareInfo = stored ?? { profileId: profile.id, updatedAt: nowIso(), ...DEFAULTS };

  async function update(patch: Partial<CareInfo>) {
    await db.careInfo.put({ ...info, ...patch, updatedAt: nowIso() });
  }

  const todayKey = localDayKey(new Date().toISOString());
  const last28 = inDayRange(events, (e) => e.startedAt, dayKeyDaysAgo(27), todayKey);
  const freeDays = daysSinceLastEvent(events, todayKey);

  // Nur tatsächlich dokumentierte Ereignisarten erklären (sonst alle des Moduls)
  const seenTypes = new Set(events.map((e) => e.type));
  const typesToShow =
    seenTypes.size > 0
      ? preset.eventTypes.filter((t) => seenTypes.has(t.key))
      : preset.eventTypes;

  // Häufigste dokumentierte Begleitumstände (max. 5)
  const triggerCounts = new Map<string, number>();
  for (const e of events) for (const c of e.circumstances) triggerCounts.set(c, (triggerCounts.get(c) ?? 0) + 1);
  const topTriggers = [...triggerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const emergencyMeds = medications.filter((m) => m.isEmergency && !m.endDate);

  const field = (
    label: string,
    key: 'aboutText' | 'helpsText' | 'avoidText' | 'doctorPlanText' | 'contactsText',
    placeholder: string
  ) => (
    <label className="field">
      <span>{label}</span>
      <textarea
        defaultValue={info[key] ?? ''}
        onBlur={(e) => update({ [key]: e.target.value.trim() || undefined })}
        placeholder={placeholder}
      />
    </label>
  );

  const toggle = (
    label: string,
    key: 'includeFrequency' | 'includeEventTypes' | 'includeTriggers' | 'includeEmergencyMeds'
  ) => (
    <label className="check-row">
      <input type="checkbox" checked={info[key]} onChange={(e) => update({ [key]: e.target.checked })} />
      {label}
    </label>
  );

  return (
    <div className="report">
      <div className="report-actions no-print">
        <button className="btn secondary" onClick={closeCareReport}>← Zurück</button>
        <button className="btn secondary" onClick={() => setEditing(!editing)}>
          {editing ? 'Vorschau' : '✎ Bearbeiten'}
        </button>
        <button className="btn" onClick={() => window.print()}>🖨 Drucken / PDF</button>
      </div>

      {editing && (
        <div className="card no-print">
          <h2>Inhalt festlegen (nur ihr seht diese Einstellungen)</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Weniger ist mehr: Der Bericht soll Verständnis schaffen, keine Akte sein.
            Stimmungs-Skalen, Gewicht und Nebenwirkungen erscheinen hier grundsätzlich nicht.
          </p>
          {field('Worum es geht — in euren Worten', 'aboutText',
            'z. B. Mia hat Epilepsie. Meistens merkt man ihr nichts an — manchmal hat sie kurze Anfälle.')}
          {field('Was im Alltag hilft', 'helpsText',
            'z. B. feste Pausen, bei Müdigkeit früher nach Hause, nach einem Anfall Ruhe statt Fragen.')}
          {field('Was bitte vermeiden', 'avoidText',
            'z. B. Flackerlicht, Übermüdung auf Klassenfahrten, Sonderbehandlung vor der Klasse.')}
          {field('Individuell mit dem Arzt vereinbart', 'doctorPlanText',
            'z. B. Notfallmedikament nach 3 Minuten Anfallsdauer laut Anweisung von Dr. …')}
          {field('Kontakt für Rückfragen', 'contactsText',
            'z. B. Mama: 0170 …, Papa: 0151 … — lieber einmal zu oft anrufen.')}
          {toggle('Ereignisarten erklären', 'includeEventTypes')}
          {toggle('Notfallmedikation nennen', 'includeEmergencyMeds')}
          {toggle('Häufige Begleitumstände zeigen', 'includeTriggers')}
          {toggle('Aktuelle Häufigkeit zeigen (letzte 4 Wochen)', 'includeFrequency')}
        </div>
      )}

      <h1>So könnt ihr {profile.name} unterstützen</h1>
      <p className="hint">
        Für Schule, Betreuung, Familie und Freunde — von den Angehörigen erstellt am{' '}
        {fmtDayKey(todayKey)}. Kein medizinisches Dokument; Grundlage für gutes Zusammenspiel.
      </p>

      <div className="card">
        <h2>Worum es geht</h2>
        <p style={{ margin: '4px 0' }}>
          {info.aboutText || `${profile.name} lebt mit: ${preset.label}.`}
        </p>
      </div>

      {info.includeEventTypes && typesToShow.length > 0 && (
        <div className="card">
          <h2>So kann es aussehen</h2>
          {typesToShow.map((t) => (
            <p key={t.key} style={{ margin: '6px 0' }}>
              <strong>{t.label}:</strong> {t.description}
            </p>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Was in dem Moment hilft</h2>
        <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
          {preset.firstAid.map((step, i) => (
            <li key={i} style={{ margin: '4px 0' }}>{step}</li>
          ))}
        </ol>
        {info.doctorPlanText && (
          <p style={{ margin: '8px 0 0' }}>
            <strong>Individuell mit dem Arzt vereinbart:</strong> {info.doctorPlanText}
          </p>
        )}
        <p className="hint">
          Allgemeine Erste-Hilfe-Grundregeln — individuelle ärztliche Anweisungen gehen immer vor.
        </p>
      </div>

      {info.includeEmergencyMeds && emergencyMeds.length > 0 && (
        <div className="card">
          <h2>Notfallmedikation</h2>
          {emergencyMeds.map((m) => (
            <p key={m.id} style={{ margin: '4px 0' }}>
              🚨 <strong>{m.name}</strong> — {m.dose} {m.unit}
              {m.schedule ? ` (${m.schedule})` : ''}
            </p>
          ))}
          <p className="hint">Nur nach Absprache mit den Angehörigen bzw. laut vereinbartem Vorgehen geben.</p>
        </div>
      )}

      {(info.helpsText || info.avoidText) && (
        <div className="card">
          <h2>Im Alltag</h2>
          {info.helpsText && (
            <p style={{ margin: '4px 0' }}><strong>Das hilft:</strong> {info.helpsText}</p>
          )}
          {info.avoidText && (
            <p style={{ margin: '4px 0' }}><strong>Bitte vermeiden:</strong> {info.avoidText}</p>
          )}
        </div>
      )}

      {info.includeTriggers && topTriggers.length > 0 && (
        <div className="card">
          <h2>Häufig dokumentierte Begleitumstände</h2>
          <p style={{ margin: '4px 0' }}>
            {topTriggers.map(([c, n]) => `${c} (${n}×)`).join(' · ')}
          </p>
          <p className="hint">Beobachtungen der Angehörigen — kein Auslöser-Beweis.</p>
        </div>
      )}

      {info.includeFrequency && (
        <div className="card">
          <h2>Aktuelle Lage in Kürze</h2>
          <p style={{ margin: '4px 0' }}>
            Letzte 4 Wochen: {last28.length === 0 ? 'kein dokumentiertes Ereignis' : `${last28.length} dokumentierte${last28.length === 1 ? 's' : ''} Ereignis${last28.length === 1 ? '' : 'se'}`}
            {freeDays != null && freeDays > 0 ? ` · aktuell ${freeDays} Tag${freeDays === 1 ? '' : 'e'} ohne Ereignis` : ''}
          </p>
        </div>
      )}

      {info.contactsText && (
        <div className="card">
          <h2>Kontakt für Rückfragen</h2>
          <p style={{ margin: '4px 0' }}>{info.contactsText}</p>
        </div>
      )}

      <p className="hint">
        Erstellt mit care-diary — die Daten bleiben auf dem Gerät der Familie. Bitte vertraulich
        behandeln und nicht weitergeben.
      </p>
    </div>
  );
}
