// Sprachnotiz aufnehmen (MediaRecorder) — für Momente, in denen Tippen nicht
// drin ist: ein Tipp startet, ein Tipp stoppt. Gespeichert wird die Aufnahme
// als Anhang beim Eintrag (lokal, wie Fotos).
import { useEffect, useRef, useState } from 'react';
import { IconMic } from './icons';

export function AudioRecorder({
  clips,
  onChange,
}: {
  clips: Blob[];
  onChange: (clips: Blob[]) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = clips.map((c) => URL.createObjectURL(c));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [clips]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // Beim Schließen des Formulars laufende Aufnahme sauber beenden
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

  const supported =
    typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  if (!supported) return null; // ohne Mikrofon-Unterstützung: Feature still weglassen

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size > 0) onChange([...clips, blob]);
        setRecording(false);
      };
      recorderRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      setError('Mikrofon nicht verfügbar — bitte Berechtigung prüfen.');
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="photo-picker">
      <label className="field" style={{ marginBottom: 6 }}>
        <span><IconMic size={16} className="inline-icon" /> Sprachnotiz (optional) — sprechen statt tippen</span>
      </label>
      {clips.map((_, i) => (
        <div key={i} className="audio-row">
          <audio controls src={urls[i]} preload="metadata" />
          <button
            type="button"
            className="btn secondary audio-remove"
            aria-label={`Sprachnotiz ${i + 1} entfernen`}
            onClick={() => onChange(clips.filter((_, j) => j !== i))}
          >
            🗑
          </button>
        </div>
      ))}
      {recording ? (
        <button type="button" className="btn danger" onClick={stop}>
          ⏹ Aufnahme beenden ({mm}:{ss})
        </button>
      ) : (
        <button type="button" className="btn secondary" onClick={start}>
          🎙 Sprachnotiz aufnehmen
        </button>
      )}
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
