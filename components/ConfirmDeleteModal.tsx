import React from 'react';
import { Modal, Button } from './ui';
import { TrashIcon } from './icons';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tableName: string;
  isLoading: boolean;
  customMessage?: string;
  title?: string;
  confirmButtonText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info';
  icon?: React.ElementType;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tableName,
  isLoading,
  customMessage,
  title = "Confirmare Ștergere",
  confirmButtonText = "Da, șterge",
  confirmButtonVariant = "danger",
  icon: Icon = TrashIcon
}) => {
  if (!isOpen) return null;

  const variant = confirmButtonVariant || 'danger';

  const iconColorClass = {
      danger: 'text-red-400',
      success: 'text-green-400',
      info: 'text-sky-400',
      primary: 'text-blue-400',
      secondary: 'text-slate-400',
  }[variant];
  
  const iconBgClass = {
      danger: 'bg-red-900/50 border-red-700',
      success: 'bg-green-900/50 border-green-700',
      info: 'bg-sky-900/50 border-sky-700',
      primary: 'bg-blue-900/50 border-blue-700',
      secondary: 'bg-slate-900/50 border-slate-700',
  }[variant];


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-center">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${iconBgClass}`}>
          <Icon className={`h-6 w-6 ${iconColorClass}`} />
        </div>
        <div className="mt-4">
            <h3 className="text-lg font-semibold text-white">Atenție!</h3>
            <p className="mt-2 text-sm text-slate-300" style={{ fontSize: '13px' }}>
                {customMessage || `Sigur dorești să ștergi această înregistrare din ${tableName}?`}
            </p>
             <p className="mt-1 text-xs text-slate-500">
                Această acțiune este ireversibilă.
            </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto order-2 sm:order-1 bg-slate-600 hover:bg-slate-700">
          Anulează
        </Button>
        <Button variant={confirmButtonVariant} onClick={onConfirm} isLoading={isLoading} className="w-full sm:w-auto order-1 sm:order-2">
          {confirmButtonText}
        </Button>
      </div>
    </Modal>
  );
};