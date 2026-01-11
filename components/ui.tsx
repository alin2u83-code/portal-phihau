import React, { ReactNode } from 'react';
import { XIcon } from './icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info' | 'brand' | 'light-secondary';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = "rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center shadow";
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
  };
  const variantClasses = {
    primary: "bg-brand-secondary hover:bg-sky-500 focus:ring-brand-secondary text-white",
    secondary: "bg-slate-600 hover:bg-slate-700 focus:ring-slate-500 text-white",
    danger: "bg-status-danger hover:bg-red-700 focus:ring-status-danger text-white",
    success: "bg-status-success hover:bg-green-700 focus:ring-status-success text-white",
    info: "bg-brand-secondary hover:bg-sky-500 focus:ring-brand-secondary text-white",
    brand: "bg-brand-primary hover:bg-blue-800 focus:ring-brand-primary text-white",
    'light-secondary': "bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400",
  };
  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={`bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg border border-slate-700 ${className}`}>
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

  const handleOverlayClick = () => {
    if (!persistent) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-600" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XIcon />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const LightModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, persistent = false }) => {
  if (!isOpen) return null;
  const handleOverlayClick = () => { if (!persistent) { onClose(); } };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <XIcon />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-slate-700">
          {children}
        </div>
      </div>
    </div>
  );
};


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
  
export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
        <input id={id} {...props} className={`w-full bg-slate-900/50 border border-slate-600 rounded-md px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary focus:bg-slate-800 disabled:opacity-50 disabled:bg-slate-700 min-h-[44px] ${props.className}`} />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
        <select id={id} {...props} className={`w-full bg-slate-900/50 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary focus:bg-slate-800 disabled:opacity-50 disabled:bg-slate-700 min-h-[44px] ${props.className}`}>
            {children}
        </select>
    </div>
);

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Șterge",
  cancelText = "Anulează",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col border border-red-700/50" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XIcon />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-300">{message}</p>
        </div>
        <div className="flex justify-end items-center p-4 bg-slate-900/50 rounded-b-lg space-x-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelText}</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>{loading ? 'Se șterge...' : confirmText}</Button>
        </div>
      </div>
    </div>
  );
};