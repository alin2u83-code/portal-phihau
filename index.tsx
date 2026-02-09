import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorProvider } from './components/ErrorProvider';
import { BrowserRouter } from 'react-router-dom';

// Înregistrează Service Worker-ul, curățând înregistrările vechi mai întâi.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Căutăm toate înregistrările active
    navigator.serviceWorker.getRegistrations().then(registrations => {
      // Ștergem fiecare înregistrare veche pentru a preveni conflictele
      for (const registration of registrations) {
        registration.unregister();
        console.log('Service Worker vechi a fost șters:', registration.scope);
      }
    }).then(() => {
      // După ce curățarea este completă, înregistrăm noul Service Worker
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('Service Worker nou înregistrat cu succes:', registration.scope);
      }).catch(error => {
        console.error('Eroare la înregistrarea noului Service Worker:', error);
      });
    }).catch(error => {
      console.error('Eroare la ștergerea Service Worker-ilor vechi:', error);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorProvider>
  </React.StrictMode>
);