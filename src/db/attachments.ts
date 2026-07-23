// Anhänge (Fotos, Sprachnotizen) zu einem Eintrag speichern.
// Bilder werden vor dem Speichern verkleinert, Audio unverändert übernommen.
import type { AttachmentEntryKind, ID } from './models';
import { newId, nowIso } from './models';
import { db } from './db';
import { shrinkImage } from '../utils/image';

export async function saveAttachments(
  profileId: ID,
  entryKind: AttachmentEntryKind,
  entryId: ID,
  files: (File | Blob)[]
): Promise<void> {
  for (const file of files) {
    const blob = file.type.startsWith('image/') ? await shrinkImage(file as File) : file;
    await db.attachments.add({
      id: newId(),
      profileId,
      entryKind,
      entryId,
      mimeType: blob.type || file.type || 'application/octet-stream',
      blob,
      createdAt: nowIso(),
    });
  }
}
