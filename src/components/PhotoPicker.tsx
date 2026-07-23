// Foto-Auswahl in Erfassungsformularen: Kamera oder Galerie, mehrere Bilder,
// Vorschau mit Entfernen — die Dateien hält das Formular, gespeichert wird
// erst mit dem Eintrag (verkleinert, siehe utils/image).
import { useEffect, useRef, useState } from 'react';

export function PhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (images.length > 0) onChange([...files, ...images]);
  }

  return (
    <div className="photo-picker">
      <label className="field" style={{ marginBottom: 6 }}>
        <span>Fotos (optional) — z. B. Hautbild, Medikamentenpackung, Befund</span>
      </label>
      {files.length > 0 && (
        <div className="photo-strip">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="photo-thumb">
              <img src={urls[i]} alt={`Foto ${i + 1}`} />
              <button
                type="button"
                className="photo-remove"
                aria-label={`Foto ${i + 1} entfernen`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn secondary" onClick={() => inputRef.current?.click()}>
        📷 Foto hinzufügen
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
