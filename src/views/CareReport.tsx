// Umfeld-Bericht: „So könnt ihr … unterstützen" — für Schule, Betreuung,
// Familie und Freunde. Je Empfängerkreis eine Variante (eigene Texte,
// Schalter und Sprache de/en/fr), dazu die druckbare QR-Notfallkarte.
// Datensparsamkeit per Schalter — Stimmungs-Skalen, Gewicht und
// Nebenwirkungen erscheinen hier grundsätzlich NICHT (das gehört zum Arzt).
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import QRCode from 'qrcode';
import { db } from '../db/db';
import type { CareReportVariant, Profile } from '../db/models';
import { newId, nowIso } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { useAppStore } from '../store/appStore';
import { inDayRange } from '../utils/aggregate';
import { daysSinceLastEvent } from '../utils/correlation';
import { dayKeyDaysAgo, fmtDayKey, localDayKey } from '../utils/date';
import {
  CARD_STEPS,
  fill,
  langDir,
  LANGUAGE_LABEL,
  presetContent,
  REPORT_STRINGS,
  type CareReportLanguage,
} from '../i18n/careReport';

function defaultVariant(profileId: string, name: string): CareReportVariant {
  return {
    id: newId(),
    profileId,
    name,
    language: 'de',
    includeFrequency: false,
    includeEventTypes: true,
    includeTriggers: false,
    includeEmergencyMeds: true,
    updatedAt: nowIso(),
  };
}

export function CareReport({ profile, preset }: { profile: Profile; preset: ConditionPreset }) {
  const { closeCareReport } = useAppStore();
  const [editing, setEditing] = useState(true);
  const [mode, setMode] = useState<'report' | 'card'>('report');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [addingVariant, setAddingVariant] = useState(false);

  const variants = useLiveQuery(
    () => db.careReports.where('profileId').equals(profile.id).toArray(),
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

  // Erste Variante automatisch anlegen (Migration deckt Bestandsdaten ab)
  useEffect(() => {
    if (variants && variants.length === 0) {
      db.careReports.put(defaultVariant(profile.id, 'Standard'));
    }
  }, [variants, profile.id]);

  if (!variants || variants.length === 0 || !events || !medications) return null;
  const info = variants.find((v) => v.id === selectedId) ?? variants[0];
  const lang: CareReportLanguage = info.language;
  const t = REPORT_STRINGS[lang];
  const content = presetContent(preset, lang);

  async function update(patch: Partial<CareReportVariant>) {
    await db.careReports.put({ ...info, ...patch, updatedAt: nowIso() });
  }

  async function addVariant() {
    if (!newName.trim()) return;
    const v = defaultVariant(profile.id, newName.trim());
    await db.careReports.put(v);
    setSelectedId(v.id);
    setNewName('');
    setAddingVariant(false);
  }

  async function removeVariant() {
    if (variants!.length <= 1) return;
    if (!window.confirm(`Variante „${info.name}" wirklich löschen?`)) return;
    await db.careReports.delete(info.id);
    setSelectedId(null);
  }

  const todayKey = localDayKey(new Date().toISOString());
  const last28 = inDayRange(events, (e) => e.startedAt, dayKeyDaysAgo(27), todayKey);
  const freeDays = daysSinceLastEvent(events, todayKey);

  const seenTypes = new Set(events.map((e) => e.type));
  const typeKeys =
    seenTypes.size > 0
      ? preset.eventTypes.filter((et) => seenTypes.has(et.key)).map((et) => et.key)
      : preset.eventTypes.map((et) => et.key);

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
        key={`${info.id}-${key}`}
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
        <button className="btn secondary" onClick={closeCareReport}>←</button>
        <button
          className={mode === 'card' ? 'btn' : 'btn secondary'}
          onClick={() => setMode(mode === 'card' ? 'report' : 'card')}
        >
          {mode === 'card' ? '📄 Bericht' : '🪪 Notfallkarte'}
        </button>
        {mode === 'report' && (
          <button className="btn secondary" onClick={() => setEditing(!editing)}>
            {editing ? 'Vorschau' : '✎ Bearbeiten'}
          </button>
        )}
        <button className="btn" onClick={() => window.print()}>🖨 Drucken / PDF</button>
      </div>

      <div className="card no-print">
        <h2>Variante (je Empfängerkreis) &amp; Sprache</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={info.id}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Variante wählen"
            style={{ flex: 2 }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={lang}
            onChange={(e) => update({ language: e.target.value as CareReportLanguage })}
            aria-label="Sprache"
            style={{ flex: 1 }}
          >
            {(Object.keys(LANGUAGE_LABEL) as CareReportLanguage[]).map((l) => (
              <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>
            ))}
          </select>
        </div>
        {addingVariant ? (
          <>
            <label className="field" style={{ marginTop: 10 }}>
              <span>Name der neuen Variante</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addVariant()}
                placeholder="z. B. Schule, Großeltern, Sportverein"
                autoFocus
              />
            </label>
            <button className="btn" onClick={addVariant} disabled={newName.trim() === ''}>
              Variante anlegen
            </button>
            <button className="btn secondary" onClick={() => setAddingVariant(false)}>Abbrechen</button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn secondary" style={{ marginTop: 0 }} onClick={() => setAddingVariant(true)}>
              ＋ Neue Variante
            </button>
            {variants.length > 1 && (
              <button className="btn danger" style={{ marginTop: 0 }} onClick={removeVariant}>
                🗑 Löschen
              </button>
            )}
          </div>
        )}
        <p className="hint" style={{ marginBottom: 0 }}>
          So bekommt die Schule andere Inhalte als die Großeltern. Freitexte bitte in der
          gewählten Sprache schreiben — Struktur, Ereignisarten und Erste Hilfe übersetzt die
          App.
        </p>
      </div>

      {mode === 'card' ? (
        <EmergencyCard profile={profile} preset={preset} info={info} />
      ) : (
        <>
          {editing && (
            <div className="card no-print">
              <h2>Inhalt „{info.name}" (nur ihr seht diese Einstellungen)</h2>
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

          <div dir={langDir(lang)}>
          <h1>{fill(t.title, { name: profile.name })}</h1>
          <p className="hint">{fill(t.subtitle, { date: fmtDayKey(todayKey) })}</p>

          <div className="card">
            <h2>{t.about}</h2>
            <p style={{ margin: '4px 0' }}>
              {info.aboutText || fill(t.livesWith, { name: profile.name, condition: content.conditionLabel })}
            </p>
          </div>

          {info.includeEventTypes && typeKeys.length > 0 && (
            <div className="card">
              <h2>{t.howItLooks}</h2>
              {typeKeys.map((key) => {
                const et = content.eventTypes[key];
                if (!et) return null;
                return (
                  <p key={key} style={{ margin: '6px 0' }}>
                    <strong>{et.label}:</strong> {et.description}
                  </p>
                );
              })}
            </div>
          )}

          <div className="card">
            <h2>{t.inTheMoment}</h2>
            <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
              {content.firstAid.map((step, i) => (
                <li key={i} style={{ margin: '4px 0' }}>{step}</li>
              ))}
            </ol>
            {info.doctorPlanText && (
              <p style={{ margin: '8px 0 0' }}>
                <strong>{t.agreedWithDoctor}:</strong> {info.doctorPlanText}
              </p>
            )}
            <p className="hint">{t.firstAidDisclaimer}</p>
          </div>

          {info.includeEmergencyMeds && emergencyMeds.length > 0 && (
            <div className="card">
              <h2>{t.emergencyMeds}</h2>
              {emergencyMeds.map((m) => (
                <p key={m.id} style={{ margin: '4px 0' }}>
                  🚨 <strong>{m.name}</strong> — {m.dose} {m.unit}
                  {m.schedule ? ` (${m.schedule})` : ''}
                </p>
              ))}
              <p className="hint">{t.emergencyMedsNote}</p>
            </div>
          )}

          {(info.helpsText || info.avoidText) && (
            <div className="card">
              <h2>{t.everyday}</h2>
              {info.helpsText && (
                <p style={{ margin: '4px 0' }}><strong>{t.helps}:</strong> {info.helpsText}</p>
              )}
              {info.avoidText && (
                <p style={{ margin: '4px 0' }}><strong>{t.avoid}:</strong> {info.avoidText}</p>
              )}
            </div>
          )}

          {info.includeTriggers && topTriggers.length > 0 && (
            <div className="card">
              <h2>{t.triggersTitle}</h2>
              <p style={{ margin: '4px 0' }}>
                {topTriggers.map(([c, n]) => `${c} (${n}×)`).join(' · ')}
              </p>
              <p className="hint">{t.triggersNote}</p>
            </div>
          )}

          {info.includeFrequency && (
            <div className="card">
              <h2>{t.frequencyTitle}</h2>
              <p style={{ margin: '4px 0' }}>
                {last28.length === 0 ? t.freqNone : fill(t.freqSome, { n: last28.length })}
                {freeDays != null && freeDays > 0 ? ` · ${fill(t.freqFreeDays, { n: freeDays })}` : ''}
              </p>
            </div>
          )}

          {info.contactsText && (
            <div className="card">
              <h2>{t.contact}</h2>
              <p style={{ margin: '4px 0' }}>{info.contactsText}</p>
            </div>
          )}

          <p className="hint">{t.footer}</p>
          </div>
        </>
      )}
    </div>
  );
}

/** Druckbare Notfallkarte im Scheckkartenformat mit Offline-QR-Code:
 *  Der QR enthält die Notfall-Infos als Klartext — jeder Scanner zeigt sie
 *  ohne Internet und ohne Server an. */
function EmergencyCard({
  profile,
  preset,
  info,
}: {
  profile: Profile;
  preset: ConditionPreset;
  info: CareReportVariant;
}) {
  const lang = info.language;
  const t = REPORT_STRINGS[lang];
  const content = presetContent(preset, lang);
  const steps = CARD_STEPS[lang][preset.key] ?? CARD_STEPS[lang].generic;
  const [qr, setQr] = useState('');

  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const emergencyMeds = (medications ?? []).filter((m) => m.isEmergency && !m.endDate);

  const qrText = [
    `${t.cardTitle}: ${profile.name} — ${content.conditionLabel}`,
    ...steps.map((s) => `• ${s}`),
    ...(info.includeEmergencyMeds && emergencyMeds.length > 0
      ? [`${t.cardMed}: ${emergencyMeds.map((m) => `${m.name} ${m.dose} ${m.unit}`).join(', ')}`]
      : []),
    ...(info.contactsText ? [`${t.cardContact}: ${info.contactsText}`] : []),
  ].join('\n');

  useEffect(() => {
    QRCode.toDataURL(qrText, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [qrText]);

  return (
    <>
      <div className="wallet-card" dir={langDir(lang)}>
        <div className="wallet-text">
          <div className="wallet-title">{t.cardTitle}</div>
          <div className="wallet-name">{profile.name} — {content.conditionLabel}</div>
          <ul className="wallet-steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {info.includeEmergencyMeds && emergencyMeds.length > 0 && (
            <div className="wallet-line">
              🚨 {emergencyMeds.map((m) => `${m.name} ${m.dose} ${m.unit}`).join(', ')}
            </div>
          )}
          {info.contactsText && <div className="wallet-line">☎ {info.contactsText}</div>}
        </div>
        {qr && <img className="wallet-qr" src={qr} alt="QR-Code mit Notfall-Informationen" />}
      </div>
      <p className="hint no-print">
        Scheckkartenformat — ausdrucken, ausschneiden, ins Portemonnaie oder in den Schulranzen.
        Der QR-Code enthält dieselben Infos als Text: jedes Handy zeigt sie beim Scannen sofort
        an, ganz ohne Internet. Es wird nichts hochgeladen.
      </p>
    </>
  );
}
