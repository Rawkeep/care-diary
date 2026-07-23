// Capacitor-Konfiguration — Grundstein für die nativen Builds (iOS/Android).
// Die Web-App bleibt die eine Quelle; Capacitor verpackt dist/ als native App
// (dann mit echten Push-Erinnerungen und Biometrie, siehe NATIVE.md).
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.rawkeep.carediary',
  appName: 'care-diary',
  webDir: 'dist',
};

export default config;
