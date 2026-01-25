import React, { ReactNode } from 'react';
import { XIcon } from './icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info';
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps & { as?: 'label', htmlFor?: string }> = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  disabled,
  as,
  htmlFor,
  ...props 
}) => {
  const baseClasses = "rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center shadow-sm text-sm whitespace-nowrap";
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1",
  };
  
  const variantClasses = {
    primary: "bg-[var(--accent)] hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)] text-white hover:shadow-glow-blue",
    secondary: "bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 text-white hover:shadow-glow-blue",
    danger: "bg-status-danger hover:bg-red-700 focus:ring-red-500 text-white",
    success: "bg-status-success hover:bg-green-700 focus:ring-green-500 text-white",
    info: "bg-[var(--accent)] hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)] text-white hover:shadow-glow-blue",
  };

  const finalClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  const content = isLoading ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Procesare...
    </span>
  ) : children;

  if (as === 'label') {
    return (
      <label 
        htmlFor={htmlFor} 
        className={`${finalClassName} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...(props as any)}
      >
        {content}
      </label>
    );
  }

  return (
    <button 
      className={finalClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={`bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-lg shadow-black/20 ${className}`}>
    {children}
  </div>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  persistent?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, persistent = false }) => {
  if (!isOpen) return null;
  const titleId = React.useId();

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex sm:items-center sm:justify-center sm:p-4"
      onClick={() => !persistent && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-[var(--bg-card)] w-full h-full flex flex-col sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-lg sm:border border-[var(--border-color)] shadow-2xl animate-fade-in-down" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-3 border-b border-[var(--border-color)]">
          <h2 id={titleId} className="text-lg font-bold text-white uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-white transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}
  
export const Input: React.FC<InputProps> = ({ label, id, error, ...props }) => {
    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[var(--border-color)] focus:ring-[var(--accent)] focus:border-[var(--accent)]';
    const themeClasses = 'bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]';

    return (
        <div className="w-full">
            {label && <label htmlFor={id} className={`block text-[11px] uppercase font-bold text-[var(--text-secondary)] mb-1 ml-1`}>{label}</label>}
            <input 
                id={id} 
                {...props} 
                className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 transition-all ${errorClasses} ${themeClasses} ${props.className}`} 
            />
            {error && <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>}
        </div>
    );
};


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-[11px] uppercase font-bold text-[var(--text-secondary)] mb-1 ml-1">{label}</label>}
        <select id={id} {...props} className={`w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all appearance-none ${props.className}`}>
            {children}
        </select>
    </div>
);

export const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-3">
            {children}
        </div>
    </div>
);

export const Switch: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer group">
        <div className="relative">
            <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
            <div className={`block w-9 h-5 rounded-full transition-colors ${checked ? 'bg-[var(--accent)]' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}></div>
        </div>
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase group-hover:text-white transition-colors">{label}</span>
    </label>
);

export const Stepper: React.FC<{ value: number; onChange: (newValue: number) => void }> = ({ value, onChange }) => {
    const step = (amount: number) => {
        const stepAmount = 0.5;
        const newValue = Math.max(0, Math.min(10, value + (amount * stepAmount)));
        onChange(newValue);
    };

    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="!p-1 h-7 w-7" onClick={() => step(-1)}>-</Button>
            <span className="font-bold text-lg w-10 text-center">{value.toFixed(1)}</span>
            <Button size="sm" variant="secondary" className="!p-1 h-7 w-7" onClick={() => step(1)}>+</Button>
        </div>
    );
};
