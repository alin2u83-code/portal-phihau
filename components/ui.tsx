import React, { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { XIcon, SearchIcon, ChevronDownIcon } from './icons';
import { Rol, Club } from '../types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  pill?: boolean;
  ghost?: boolean;
  outline?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
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
  pill,
  ghost,
  outline,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (disabled || isLoading) setIsHovered(false);
  }, [disabled, isLoading]);

  const roundedClass = pill ? 'rounded-full' : 'rounded-xl';
  const baseClasses = `inline-flex items-center justify-center ${roundedClass} font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap`;

  const sizeClasses: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
    xs: 'px-3 py-1 text-xs',
    sm: "px-4 py-2 text-sm", // Increased touch target
    md: "px-6 py-3 text-base", // Larger for mobile
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: "focus:ring-blue-500 shadow-md active:scale-95",
    secondary: "focus:ring-slate-500 shadow-sm active:scale-95",
    danger: "focus:ring-rose-500 shadow-md active:scale-95",
    success: "focus:ring-emerald-500 shadow-md active:scale-95",
    info: "focus:ring-sky-500 shadow-md active:scale-95",
    warning: "focus:ring-amber-500 shadow-md active:scale-95",
  };

  const variantStyles: Partial<Record<string, React.CSSProperties>> = {
    primary: {
      backgroundColor: isHovered ? 'var(--t-primary-hover)' : 'var(--t-primary)',
      color: 'var(--t-primary-fg)',
    },
    secondary: {
      backgroundColor: isHovered ? 'var(--t-secondary-hover)' : 'var(--t-secondary)',
      color: 'var(--t-secondary-fg)',
    },
    danger: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-danger) 80%, #000)' : 'var(--t-status-danger)',
      color: '#ffffff',
    },
    success: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-success) 80%, #000)' : 'var(--t-status-success)',
      color: '#ffffff',
    },
    info: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-info) 80%, #000)' : 'var(--t-status-info)',
      color: '#ffffff',
    },
    warning: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-warning) 80%, #000)' : 'var(--t-status-warning)',
      color: '#ffffff',
    },
    ghost_primary: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-primary) 10%, transparent)' : 'transparent',
      color: 'var(--t-primary)',
      border: '1px solid var(--t-primary)',
    },
    ghost_secondary: {
      backgroundColor: isHovered ? 'var(--t-surface-2)' : 'transparent',
      color: 'var(--t-secondary-fg)',
      border: '1px solid var(--t-border)',
    },
    ghost_danger: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-danger) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-danger)',
      border: '1px solid var(--t-status-danger)',
    },
    ghost_success: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-success) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-success)',
      border: '1px solid var(--t-status-success)',
    },
    ghost_info: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-info) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-info)',
      border: '1px solid var(--t-status-info)',
    },
    ghost_warning: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-warning) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-warning)',
      border: '1px solid var(--t-status-warning)',
    },
    outline_primary: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-primary) 10%, transparent)' : 'transparent',
      color: 'var(--t-primary)',
      border: '2px solid var(--t-primary)',
    },
    outline_secondary: {
      backgroundColor: isHovered ? 'var(--t-surface-2)' : 'transparent',
      color: 'var(--t-secondary-fg)',
      border: '2px solid var(--t-border)',
    },
    outline_danger: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-danger) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-danger)',
      border: '2px solid var(--t-status-danger)',
    },
    outline_success: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-success) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-success)',
      border: '2px solid var(--t-status-success)',
    },
    outline_info: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-info) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-info)',
      border: '2px solid var(--t-status-info)',
    },
    outline_warning: {
      backgroundColor: isHovered ? 'color-mix(in srgb, var(--t-status-warning) 10%, transparent)' : 'transparent',
      color: 'var(--t-status-warning)',
      border: '2px solid var(--t-status-warning)',
    },
  };

  const stylePrefix = ghost ? 'ghost_' : outline ? 'outline_' : '';
  const styleKey = `${stylePrefix}${variant}`;
  const activeStyle = variantStyles[styleKey] ?? variantStyles[variant] ?? {};

  const finalClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ''} touch-manipulation`; // Added touch-manipulation

  const content = isLoading ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Procesare...
    </span>
  ) : (leftIcon || rightIcon) ? (
    <span className="flex items-center gap-2">
      {leftIcon}
      {children}
      {rightIcon}
    </span>
  ) : children;

  if (as === 'label') {
    return (
      <label
        htmlFor={htmlFor}
        className={`${finalClassName} ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={activeStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {content}
      </label>
    );
  }

  return (
    <button
      className={finalClassName}
      style={activeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
};

export interface ConfirmButtonProps extends Omit<ButtonProps & { as?: 'label'; htmlFor?: string }, 'onClick' | 'as'> {
  onConfirm: () => void;
  confirmText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  onConfirm,
  confirmText = 'Ești sigur?',
  confirmLabel = 'Da',
  cancelLabel = 'Nu',
  children,
  variant = 'danger',
  ...buttonProps
}) => {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConfirming = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setConfirming(false);
    }, 3000);
  };

  const handleConfirm = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
    onConfirm();
  };

  const handleCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfirming(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-sm text-slate-400">{confirmText}</span>
        <Button size="sm" variant={variant} onClick={handleConfirm}>{confirmLabel}</Button>
        <Button size="sm" variant="secondary" onClick={handleCancel}>{cancelLabel}</Button>
      </span>
    );
  }

  return (
    <Button variant={variant} onClick={startConfirming} {...buttonProps}>
      {children}
    </Button>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => (
  <div className={`bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-4 shadow-lg backdrop-blur-sm ${className ?? ''}`} {...props}>
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  accentColor?: string;
  trend?: { value: number; label: string };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accentColor = 'amber', trend, className = '', onClick }) => {
  const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    amber: { bg: 'from-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10' },
    emerald: { bg: 'from-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10' },
    sky: { bg: 'from-sky-500/5', text: 'text-sky-400', border: 'border-sky-500/20', iconBg: 'bg-sky-500/10' },
    indigo: { bg: 'from-indigo-500/5', text: 'text-indigo-400', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/10' },
    rose: { bg: 'from-rose-500/5', text: 'text-rose-400', border: 'border-rose-500/20', iconBg: 'bg-rose-500/10' },
    slate: { bg: 'from-slate-700/20', text: 'text-slate-400', border: 'border-slate-700/50', iconBg: 'bg-slate-700/50' },
  };
  const c = colorMap[accentColor] || colorMap.amber;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} to-slate-800/80 p-4 shadow-lg backdrop-blur-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : ''} ${className ?? ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-black ${c.text} leading-none`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-1.5 ${trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${c.iconBg} shrink-0`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  persistent?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, persistent = false }) => {
  const titleId = React.useId();
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => !persistent && onClose()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="bg-[var(--t-bg)] border border-[var(--t-border)] w-full max-h-[90vh] max-w-lg sm:max-w-2xl rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()} style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[var(--t-border)] bg-[var(--t-surface-2)] rounded-t-2xl sticky top-0 z-10 backdrop-blur-md">
          <h2 id={titleId} className="text-base sm:text-lg font-bold text-white tracking-tight truncate pr-4">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors active:scale-95 touch-manipulation">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

interface CredentialeContModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  parola: string;
  numeSportiv?: string;
}

export const CredentialeContModal: React.FC<CredentialeContModalProps> = ({ isOpen, onClose, email, parola, numeSportiv }) => {
  const [copiatEmail, setCopiatEmail] = useState(false);
  const [copiatParola, setCopiatParola] = useState(false);

  const copiaza = (text: string, setCopiat: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Credențiale cont creat"
    >
      <div
        className="bg-[var(--t-bg)] border border-[var(--t-border)] w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[var(--t-border)] bg-[var(--t-surface-2)] rounded-t-2xl">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Cont creat cu succes</h2>
            {numeSportiv && <p className="text-xs text-slate-400 mt-0.5">Credențiale pentru {numeSportiv}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors active:scale-95 touch-manipulation"
            aria-label="Închide"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Transmite aceste credențiale sportivului. Parola va fi cerută a fi schimbată la prima autentificare.
          </p>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</label>
            <div className="flex items-center gap-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-[var(--t-text)] font-mono break-all select-all">{email}</span>
              <button
                type="button"
                onClick={() => copiaza(email, setCopiatEmail)}
                className="shrink-0 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors touch-manipulation"
                aria-label="Copiază email"
              >
                {copiatEmail ? 'Copiat!' : 'Copiază'}
              </button>
            </div>
          </div>

          {/* Parola */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Parolă inițială</label>
            <div className="flex items-center gap-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-[var(--t-text)] font-mono break-all select-all">{parola}</span>
              <button
                type="button"
                onClick={() => copiaza(parola, setCopiatParola)}
                className="shrink-0 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors touch-manipulation"
                aria-label="Copiază parola"
              >
                {copiatParola ? 'Copiată!' : 'Copiază'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-semibold text-sm transition-colors border-b-4 border-amber-800 touch-manipulation"
          >
            Am înțeles
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, id, error, ...props }, ref) => {
    const errorClasses = error ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-[var(--t-border)] focus:ring-indigo-500 focus:border-indigo-500';

    return (
        <div className="w-full">
            {label && <label htmlFor={id} className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>}
            <input
                id={id}
                ref={ref}
                {...props}
                className={`w-full bg-[var(--t-bg)] border ${errorClasses} rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-2 transition-all shadow-sm touch-manipulation appearance-none ${props.className ?? ""}`}
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
            <select id={id} ref={ref} {...props} className={`w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-base sm:text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm appearance-none touch-manipulation ${props.className ?? ""}`}>
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
  <div className={`animate-pulse bg-slate-700 rounded ${className ?? ''}`}></div>
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

export const Badge: React.FC<{ children: React.ReactNode, variant?: 'green' | 'red' | 'amber' | 'blue' | 'slate', className?: string }> = ({ children, variant = 'slate', className = '' }) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    green: {
      background: 'color-mix(in srgb, var(--t-status-success) 18%, transparent)',
      color: 'var(--t-status-success)',
      borderColor: 'color-mix(in srgb, var(--t-status-success) 35%, transparent)',
    },
    red: {
      background: 'color-mix(in srgb, var(--t-status-danger) 18%, transparent)',
      color: 'var(--t-status-danger)',
      borderColor: 'color-mix(in srgb, var(--t-status-danger) 35%, transparent)',
    },
    amber: {
      background: 'color-mix(in srgb, var(--t-status-warning) 18%, transparent)',
      color: 'var(--t-status-warning)',
      borderColor: 'color-mix(in srgb, var(--t-status-warning) 35%, transparent)',
    },
    blue: {
      background: 'color-mix(in srgb, var(--t-status-info) 18%, transparent)',
      color: 'var(--t-status-info)',
      borderColor: 'color-mix(in srgb, var(--t-status-info) 35%, transparent)',
    },
    slate: {
      background: 'rgba(100,116,139,0.15)',
      color: '#94a3b8',
      borderColor: 'rgba(100,116,139,0.3)',
    },
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${className ?? ''}`} style={variantStyles[variant]}>
      {children}
    </span>
  );
};

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ label, containerClassName = '', className = '', ...props }) => (
  <div className={`w-full ${containerClassName}`}>
    {label && <label className="block text-[11px] uppercase font-bold text-slate-200 mb-1 ml-1">{label}</label>}
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-4 w-4 text-slate-400" />
      </div>
      <input
        {...props}
        className={`w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm touch-manipulation appearance-none ${className ?? ''}`}
      />
    </div>
  </div>
);

export const ClubSelect: React.FC<{
  clubs: Club[];
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  label?: string;
  allLabel?: string;
  name?: string;
  renderOption?: (club: Club) => string;
}> = ({ clubs, value, onChange, label = 'Club', allLabel = 'Toate cluburile', name, renderOption }) => (
  <Select label={label} name={name} value={value} onChange={onChange}>
    <option value="">{allLabel}</option>
    {clubs.map(c => <option key={c.id} value={c.id}>{renderOption ? renderOption(c) : c.nume}</option>)}
  </Select>
);

// -----------------------------------------------
// SEARCHABLE SELECT
// Desktop: combobox custom cu highlight, navigare taste, Clear(X)
// Mobil (< 768px): <select> nativ HTML pentru UX touch
// -----------------------------------------------
export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  emptyLabel?: string; // eticheta pentru opțiunea "goală" (ex: "Orice grad")
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-blue-400">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selectează...',
  label,
  className = '',
  emptyLabel,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  // Ce e vizibil în câmpul text
  const [inputValue, setInputValue] = useState('');
  // Filtrul activ (ce tastează userul)
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Detectare mobil
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Închide dropdown la click afară
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Restaurează label-ul valorii selectate la închidere
        const selected = options.find(o => o.value === value);
        setInputValue(selected ? selected.label : '');
        setQuery('');
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [options, value]);

  // Când valoarea externă se schimbă și dropdown-ul e închis — sincronizăm inputul
  useEffect(() => {
    if (!open) {
      const selected = options.find(o => o.value === value);
      setInputValue(selected ? selected.label : '');
    }
  }, [value, open, options]);

  // Resetează highlight când se schimbă query-ul
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Scroll item highlighted în vizibil
  useEffect(() => {
    if (!listRef.current || !open) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const selectedOption = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    const opt = options.find(o => o.value === val);
    const lbl = opt ? opt.label : '';
    setInputValue(lbl);
    setQuery('');
    setOpen(false);
    // Selectează textul din câmp după selecție
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  }, [onChange, options]);

  const handleInputClick = () => {
    if (!open) {
      // Deschide dropdown și selectează textul existent
      setQuery('');
      setOpen(true);
      setTimeout(() => inputRef.current?.select(), 0);
    } else {
      inputRef.current?.select();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    setQuery(v);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setQuery('');
        setOpen(true);
        setTimeout(() => inputRef.current?.select(), 0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(h => Math.min(h + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlighted]) {
          handleSelect(filtered[highlighted].value);
        }
        break;
      case 'Escape':
        // Restaurează label-ul și închide
        setInputValue(selectedOption ? selectedOption.label : '');
        setQuery('');
        setOpen(false);
        break;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
    setQuery('');
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    // Click pe chevron sau pe zona din dreapta — toggle dropdown
    e.stopPropagation();
    if (open) {
      const selected = options.find(o => o.value === value);
      setInputValue(selected ? selected.label : '');
      setQuery('');
      setOpen(false);
    } else {
      setQuery('');
      setOpen(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  };

  // ---- MOBIL: select nativ ----
  if (isMobile) {
    return (
      <div className={`w-full ${className ?? ''}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-base text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm appearance-none touch-manipulation"
          >
            {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // ---- DESKTOP: combobox custom ----
  return (
    <div className={`w-full relative ${className ?? ''}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
          {label}
        </label>
      )}

      {/* Câmpul principal — un singur <input> care e și search bar */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm text-[var(--t-text)] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-sm flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onClick={handleInputClick}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder-slate-500 cursor-text"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="searchable-select-listbox"
        />
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded"
              tabIndex={-1}
              aria-label="Sterge selectia"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDropdownToggle}
            tabIndex={-1}
            className="text-slate-400 hover:text-white transition-colors p-0.5 rounded"
            aria-label={open ? 'Inchide lista' : 'Deschide lista'}
          >
            <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          id="searchable-select-listbox"
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto py-1"
        >
          {emptyLabel !== undefined && !query && (
            <li
              role="option"
              aria-selected={value === ''}
              onMouseDown={e => { e.preventDefault(); handleSelect(''); }}
              className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                value === ''
                  ? 'bg-indigo-700 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {emptyLabel}
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-500 italic">Niciun rezultat</li>
          ) : (
            filtered.map((o, idx) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={e => { e.preventDefault(); handleSelect(o.value); }}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                  idx === highlighted
                    ? 'bg-indigo-600 text-white'
                    : o.value === value
                    ? 'bg-indigo-900/50 text-indigo-300'
                    : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                {highlightMatch(o.label, query)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

interface DateInputDMYProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export const DateInputDMY: React.FC<DateInputDMYProps> = ({ label, value, onChange, required, disabled, error }) => {
  const [zi, setZi] = useState('');
  const [luna, setLuna] = useState('');
  const [an, setAn] = useState('');
  const lunaRef = useRef<HTMLInputElement>(null);
  const anRef = useRef<HTMLInputElement>(null);
  // Previne resetarea câmpurilor interne cât timp utilizatorul are focus activ
  const hasFocusRef = useRef(false);
  // Valoarea externă anterioară — sincronizăm doar când valoarea se schimbă cu adevărat din exterior
  const lastExternalValueRef = useRef<string>('');

  useEffect(() => {
    // Nu suprascriem câmpurile dacă utilizatorul tastează activ
    if (hasFocusRef.current) return;
    // Sincronizăm doar dacă valoarea externă s-a schimbat față de ultima dată când am sincronizat
    if (value === lastExternalValueRef.current) return;
    lastExternalValueRef.current = value || '';

    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-');
      setAn(y); setLuna(m); setZi(d);
    } else if (!value) {
      setZi(''); setLuna(''); setAn('');
    }
  }, [value]);

  const emit = (z: string, l: string, a: string) => {
    if (z.length <= 2 && l.length <= 2 && a.length === 4 && +z >= 1 && +z <= 31 && +l >= 1 && +l <= 12) {
      const emitted = `${a}-${l.padStart(2,'0')}-${z.padStart(2,'0')}`;
      lastExternalValueRef.current = emitted;
      onChange(emitted);
    } else {
      lastExternalValueRef.current = '';
      onChange('');
    }
  };

  const handleZi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g,'').slice(0,2);
    setZi(v); emit(v, luna, an);
    if (v.length === 2 && +v >= 1 && +v <= 31) lunaRef.current?.focus();
  };

  const handleLuna = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g,'').slice(0,2);
    setLuna(v); emit(zi, v, an);
    if (v.length === 2 && +v >= 1 && +v <= 12) anRef.current?.focus();
  };

  const handleAn = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g,'').slice(0,4);
    setAn(v); emit(zi, luna, v);
  };

  const handleFocus = () => { hasFocusRef.current = true; };
  const handleBlur = () => { hasFocusRef.current = false; };

  const cls = `w-full bg-[var(--t-surface)] border ${error ? 'border-red-500' : 'border-[var(--t-border)]'} rounded-lg px-2 py-2 text-[var(--t-text)] text-center text-base focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}{required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex flex-col items-center gap-1 flex-1">
          <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="ZZ" value={zi} onChange={handleZi} onFocus={handleFocus} onBlur={handleBlur} disabled={disabled} maxLength={2} className={cls} aria-label="Zi" />
          <span className="text-xs text-slate-500">Zi</span>
        </div>
        <span className="text-slate-500 mb-5">/</span>
        <div className="flex flex-col items-center gap-1 flex-1">
          <input ref={lunaRef} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="LL" value={luna} onChange={handleLuna} onFocus={handleFocus} onBlur={handleBlur} disabled={disabled} maxLength={2} className={cls} aria-label="Lună" />
          <span className="text-xs text-slate-500">Lună</span>
        </div>
        <span className="text-slate-500 mb-5">/</span>
        <div className="flex flex-col items-center gap-1 flex-[2]">
          <input ref={anRef} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="AAAA" value={an} onChange={handleAn} onFocus={handleFocus} onBlur={handleBlur} disabled={disabled} maxLength={4} className={cls} aria-label="An" />
          <span className="text-xs text-slate-500">An</span>
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

// --- Accordion ---
interface AccordionItemProps {
  id: string;
  title: string;
  icon?: React.ElementType;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ id, title, icon: Icon, isOpen, onToggle, children }) => (
  <div className="border border-[var(--t-border)] rounded-lg overflow-hidden">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-4 py-3 bg-[var(--t-surface-2)] hover:bg-[var(--t-surface)] transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-amber-400 shrink-0" />}
        <span className="font-semibold text-slate-200 text-sm uppercase tracking-wider">{title}</span>
      </div>
      <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="p-3 bg-slate-900/40">
        {children}
      </div>
    )}
  </div>
);

export const Accordion: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-2">{children}</div>
);
