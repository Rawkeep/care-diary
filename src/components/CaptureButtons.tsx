// Sofort-Aufnahme im Akutfall: große Knöpfe, die direkt Kamera bzw. Mikrofon
// starten — erst aufnehmen, das Formular kommt danach. Die Sprachnotiz ist
// bewusst gleichrangig: sprechen statt tippen, gerade für alle, denen
// Schreiben schwerfällt.
import { useEffect, useRef, useState } from 'react';

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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(
    () => () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.stream.getTracks().forEach((t) => t.stop());
        rec.stop();
      }
    },
    []
  );

  const micSupported =
    typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  async function toggleMic() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > 0) onCapture([new File([blob], 'sprachnotiz.webm', { type })]);
        setRecording(false);
      };
      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      /* Mikrofon verweigert — Knopf bleibt folgenlos */
    }
  }

  function take(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter(
      (f) =>
        (f.type.startsWith('image/') || f.type.startsWith('video/')) &&
        !(f.type.startsWith('video/') && f.size > MAX_VIDEO_BYTES)
    );
    if (ok.length > 0) onCapture(ok);
  }

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="capture-row">
      <button type="button" className="capture-btn" onClick={() => videoRef.current?.click()}>
        🎥 Video
      </button>
      <button type="button" className="capture-btn" onClick={() => photoRef.current?.click()}>
        📷 Foto
      </button>
      {micSupported && (
        <button
          type="button"
          className={recording ? 'capture-btn recording' : 'capture-btn'}
          onClick={toggleMic}
        >
          {recording ? `⏹ Stopp (${mm}:${ss})` : '🎙 Sprachnotiz'}
        </button>
      )}
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
