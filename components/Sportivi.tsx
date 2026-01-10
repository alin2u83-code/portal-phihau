import React, { useState, useMemo } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, User } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { FamiliiManagement } from './Familii';
import { UserManagement } from './UserManagement';
import { useError } from './ErrorProvider';

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

interface SportivFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sportivData: Partial<Sportiv>) => Promise<{success: boolean, error?: string}>;
    sportivToEdit: Sportiv | null;
    grupe: Grupa[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    customFields: string[];
}

const SportivFormModal: React.FC<SportivFormModalProps> = ({ isOpen, onClose, onSave, sportivToEdit, grupe, familii, tipuriAbonament, customFields }) => {
    const [formState, setFormState] = useState<Partial<Sportiv>>(sportivToEdit || emptySportivState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setFormState(sportivToEdit || emptySportivState);
            setError(null);
        }
    }, [isOpen, sportivToEdit]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: any } }) => {
        const {name, value} = e.target;
        setFormState(p => ({...p, [name]: value === '' ? null : value }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const result = await onSave(formState);
        setLoading(false);
        if (result.success) {
            onClose();
        } else {
            setError(result.error || "A apărut o eroare necunoscută.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={sportivToEdit ? "Editează Sportiv" : "Adaugă Sportiv Nou"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <SportivFormFields 
                    formState={formState} 
                    handleChange={handleChange} 
                    grupe={grupe} 
                    familii={familii} 
                    tipuriAbonament={tipuriAbonament} 
                    customFields={customFields}
                    isEditMode={!!sportivToEdit}
                />
                 {error && (
                    <div className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-lg border border-red-700/50">
                        {error}
                    </div>
                )}
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};


type SportiviSubView = 'lista' | 'gestiune' | 'acces';

interface SportiviManagementProps { 
    onBack: () => void; 
    sportivi: Sportiv[]; setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>; 
    participari: any[]; // Simplified for brevity
    grupe: Grupa[]; 
    tipuriAbonament: TipAbonament[]; 
    customFields: string[]; 
    setCustomFields: React.Dispatch<React.SetStateAction<string[]>>;
    currentUser: User;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
}

export const SportiviManagement: React.FC<SportiviManagementProps> = ({ onBack, sportivi, setSportivi, participari, grupe, tipuriAbonament, familii, setFamilii, customFields, setCustomFields, currentUser, setCurrentUser, allRoles, setAllRoles }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [subView, setSubView] = useState<SportiviSubView>('lista');
  const { showError } = useError();
  
  const initialFilters = { searchTerm: '', grupa: 'all' };
  const [filters, setFilters] = useState(initialFilters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const filteredSportivi = useMemo(() => {
    return sportivi.filter(s => {
      const nameMatch = `${s.nume} ${s.prenume}`.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const grupaMatch = filters.grupa === 'all' || s.grupa_id === filters.grupa;
      return nameMatch && grupaMatch;
    }).sort((a,b) => a.nume.localeCompare(b.nume) || a.prenume.localeCompare(b.prenume));
  }, [sportivi, filters]);

  const handleAddCustomField = () => {
    const trimmedName = newFieldName.trim();
    if (trimmedName && !customFields.includes(trimmedName) && !Object.keys(emptySportivState).includes(trimmedName)) {
        setCustomFields(prev => [...prev, trimmedName]);
        setNewFieldName('');
    } else {
        showError("Nume invalid", "Numele câmpului este invalid, deja există, sau este un câmp rezervat.");
    }
  };

  const handleDeleteCustomField = (fieldName: string) => {
    if (window.confirm(`Sunteți sigur că doriți să ștergeți câmpul "${fieldName}"? Toate datele asociate acestuia vor fi pierdute la următoarea salvare.`)) {
        setCustomFields(prev => prev.filter(f => f !== fieldName));
    }
  };

    const handleSave = async (formData: Partial<Sportiv>): Promise<{success: boolean, error?: string}> => {
        if (sportivToEdit) {
            return await handleUpdateSportiv(sportivToEdit.id, formData);
        } else {
            return await handleAddSportiv(formData);
        }
    };
    
    const handleAddSportiv = async (sportivData: Partial<Sportiv>): Promise<{success: boolean; error?: string}> => {
        if (!supabase) return { success: false, error: "Clientul Supabase nu este configurat." };

        const { email, parola, username } = sportivData;
        const validColumns = ['nume','prenume','data_nasterii','cnp','inaltime','data_inscrierii','status','club_provenienta','grupa_id','familie_id','tip_abonament_id','participa_vacanta','username','email'];
        const profileData: {[key: string]: any} = {};
        validColumns.forEach(key => { if (sportivData.hasOwnProperty(key)) { profileData[key] = sportivData[key] === '' ? null : sportivData[key]; } });

        // Flow: Create profile first, then auth user, rollback on auth failure.
        const { data: newSportiv, error: profileError } = await supabase.from('sportivi').insert(profileData).select().single();

        if (profileError) {
            showError("Eroare Salvare Profil", profileError);
            return { success: false, error: `Eroare la salvarea profilului: ${profileError.message}` };
        }

        if (email && parola) {
            const { data: { session: adminSession } } = await supabase.auth.getSession();
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: parola });

            // Restore admin session immediately after the sensitive call
            if (adminSession) {
                await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
            }

            if (authError) {
                // ATOMIC ROLLBACK
                await supabase.from('sportivi').delete().eq('id', newSportiv.id);
                showError("Eroare Creare Cont", `Contul nu a putut fi creat (${authError.message}). Profilul a fost șters automat.`);
                return { success: false, error: `Contul nu a putut fi creat (${authError.message}). Profilul a fost șters automat.` };
            }

            if (authData.user) {
                const { error: linkError } = await supabase.from('sportivi').update({ user_id: authData.user.id }).eq('id', newSportiv.id);
                if (linkError) {
                    showError("Eroare Critică", `Cont creat, dar profilul nu a putut fi asociat: ${linkError.message}. Asociați manual.`);
                }
            }
        }

        // Fetch the final complete data to update state
        const { data: finalData, error: fetchError } = await supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))').eq('id', newSportiv.id).single();
        if (fetchError || !finalData) {
             setSportivi(prev => [...prev, { ...newSportiv, roluri: [] }]);
        } else {
            const finalNewSportiv = finalData as any;
            finalNewSportiv.roluri = finalNewSportiv.sportivi_roluri ? finalNewSportiv.sportivi_roluri.map((item: any) => item.roluri) : [];
            delete finalNewSportiv.sportivi_roluri;
            setSportivi(prev => [...prev, finalNewSportiv]);
        }

        return { success: true };
    };

  const handleUpdateSportiv = async (sportivId: string, updates: Partial<Sportiv>) => {
    if (!supabase) return {success: false, error: "Client Supabase neconfigurat."};

    const validUpdateColumns = ['nume','prenume','data_nasterii','cnp','inaltime','data_inscrierii','status','club_provenienta','grupa_id','familie_id','tip_abonament_id','participa_vacanta'];
    const cleanUpdates: {[key: string]: any} = {};
    for (const key in updates) { if (validUpdateColumns.includes(key)) { cleanUpdates[key] = updates[key] === '' ? null : updates[key]; } }
    
    const { data, error } = await supabase.from('sportivi').update(cleanUpdates).eq('id', sportivId).select('*, sportivi_roluri(roluri(id, nume))').single();

    if (error) {
        showError("Eroare la actualizarea profilului", error);
        return {success: false, error: error.message};
    } 
    
    const updatedUser = data as any;
    updatedUser.roluri = updatedUser.sportivi_roluri.map((item: any) => item.roluri);
    delete updatedUser.sportivi_roluri;

    setSportivi(prev => prev.map(s => s.id === sportivId ? updatedUser : s));
    return {success: true};
  };

  const handleDeleteSportiv = async (sportiv: Sportiv) => {
      if (!supabase) return;
      let confirmationMessage = "Sunteți sigur că doriți să ștergeți acest profil?";
      if (sportiv.user_id) {
          confirmationMessage += "\n\nATENȚIE: Acest utilizator are un cont de acces. Ștergerea profilului NU va șterge contul de autentificare, care va trebui curățat manual de către un administrator al sistemului.";
      }
      if (window.confirm(confirmationMessage)) {
          const { error } = await supabase.from('sportivi').delete().eq('id', sportiv.id);
          if (error) {
              showError("Eroare la ștergere", error);
          } else {
              setSportivi(prev => prev.filter(s => s.id !== sportiv.id));
          }
      }
  };

  const handleOpenAdd = () => { setSportivToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (sportiv: Sportiv) => { setSportivToEdit(sportiv); setIsModalOpen(true); };

  const TabButton: React.FC<{ view: SportiviSubView; label: string }> = ({ view, label }) => {
    const isActive = subView === view;
    return (
      <button
        onClick={() => setSubView(view)}
        className={`py-2 px-3 border-b-2 text-sm transition-colors duration-200 ${
          isActive
            ? 'border-brand-secondary text-white font-semibold'
            : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
        <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
        <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-white">Sportivi & Utilizatori</h1>
        </div>

        <div className="border-b border-slate-700 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <TabButton view="lista" label="Listă Sportivi" />
                <TabButton view="gestiune" label="Gestiune" />
                {currentUser?.roluri.some(r => r.nume === 'Admin') && (
                    <TabButton view="acces" label="Acces Utilizatori" />
                )}
            </nav>
        </div>

        {subView === 'lista' && (
            <>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Bază Date Sportivi</h2>
                    <Button onClick={handleOpenAdd} variant="info">
                        <PlusIcon className="w-5 h-5 mr-2" />Adaugă Sportiv
                    </Button>
                </div>

                <Card className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <Input label="Caută sportiv" name="searchTerm" placeholder="Nume..." value={filters.searchTerm} onChange={handleFilterChange} />
                        <Select label="Filtrează după grupă" name="grupa" value={filters.grupa} onChange={handleFilterChange}>
                            <option value="all">Toate grupele</option>
                            {grupe.map(g => (<option key={g.id} value={g.id}>{g.denumire}</option>))}
                        </Select>
                    </div>
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
                                <tr key={sportiv.id} className="hover:bg-slate-700/50">
                                    <td className="p-4 font-bold">{sportiv.nume} {sportiv.prenume}</td>
                                    <td className="p-4 text-slate-300">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-bold uppercase ${sportiv.status === 'Activ' ? 'text-green-300 bg-green-600/20' : 'text-red-300 bg-red-600/20'}`}>{sportiv.status}</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {sportiv.roluri.map(r => <RoleBadge key={r.id} role={r} />)}
                                        </div>
                                    </td>
                                    {customFields.map(field => <td key={field} className="p-4 text-slate-300">{sportiv[field] || '-'}</td>)}
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="primary" onClick={() => handleOpenEdit(sportiv)} title="Editează profil"><EditIcon /></Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDeleteSportiv(sportiv)} title="Șterge profil"><TrashIcon /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}
        
        {subView === 'gestiune' && (
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Gestiune Familii</h2>
                    <FamiliiManagement familii={familii} setFamilii={setFamilii} isEmbedded />
                </div>
                 <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Gestiune Câmpuri Custom</h2>
                    <Card>
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
                 </div>
            </div>
        )}

        {subView === 'acces' && currentUser?.roluri.some(r => r.nume === 'Admin') && (
             <UserManagement 
                sportivi={sportivi} 
                setSportivi={setSportivi} 
                currentUser={currentUser!} 
                setCurrentUser={setCurrentUser} 
                allRoles={allRoles} 
                setAllRoles={setAllRoles} 
                isEmbedded={true}
            />
        )}

        <SportivFormModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
            sportivToEdit={sportivToEdit}
            grupe={grupe}
            familii={familii}
            tipuriAbonament={tipuriAbonament}
            customFields={customFields}
        />
    </div>
  );
};