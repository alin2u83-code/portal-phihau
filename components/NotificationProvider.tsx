import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { XIcon } from './icons';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const typeClasses = {
    success: { bg: 'bg-green-900/90', border: 'border-green-700', iconColor: 'text-green-400', titleColor: 'text-green-200', textColor: 'text-green-300', shadow: 'shadow-green-900/50' },
    warning: { bg: 'bg-yellow-900/90', border: 'border-yellow-700', iconColor: 'text-yellow-400', titleColor: 'text-yellow-200', textColor: 'text-yellow-300', shadow: 'shadow-yellow-900/50' },
    error: { bg: 'bg-red-900/90', border: 'border-red-700', iconColor: 'text-red-400', titleColor: 'text-red-200', textColor: 'text-red-300', shadow: 'shadow-red-900/50' },
    info: { bg: 'bg-sky-900/90', border: 'border-sky-700', iconColor: 'text-sky-400', titleColor: 'text-sky-200', textColor: 'text-sky-300', shadow: 'shadow-sky-900/50' }
};

const Icon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    const icons: Record<Notification['type'], React.ReactNode> = {
        success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
        error: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
        info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    };
    return <svg className={`h-6 w-6 ${typeClasses[type].iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{icons[type]}</svg>;
};

const Toast: React.FC<Notification & { onClose: () => void; className?: string }> = ({ title, message, type, onClose, className }) => {
    const styles = typeClasses[type];
    return (
        <div className={`w-full max-w-sm ${styles.bg} backdrop-blur-sm text-white rounded-lg shadow-2xl ${styles.shadow} border ${styles.border} animate-fade-in-down ${className}`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0"><Icon type={type} /></div>
                    <div className="ml-3 w-0 flex-1">
                        <p className={`text-md font-bold ${styles.titleColor}`}>{title}</p>
                        <p className={`mt-1 text-sm ${styles.textColor} break-words max-h-40 overflow-y-auto`}>{message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button onClick={onClose} className={`inline-flex ${styles.textColor} rounded-md hover:text-white`}>
                            <span className="sr-only">Close</span>
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification = { ...notification, id: Date.now() };
    setNotifications(prev => [...prev, newNotification]);

    setTimeout(() => {
        hideNotification(newNotification.id);
    }, 8000);
  }, []);

  const hideNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = { showNotification };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-5 z-[100] flex flex-col items-center space-y-4 pointer-events-none">
        {notifications.map(notif => (
          <Toast 
            key={notif.id} 
            {...notif}
            onClose={() => hideNotification(notif.id)}
            className="pointer-events-auto"
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
