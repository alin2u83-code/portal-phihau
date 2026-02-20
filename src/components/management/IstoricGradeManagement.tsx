import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Trash2 } from 'lucide-react';

interface Grad {
  id: string;
  nume: string;
}

interface IstoricGrade {
  id: string;
  data_obtinere: string;
  grade: Grad;
}

interface Props {
  sportivId: string;
}

export function IstoricGradeManagement({ sportivId }: Props) {
  const [istoric, setIstoric] = useState<IstoricGrade[]>([]);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [newGradId, setNewGradId] = useState('');
  const [newData, setNewData] = useState('');

  const fetchIstoric = async () => {
    const { data } = await supabase
      .from('istoric_grade')
      .select('id, data_obtinere, grade (id, nume)')
      .eq('sportiv_id', sportivId)
      .order('data_obtinere', { ascending: false });
    setIstoric(data || []);
  };

  useEffect(() => {
    const fetchGrade = async () => {
      const { data } = await supabase.from('grade').select('id, nume').order('ordine');
      setGrade(data || []);
    };

    fetchIstoric();
    fetchGrade();
  }, [sportivId]);

  const handleAdd = async () => {
    if (!newGradId || !newData) return;
    await supabase.from('istoric_grade').insert({ sportiv_id: sportivId, grad_id: newGradId, data_obtinere: newData });
    fetchIstoric();
    setNewGradId('');
    setNewData('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Ștergeți această înregistrare din istoric?')) {
      await supabase.from('istoric_grade').delete().eq('id', id);
      fetchIstoric();
    }
  };

  return (
    <div className="mt-6 pt-4 border-t border-gray-700">
      <h3 className="text-lg font-semibold mb-3">Istoric Grade</h3>
      {/* Formular adăugare */}
      <div className="flex gap-2 mb-4">
        <select value={newGradId} onChange={e => setNewGradId(e.target.value)} className="bg-gray-700 p-2 rounded flex-grow">
          <option value="">Selectează grad</option>
          {grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
        </select>
        <input type="date" value={newData} onChange={e => setNewData(e.target.value)} className="bg-gray-700 p-2 rounded" />
        <button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 p-2 rounded"><Plus size={20} /></button>
      </div>
      {/* Lista istoric */}
      <ul className="space-y-2">
        {istoric.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
            <span>{item.grade.nume} - {new Date(item.data_obtinere).toLocaleDateString()}</span>
            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
