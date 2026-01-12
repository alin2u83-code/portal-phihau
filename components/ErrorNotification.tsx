import React from 'react';

interface ErrorNotificationProps {
  title: string;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const typeStyles = {
  error: {
    bgColor: 'bg-status-danger', // #DC2626
    borderColor: 'border-red-400/50',
    iconColor: 'text-red-200',
    titleColor: 'text-white',
    messageColor: 'text-red-100',
    Icon: () => (
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    bgColor: 'bg-brand-primary', // #3D3D99
    borderColor: 'border-blue-400/50',
    iconColor: 'text-blue-200',
    titleColor: 'text-white',
    messageColor: 'text-blue-100',
    Icon: () => (
       <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
};

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ title, message, type, onClose }) => {
  const styles = typeStyles[type];
  const { Icon } = styles;

  return (
    <div className={`w-full max-w-md ${styles.bgColor} text-white rounded-lg shadow-2xl border ${styles.borderColor} animate-fade-in-down`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${styles.iconColor}`}>
            <Icon />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`font-bold ${styles.titleColor}`} style={{ fontSize: '14px' }}>{title}</p>
            <p className={`mt-1 text-sm ${styles.messageColor}`} style={{ fontSize: '14px' }}>{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button onClick={onClose} className={`inline-flex ${styles.messageColor} rounded-md hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white/50`}>
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};