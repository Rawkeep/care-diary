// Einheitliche Darstellung von Verlaufseinträgen (Einnahmen, Ereignisse,
// Zustand) — Tippen auf einen Eintrag öffnet Bearbeiten/Löschen.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Attachment, HealthEvent, Intake, IntakeStatus, Medication, Observation, Profile } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { eventTypeLabel } from '../presets/epilepsy';
import type { DiaryItem } from '../utils/aggregate';
import { fmtDuration, fmtTime } from '../utils/date';
import { EventForm } from './forms/EventForm';
import { IntakeForm } from './forms/IntakeForm';
import { ObservationEditForm } from './forms/ObservationEditForm';
import { IconEdit, IconTrash } from './icons';
import { Modal } from './Modal';
import { PhotoStrip } from './PhotoStrip';

const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  taken: 'genommen',
  missed: 'ausgelassen',
  late: 'verspätet',
  vomited: 'erbrochen',
};

const KIND_TITLE = { intake: 'Einnahme', event: 'Ereignis', observation: 'Zustand' } as const;

export function EntryList({
  items,
  medications,
  preset,
  profile,
}: {
  items: DiaryItem[];
  medications: Medication[];
  preset: ConditionPreset;
  profile: Profile;
}) {
  const [selected, setSelected] = useState<DiaryItem | null>(null);
  const [editing, setEditing] = useState(false);

  function open(item: DiaryItem) {
    setSelected(item);
    setEditing(false);
  }

  function close() {
    setSelected(null);
    setEditing(false);
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm('Diesen Eintrag wirklich löschen? (Anhänge werden mit entfernt)')) return;
    const id = selected.ref.id;
    if (selected.kind === 'intake') await db.intakes.delete(id);
    if (selected.kind === 'event') {
      await db.attachments.where('entryId').equals(id).delete();
      await db.events.delete(id);
    }
    if (selected.kind === 'observation') {
      await db.attachments.where('entryId').equals(id).delete();
      await db.observations.delete(id);
    }
    close();
  }
  // Anhänge aller sichtbaren Einträge in einem Rutsch laden, nach Eintrag gruppiert
  const entryIds = items.map((i) => i.ref.id);
  const attachments = useLiveQuery(
    () => db.attachments.where('entryId').anyOf(entryIds).toArray(),
    [entryIds.join(',')]
  );
  const byEntry = new Map<string, Attachment[]>();
  for (const a of attachments ?? []) {
    byEntry.set(a.entryId, [...(byEntry.get(a.entryId) ?? []), a]);
  }
  const photosOf = (id: string) => byEntry.get(id) ?? [];

  if (items.length === 0) return <p className="empty">Noch keine Einträge.</p>;
  const medName = (id: string) => medications.find((m) => m.id === id)?.name ?? 'Medikament';

  return (
    <div>
      {items.map((item) => {
        if (item.kind === 'intake') {
          const i = item.ref as Intake;
          return (
            <div key={i.id} className="entry kind-intake tappable" onClick={() => open(item)}>
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
            <div key={e.id} className="entry kind-event tappable" onClick={() => open(item)}>
              <span className="time">{fmtTime(e.startedAt)}</span>
              <div className="body">
                <div className="title">⚡ {eventTypeLabel(preset, e.type)}</div>
                <div className="meta">
                  {parts.join(' · ')}
                  {e.note ? ` · ${e.note}` : ''}
                </div>
                <PhotoStrip attachments={photosOf(e.id)} />
              </div>
            </div>
          );
        }
        const o = item.ref as Observation;
        const param = preset.observationParams.find((p) => p.key === o.parameter);
        return (
          <div key={o.id} className="entry kind-observation tappable" onClick={() => open(item)}>
            <span className="time">{fmtTime(o.at)}</span>
            <div className="body">
              <div className="title">📝 {param?.label ?? o.parameter}</div>
              <div className="meta">
                {o.value}/5{o.note ? ` · ${o.note}` : ''}
              </div>
              <PhotoStrip attachments={photosOf(o.id)} />
            </div>
          </div>
        );
      })}

      {selected && (
        <Modal
          title={editing ? `${KIND_TITLE[selected.kind]} bearbeiten` : KIND_TITLE[selected.kind]}
          onClose={close}
        >
          {!editing ? (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                <IconEdit size={18} className="inline-icon" /> Bearbeiten
              </button>
              <button className="btn danger" onClick={deleteSelected}>
                <IconTrash size={18} className="inline-icon" /> Löschen
              </button>
              <button className="btn secondary" onClick={close}>Abbrechen</button>
            </>
          ) : selected.kind === 'intake' ? (
            <IntakeForm profile={profile} existing={selected.ref as Intake} onDone={close} />
          ) : selected.kind === 'event' ? (
            <EventForm profile={profile} preset={preset} existing={selected.ref as HealthEvent} onDone={close} />
          ) : (
            <ObservationEditForm existing={selected.ref as Observation} preset={preset} onDone={close} />
          )}
        </Modal>
      )}
    </div>
  );
}
