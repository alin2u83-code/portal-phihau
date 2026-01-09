import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, TipAbonament, Familie, Rol } from '../types';
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

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    const colorClasses: Record<Rol['nume'], string> = {
        Admin: 'bg-red-500 text-white',
        Instructor: 'bg-sky-500 text-white',
        Sportiv: 'bg-slate-200 text-slate-700',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[role.nume]}`}>
            {role.nume}
        </span>
    );
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
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 my-4 space-y-4">
                <h3 className="text-amber-600 font-bold flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" /> Date Opționale Acces Cont
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email" name="email" type="email" value={formState.email || ''} onChange={handleChange} />
                    <Input label="Nume Utilizator (Login)" name="username" value={formState.username || ''} onChange={handleChange} />
                </div>
                <Input label="Parolă Inițială" name="parola" type="password" value={formState.parola} onChange={handleChange} />
                <p className="text-xs text-slate-500 italic">Completați aceste câmpuri doar dacă doriți să creați și un cont de autentificare.</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input label="Data Nașterii" name="data_nasterii" type="date" value={formState.data_nasterii} onChange={handleChange} required />
             <Input label="CNP" name="cnp" value={formState.cnp || ''} onChange={handleChange} maxLength={13} />
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

        {customFields.length > 0 && (
            <div className="border-t border-slate-200 pt-6 mt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Câmpuri Suplimentare</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map(field => (
                        <Input
                            key={field}
                            label={field}
                            name={field}
                            value={formState[field] || ''}
                            onChange={handleChange}
                        />
                    ))}
                </div>
            </div>
        )}
    </div>
);

const emptySportivState: Partial<Sportiv> = {
    nume: '', prenume: '', email: '', username: '', parola: '', data_nasterii: '', cnp: '', roluri: [],
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
        <dd className="text-base text-slate-900 font-medium">{value || 'N/A'}</dd>
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
        : <span className="text-sky-600 italic">Începător</span>;

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: any; } }) => {
        const { name, value } = e.target;
        setFormState(prev => ({...prev, [name]: value === '' ? null : value}));
    };
    
    const handleSave = async () => {
        setLoading(true);
        const { parola, email, username, user_id, roluri, ...updateData } = formState; 
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
                    {saveStatus && <span className={`text-sm self-center ${saveStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{saveStatus.message}</span>}
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
                             <div className="w-24 h-24 rounded-2xl bg-slate-200 flex items-center justify-center text-3xl font-bold text-brand-primary shadow-xl border border-slate-300">
                                {sportiv.nume[0]}{sportiv.prenume[0]}
                             </div>
                             <div>
                                <h2 className="text-3xl font-extrabold text-slate-900 leading-tight uppercase">{sportiv.nume} {sportiv.prenume}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-sm font-bold rounded-full border border-brand-primary/20">
                                        {gradActual}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${sportiv.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {sportiv.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isEditMode ? (
                            <div className="space-y-6">
                                <SportivFormFields 
                                    formState={formState} 
                                    handleChange={handleFormChange} 
                                    grupe={grupe} 
                                    familii={familii} 
                                    tipuriAbonament={tipuriAbonament} 
                                    customFields={customFields} 
                                    isEditMode={true} 
                                />
                                <div className="flex justify-end pt-4 border-t border-slate-200">
                                    <Button onClick={handleSave} variant="success" disabled={loading}>
                                        {loading ? 'Se salvează...' : 'Salvează Profilul'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-slate-500 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase tracking-widest">
                                        <UsersIcon className="w-4 h-4" /> Detalii Sportive
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DataField label="Grupă" value={grupa?.denumire} />
                                        <DataField label="Roluri" value={<div className="flex flex-wrap gap-1">{sportiv.roluri.map(r => <RoleBadge key={r.id} role={r} />)}</div>} />
                                        <DataField label="Club" value={sportiv.club_provenienta} />
                                        <DataField label="Data Înscrierii" value={new Date(sportiv.data_inscrierii).toLocaleDateString('ro-RO')} />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-slate-500 border-b border-slate-200 pb-2 flex items-center gap-2 uppercase tracking-widest">
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

                    {customFields.length > 0 && !isEditMode && (
                        <Card>
                             <h3 className="text-xl font-bold text-slate-900 mb-4">Date Suplimentare</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {customFields.map(field => (
                                    <DataField key={field} label={field} value={sportiv[field]} />
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card className="bg-slate-50 border border-slate-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-full">
                                    <ShieldCheckIcon className="w-8 h-8 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Gestionare Cont & Roluri</h3>
                                    <p className="text-sm text-slate-600">Date de autentificare (email, username, parolă) și roluri.</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => onNavigateToAccountSettings(sportiv)} 
                                variant="secondary" 
                                className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20 border-none"
                            >
                                <CogIcon className="w-5 h-5 mr-2" /> Gestionare Cont Acces
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Istoric Grade & Examene</h3>
                        <div className="space-y-2">
                            {sportivParticipari.map(p => {
                                const examen = examene.find(e => e.id === p.examen_id);
                                const grad = grade.find(g => g.id === p.grad_sustinut_id);
                                return ( 
                                    <div key={p.id} className="bg-slate-100 p-3 rounded-md border border-slate-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-800">{grad?.nume}</p>
                                            <p className="text-xs text-slate-500">{examen?.data} - {examen?.locatia}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${p.rezultat === 'Admis' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
                    <Card className="bg-white/80 border border-brand-secondary/20">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-brand-secondary rounded-full"></span> Situație Financiară
                        </h3>
                        <div className="space-y-3">
                            {sportivPlati.filter(p => p.status !== 'Achitat').map(p => (
                                <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-sm font-semibold text-slate-800">{p.descriere}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-slate-500">{new Date(p.data).toLocaleDateString('ro-RO')}</span>
                                        <span className="text-sm font-bold text-red-600">{p.suma.toFixed(2)} RON</span>
                                    </div>
                                </div>
                            ))}
                            {sportivPlati.filter(p => p.status !== 'Achitat').length === 0 && (
                                <div className="text-center py-6">
                                    <div className="inline-block p-2 bg-green-500/10 rounded-full mb-2">
                                        <ShieldCheckIcon className="w-6 h-6 text-green-500" />
                                    </div>
                                    <p className="text-slate-500 text-sm">Toate plățile la zi.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-widest">Note & Observații</h3>
                        <p className="text-slate-500 text-sm italic">Nu există observații suplimentare pentru acest profil.</p>
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
    setCustomFields: React.Dispatch<React.SetStateAction<string[]>>;
    selectedSportiv: Sportiv | null;
    onSelectSportiv: (sportiv: Sportiv) => void;
    onClearSelectedSportiv: () => void;
    onSelectFamilie: (familieId: string) => void;
    onNavigateToAccountSettings: (sportiv: Sportiv) => void;
    allRoles: Rol[];
}

export const SportiviManagement: React.FC<SportiviManagementProps> = ({ onBack, sportivi, setSportivi, participari, examene, grade, prezente, grupe, plati, evenimente, rezultate, tipuriAbonament, familii, customFields, setCustomFields, selectedSportiv, onSelectSportiv, onClearSelectedSportiv, onSelectFamilie, onNavigateToAccountSettings, allRoles }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  
  const filteredSportivi = useMemo(() => {
    return sportivi.filter(s => 
      `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.cnp && s.cnp.includes(searchTerm))
    );
  }, [sportivi, searchTerm]);

  const handleAddCustomField = () => {
    const trimmedName = newFieldName.trim();
    if (trimmedName && !customFields.includes(trimmedName) && !Object.keys(emptySportivState).includes(trimmedName)) {
        setCustomFields(prev => [...prev, trimmedName]);
        setNewFieldName('');
    } else {
        alert("Numele câmpului este invalid, deja există, sau este un câmp rezervat.");
    }
  };

  const handleDeleteCustomField = (fieldName: string) => {
    if (window.confirm(`Sunteți sigur că doriți să ștergeți câmpul "${fieldName}"? Toate datele asociate acestuia vor fi pierdute la următoarea salvare.`)) {
        setCustomFields(prev => prev.filter(f => f !== fieldName));
        // Datele vor fi eliminate de pe obiectele sportiv la următoarea salvare a unui profil individual.
    }
  };


    const handleSaveSportiv = async (sportivData: Partial<Sportiv>) => {
        if (!supabase) {
            alert("Eroare: Clientul Supabase nu este configurat.");
            return;
        }

        const { email, parola, ...profileData } = sportivData;

        // Dacă nu se creează cont de autentificare, se inserează direct profilul
        if (!email || !parola) {
            const { data: newSportiv, error } = await supabase
                .from('sportivi')
                .insert({ ...profileData, email: email || null })
                .select('*')
                .single();
            
            if (error) {
                alert(`Eroare la salvarea profilului fără cont: ${error.message}`);
                return;
            }
            if (newSportiv) {
                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                if (sportivRole) {
                     const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: newSportiv.id, rol_id: sportivRole.id });
                     if (roleError) {
                         alert(`Eroare la asignarea rolului: ${roleError.message}. Sportivul a fost creat, dar va trebui să îi asignați rolul manual.`);
                     }
                }
                const sportivWithRole = { ...newSportiv, roluri: sportivRole ? [sportivRole] : [] };
                setSportivi(prev => [...prev, sportivWithRole as Sportiv]);
                setShowAddForm(false);
            }
            return;
        }

        // Dacă se creează cont, se folosește funcția RPC
        const { data: newSportiv, error } = await supabase.rpc('create_user_and_profile', {
            email: sportivData.email,
            password: sportivData.parola,
            username: sportivData.username || null,
            nume: sportivData.nume,
            prenume: sportivData.prenume,
            data_nasterii: sportivData.data_nasterii,
            cnp: sportivData.cnp || null,
            data_inscrierii: sportivData.data_inscrierii,
            status: sportivData.status,
            club_provenienta: sportivData.club_provenienta,
            grupa_id: sportivData.grupa_id || null,
            familie_id: sportivData.familie_id || null,
            tip_abonament_id: sportivData.tip_abonament_id || null,
            participa_vacanta: sportivData.participa_vacanta,
            inaltime: sportivData.inaltime || null
        });

        if (error) {
            alert(`Eroare la crearea contului și a profilului: ${error.message}`);
            return;
        }
        
        if (newSportiv) {
            const { data: finalSportivData, error: refetchError } = await supabase
                .from('sportivi')
                .select('*, sportivi_roluri(roluri(id, nume))')
                .eq('id', newSportiv.id)
                .single();
            
             if (refetchError) {
                alert(`Profil creat, dar eroare la reîncărcarea datelor: ${refetchError.message}`);
                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                const sportivWithRole = { ...newSportiv, roluri: sportivRole ? [sportivRole] : [] };
                setSportivi(prev => [...prev, sportivWithRole as Sportiv]);
            } else if (finalSportivData) {
                const userProfile = finalSportivData as any;
                userProfile.roluri = userProfile.sportivi_roluri.map((item: any) => item.roluri);
                delete userProfile.sportivi_roluri;
                setSportivi(prev => [...prev, userProfile as Sportiv]);
            }
            setShowAddForm(false);
        }
    };

  const handleUpdateSportiv = async (updates: Partial<Sportiv>) => {
    if (!supabase || !selectedSportiv) return {success: false};

    const supabaseUpdates = { ...updates };
    customFields.forEach(field => delete (supabaseUpdates as any)[field]);
    
    const { data, error } = await supabase.from('sportivi').update(supabaseUpdates).eq('id', selectedSportiv.id).select().single();
    if (error) {
        return {success: false, error};
    } else {
        setSportivi(prev => prev.map(s => s.id === selectedSportiv.id ? { ...s, ...updates } : s));
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
            <h1 className="text-3xl font-bold text-slate-900">Bază Date Sportivi</h1>
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
            <h2 className="text-xl font-bold text-slate-900 mb-4">Management Câmpuri Custom</h2>
            <div className="flex items-end gap-2">
                <Input label="Nume Câmp Nou" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="ex: Telefon Părinte"/>
                <Button onClick={handleAddCustomField} variant="secondary">Adaugă Câmp</Button>
            </div>
            {customFields.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-500 mb-2">Câmpuri existente:</h3>
                    <div className="flex flex-wrap gap-2">
                        {customFields.map(field => (
                            <span key={field} className="bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-2">
                                {field}
                                <button onClick={() => handleDeleteCustomField(field)} className="text-slate-500 hover:text-slate-800 font-bold text-lg leading-none transform hover:scale-125 transition-transform" title={`Șterge câmpul "${field}"`}>&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Card>

        <Card className="mb-6">
            <Input 
                label="Caută sportiv" 
                placeholder="Nume sau CNP..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
            />
        </Card>

        <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 text-sm font-semibold text-slate-600">Nume</th>
                        <th className="p-4 text-sm font-semibold text-slate-600">Grupă</th>
                        <th className="p-4 text-sm font-semibold text-slate-600">Statut</th>
                        <th className="p-4 text-sm font-semibold text-slate-600">Roluri</th>
                        {customFields.map(field => <th key={field} className="p-4 text-sm font-semibold text-slate-600">{field}</th>)}
                        <th className="p-4 text-right text-sm font-semibold text-slate-600">Acțiuni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredSportivi.map(sportiv => (
                        <tr key={sportiv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onSelectSportiv(sportiv)}>
                            <td className="p-4 font-bold">{sportiv.nume} {sportiv.prenume}</td>
                            <td className="p-4 text-slate-600">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || '-'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase ${sportiv.status === 'Activ' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}`}>
                                    {sportiv.status}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                    {sportiv.roluri.map(r => <RoleBadge key={r.id} role={r} />)}
                                </div>
                            </td>
                            {customFields.map(field => <td key={field} className="p-4 text-slate-600">{sportiv[field] || '-'}</td>)}
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