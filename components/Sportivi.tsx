import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, TipAbonament, Familie, Tranzactie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);

const getAge = (dateString: string) => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

interface SportivFormFieldsProps {
  formState: Partial<Sportiv>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: any } }) => void;
  grupe: Grupa[];
  familii: Familie[];
  tipuriAbonament: TipAbonament[];
  customFields: string[];
  isEditMode?: boolean;
}

const SportivFormFields: React.FC<SportivFormFieldsProps> = ({ formState, handleChange, grupe, familii, tipuriAbonament, customFields, isEditMode = false }) => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nume" name="nume" value={formState.nume} onChange={handleChange} required />
            <Input label="Prenume" name="prenume" value={formState.prenume} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Email" name="email" type="email" value={formState.email} onChange={handleChange} required />
            <Input label="Nume Utilizator (pentru login)" name="username" value={formState.username || ''} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEditMode && <Input label="Parolă Inițială" name="parola" type="password" value={formState.parola} onChange={handleChange} required />}
             <Input label="Data Nașterii" name="data_nasterii" type="date" value={formState.data_nasterii} onChange={handleChange} required />
        </div>
        <Input label="CNP" name="cnp" value={formState.cnp} onChange={handleChange} required maxLength={13} />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data Înscrierii" name="data_inscrierii" type="date" value={formState.data_inscrierii} onChange={handleChange} required />
            <Select label="Familie" name="familie_id" value={formState.familie_id || ''} onChange={handleChange}>
                <option value="">Individual</option>
                {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
            </Select>
         </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Grupa" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange}>
                <option value="">Nicio grupă</option>
                {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
            </Select>
            <Select label="Tip Abonament (Individual)" name="tip_abonament_id" value={formState.tip_abonament_id || ''} onChange={handleChange} disabled={!!formState.familie_id}>
                <option value="">Niciun abonament</option>
                {tipuriAbonament.filter(ab => ab.numar_membri === 1).map(ab => <option key={ab.id} value={ab.id}>{ab.denumire}</option>)}
            </Select>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Status" name="status" value={formState.status} onChange={handleChange}>
                <option value="Activ">Activ</option>
                <option value="Inactiv">Inactiv</option>
            </Select>
            <Input label="Club de Proveniență" name="club_provenienta" value={formState.club_provenienta} onChange={handleChange} />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Select label="Participă la antrenamente de vacanță" name="participa_vacanta" value={formState.participa_vacanta ? 'Da' : 'Nu'} onChange={e => handleChange({ target: { name: 'participa_vacanta', value: e.target.value === 'Da' } })}>
                <option value="Nu">Nu</option>
                <option value="Da">Da</option>
            </Select>
            <Input label="Înălțime (cm)" name="inaltime" type="number" value={formState.inaltime || ''} onChange={handleChange} />
         </div>
         {customFields.length > 0 && <div className="border-t border-slate-700 pt-4 mt-4">
             <h3 className="text-lg font-semibold mb-2 text-white">Câmpuri Suplimentare</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(field => (
                    <Input key={field} label={field} name={field} value={formState[field] || ''} onChange={handleChange} />
                ))}
             </div>
        </div>}
    </>
);

const emptySportivState: Partial<Sportiv> = {
    nume: '', prenume: '', email: '', username: '', parola: '', data_nasterii: '', cnp: '', rol: 'Sportiv',
    data_inscrierii: new Date().toISOString().split('T')[0],
    status: 'Activ', club_provenienta: 'Phi Hau Iași',
    grupa_id: null,
    familie_id: null,
    tip_abonament_id: null,
    participa_vacanta: false,
    inaltime: undefined,
}

interface AddSportivFormProps {
  onSave: (sportiv: Partial<Sportiv>) => Promise<void>;
  onCancel: () => void;
  grupe: Grupa[];
  familii: Familie[];
  tipuriAbonament: TipAbonament[];
  customFields: string[];
}

const AddSportivForm: React.FC<AddSportivFormProps> = ({ onSave, onCancel, grupe, familii, tipuriAbonament, customFields }) => {
    const [formState, setFormState] = useState<Partial<Sportiv>>(emptySportivState);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: any } }) => {
        const {name, value} = e.target;
        setFormState(p => {
            const newState = {...p, [name]: value === '' ? null : value };
            if (name === 'familie_id' && value) {
                newState.tip_abonament_id = null;
            }
            return newState;
        });
    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave(formState);
        setLoading(false);
    };

    return (
        <Card className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <SportivFormFields formState={formState} handleChange={handleChange} grupe={grupe} familii={familii} tipuriAbonament={tipuriAbonament} customFields={customFields} />
                <div className="flex justify-end pt-2 space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Sportiv'}</Button>
                </div>
            </form>
        </Card>
    );
};


const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="mt-1 text-md text-white font-semibold">{value || 'N/A'}</dd>
    </div>
);

interface SportivDetailProps { 
    sportiv: Sportiv; 
    onBack: () => void;
    onUpdate: (updates: Partial<Sportiv>) => Promise<{success: boolean, error?: any}>;
    onSelectFamilie: (familieId: string) => void;
    participari: Participare[]; examene: Examen[]; grade: Grad[]; 
    grupe: Grupa[]; plati: Plata[]; 
    customFields: string[];
    familii: Familie[]; tipuriAbonament: TipAbonament[];
}
const SportivDetail: React.FC<SportivDetailProps> = ({ sportiv, onBack, onUpdate, onSelectFamilie, participari, examene, grade, grupe, plati, customFields, familii, tipuriAbonament }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [formState, setFormState] = useState<Partial<Sportiv>>(sportiv);
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

    useEffect(() => { setFormState(sportiv); }, [sportiv]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: any } }) => {
        const {name, value} = e.target;
        setFormState(p => ({...p, [name]: value === '' ? null : value }));
    }

    const handleSave = async () => {
        setLoading(true);
        setSaveStatus(null);

        // Verifică unicitatea username-ului dacă s-a schimbat
        if (formState.username && formState.username !== sportiv.username) {
            if (!supabase) {
                setSaveStatus({ type: 'error', message: 'Clientul Supabase nu este configurat.' }); setLoading(false); return;
            }
             const { data: existingUser, error: checkError } = await supabase
                .from('sportivi')
                .select('id')
                .eq('username', formState.username)
                .not('id', 'eq', sportiv.id)
                .limit(1);

            if (checkError) {
                 setSaveStatus({ type: 'error', message: `Eroare la verificare: ${checkError.message}` }); setLoading(false); return;
            }
            if (existingUser && existingUser.length > 0) {
                 setSaveStatus({ type: 'error', message: 'Numele de utilizator este deja folosit.' }); setLoading(false); return;
            }
        }

        const { parola, ...updateData } = formState; // Păstrăm ID-ul pentru upsert
        const { success, error } = await onUpdate(updateData);
        setLoading(false);

        if(success) {
            setSaveStatus({type: 'success', message: 'Datele au fost salvate cu succes!'});
            setIsEditMode(false);
            setTimeout(() => setSaveStatus(null), 3000);
        } else {
            const errorMessage = error?.message || 'A apărut o eroare necunoscută.';
            setSaveStatus({type: 'error', message: `Eroare la salvare: ${errorMessage}`});
        }
    };

    const grupa = grupe.find(g => g.id === sportiv.grupa_id);
    const familie = familii.find(f => f.id === sportiv.familie_id);
    const abonament = tipuriAbonament.find(t => t.id === sportiv.tip_abonament_id);
    const age = getAge(sportiv.data_nasterii);
    const sportivPlati = plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id));
    const sportivParticipari = participari.filter(p => p.sportiv_id === sportiv.id).sort((a, b) => new Date(examene.find(e => e.id === b.examen_id)!.data).getTime() - new Date(examene.find(e => e.id === a.examen_id)!.data).getTime());
    
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la listă</Button>
            
            <Card className="mb-6">
                <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h2>
                        <p className="text-slate-400">{sportiv.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {sportiv.familie_id && !isEditMode && <Button onClick={() => onSelectFamilie(sportiv.familie_id!)} variant='info' size="sm">Grup de Familie</Button>}
                        <Button onClick={() => setIsEditMode(p => !p)} variant={isEditMode ? 'secondary' : 'primary'} size="sm">
                            <EditIcon className="w-4 h-4 mr-2" />{isEditMode ? 'Anulează' : 'Editează'}
                        </Button>
                    </div>
                </div>
                
                {isEditMode ? (
                     <form className="space-y-4 pt-4 border-t border-slate-700">
                        <SportivFormFields formState={formState} handleChange={handleChange} grupe={grupe} familii={familii} tipuriAbonament={tipuriAbonament} customFields={customFields} isEditMode={true} />
                        <div className="flex justify-end items-center gap-4 pt-4">
                            {saveStatus && <p className={`text-sm font-semibold ${saveStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{saveStatus.message}</p>}
                            <Button type="button" variant="success" onClick={handleSave} disabled={loading}>{loading ? "Se salvează..." : "Salvează Modificările"}</Button>
                        </div>
                     </form>
                ) : (
                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 pt-4 border-t border-slate-700">
                        <DataField label="Nume Utilizator" value={sportiv.username} />
                        <DataField label="Data Nașterii" value={`${new Date(sportiv.data_nasterii).toLocaleDateString('ro-RO')} (${age} ani)`} />
                        <DataField label="CNP" value={sportiv.cnp} />
                        <DataField label="Data Înscrierii" value={new Date(sportiv.data_inscrierii).toLocaleDateString('ro-RO')} />
                        <DataField label="Status" value={<span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${sportiv.status === 'Activ' ? 'bg-green-600' : 'bg-red-600'}`}>{sportiv.status}</span>} />
                        <DataField label="Rol" value={<span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${sportiv.rol === 'Admin' ? 'bg-amber-600' : sportiv.rol === 'Instructor' ? 'bg-sky-600' : 'bg-slate-600'}`}>{sportiv.rol}</span>}/>
                        <DataField label="Grupă" value={grupa?.denumire} />
                        <DataField label="Familie" value={familie?.nume} />
                        <DataField label="Abonament Individual" value={abonament?.denumire} />
                        <DataField label="Club Proveniență" value={sportiv.club_provenienta} />
                        <DataField label="Înălțime" value={sportiv.inaltime ? `${sportiv.inaltime} cm` : 'N/A'} />
                        <DataField label="Participă Vacanță" value={sportiv.participa_vacanta ? 'Da' : 'Nu'} />
                        {customFields.map(field => <DataField key={field} label={field} value={sportiv[field]} />)}
                    </dl>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Istoric Grade & Examene</h3>
                    <div className="space-y-2">
                        {sportivParticipari.map(p => {
                            const examen = examene.find(e => e.id === p.examen_id);
                            const grad = grade.find(g => g.id === p.grad_sustinut_id);
                            const statusClass = p.rezultat === 'Admis' ? 'text-green-400' : p.rezultat === 'Respins' ? 'text-red-400' : 'text-yellow-400';
                            return ( <div key={p.id} className="bg-slate-700/50 p-3 rounded-md text-sm"> <div className="flex justify-between items-center"> <p><span className="font-semibold">{grad?.nume}</span> la data de {new Date(examen!.data).toLocaleDateString('ro-RO')}</p> <p className={`font-bold ${statusClass}`}>{p.rezultat}</p> </div> {p.observatii && <p className="text-xs text-slate-400 mt-1">Obs: {p.observatii}</p>} </div> )
                        })}
                         {sportivParticipari.length === 0 && <p className="text-slate-400 text-sm">Niciun examen susținut.</p>}
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Situație Financiară (Datorii)</h3>
                     <div className="space-y-2">
                        {sportivPlati.filter(p => p.status !== 'Achitat').map(p => {
                             const statusClass = p.status === 'Achitat Parțial' ? 'text-yellow-400' : 'text-red-400';
                             return ( <div key={p.id} className="bg-slate-700/50 p-3 rounded-md text-sm flex justify-between items-center"> <div> <p className="font-semibold">{p.descriere}</p> <p className="text-xs text-slate-400">Data: {new Date(p.data).toLocaleDateString('ro-RO')}</p> </div> <p className={`font-bold ${statusClass}`}>{p.suma.toFixed(2)} RON</p> </div> )
                        })}
                        {sportivPlati.filter(p => p.status !== 'Achitat').length === 0 && <p className="text-slate-400 text-sm">Nicio datorie restantă.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
}


interface SportiviManagementProps { 
    onBack: () => void; 
    sportivi: Sportiv[]; setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>; 
    participari: Participare[]; examene: Examen[]; grade: Grad[]; 
    prezente: Prezenta[]; grupe: Grupa[]; 
    plati: Plata[]; 
    evenimente: Eveniment[]; rezultate: Rezultat[]; 
    tipuriAbonament: TipAbonament[]; familii: Familie[]; 
    customFields: string[]; 
    selectedSportiv: Sportiv | null;
    onSelectSportiv: (sportiv: Sportiv) => void;
    onClearSelectedSportiv: () => void;
    onSelectFamilie: (familieId: string) => void;
}
export const SportiviManagement: React.FC<Omit<SportiviManagementProps, 'setPlati' | 'setTranzactii' | 'setCustomFields'>> = ({ onBack, sportivi, setSportivi, participari, examene, grade, prezente, grupe, plati, evenimente, rezultate, tipuriAbonament, familii, customFields, selectedSportiv, onSelectSportiv, onClearSelectedSportiv, onSelectFamilie }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const platiRestante = useMemo(() => {
    const lunaCurenta = new Date().getMonth();
    const anulCurent = new Date().getFullYear();
    const sportiviCuRestante = new Set<string>();
    sportivi.forEach(s => {
        if (s.status !== 'Activ') return;
        let areAbonamentPlatit = false;
        if (s.familie_id) {
            areAbonamentPlatit = plati.some(p => p.familie_id === s.familie_id && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
        } else {
            areAbonamentPlatit = plati.some(p => p.sportiv_id === s.id && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
        }
        if (!areAbonamentPlatit) { sportiviCuRestante.add(s.id); }
    });
    return sportiviCuRestante;
  }, [sportivi, plati]);
  
    const handleAddSportiv = async (sportivData: Partial<Sportiv>) => {
        if (!supabase) {
            alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (!sportivData.email || !sportivData.parola) { alert("Email și parolă sunt obligatorii."); return; }

        // Verifică unicitatea username-ului
        if (sportivData.username) {
            const { data: existingUser, error: checkError } = await supabase.from('sportivi').select('id').eq('username', sportivData.username).limit(1);
            if (checkError) { alert(`Eroare la verificarea numelui de utilizator: ${checkError.message}`); return; }
            if (existingUser && existingUser.length > 0) { alert('Acest nume de utilizator este deja folosit. Vă rugăm alegeți altul.'); return; }
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({ email: sportivData.email, password: sportivData.parola });
        if (authError) { alert(`Eroare la crearea contului: ${authError.message}`); return; }
        if (authData.user) {
            const profileData = { ...sportivData, user_id: authData.user.id };
            delete profileData.parola;
            const { data, error } = await supabase.from('sportivi').insert(profileData).select().single();
            if (error) { alert(`Eroare la salvarea profilului: ${error.message}`); return; }
            if (data) { setSportivi(prev => [...prev, data as Sportiv]); setShowAddForm(false); }
        }
    };
    
    const handleUpdateSportiv = async (updates: Partial<Sportiv>): Promise<{success: boolean, error?: any}> => {
        if (!supabase) {
            alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return { success: false, error: { message: "Client Supabase neconfigurat." } };
        }
        // Utilizăm upsert pentru a actualiza. Obiectul 'updates' trebuie să conțină ID-ul.
        const { data, error } = await supabase.from('sportivi').upsert(updates).select().single();
        if (error) { 
            console.error("Eroare la actualizare:", error);
            return { success: false, error: error };
        }
        if (data) { 
            const updatedSportiv = data as Sportiv;
            // Actualizăm starea locală cu datele proaspete de la baza de date
            setSportivi(prev => prev.map(s => s.id === updatedSportiv.id ? updatedSportiv : s)); 
            onSelectSportiv(updatedSportiv);
        }
        return { success: true };
    };

    const handleDelete = async (sportivId: string) => {
        if (!supabase) {
            alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (!window.confirm("Ești sigur că vrei să ștergi acest sportiv? Contul de autentificare asociat NU va fi șters automat.")) return;
        const { error } = await supabase.from('sportivi').delete().eq('id', sportivId);
        if (error) { alert(`Eroare la ștergere: ${error.message}`); return; }
        setSportivi(prev => prev.filter(s => s.id !== sportivId));
        if (selectedSportiv?.id === sportivId) onClearSelectedSportiv();
    };

  const filteredSportivi = sportivi.filter(s => `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b) => a.nume.localeCompare(b.nume));

  if (selectedSportiv) return (
        <SportivDetail 
            sportiv={selectedSportiv} 
            onBack={onClearSelectedSportiv}
            onUpdate={handleUpdateSportiv}
            onSelectFamilie={onSelectFamilie}
            participari={participari} examene={examene} grade={grade} 
            grupe={grupe} plati={plati}
            customFields={customFields} familii={familii} tipuriAbonament={tipuriAbonament}
        />
  )

  return (
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-white">Management Sportivi</h1>
        <Button onClick={() => setShowAddForm(p => !p)} variant="info">
        {showAddForm ? 'Anulează' : <><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sportiv</>}
        <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      
      {showAddForm && <AddSportivForm onSave={handleAddSportiv} onCancel={() => setShowAddForm(false)} grupe={grupe} familii={familii} tipuriAbonament={tipuriAbonament} customFields={customFields} />}

      <div className="mb-4 mt-6"><Input label="Caută sportiv..." type="text" placeholder="Nume, prenume..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-700">
              <tr>
                <th className="p-4 font-semibold">Nume Complet</th><th className="p-4 font-semibold">Rol</th><th className="p-4 font-semibold">Grupă</th>
                <th className="p-4 font-semibold">Data Înscrierii</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Acțiuni</th>
              </tr>
            </thead>
          <tbody>
            {filteredSportivi.map(sportiv => {
                const grupa = grupe.find(g => g.id === sportiv.grupa_id);
                return (
                 <tr key={sportiv.id} className="border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer" onClick={() => onSelectSportiv(sportiv)}>
                    <td className="p-4 font-medium">
                        <div className="flex items-center">
                            {platiRestante.has(sportiv.id) && <span className="w-3 h-3 bg-red-500 rounded-full mr-3 flex-shrink-0" title="Abonament neachitat"></span>}
                            <span>{sportiv.nume} {sportiv.prenume}</span>
                        </div>
                    </td>
                    <td className="p-4">{sportiv.rol}</td>
                    <td className="p-4">{grupa?.denumire || 'N/A'}</td>
                    <td className="p-4">{new Date(sportiv.data_inscrierii).toLocaleDateString('ro-RO')}</td>
                    <td className="p-4"> <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${sportiv.status === 'Activ' ? 'bg-green-600' : 'bg-red-600'}`}>{sportiv.status}</span></td>
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center space-x-2"><Button onClick={() => handleDelete(sportiv.id)} variant="danger" size="sm"><TrashIcon /></Button></div>
                    </td>
                 </tr>
                )
            })}
          </tbody>
        </table>
         {filteredSportivi.length === 0 && <p className="p-4 text-center text-slate-400">Niciun sportiv găsit.</p>}
      </div>
    </div>
  );
};