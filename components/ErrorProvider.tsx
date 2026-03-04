import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { ErrorNotification } from './ErrorNotification';

interface NotificationInfo {
  title: string;
  message: string;
  type: 'success' | 'error';
}

interface ErrorContextType {
  showError: (title: string, error: any) => void;
  showSuccess: (title: string, message: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<(NotificationInfo & { id: number })[]>([]);

  const showError = useCallback((title: string, errorObj: any) => {
    console.error('DEBUG:', errorObj);
    let message = errorObj?.message || (typeof errorObj === 'string' ? errorObj : 'O eroare necunoscută a apărut.');
    
    if (errorObj?.status === 403 || message.includes('403')) {
        message = "Nu aveți permisiunea necesară pentru a efectua această acțiune. Vă rugăm contactați un administrator.";
    } else if (message.includes('duplicate key value violates unique constraint')) {
        message = "Datele introduse sunt deja în sistem (duplicat).";
    }
    
    const newNotification = { title, message, type: 'error' as const, id: Date.now() };
    setNotifications(prev => [...prev, newNotification]);

    setTimeout(() => {
        hideNotification(newNotification.id);
    }, 8000);
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    const newNotification = { title, message, type: 'success' as const, id: Date.now() };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      hideNotification(newNotification.id);
    }, 4000);
  }, []);

  const hideNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = { showError, showSuccess };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-5 z-[9999] flex flex-col items-center space-y-2 px-4">
        {notifications.map(notification => (
          <ErrorNotification
            key={notification.id}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onClose={() => hideNotification(notification.id)}
          />
        ))}
      </div>
    </ErrorContext.Provider>
  );
};