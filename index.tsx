import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorProvider } from './components/ErrorProvider';
import { BrowserRouter } from 'react-router-dom';

// Înregistrarea Service Worker-ului este acum gestionată automat de `vite-plugin-pwa`.
// Codul manual de înregistrare a fost eliminat pentru a preveni conflictele.

import { DataProvider } from './contexts/DataContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorProvider>
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <NavigationProvider>
          <React.StrictMode>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App />
            </BrowserRouter>
          </React.StrictMode>
        </NavigationProvider>
      </DataProvider>
    </QueryClientProvider>
  </ErrorProvider>
);