import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { GraduationCap, Save, Printer, CheckCircle } from 'lucide-react';

const RapoarteExamen = ({ examenId, logoUrl }) => {
  const [inscrieri, setInscrieri] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInscrieri();
  }, [examenId]);

  const fetchInscrieri = async () => {
    const { data, error } = await supabase
      .from('inscrieri_examene')
      .select(`
        *,
        sportivi (id, nume, data_nasterii, grad_actual_id)
      `)
      .eq('examen_id', examenId);

    if (!error && data) {
      // Inițializăm notele dacă sunt goale
      const dataCuNote = data.map(item => ({
        ...item,
        nota_tehnica: item.nota_tehnica || 0,
        nota_doc_luyen: item.nota_doc_luyen || 0,
        nota_song_luyen: item.nota_song_luyen || 0,
        nota_thao_quyen: item.nota_thao_quyen || 0,
        rezultat: item.rezultat || 'In asteptare'
      }));
      setInscrieri(dataCuNote);
    }
  };

  const updateLocalData = (id, field, value) => {
    setInscrieri(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculeazaMedia = (item) => {
    const media = (Number(item.nota_tehnica) + Number(item.nota_doc_luyen) + 
                   Number(item.nota_song_luyen) + Number(item.nota_thao_quyen)) / 4;
    return media.toFixed(2);
  };

  const handleSalvareSiPromovare = async () => {
    setLoading(true);
    try {
      for (const item of inscrieri) {
        // 1. Salvăm notele și rezultatul în tabelul de examen
        const media = calculeazaMedia(item);
        await supabase
          .from('inscrieri_examene')
          .update({ 
            nota_tehnica: item.nota_tehnica,
            nota_doc_luyen: item.nota_doc_luyen,
            nota_song_luyen: item.nota_song_luyen,
            nota_thao_quyen: item.nota_thao_quyen,
            rezultat: item.rezultat,
            medie_generala: media
          })
          .eq('id', item.id);

        // 2. DACĂ ESTE ADMIS -> Actualizăm Profil Sportiv + Istoric
        if (item.rezultat === 'Admis') {
          // Update Grad Actual
          await supabase
            .from('sportivi')
            .update({ grad_actual_id: item.grad_sustinut_id })
            .eq('id', item.sportiv_id);

          // Inserare în Istoric (folosind coloanele tale: data_obtinere, sesiune_examen_id)
          await supabase
            .from('istoric_grade')
            .insert([{
              sportiv_id: item.sportiv_id,
              grad_id: item.grad_sustinut_id,
              data_obtinere: new Date().toISOString().split('T')[0],
              sesiune_examen_id: examenId
            }]);
        }
      }
      alert("Date salvate cu succes! Profilele sportivilor admiși au fost actualizate.");
      fetchInscrieri();
    } catch (err) {
      alert("Eroare la procesare. Verifică consola.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen" id="print-section">
      {/* HEADER OFICIAL */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
        <img src={logoUrl || "/logo-phi-hau.png"} alt="Logo Phi Hau" className="h-20" />
        <div className="text-right">
          <h1 className="text-2xl font-bold uppercase">Tabelul Examenelor Locale</h1>
          <p className="text-sm italic">Clubul Sportiv Phi Hau - Qwan Ki Do</p>
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-400 text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 p-2">Nr.</th>
            <th className="border border-gray-400 p-2 text-left">Nume Sportiv</th>
            <th className="border border-gray-400 p-2">Tehnică Indiv.</th>
            <th className="border border-gray-400 p-2">Doc Luyen</th>
            <th className="border border-gray-400 p-2">Song Luyen</th>
            <th className="border border-gray-400 p-2">Thao Quyen</th>
            <th className="border border-gray-400 p-2">Medie</th>
            <th className="border border-gray-400 p-2">Rezultat</th>
          </tr>
        </thead>
        <tbody>
          {inscrieri.map((item, index) => (
            <tr key={item.id} className="text-center">
              <td className="border border-gray-400 p-2">{index + 1}</td>
              <td className="border border-gray-400 p-2 text-left font-semibold">
                {item.sportivi?.nume}
              </td>
              <td className="border border-gray-400 p-2">
                <input type="number" step="0.25" className="w-16 text-center" 
                  value={item.nota_tehnica} onChange={(e) => updateLocalData(item.id, 'nota_tehnica', e.target.value)} />
              </td>
              <td className="border border-gray-400 p-2">
                <input type="number" step="0.25" className="w-16 text-center" 
                  value={item.nota_doc_luyen} onChange={(e) => updateLocalData(item.id, 'nota_doc_luyen', e.target.value)} />
              </td>
              <td className="border border-gray-400 p-2">
                <input type="number" step="0.25" className="w-16 text-center" 
                  value={item.nota_song_luyen} onChange={(e) => updateLocalData(item.id, 'nota_song_luyen', e.target.value)} />
              </td>
              <td className="border border-gray-400 p-2">
                <input type="number" step="0.25" className="w-16 text-center" 
                  value={item.nota_thao_quyen} onChange={(e) => updateLocalData(item.id, 'nota_thao_quyen', e.target.value)} />
              </td>
              <td className="border border-gray-400 p-2 font-bold bg-gray-50">
                {calculeazaMedia(item)}
              </td>
              <td className="border border-gray-400 p-2">
                <select 
                  value={item.rezultat} 
                  onChange={(e) => updateLocalData(item.id, 'rezultat', e.target.value)}
                  className={`p-1 rounded font-bold ${item.rezultat === 'Admis' ? 'text-green-600' : item.rezultat === 'Respins' ? 'text-red-600' : ''}`}
                >
                  <option value="In asteptare">Așteptare</option>
                  <option value="Admis">Admis</option>
                  <option value="Respins">Respins</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* BUTOANE ACȚIUNE */}
      <div className="mt-8 flex gap-4 no-print">
        <button 
          onClick={handleSalvareSiPromovare}
          disabled={loading}
          className="flex items-center gap-2 bg-green-700 text-white px-8 py-3 rounded-lg hover:bg-green-800 transition-all shadow-lg"
        >
          {loading ? "Se procesează..." : <><Save size={20} /> Salvează și Actualizează Gradele</>}
        </button>
        
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-700 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-all shadow-lg"
        >
          <Printer size={20} /> Printează Tabel
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { padding: 0; }
          #print-section { box-shadow: none; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default RapoarteExamen;
