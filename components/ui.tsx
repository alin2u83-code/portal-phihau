import React, { ReactNode } from 'react';
import { XIcon } from './icons';
import { Rol } from '../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
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
  const baseClasses = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap";
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm", // Increased touch target
    md: "px-6 py-3 text-base", // Larger for mobile
  };
  
  const variantClasses = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md active:scale-95", // Added active state
    secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 shadow-sm active:scale-95",
    danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-md active:scale-95",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md active:scale-95",
    info: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500 shadow-md active:scale-95",
    warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-md active:scale-95",
  };

  const finalClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} touch-manipulation`; // Added touch-manipulation

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
      <label htmlFor={htmlFor} className={`${finalClassName} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`} {...(props as any)}>
        {content}
      </label>
    );
  }

  return (
    <button className={finalClassName} disabled={disabled || isLoading} {...props}>
      {content}
    </button>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm ${className}`} {...props}>
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center sm:justify-center sm:p-4 backdrop-blur-sm" onClick={() => !persistent && onClose()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="bg-slate-900 border-t sm:border border-slate-700 w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col transition-transform transform translate-y-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-700 bg-slate-800/50 rounded-t-2xl sticky top-0 z-10 backdrop-blur-md">
          <h2 id={titleId} className="text-lg sm:text-xl font-bold text-white uppercase tracking-tight truncate pr-4">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors active:scale-95 touch-manipulation">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
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

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, id, error, ...props }, ref) => {
    const errorClasses = error ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500';

    return (
        <div className="w-full">
            {label && <label htmlFor={id} className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>}
            <input
                id={id}
                ref={ref}
                {...props}
                className={`w-full bg-slate-900 border ${errorClasses} rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all shadow-sm touch-manipulation appearance-none ${props.className}`}
            />
            {error && <p className="text-rose-400 text-xs mt-1.5 ml-1 font-medium flex items-center gap-1">⚠️ {error}</p>}
        </div>
    );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ label, id, children, ...props }, ref) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>}
        <div className="relative">
            <select id={id} ref={ref} {...props} className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm appearance-none touch-manipulation ${props.className}`}>
                {children}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
));

export const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider border-b border-[var(--border-color)] pb-1.5">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mt-3">
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

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-700 rounded ${className}`}></div>
);

export const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    const displayNameMap: Record<Rol['nume'], string> = {
        'SUPER_ADMIN_FEDERATIE': 'Super Admin',
        'ADMIN': 'Admin',
        'ADMIN_CLUB': 'Admin Club',
        'INSTRUCTOR': 'Instructor',
        'SPORTIV': 'Sportiv'
    };
    
    const colorClasses: Record<Rol['nume'], string> = {
        'SUPER_ADMIN_FEDERATIE': 'bg-purple-900 text-white font-black',
        'ADMIN': 'bg-purple-700 text-white',
        'ADMIN_CLUB': 'bg-[#3D3D99] text-white font-bold',
        'INSTRUCTOR': 'bg-red-600 text-white',
        'SPORTIV': 'bg-[#4DBCE9] text-white',
    };

    const displayName = displayNameMap[role.nume] || role.nume;

    return (
        <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${colorClasses[role.nume] || 'bg-gray-500 text-white'}`}>
            {displayName}
        </span>
    );
};