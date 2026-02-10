import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorProvider } from './components/ErrorProvider';
import { BrowserRouter } from 'react-router-dom';

// Înregistrarea Service Worker-ului este acum gestionată automat de `vite-plugin-pwa`.
// Codul manual de înregistrare a fost eliminat pentru a preveni conflictele.

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