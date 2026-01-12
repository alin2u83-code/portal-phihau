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
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tableName,
  isLoading,
  customMessage
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmare Ștergere">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-900/50 border border-red-700">
          <TrashIcon className="h-6 w-6 text-red-400" />
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
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading} className="bg-slate-600 hover:bg-slate-700">
          Anulează
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          Da, șterge
        </Button>
      </div>
    </Modal>
  );
};