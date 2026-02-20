import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { IstoricGradeManagement } from './IstoricGradeManagement';

// Presupunem că aceste tipuri sunt definite undeva global, ex: /src/types.ts
interface Grad {
  id: string;
  nume: string;
}

interface Sportiv {
  id?: string;
  nume: string;
  prenume: string;
  data_nasterii: string;
  email: string | null;
  telefon: string | null;
  centura_curenta_id: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sportiv: Omit<Sportiv, 'id'>) => void;
  sportivToEdit?: Sportiv | null;
}

const initialSportivState: Sportiv = {
  nume: '',
  prenume: '',
  data_nasterii: '',
  email: '',
  telefon: '',
  centura_curenta_id: null,
};

export function SportivFormModal({ isOpen, onClose, onSave, sportivToEdit }: Props) {
  const [sportiv, setSportiv] = useState<Sportiv>(initialSportivState);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sportivToEdit) {
      setSportiv(sportivToEdit);
    } else {
      setSportiv(initialSportivState);
    }

    const fetchGrade = async () => {
      const { data, error } = await supabase.from('grade').select('id, nume').order('ordine');
      if (error) console.error('Eroare la încărcarea gradelor:', error);
      else setGrade(data || []);
    };

    if (isOpen) fetchGrade();

  }, [sportivToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSportiv(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { id, ...rest } = sportiv;
      onSave(rest);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-start pt-10 overflow-y-auto">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <h2 className="text-xl font-bold mb-4">{sportivToEdit ? 'Editează Sportiv' : 'Adaugă Sportiv'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="nume" value={sportiv.nume} onChange={handleChange} placeholder="Nume" required className="bg-gray-700 p-2 rounded" />
            <input type="text" name="prenume" value={sportiv.prenume} onChange={handleChange} placeholder="Prenume" required className="bg-gray-700 p-2 rounded" />
            <input type="date" name="data_nasterii" value={sportiv.data_nasterii} onChange={handleChange} className="bg-gray-700 p-2 rounded" />
            <input type="email" name="email" value={sportiv.email || ''} onChange={handleChange} placeholder="Email" className="bg-gray-700 p-2 rounded" />
            <input type="tel" name="telefon" value={sportiv.telefon || ''} onChange={handleChange} placeholder="Telefon" className="bg-gray-700 p-2 rounded" />
            <select name="centura_curenta_id" value={sportiv.centura_curenta_id || ''} onChange={handleChange} className="bg-gray-700 p-2 rounded">
              <option value="">Selectează centura</option>
              {grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
            </select>
          </div>
          
          {sportivToEdit?.id && <IstoricGradeManagement sportivId={sportivToEdit.id} />}

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex justify-end mt-6">
            <button type="button" onClick={onClose} disabled={loading} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded mr-2">Anulează</button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              {loading ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
