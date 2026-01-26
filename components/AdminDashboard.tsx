import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Sportiv, User } from '../types';

interface AdminDashboardProps {
  currentUser: User | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verifică dacă utilizatorul are rolul de 'Admin Club' în oricare dintre sisteme
  const isAdminClub = currentUser?.rol === 'ADMIN_CLUB' || currentUser?.roluri?.some(r => r.nume === 'Admin Club');
  
  useEffect(() => {
    // Nu se execută fetch dacă utilizatorul nu are rolul corect
    if (!isAdminClub) {
        setLoading(false);
        return;
    }
    
    const fetchSportivi = async () => {
      setLoading(true);
      setError(null);
      
      // Politicile RLS din Supabase vor filtra automat sportivii
      // pentru a returna doar pe cei din clubul administratorului curent.
      const { data, error } = await supabase.from('sportivi').select('*');

      if (error) {
        setError(error.message);
        console.error("Error fetching sportivi:", error);
      } else {
        setSportivi(data as Sportiv[]);
      }
      setLoading(false);
    };

    fetchSportivi();
  }, [isAdminClub]); // Se re-execută dacă rolul utilizatorului s-ar schimba

  // Afișează 'Acces Refuzat' dacă rolul nu este 'ADMIN_CLUB'
  if (!isAdminClub) {
    return (
      <div className="p-8 text-center bg-red-900/50 text-red-300 rounded-lg border border-red-700">
        <h1 className="text-2xl font-bold">Acces Refuzat</h1>
        <p className="mt-2">Nu aveți permisiunile necesare pentru a vizualiza această pagină.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-white">Încărcare sportivi...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-400">Eroare: {error}</div>;
  }
  
  // Afișează tabelul cu sportivi
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">Listă Sportivi Club</h1>
        <p className="text-slate-400">Sunt afișați sportivii din clubul dumneavoastră.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-700 text-xs text-slate-400 uppercase">
            <tr>
              <th scope="col" className="px-6 py-3">Nume</th>
              <th scope="col" className="px-6 py-3">Prenume</th>
              <th scope="col" className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sportivi.map(sportiv => (
              <tr key={sportiv.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
                <td className="px-6 py-4 font-medium text-white">{sportiv.nume}</td>
                <td className="px-6 py-4">{sportiv.prenume}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    sportiv.status === 'Activ' 
                      ? 'bg-green-600/30 text-green-300' 
                      : 'bg-red-600/30 text-red-400'
                  }`}>
                    {sportiv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sportivi.length === 0 && !loading && <p className="p-4 text-center text-slate-400">Nu s-au găsit sportivi în clubul dumneavoastră.</p>}
    </div>
  );
};

export default AdminDashboard;