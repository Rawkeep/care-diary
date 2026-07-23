// Foto-/Video-Auswahl in Erfassungsformularen: Kamera oder Galerie, mehrere
// Dateien, Vorschau mit Entfernen — die Dateien hält das Formular, gespeichert
// wird erst mit dem Eintrag (Fotos verkleinert, Videos unverändert).
import { useEffect, useRef, useState } from 'react';

/** Obergrenze je Video — schützt die lokale Datenbank vor Riesen-Dateien */
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function PhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setHint('');
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (f.type.startsWith('image/')) accepted.push(f);
      else if (f.type.startsWith('video/')) {
        if (f.size > MAX_VIDEO_BYTES) {
          setHint('Video übersprungen — größer als 100 MB. Bitte kürzer aufnehmen.');
        } else {
          accepted.push(f);
        }
      }
    }
    if (accepted.length > 0) onChange([...files, ...accepted]);
  }

  return (
    <div className="photo-picker">
      <label className="field" style={{ marginBottom: 6 }}>
        <span>Fotos / Videos (optional) — z. B. Hautbild, Befund, kurzes Video des Ereignisses</span>
      </label>
      {files.length > 0 && (
        <div className="photo-strip">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="photo-thumb">
              {f.type.startsWith('video/') ? (
                <video src={urls[i]} muted playsInline preload="metadata" />
              ) : (
                <img src={urls[i]} alt={`Anhang ${i + 1}`} />
              )}
              {f.type.startsWith('video/') && <span className="video-mark">▶</span>}
              <button
                type="button"
                className="photo-remove"
                aria-label={`Anhang ${i + 1} entfernen`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn secondary" onClick={() => inputRef.current?.click()}>
        📷 Foto / Video hinzufügen
      </button>
      {hint && <p className="hint" style={{ color: 'var(--danger)' }}>{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ''; // gleiche Datei erneut wählbar
        }}
      />
    </div>
  );
}
