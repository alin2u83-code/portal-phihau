import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, TipAbonament, Familie, Tranzactie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon, ArrowLeftIcon, ShieldCheckIcon, CogIcon, UsersIcon } from './icons';
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
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nume" name="nume" value={formState.nume} onChange={handleChange} required />
            <Input label="Prenume" name="prenume" value={formState.prenume} onChange={handleChange} required />
        </div>
        
        {!isEditMode && (
            <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/50 my-4 space-y-4">
                <h3 className="text-amber-400 font-bold flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" /> Date Inițiale Acces Cont
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email" name="email" type="email" value={formState.email} onChange={handleChange} required />
                    <Input label="Nume Utilizator (Login)" name="username" value={formState.username || ''} onChange={handleChange} />
                </div>
                <Input label="Parolă Inițială" name="parola" type="password" value={formState.parola} onChange={handleChange} required />
                <p className="text-xs text-slate-400 italic">Aceste date creează contul de autentificare pentru sportiv.</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Data Nașterii" name="data_nasterii" type="date" value={formState.data_nasterii} onChange={handleChange} required />
             <Input label="CNP" name="cnp" value={formState.cnp} onChange={handleChange} required maxLength={13} />
        </div>
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
             <Select label="Antrenamente Vacanță" name="participa_vacanta" value={formState.participa_vacanta ? 'Da' : 'Nu'} onChange={e => handleChange({ target: { name: 'participa_vacanta', value: e.target.value === 'Da' } })}>
                <option value="Nu">Nu participă</option>
                <option value="Da">Participă</option>
            </Select>
            <Input label="Înălțime (cm)" name="inaltime" type="number" value={formState.inaltime || ''} onChange={handleChange} />
         </div>
    </div>
);

const emptySportivState: Partial<Sportiv> = {
    nume: '', prenume: '', email: '', username: '', parola: '', data_nasterii: '', cnp: '', roluri: ['Sportiv'],
    data_inscrierii: new Date().toISOString().split('T')[0],
    status: 'Activ', club_provenienta: 'Phi Hau Iași',
    grupa_id: null,
    familie_id: null,
    tip_abonament_id: null,
    participa_vacanta: false,
}

const DataField: React.FC<{label: string, value: React.ReactNode, icon?: React.ReactNode}> = ({label, value, icon}) => (
    <div className="flex flex-col">
        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-tight mb-1 flex items-center gap-1">
            {icon} {label}
        </dt>
        <dd className="text-base text-white font-medium">{value || 'N/A'}</dd>
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
    onNavigateToAccountSettings: (sportiv: Sportiv) => void;
}

const SportivDetail: React.FC<SportivDetailProps> = ({ sportiv, onBack, onUpdate, onSelectFamilie, participari, examene, grade, grupe, plati, customFields, familii, tipuriAbonament, onNavigateToAccountSettings }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [formState, setFormState] = useState<Partial<Sportiv>>(sportiv);
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const grupa = grupe.find(g => g.id === sportiv.grupa_id);
    const familie = familii.find(f => f.id === sportiv.familie_id);
    const abonament = tipuriAbonament.find(t => t.id === sportiv.tip_abonament_id);
    const age = getAge(sportiv.data_nasterii);
    const sportivPlati = plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id));
    const sportivParticipari = participari.filter(p => p.sportiv_id === sportiv.id).sort((a, b) => new Date(examene.find(e => e.id === b.examen_id)!.data).getTime() - new Date(examene.find(e => e.id === a.examen_id)!.data).getTime());
    
    const admittedParticipations = sportivParticipari.filter(p => p.rezultat === 'Admis');
    const gradActual = admittedParticipations.length > 0 
        ? getGrad(admittedParticipations[0].grad_sustinut_id, grade)?.nume 
        : <span className="text-sky-400 italic">Începător</span>;

    const handleSave = async () => {
        setLoading(true);
        const { parola, email, username, user_id, ...updateData } = formState; 
        const { success, error } = await onUpdate(updateData);
        setLoading(false);
        if(success) {
            setIsEditMode(false);
            setSaveStatus({type: 'success', message: 'Salvat!'});
            setTimeout(() => setSaveStatus(null), 2000);
        } else {
            setSaveStatus({type: 'error', message: error?.message || 'Eroare'});
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
                <div className="flex gap-2">
                    {saveStatus && <span className={`text-sm self-center ${saveStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{saveStatus.message}</span>}
                    <Button onClick={() => setIsEditMode(!isEditMode)} variant={isEditMode ? 'secondary' : 'primary'} size="sm">
                        <EditIcon className="w-4 h-4 mr-2" /> {isEditMode ? 'Anulează' : 'Editează Profil'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coloana Stângă - Profil și Date Cheie */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-l-4 border-l-brand-primary">
                        <div className="flex items-center gap-6 mb-8">
                             <div className="w-24 h-24 rounded-2xl bg-slate-700 flex items-center justify-center text-3xl font-bold text-white shadow-xl border border-slate-600">
                                {sportiv.nume[0]}{sportiv.prenume[0]}
                             </div>
                             <div>
                                <h2 className="text-3xl font-extrabold text-white leading-tight uppercase">{sportiv.nume} {sportiv.prenume}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-3 py-1 bg-brand-primary/20 text-brand-secondary text-sm font-bold rounded-full border border-brand-primary/30">
                                        {gradActual}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${sportiv.status === 'Activ' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                        {sportiv.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isEditMode ? (
                            <div className="space-y-6">
                                <SportivFormFields 
                                    formState={formState} 
                                    handleChange={(e: any) => setFormState({...formState, [e.target.name]: e.target.value})} 
                                    grupe={grupe} 
                                    familii={familii} 
                                    tipuriAbonament={tipuriAbonament} 
                                    customFields={customFields} 
                                    isEditMode={true} 
                                />
                                <div className="flex justify-end pt-4 border-t border-slate-700">
                                    <Button onClick={handleSave} variant="success" disabled={loading}>
                                        {loading ? 'Se salvează...' : 'Salvează Profilul'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-slate-400 border-b border-slate-700 pb-2 flex items-center gap-2 uppercase tracking-widest">
                                        <UsersIcon className="w-4 h-4" /> Detalii Sportive
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DataField label="Grupă" value={grupa?.denumire} />
                                        <DataField label="Roluri" value={sportiv.roluri.join(', ')} />
                                        <DataField label="Club" value={sportiv.club_provenienta} />
                                        <DataField label="Data Înscrierii" value={new Date(sportiv.data_inscrierii).toLocaleDateString('ro-RO')} />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-slate-400 border-b border-slate-700 pb-2 flex items-center gap-2 uppercase tracking-widest">
                                        <CogIcon className="w-4 h-4" /> Date Administrative
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DataField label="Data Nașterii" value={`${new Date(sportiv.data_nasterii).toLocaleDateString('ro-RO')} (${age} ani)`} />
                                        <DataField label="CNP" value={sportiv.cnp} />
                                        <DataField label="Înălțime" value={sportiv.inaltime ? `${sportiv.inaltime} cm` : 'N/A'} />
                                        <DataField label="Familie" value={familie ? <button onClick={() => onSelectFamilie(familie.id)} className="text-brand-secondary hover:underline">{familie.nume}</button> : 'Individual'} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="bg-slate-900/50 border border-slate-700/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-600/10 rounded-full">
                                    <ShieldCheckIcon className="w-8 h-8 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Gestionare Cont & Roluri</h3>
                                    <p className="text-sm text-slate-400">Date de autentificare (email, username, parolă) și roluri.</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => onNavigateToAccountSettings(sportiv)} 
                                variant="secondary" 
                                className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 border-none"
                            >
                                <CogIcon className="w-5 h-5 mr-2" /> Gestionare Cont
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Istoric Grade & Examene</h3>
                        <div className="space-y-2">
                            {sportivParticipari.map(p => {
                                const examen = examene.find(e => e.id === p.examen_id);
                                const grad = grade.find(g => g.id === p.grad_sustinut_id);
                                return ( 
                                    <div key={p.id} className="bg-slate-700/30 p-3 rounded-md border border-slate-700/50 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">{grad?.nume}</p>
                                            <p className="text-xs text-slate-400">{examen?.data} - {examen?.locatia}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${p.rezultat === 'Admis' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                            {p.rezultat}
                                        </span>
                                    </div>
                                );
                            })}
                            {sportivParticipari.length === 0 && <p className="text-slate-500 italic text-sm">Niciun examen susținut încă.</p>}
                        </div>
                    </Card>
                </div>

                {/* Coloana Dreaptă - Rezumat Financiar și Note */}
                <div className="space-y-6">
                    <Card className="bg-slate-800/80 border border-brand-primary/20">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-brand-secondary rounded-full"></span> Situație Financiară
                        </h3>
                        <div className="space-y-3">
                            {sportivPlati.filter(p => p.status !== 'Achitat').map(p => (
                                <div key={p.id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                                    <p className="text-sm font-semibold text-white">{p.descriere}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-slate-400">{new Date(p.data).toLocaleDateString('ro-RO')}</span>
                                        <span className="text-sm font-bold text-red-400">{p.suma.toFixed(2)} RON</span>
                                    </div>
                                </div>
                            ))}
                            {sportivPlati.filter(p => p.status !== 'Achitat').length === 0 && (
                                <div className="text-center py-6">
                                    <div className="inline-block p-2 bg-green-500/10 rounded-full mb-2">
                                        <ShieldCheckIcon className="w-6 h-6 text-green-500" />
                                    </div>
                                    <p className="text-slate-400 text-sm">Toate plățile la zi.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-slate-700/20 border-dashed border-2 border-slate-600">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-widest">Note & Observații</h3>
                        <p className="text-slate-400 text-sm italic">Nu există observații suplimentare pentru acest profil.</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// --- RESTUL COMPONENTEI RESTAURAT ---

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
    onNavigateToAccountSettings: (sportiv: Sportiv) => void;
}

export const SportiviManagement: React.FC<SportiviManagementProps> = ({ onBack, sportivi, setSportivi, participari, examene, grade, prezente, grupe, plati, evenimente, rezultate, tipuriAbonament, familii, customFields, selectedSportiv, onSelectSportiv, onClearSelectedSportiv, onSelectFamilie, onNavigateToAccountSettings }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredSportivi = useMemo(() => {
    return sportivi.filter(s => 
      `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.cnp.includes(searchTerm)
    );
  }, [sportivi, searchTerm]);

  const handleSaveSportiv = async (sportivData: Partial<Sportiv>) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('sportivi').insert(sportivData).select().single();
    if (error) {
        alert("Eroare la adăugare: " + error.message);
    } else if (data) {
        setSportivi(prev => [...prev, data as Sportiv]);
        setShowAddForm(false);
    }
  };

  const handleUpdateSportiv = async (updates: Partial<Sportiv>) => {
    if (!supabase || !selectedSportiv) return {success: false};
    const { data, error } = await supabase.from('sportivi').update(updates).eq('id', selectedSportiv.id).select().single();
    if (error) {
        return {success: false, error};
    } else {
        setSportivi(prev => prev.map(s => s.id === selectedSportiv.id ? data as Sportiv : s));
        return {success: true};
    }
  };

  if (selectedSportiv) {
    return (
        <SportivDetail 
            sportiv={selectedSportiv} 
            onBack={onClearSelectedSportiv} 
            onUpdate={handleUpdateSportiv}
            onSelectFamilie={onSelectFamilie}
            participari={participari}
            examene={examene}
            grade={grade}
            grupe={grupe}
            plati={plati}
            customFields={customFields}
            familii={familii}
            tipuriAbonament={tipuriAbonament}
            onNavigateToAccountSettings={onNavigateToAccountSettings}
        />
    );
  }

  return (
    <div>
        <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Bază Date Sportivi</h1>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="info">
                {showAddForm ? 'Anulează' : <><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sportiv</>}
            </Button>
        </div>

        {showAddForm && (
            <AddSportivForm 
                onSave={handleSaveSportiv} 
                onCancel={() => setShowAddForm(false)} 
                grupe={grupe} 
                familii={familii} 
                tipuriAbonament={tipuriAbonament} 
                customFields={customFields} 
            />
        )}

        <Card className="mb-6">
            <Input 
                label="Caută sportiv" 
                placeholder="Nume sau CNP..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
            />
        </Card>

        <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-700">
                    <tr>
                        <th className="p-4">Nume</th>
                        <th className="p-4">Grupă</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4">Roluri</th>
                        <th className="p-4 text-right">Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSportivi.map(sportiv => (
                        <tr key={sportiv.id} className="border-b border-slate-700 hover:bg-slate-700/40 cursor-pointer" onClick={() => onSelectSportiv(sportiv)}>
                            <td className="p-4 font-bold">{sportiv.nume} {sportiv.prenume}</td>
                            <td className="p-4 text-slate-300">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || '-'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase ${sportiv.status === 'Activ' ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30'}`}>
                                    {sportiv.status}
                                </span>
                            </td>
                            <td className="p-4 text-slate-400 text-sm">{sportiv.roluri.join(', ')}</td>
                            <td className="p-4 text-right">
                                <Button size="sm" variant="primary"><EditIcon className="w-4 h-4" /></Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

// Define interface for AddSportivForm props
interface AddSportivFormProps {
    onSave: (sportivData: Partial<Sportiv>) => Promise<void>;
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
        setFormState(p => ({...p, [name]: value === '' ? null : value }));
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