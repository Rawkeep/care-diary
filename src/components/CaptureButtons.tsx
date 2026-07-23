// Sofort-Aufnahme im Akutfall: große Knöpfe, die direkt die Kamera öffnen
// (capture="environment") — erst aufnehmen, das Formular kommt danach.
import { useRef } from 'react';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function CaptureButtons({
  onCapture,
  count,
}: {
  onCapture: (files: File[]) => void;
  /** bereits aufgenommene Medien (Anzeige „hängt am Ereignis") */
  count: number;
}) {
  const videoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  function take(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter(
      (f) =>
        (f.type.startsWith('image/') || f.type.startsWith('video/')) &&
        !(f.type.startsWith('video/') && f.size > MAX_VIDEO_BYTES)
    );
    if (ok.length > 0) onCapture(ok);
  }

  return (
    <div className="capture-row">
      <button type="button" className="capture-btn" onClick={() => videoRef.current?.click()}>
        🎥 Video
      </button>
      <button type="button" className="capture-btn" onClick={() => photoRef.current?.click()}>
        📷 Foto
      </button>
      {count > 0 && (
        <span className="capture-count">
          ✓ {count} Aufnahme{count === 1 ? '' : 'n'} — wird mit dem Ereignis gespeichert
        </span>
      )}
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        data-testid="capture-video"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="capture-photo"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
