// Thumbnail-Streifen unter Verlaufseinträgen + Vollbild-Ansicht (Lightbox).
// Objekt-URLs werden je Anhang erzeugt und beim Unmount wieder freigegeben.
import { useEffect, useMemo, useState } from 'react';
import type { Attachment } from '../db/models';

export function PhotoStrip({ attachments }: { attachments: Attachment[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const urls = useMemo(() => attachments.map((a) => URL.createObjectURL(a.blob)), [attachments]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="photo-strip">
        {attachments.map((a, i) => (
          <button key={a.id} type="button" className="photo-thumb" onClick={() => setOpenIdx(i)}>
            <img src={urls[i]} alt={`Foto ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {openIdx != null && (
        <div className="lightbox" onClick={() => setOpenIdx(null)} role="dialog" aria-label="Foto-Vollansicht">
          <img src={urls[openIdx]} alt={`Foto ${openIdx + 1} (Vollansicht)`} />
          <button className="lightbox-close" aria-label="Schließen" onClick={() => setOpenIdx(null)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
