import React, { useState } from 'react';
import { Permissions, Inlantuire } from '../types';
import { useInlantuiri } from '../hooks/useInlantuiri';
import { InlantuireFormModal } from './InlantuireFormModal';
import { InlantuireGradePanel } from './InlantuireGradePanel';
import { Button, Badge } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from './icons';
import { useError } from './ErrorProvider';

interface Props {
  permissions: Permissions;
  onBack: () => void;
}

export const InlantuciriAdmin: React.FC<Props> = ({ permissions, onBack }) => {
  const { showError } = useError();
  const { inlantuiri, loading, addInlantuire, updateInlantuire, deleteInlantuire } = useInlantuiri();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Inlantuire | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canEdit = permissions.isSuperAdmin || permissions.isFederationAdmin;

  if (!canEdit) {
    return (
      <div className="text-center py-16 text-slate-400">
        Acces restricționat — doar SUPER_ADMIN_FEDERATIE.
      </div>
    );
  }

  const openAdd = () => { setEditItem(undefined); setFormOpen(true); };
  const openEdit = (item: Inlantuire) => { setEditItem(item); setFormOpen(true); };

  const handleSave = async (values: Pick<Inlantuire, 'denumire' | 'ordine' | 'activ'>) => {
    let error;
    if (editItem) {
      error = await updateInlantuire(editItem.id, values);
    } else {
      error = await addInlantuire(values);
    }
    if (error) throw new Error(error.message);
  };

  const handleDelete = async (item: Inlantuire) => {
    if (!window.confirm(`Ștergi înlănțuirea "${item.denumire}"? Se vor șterge și toate asocierile cu grade.`)) return;
    setDeleting(item.id);
    const error = await deleteInlantuire(item.id);
    if (error) showError('Eroare ștergere', error.message);
    setDeleting(null);
  };

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Înlănțuiri</h1>
          <p className="text-slate-400 text-sm">
            Catalog forme/arme + asocieri per grad și tip probă
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon className="w-4 h-4 mr-1" />
          Adaugă
        </Button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Se încarcă...</div>
      ) : inlantuiri.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center italic">Nicio înlănțuire definită.</div>
      ) : (
        <div className="space-y-1">
          {inlantuiri.map(item => (
            <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                >
                  {expanded === item.id
                    ? <ChevronDownIcon className="w-4 h-4" />
                    : <ChevronRightIcon className="w-4 h-4" />
                  }
                </button>
                <span className="flex-1 text-sm text-slate-200 font-medium">{item.denumire}</span>
                <span className="text-xs text-slate-500 w-16 text-right">ord: {item.ordine}</span>
                <Badge variant={item.activ ? 'green' : 'slate'}>
                  {item.activ ? 'activ' : 'inactiv'}
                </Badge>
                <button
                  onClick={() => openEdit(item)}
                  title="Editează"
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deleting === item.id}
                  title="Șterge"
                  className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors disabled:opacity-40"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              {expanded === item.id && (
                <div className="border-t border-slate-700 px-3 py-3 bg-slate-900/40">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
                    Grade și probe permise
                  </p>
                  <InlantuireGradePanel inlantuireId={item.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <InlantuireFormModal
          inlantuire={editItem}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
};
