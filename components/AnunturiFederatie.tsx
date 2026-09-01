import React, { useState, useEffect } from 'react';
import { AnuntFederatie, Club, User } from '../types';
import { Card, Modal, Input, Select, Button } from './ui';
import { PlusIcon, EditIcon, TrashIcon, BellIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AnuntFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { titlu: string; continut: string; club_id_target: string | null; expira_la: string | null }) => Promise<boolean>;
  clubs: Club[];
  anuntToEdit: AnuntFederatie | null;
}

const AnuntFormModal: React.FC<AnuntFormModalProps> = ({ isOpen, onClose, onSave, clubs, anuntToEdit }) => {
  const [titlu, setTitlu] = useState('');
  const [continut, setContinut] = useState('');
  const [clubIdTarget, setClubIdTarget] = useState<string>('');
  const [expiraLa, setExpiraLa] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitlu(anuntToEdit?.titlu || '');
      setContinut(anuntToEdit?.continut || '');
      setClubIdTarget(anuntToEdit?.club_id_target || '');
      setExpiraLa(anuntToEdit?.expira_la ? anuntToEdit.expira_la.slice(0, 10) : '');
    }
  }, [isOpen, anuntToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const inchide = await onSave({
      titlu: titlu.trim(),
      continut: continut.trim(),
      club_id_target: clubIdTarget || null,
      expira_la: expiraLa ? new Date(expiraLa).toISOString() : null,
    });
    setLoading(false);
    if (inchide) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={anuntToEdit ? 'Editează Anunț' : 'Anunț Nou'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Titlu" value={titlu} onChange={e => setTitlu(e.target.value)} required />
        <div className="w-full">
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Conținut</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white resize-none"
            rows={4}
            value={continut}
            onChange={e => setContinut(e.target.value)}
            required
          />
        </div>
        <Select label="Club țintă (gol = toate cluburile)" value={clubIdTarget} onChange={e => setClubIdTarget(e.target.value)}>
          <option value="">Toate cluburile</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
        </Select>
        <Input label="Expiră la (opțional)" type="date" value={expiraLa} onChange={e => setExpiraLa(e.target.value)} />
        <div className="flex justify-end pt-2 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
        </div>
      </form>
    </Modal>
  );
};

interface AnunturiFederatieProps {
  onBack: () => void;
  clubs: Club[];
  currentUser: User;
}

export const AnunturiFederatie: React.FC<AnunturiFederatieProps> = ({ clubs, currentUser }) => {
  const [anunturi, setAnunturi] = useState<AnuntFederatie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [anuntToEdit, setAnuntToEdit] = useState<AnuntFederatie | null>(null);
  const [anuntToDelete, setAnuntToDelete] = useState<AnuntFederatie | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError, showSuccess } = useError();

  const fetchAnunturi = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('anunturi_federatie').select('*').order('created_at', { ascending: false });
    if (error) showError('Eroare', error.message);
    else setAnunturi((data || []) as AnuntFederatie[]);
    setLoading(false);
  };

  useEffect(() => { fetchAnunturi(); }, []);

  const handleSave = async (formData: { titlu: string; continut: string; club_id_target: string | null; expira_la: string | null }): Promise<boolean> => {
    try {
      if (anuntToEdit) {
        const { data, error } = await supabase.from('anunturi_federatie').update(formData).eq('id', anuntToEdit.id).select().single();
        if (error) throw error;
        if (data) setAnunturi(prev => prev.map(a => a.id === anuntToEdit.id ? data as AnuntFederatie : a));
      } else {
        const { data, error } = await supabase.from('anunturi_federatie').insert([{ ...formData, creat_de: currentUser.id }]).select().single();
        if (error) throw error;
        if (data) setAnunturi(prev => [data as AnuntFederatie, ...prev]);
      }
      showSuccess('Succes', 'Anunțul a fost salvat.');
      return true;
    } catch (err: any) {
      showError('Eroare la salvare', err.message);
      return false;
    }
  };

  const confirmDelete = async (id: string) => {
    setIsDeleting(true);
    const { error } = await supabase.from('anunturi_federatie').delete().eq('id', id);
    if (error) showError('Eroare la ștergere', error.message);
    else {
      setAnunturi(prev => prev.filter(a => a.id !== id));
      showSuccess('Succes', 'Anunțul a fost șters.');
    }
    setIsDeleting(false);
    setAnuntToDelete(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-2">
          <BellIcon className="w-6 h-6 text-amber-400" /> Anunțuri Federație
        </h1>
        <Button onClick={() => { setAnuntToEdit(null); setIsModalOpen(true); }} variant="info">
          <PlusIcon className="w-5 h-5 mr-2" /> Anunț Nou
        </Button>
      </div>

      {loading ? (
        <Card className="text-center p-8"><p className="text-slate-400 italic">Se încarcă...</p></Card>
      ) : anunturi.length === 0 ? (
        <Card className="text-center p-8"><p className="text-slate-400 italic">Niciun anunț publicat încă.</p></Card>
      ) : (
        <div className="space-y-3">
          {anunturi.map(a => {
            const club = a.club_id_target ? clubs.find(c => c.id === a.club_id_target) : null;
            const expirat = a.expira_la ? new Date(a.expira_la) < new Date() : false;
            return (
              <Card key={a.id} className={`p-4 ${expirat ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{a.titlu}</p>
                    <p className="text-sm text-slate-300 mt-1">{a.continut}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {club ? `Club: ${club.nume}` : 'Toate cluburile'}
                      {a.expira_la && ` · Expiră: ${new Date(a.expira_la).toLocaleDateString('ro-RO')}`}
                      {expirat && ' · EXPIRAT'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="primary" onClick={() => { setAnuntToEdit(a); setIsModalOpen(true); }}><EditIcon /></Button>
                    <Button size="sm" variant="danger" onClick={() => setAnuntToDelete(a)}><TrashIcon /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AnuntFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} clubs={clubs} anuntToEdit={anuntToEdit} />
      <ConfirmDeleteModal isOpen={!!anuntToDelete} onClose={() => setAnuntToDelete(null)} onConfirm={() => { if (anuntToDelete) confirmDelete(anuntToDelete.id); }} tableName="Anunț" isLoading={isDeleting} />
    </div>
  );
};
