import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface ErrorInfo {
  title: string;
  message: string;
}

interface ErrorContextType {
  showError: (title: string, error: any) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

const ErrorToast: React.FC<{ title: string; message: string; onClose: () => void }> = ({ title, message, onClose }) => {
    
    const handleCopy = () => {
        navigator.clipboard.writeText(message).catch(err => {
            console.error('DEBUG:', 'Failed to copy error message:', err);
        });
    };

    return (
        <div className="w-full max-w-sm bg-red-900/90 backdrop-blur-sm text-white rounded-lg shadow-2xl shadow-red-900/50 border border-red-700 animate-fade-in-down">
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="ml-3 w-0 flex-1">
                        <p className="text-md font-bold text-red-200">{title}</p>
                        <p className="mt-1 text-sm text-red-300 break-words">{message}</p>
                        <div className="mt-3 flex gap-2">
                            <button onClick={handleCopy} className="text-xs bg-red-700/50 hover:bg-red-700 text-white font-semibold py-1 px-2 rounded-md transition-colors">
                                Copiază Eroarea
                            </button>
                        </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button onClick={onClose} className="inline-flex text-red-300 rounded-md hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-600">
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

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<(ErrorInfo & { id: number })[]>([]);

  const showError = useCallback((title: string, errorObj: any) => {
    console.error('DEBUG:', errorObj);
    const message = errorObj?.message || (typeof errorObj === 'string' ? errorObj : 'O eroare necunoscută a apărut.');
    const newError = { title, message, id: Date.now() };
    setErrors(prevErrors => [...prevErrors, newError]);

    setTimeout(() => {
        hideError(newError.id);
    }, 8000);
  }, []);

  const hideError = useCallback((id: number) => {
    setErrors(prevErrors => prevErrors.filter(e => e.id !== id));
  }, []);

  const value = { showError };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-2">
        {errors.map(error => (
          <ErrorToast key={error.id} title={error.title} message={error.message} onClose={() => hideError(error.id)} />
        ))}
      </div>
    </ErrorContext.Provider>
  );
};