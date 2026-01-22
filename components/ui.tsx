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
    primary: "bg-[#3D3D99] hover:bg-[#2A2A7A] focus:ring-[#3D3D99] text-white", // Albastru Club
    secondary: "bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 text-white",
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
    success: "bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white",
    info: "bg-brand-secondary hover:bg-sky-500 focus:ring-brand-secondary text-white",
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
  <div className={`bg-slate-800/50 backdrop-blur-sm p-4 rounded-lg border border-slate-600 shadow-md shadow-black/20 ${className}`}>
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex sm:items-center sm:justify-center sm:p-4" onClick={() => !persistent && onClose()}>
      <div className="bg-slate-800 w-full h-full flex flex-col sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-lg sm:border border-slate-600 shadow-2xl animate-fade-in-down" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-3 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
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
    const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-600 focus:ring-brand-secondary focus:border-brand-secondary';
    return (
        <div className="w-full">
            {label && <label htmlFor={id} className="block text-[11px] uppercase font-bold text-slate-400 mb-1 ml-1">{label}</label>}
            <input 
                id={id} 
                {...props} 
                className={`w-full bg-slate-900/50 border rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${errorClasses} ${props.className}`} 
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
        {label && <label htmlFor={id} className="block text-[11px] uppercase font-bold text-slate-400 mb-1 ml-1">{label}</label>}
        <select id={id} {...props} className={`w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-secondary focus:border-brand-secondary transition-all appearance-none ${props.className}`}>
            {children}
        </select>
    </div>
);

export const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-slate-700 pb-1.5">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mt-3">
            {children}
        </div>
    </div>
);

export const Switch: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer group">
        <div className="relative">
            <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
            <div className={`block w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand-secondary' : 'bg-slate-600'}`}></div>
            <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}></div>
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase group-hover:text-white transition-colors">{label}</span>
    </label>
);