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
            <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 my-4 space-y-4">
                <h3 className="text-amber-400 font-bold flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5" /> Date Opționale Acces Cont
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email" name="email" type="email" value={formState.email || ''} onChange={handleChange} />
                    <Input label="Nume Utilizator (Login)" name="username" value={formState.username || ''} onChange={handleChange} />
                </div>
                <Input label="Parolă Inițială" name="parola" type="password" value={formState.parola} onChange={handleChange} />
                <p className="text-xs text-slate-400 italic">Completați aceste câmpuri doar dacă doriți să creați și un cont de autentificare.</p>
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
            <div className="border-t border-slate-700 pt-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Câmpuri Suplimentare</h3>
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
        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-tight mb-1 flex items-center gap-1">
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

    const currentParticipation = admittedParticipations.length > 0 ? admittedParticipations[0] : null;

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
                    {saveStatus && <span className={`text-sm self-center ${saveStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{saveStatus.message}</span>}
                    <Button onClick={() => setIsEditMode(!isEditMode)} variant={isEditMode ? 'secondary' : 'primary'} size="sm">
                        <EditIcon className="w-4 h-4 mr-2" /> {isEditMode ? 'Anulează' : 'Editează Profil'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coloana Stângă - Profil și Date Cheie */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-l-4 border-l-brand-secondary">
                        <div className="flex items-center gap-6 mb-8">
                             <div className="w-24 h-24 rounded-2xl bg-slate-700 flex items-center justify-center text-3xl font-bold text-brand-secondary shadow-xl border border-slate-600">
                                {sportiv.nume[0]}{sportiv.prenume[0]}
                             </div>
                             <div>
                                <h2 className="text-3xl font-extrabold text-white leading-tight uppercase">{sportiv.nume} {sportiv.prenume}</h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary text-sm font-bold rounded-full border border-brand-secondary/20">
                                        {gradActual}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${sportiv.status === 'Activ' ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}>
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
                                <div className="flex justify-end pt-4 border-t border-slate-700">
                                    <Button onClick={handleSave} variant="success" disabled={loading}>
                                        {loading ? 'Se salvează...' : 'Salvează Profilul'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-slate-500 border-b border-slate-700 pb-2 flex items-center gap-2 uppercase tracking-widest">
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
                                    <h3 className="text-sm font-bold text-slate-500 border-b border-slate-700 pb-2 flex items-center gap-2 uppercase tracking-widest">
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
                             <h3 className="text-xl font-bold text-white mb-4">Date Suplimentare</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {customFields.map(field => (
                                    <DataField key={field} label={field} value={sportiv[field]} />
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card className="bg-slate-700/50 border border-slate-600">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-full">
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
                                className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/20 border-none"
                            >
                                <CogIcon className="w-5 h-5 mr-2" /> Gestionare Cont Acces
                            </Button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Istoric Grade & Examene</h3>
                        <div className="space-y-2">
                            {sportivParticipari.map(p => {
                                const examen = examene.find(e => e.id === p.examen_id);
                                const grad = grade.find(g => g.id === p.grad_sustinut_id);
                                const isCurrentGrad = currentParticipation && p.id === currentParticipation.id;

                                return ( 
                                    <div 
                                        key={p.id} 
                                        className={`p-3 rounded-lg flex justify-between items-center transition-all ${
                                            isCurrentGrad 
                                            ? 'bg-brand-secondary/20 border-2 border-brand-secondary shadow-lg shadow-brand-secondary/10' 
                                            : 'bg-slate-700/50 border border-slate-700'
                                        }`}
                                    >
                                        <div>
                                            <p className={`font-bold ${isCurrentGrad ? 'text-brand-secondary text-lg' : 'text-white'}`}>{grad?.nume}</p>
                                            <p className="text-xs text-slate-400">{new Date(examen!.data).toLocaleDateString('ro-RO')} - {examen?.locatia}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isCurrentGrad && <span className="text-xs font-bold uppercase text-brand-secondary tracking-wider">Curent</span>}
                                            <span className={`px-2 py-1 text-xs font-bold rounded ${p.rezultat === 'Admis' ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}>
                                                {p.rezultat}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {sportivParticipari.length === 0 && <p className="text-slate-400 italic text-sm">Niciun examen susținut încă.</p>}
                        </div>
                    </Card>
                </div>

                {/* Coloana Dreaptă - Rezumat Financiar și Note */}
                <div className="space-y-6">
                    <Card className="bg-slate-800/80 border border-brand-secondary/20">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-brand-secondary rounded-full"></span> Situație Financiară
                        </h3>
                        <div className="space-y-3">
                            {sportivPlati.filter(p => p.status !== 'Achitat').map(p => (
                                <div key={p.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-700">
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

                    <Card className="bg-slate-800/30 border-dashed border-2 border-slate-700">
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
      `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
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

        const profileToInsert = {
            nume: profileData.nume,
            prenume: profileData.prenume,
            data_nasterii: profileData.data_nasterii,
            cnp: profileData.cnp || null,
            data_inscrierii: profileData.data_inscrierii,
            status: profileData.status,
            club_provenienta: profileData.club_provenienta,
            grupa_id: profileData.grupa_id || null,
            familie_id: profileData.familie_id || null,
            tip_abonament_id: profileData.tip_abonament_id || null,
            participa_vacanta: profileData.participa_vacanta,
            inaltime: profileData.inaltime || null,
            username: profileData.username || null,
            email: email || null,
        };

        let userId: string | undefined = undefined;

        if (email && parola) {
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: parola });
            if (authError) {
                alert(`Eroare la crearea contului de autentificare: ${authError.message}`);
                return;
            }
            if (authData.user) {
                userId = authData.user.id;
            }
        }

        const { data: newSportiv, error: profileError } = await supabase
            .from('sportivi')
            .insert({ ...profileToInsert, user_id: userId })
            .select('*')
            .single();
        
        if (profileError) {
            alert(`Eroare la salvarea profilului: ${profileError.message}`);
            return;
        }

        if (newSportiv) {
            const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
            let finalNewSportiv: Sportiv = { ...newSportiv, roluri: [] };

            if (sportivRole) {
                const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: newSportiv.id, rol_id: sportivRole.id });
                if (roleError) {
                    alert(`Profil creat, dar eroare la asignarea rolului: ${roleError.message}`);
                }
                finalNewSportiv.roluri = [sportivRole];
            }
            
            setSportivi(prev => [...prev, finalNewSportiv]);
            setShowAddForm(false);
        }
    };

  const handleUpdateSportiv = async (updates: Partial<Sportiv>) => {
    if (!supabase || !selectedSportiv) return {success: false};
    
    const { data, error } = await supabase.from('sportivi').update(updates).eq('id', selectedSportiv.id).select('*, sportivi_roluri(roluri(id, nume))').single();

    if (error) {
        return {success: false, error};
    } else {
        const updatedUser = data as any;
        updatedUser.roluri = updatedUser.sportivi_roluri.map((item: any) => item.roluri);
        delete updatedUser.sportivi_roluri;

        setSportivi(prev => prev.map(s => s.id === selectedSportiv.id ? { ...s, ...updatedUser } : s));
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
            <h2 className="text-xl font-bold text-white mb-4">Management Câmpuri Custom</h2>
            <div className="flex items-end gap-2">
                <Input label="Nume Câmp Nou" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="ex: Telefon Părinte"/>
                <Button onClick={handleAddCustomField} variant="secondary">Adaugă Câmp</Button>
            </div>
            {customFields.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">Câmpuri existente:</h3>
                    <div className="flex flex-wrap gap-2">
                        {customFields.map(field => (
                            <span key={field} className="bg-slate-600 text-slate-200 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-2">
                                {field}
                                <button onClick={() => handleDeleteCustomField(field)} className="text-slate-400 hover:text-white font-bold text-lg leading-none transform hover:scale-125 transition-transform" title={`Șterge câmpul "${field}"`}>&times;</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Card>

        <Card className="mb-6">
            <Input 
                label="Caută sportiv" 
                placeholder="Nume..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
            />
        </Card>

        <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-700">
                    <tr>
                        <th className="p-4 text-sm font-semibold text-white">Nume</th>
                        <th className="p-4 text-sm font-semibold text-white">Grupă</th>
                        <th className="p-4 text-sm font-semibold text-white">Statut</th>
                        <th className="p-4 text-sm font-semibold text-white">Roluri</th>
                        {customFields.map(field => <th key={field} className="p-4 text-sm font-semibold text-white">{field}</th>)}
                        <th className="p-4 text-right text-sm font-semibold text-white">Acțiuni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {filteredSportivi.map(sportiv => (
                        <tr key={sportiv.id} className="hover:bg-slate-700/50 cursor-pointer" onClick={() => onSelectSportiv(sportiv)}>
                            <td className="p-4 font-bold">{sportiv.nume} {sportiv.prenume}</td>
                            <td className="p-4 text-slate-300">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || '-'}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase ${sportiv.status === 'Activ' ? 'text-green-300 bg-green-600/20' : 'text-red-300 bg-red-600/20'}`}>
                                    {sportiv.status}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                    {sportiv.roluri.map(r => <RoleBadge key={r.id} role={r} />)}
                                </div>
                            </td>
                            {customFields.map(field => <td key={field} className="p-4 text-slate-300">{sportiv[field] || '-'}</td>)}
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