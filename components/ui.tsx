import React, { ReactNode } from 'react';
import { XIcon } from './icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = "rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center shadow";
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
  };
  const variantClasses = {
    primary: "bg-brand-primary hover:bg-blue-900 focus:ring-brand-primary text-white",
    secondary: "bg-slate-500 hover:bg-slate-600 focus:ring-slate-500 text-white",
    danger: "bg-status-danger hover:bg-red-700 focus:ring-status-danger text-white",
    success: "bg-status-success hover:bg-green-700 focus:ring-status-success text-white",
    info: "bg-brand-secondary hover:bg-sky-500 focus:ring-brand-secondary text-white",
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
  <div className={`bg-white p-6 rounded-lg shadow-lg ${className}`}>
    {children}
  </div>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
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


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
  
export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>}
        <input id={id} {...props} className={`w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary ${props.className}`} />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>}
        <select id={id} {...props} className={`w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary ${props.className}`}>
            {children}
        </select>
    </div>
);