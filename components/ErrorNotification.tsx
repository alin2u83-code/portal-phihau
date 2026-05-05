import React, { useEffect } from 'react';

interface ErrorNotificationProps {
  title: string;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const typeStyles = {
  error: {
    headerBg: 'bg-status-danger',
    iconColor: 'text-red-200',
    Icon: () => (
      <svg className="h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    okBtnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    label: 'Eroare',
  },
  success: {
    headerBg: 'bg-brand-primary',
    iconColor: 'text-blue-200',
    Icon: () => (
      <svg className="h-7 w-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    okBtnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    label: 'Succes',
  },
};

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ title, message, type, onClose }) => {
  const styles = typeStyles[type];
  const { Icon } = styles;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
        <div className={`${styles.headerBg} px-5 py-4 flex items-center gap-3`}>
          <span className={styles.iconColor}><Icon /></span>
          <span className="text-white font-bold text-base">{title}</span>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
          {type === 'error' && (
            <button
              onClick={() => navigator.clipboard.writeText(`${title}: ${message}`)}
              className="mt-3 text-[10px] uppercase font-bold tracking-wider bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copiază Eroarea
            </button>
          )}
        </div>
        <div className="bg-gray-50 px-5 py-3 flex justify-end">
          <button
            autoFocus
            onClick={onClose}
            className={`${styles.okBtnClass} text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
