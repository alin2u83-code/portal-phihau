import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { SportivFormModal } from './SportivFormModal';

// Tipuri refolosite
interface Grad {
  id: string;
  nume: string;
}

interface Sportiv {
  id: string;
  nume: string;
  prenume: string;
  data_nasterii: string;
  email: string | null;
  telefon: string | null;
  centura_curenta_id: string | null;
  grade: Grad | null; // Relația poate fi nulă
}

export function SportiviManagement() {
  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSportiv, setEditingSportiv] = useState<Sportiv | null>(null);

  const fetchSportivi = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sportivi')
        .select(`id, nume, prenume, data_nasterii, email, telefon, centura_curenta_id, grade (id, nume)`);

      if (error) throw error;
      setSportivi(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSportivi();
  }, [fetchSportivi]);

  const handleAdd = () => {
    setEditingSportiv(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sportiv: Sportiv) => {
    setEditingSportiv(sportiv);
    setIsModalOpen(true);
  };

  const handleDelete = async (sportivId: string) => {
    if (window.confirm('Sunteți sigur că doriți să ștergeți acest sportiv?')) {
      const { error } = await supabase.from('sportivi').delete().eq('id', sportivId);
      if (error) {
        setError(error.message);
      } else {
        fetchSportivi(); // Re-încarcă lista
      }
    }
  };

  const handleSave = async (sportivData: Omit<Sportiv, 'id' | 'grade'>) => {
    const dataToSave = { ...sportivData };

    if (editingSportiv) {
      // Update
      const { error } = await supabase.from('sportivi').update(dataToSave).eq('id', editingSportiv.id);
      if (error) setError(error.message);
    } else {
      // Insert
      const { error } = await supabase.from('sportivi').insert(dataToSave);
      if (error) setError(error.message);
    }
    
    setIsModalOpen(false);
    fetchSportivi(); // Re-încarcă lista după salvare
  };

  if (loading && !isModalOpen) {
    return <div className="p-4">Se încarcă sportivii...</div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      {error && <div className="bg-red-900 border border-red-700 text-white px-4 py-3 rounded relative mb-4" role="alert"><span className="block sm:inline">{error}</span></div>}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Management Sportivi</h1>
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center">
          <Plus className="mr-2" size={20} />
          <span>Adaugă Sportiv</span>
        </button>
      </div>

      <div className="bg-gray-800 shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nume Complet</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Data Nașterii</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Centură</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acțiuni</span></th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {sportivi.map((sportiv) => (
              <tr key={sportiv.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{sportiv.nume} {sportiv.prenume}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{sportiv.data_nasterii}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{sportiv.grade?.nume || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(sportiv)} className="text-blue-400 hover:text-blue-300 mr-4"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(sportiv.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SportivFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        sportivToEdit={editingSportiv}
      />
    </div>
  );
}
