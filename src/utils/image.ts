// Fotos vor dem Speichern verkleinern (max. Kantenlänge, JPEG) — hält die
// IndexedDB schlank und Exporte handhabbar; für Doku-Zwecke völlig ausreichend.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file; // ohne Canvas: Original speichern statt scheitern
    ctx.drawImage(bitmap, 0, 0, w, h);

    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', JPEG_QUALITY)
    );
  } finally {
    bitmap.close();
  }
}
