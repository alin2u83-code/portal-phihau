import React, { useState } from 'react';
import { Modal, Input, Button } from '../ui';
import { useError } from '../ErrorProvider';

export interface LocatieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locatieData: { nume: string; adresa: string }) => Promise<void>;
}

export const LocatieFormModal: React.FC<LocatieFormProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ nume: '', adresa: '' });
  const [loading, setLoading] = useState(false);
  const { showError } = useError();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nume.trim()) {
        showError("Validare eșuată", "Numele locației este obligatoriu.");
        return;
    }
    setLoading(true);
    await onSave({ nume: form.nume.trim(), adresa: form.adresa.trim() });
    setLoading(false);
    setForm({ nume: '', adresa: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Locație Nouă">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nume Locație" name="nume" value={form.nume} onChange={handleChange} required />
        <Input label="Adresă (Opțional)" name="adresa" value={form.adresa} onChange={handleChange} />
        <div className="flex justify-end pt-4 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" type="submit" isLoading={loading}>Salvează Locația</Button>
        </div>
      </form>
    </Modal>
  );
};
