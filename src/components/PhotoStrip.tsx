// Anhang-Streifen unter Verlaufseinträgen: Foto-Thumbnails mit Vollbild-
// Ansicht (Lightbox) und Audio-Player für Sprachnotizen. Objekt-URLs werden
// je Anhang erzeugt und beim Unmount wieder freigegeben.
import { useEffect, useMemo, useState } from 'react';
import type { Attachment } from '../db/models';

export function PhotoStrip({ attachments }: { attachments: Attachment[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const urls = useMemo(() => attachments.map((a) => URL.createObjectURL(a.blob)), [attachments]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  if (attachments.length === 0) return null;

  const images = attachments
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.mimeType.startsWith('image/'));
  const audios = attachments
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.mimeType.startsWith('audio/'));
  const videos = attachments
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.mimeType.startsWith('video/'));

  // stopPropagation: Anhänge liegen in tappbaren Verlaufszeilen — Medien
  // bedienen darf nicht gleichzeitig den Bearbeiten-Dialog öffnen.
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {images.length > 0 && (
        <div className="photo-strip">
          {images.map(({ a, i }, n) => (
            <button key={a.id} type="button" className="photo-thumb" onClick={() => setOpenIdx(i)}>
              <img src={urls[i]} alt={`Foto ${n + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {videos.map(({ a, i }) => (
        <video key={a.id} className="video-clip" controls playsInline src={urls[i]} preload="metadata" />
      ))}
      {audios.map(({ a, i }) => (
        <audio key={a.id} className="audio-clip" controls src={urls[i]} preload="metadata" />
      ))}
      {openIdx != null && (
        <div className="lightbox" onClick={() => setOpenIdx(null)} role="dialog" aria-label="Foto-Vollansicht">
          <img src={urls[openIdx]} alt="Foto (Vollansicht)" />
          <button className="lightbox-close" aria-label="Schließen" onClick={() => setOpenIdx(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
