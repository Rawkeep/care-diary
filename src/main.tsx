import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { applyThemePref, getThemePref } from './utils/theme';
import './index.css';

// Manuelle Theme-Wahl vor dem ersten Render anwenden (kein Flackern)
applyThemePref(getThemePref());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker nur im Build registrieren (Offline-Fähigkeit)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline-Cache ist optionaler Komfort — App funktioniert auch ohne */
    });
  });
}
