// Foto-Anhänge zu einem Eintrag speichern: verkleinern, dann in IndexedDB.
import type { AttachmentEntryKind, ID } from './models';
import { newId, nowIso } from './models';
import { db } from './db';
import { shrinkImage } from '../utils/image';

export async function saveAttachments(
  profileId: ID,
  entryKind: AttachmentEntryKind,
  entryId: ID,
  files: File[]
): Promise<void> {
  for (const file of files) {
    const blob = await shrinkImage(file);
    await db.attachments.add({
      id: newId(),
      profileId,
      entryKind,
      entryId,
      mimeType: blob.type || 'image/jpeg',
      blob,
      createdAt: nowIso(),
    });
  }
}
