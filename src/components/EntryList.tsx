// Einheitliche Darstellung von Verlaufseinträgen (Einnahmen, Ereignisse, Zustand).
import type { HealthEvent, Intake, IntakeStatus, Medication, Observation } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { eventTypeLabel } from '../presets/epilepsy';
import type { DiaryItem } from '../utils/aggregate';
import { fmtDuration, fmtTime } from '../utils/date';

const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  taken: 'genommen',
  missed: 'ausgelassen',
  late: 'verspätet',
  vomited: 'erbrochen',
};

export function EntryList({
  items,
  medications,
  preset,
}: {
  items: DiaryItem[];
  medications: Medication[];
  preset: ConditionPreset;
}) {
  if (items.length === 0) return <p className="empty">Noch keine Einträge.</p>;
  const medName = (id: string) => medications.find((m) => m.id === id)?.name ?? 'Medikament';

  return (
    <div>
      {items.map((item) => {
        if (item.kind === 'intake') {
          const i = item.ref as Intake;
          return (
            <div key={i.id} className="entry kind-intake">
              <span className="time">{fmtTime(i.at)}</span>
              <div className="body">
                <div className="title">💊 {medName(i.medicationId)}</div>
                <div className="meta">
                  {i.amount} {i.unit} · {INTAKE_STATUS_LABEL[i.status]}
                  {i.note ? ` · ${i.note}` : ''}
                </div>
              </div>
            </div>
          );
        }
        if (item.kind === 'event') {
          const e = item.ref as HealthEvent;
          const parts = [
            e.durationSeconds != null ? `Dauer ${fmtDuration(e.durationSeconds)}` : null,
            e.severity != null ? `Schwere ${e.severity}/5` : null,
            e.emergencyMedicationGiven ? 'Notfallmedikation' : null,
            e.circumstances.length > 0 ? e.circumstances.join(', ') : null,
          ].filter(Boolean);
          return (
            <div key={e.id} className="entry kind-event">
              <span className="time">{fmtTime(e.startedAt)}</span>
              <div className="body">
                <div className="title">⚡ {eventTypeLabel(preset, e.type)}</div>
                <div className="meta">
                  {parts.join(' · ')}
                  {e.note ? ` · ${e.note}` : ''}
                </div>
              </div>
            </div>
          );
        }
        const o = item.ref as Observation;
        const param = preset.observationParams.find((p) => p.key === o.parameter);
        return (
          <div key={o.id} className="entry kind-observation">
            <span className="time">{fmtTime(o.at)}</span>
            <div className="body">
              <div className="title">📝 {param?.label ?? o.parameter}</div>
              <div className="meta">
                {o.value}/5{o.note ? ` · ${o.note}` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
