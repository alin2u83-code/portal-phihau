import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorProvider } from './components/ErrorProvider';
import { NotificationProvider } from './components/NotificationProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ErrorProvider>
  </React.StrictMode>
);