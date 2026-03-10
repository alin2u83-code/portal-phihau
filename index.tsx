import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const root = ReactDOM.createRoot(rootElement);

if (!supabaseUrl || !supabaseAnonKey) {
  root.render(
    <div style={{ padding: '20px', color: 'white', backgroundColor: '#1e293b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <h1 style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '1rem' }}>Lipsește configurarea Vercel</h1>
      <p>Variabilele de mediu VITE_SUPABASE_URL și/sau VITE_SUPABASE_ANON_KEY nu sunt definite.</p>
    </div>
  );
} else {
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
}
