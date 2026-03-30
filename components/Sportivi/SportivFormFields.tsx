import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament, Club, User, Grad, Rol } from '../../types';
import { Button, Input, Select, FormSection, Switch } from '../ui';
import { PlusIcon } from '../icons';
import { FEDERATIE_ID } from '../../constants';
import { validateSportiv } from '../../utils/validation';

interface SportivFormFieldsProps {
    initialData: Partial<Sportiv>;
    onFormChange: (data: Partial<Sportiv>, isValid: boolean) => void;
    loading: boolean;
    grupe: Grupa[];
    grade: Grad[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    clubs: Club[];
    currentUser: User | null;
    onQuickAddGrupa: () => void;
    onQuickAddFamilie: () => void;
    allRoles: Rol[];
}

export const SportivFormFields: React.FC<SportivFormFieldsProps> = ({
    initialData,
    onFormChange,
    loading,
    grupe,
    grade,
    familii,
    tipuriAbonament,
    clubs,
    currentUser,
    onQuickAddGrupa,
    onQuickAddFamilie,
    allRoles,
}) => {
    const formData = initialData;
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = useCallback((data: Partial<Sportiv>) => {
        return validateSportiv(data);
    }, []);

    const isSuperAdmin = useMemo(() => 
        currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN'), 
        [currentUser]
    );

    useEffect(() => {
        const currentErrors = validate(formData);
        setErrors(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(currentErrors)) {
                return currentErrors;
            }
            return prev;
        });
    }, [formData, validate]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        let updatedData: Partial<Sportiv> = { ...formData };
        let finalValue: any;

        if (type === 'checkbox') {
            finalValue = checked;
        } else if (name === 'inaltime') {
            const num = parseInt(value, 10);
            finalValue = isNaN(num) ? null : num;
        } else if (['familie_id', 'grupa_id', 'tip_abonament_id', 'club_id', 'gen', 'grad_actual_id'].includes(name)) {
            finalValue = value === '' ? null : value;
        } else {
            finalValue = value;
        }

        (updatedData as any)[name] = finalValue;
        
        if (name === 'roluri') {
            // Handle role selection (array of Rol objects)
            const roleId = value;
            const isChecked = checked;
            const currentRoles = updatedData.roluri || [];
            if (isChecked) {
                const roleToAdd = allRoles.find(r => r.id === roleId);
                if (roleToAdd && !currentRoles.some(r => r.id === roleId)) {
                    updatedData.roluri = [...currentRoles, roleToAdd];
                }
            } else {
                updatedData.roluri = currentRoles.filter(r => r.id !== roleId);
            }
        }

        if (name === 'club_id') {
            const currentGroup = grupe.find(g => g.id === updatedData.grupa_id);
            if (currentGroup && currentGroup.club_id !== finalValue) {
                updatedData.grupa_id = null;
            }
        }
        
        if (!formData.id && (name === 'nume' || name === 'prenume')) {
            const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            const nume = sanitize(name === 'nume' ? value : updatedData.nume || '');
            const prenume = sanitize(name === 'prenume' ? value : updatedData.prenume || '');
            
            if (nume && prenume) {
                const targetClubId = updatedData.club_id || currentUser?.club_id;
                const club = clubs.find(c => c.id === targetClubId);
                const domain = club ? club.nume.toLowerCase().replace(/[^a-z0-9]/g, '') + '.ro' : 'phihau.ro';
                updatedData.email = `${nume}.${prenume}@${domain}`;
                updatedData.parola = `${nume}.1234!`;
            }
        }

        const newErrors = validate(updatedData);
        setErrors(newErrors);
        onFormChange(updatedData, Object.keys(newErrors).length === 0);
    };
    
    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'club'>('general');

    return (
        <div className="space-y-4">
            <div className="flex border-b border-slate-700 mb-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'general' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Date Personale
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'contact' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Contact & Acces
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('club')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                        activeTab === 'club' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    Club & Status
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Date Personale">
                        <Input label="Nume" name="nume" value={formData.nume || ''} onChange={handleChange} required disabled={loading} error={errors.nume} />
                        <Input label="Prenume" name="prenume" value={formData.prenume || ''} onChange={handleChange} required disabled={loading} error={errors.prenume} />
                        <Input label="Data Nașterii" name="data_nasterii" type="date" value={formData.data_nasterii || ''} onChange={handleChange} required disabled={loading} error={errors.data_nasterii} />
                        <Input label="CNP" name="cnp" value={formData.cnp || ''} onChange={handleChange} disabled={loading} maxLength={13} />
                        <Input label="Înălțime (cm)" name="inaltime" type="number" value={formData.inaltime || ''} onChange={handleChange} disabled={loading} />
                        <Select label="Gen" name="gen" value={formData.gen || ''} onChange={handleChange} disabled={loading}>
                            <option value="">Nespecificat</option>
                            <option value="Masculin">Masculin</option>
                            <option value="Feminin">Feminin</option>
                        </Select>
                    </FormSection>
                </div>
            )}

            {activeTab === 'contact' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Date Contact">
                        <Input label="Telefon" name="telefon" value={formData.telefon || ''} onChange={handleChange} disabled={loading} />
                        <Input label="Adresă" name="adresa" value={formData.adresa || ''} onChange={handleChange} disabled={loading} />
                    </FormSection>

                    {!initialData.id ? (
                        <FormSection title="Detalii Cont Acces (Opțional)">
                            <p className="text-xs text-slate-400 col-span-full -mt-1">La salvare, se va crea automat un cont de acces cu email și parolă generate. Username-ul va fi generat automat (ex: nume.prenume).</p>
                            <Input label="Email (Login)" name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled={loading} required={!initialData.id} error={errors.email} />
                            <Input
                                label="Username (Auto-generat)"
                                name="username"
                                value={formData.username || '(generat automat)'}
                                onChange={handleChange}
                                disabled={true}
                                className="opacity-60 cursor-not-allowed"
                            />
                            <Input label="Parolă" name="parola" value={formData.parola || ''} onChange={handleChange} disabled={loading} required error={errors.parola} />
                        </FormSection>
                    ) : (
                        <FormSection title="Email & Login">
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="adresa@email.ro"
                            />
                            <p className="text-xs text-slate-400 col-span-full -mt-1">
                                Dacă sportivul are cont de login, emailul de autentificare va fi actualizat automat.
                            </p>
                        </FormSection>
                    )}

                    <FormSection title="Roluri Utilizator">
                        <div className="col-span-full">
                            <p className="text-xs text-slate-400 mb-3">Selectați rolurile de acces pentru acest sportiv. Rolul 'SPORTIV' este implicit.</p>
                            <div className="flex flex-wrap gap-4">
                                {allRoles.map(role => (
                                    <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer bg-slate-800/50 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
                                        <input
                                            type="checkbox"
                                            name="roluri"
                                            value={role.id}
                                            className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                                            checked={(formData.roluri || []).some(r => r.id === role.id)}
                                            onChange={handleChange}
                                            disabled={loading || (role.nume === 'SPORTIV' && !formData.id)}
                                        />
                                        <span className="text-slate-200">{role.nume}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </FormSection>
                </div>
            )}

            {activeTab === 'club' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Club & Antrenament">
                        <Input label="Data Înscrierii" name="data_inscrierii" type="date" value={formData.data_inscrierii?.split('T')[0] || ''} onChange={handleChange} disabled={loading} />
                        {isSuperAdmin && (
                            <div className="col-span-full">
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Club</label>
                                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                    {clubs.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleChange({ target: { name: 'club_id', value: c.id } })}
                                            className={`p-4 rounded-xl border text-left transition-all active:scale-95 touch-manipulation ${
                                                formData.club_id === c.id
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <span className="font-bold text-lg block">{c.nume}</span>
                                            {c.id === FEDERATIE_ID && <span className="text-xs opacity-75">Federație</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Select label="Grad Inițial/Actual" name="grad_actual_id" value={formData.grad_actual_id || ''} onChange={handleChange} disabled={loading}>
                            <option value="">Începător (fără grad)</option>
                            {grade.sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                        </Select>
                        <div className="flex gap-2 items-end">
                            <Select label="Grupă" name="grupa_id" value={formData.grupa_id || ''} onChange={handleChange} disabled={loading} className="flex-grow">
                                <option value="">Fără grupă</option>
                                {grupe.filter(g => !formData.club_id || g.club_id === formData.club_id).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="md" onClick={onQuickAddGrupa} className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0"><PlusIcon className="w-6 h-6"/></Button>
                        </div>
                        <div className="flex gap-2 items-end">
                            <Select label="Familie" name="familie_id" value={formData.familie_id || ''} onChange={handleChange} disabled={loading} className="flex-grow">
                                <option value="">Individual</option>
                                {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                            </Select>
                            <Button type="button" variant="secondary" size="md" onClick={onQuickAddFamilie} className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0"><PlusIcon className="w-6 h-6"/></Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select label="Status" name="status" value={formData.status || 'Activ'} onChange={handleChange} disabled={loading}>
                                <option value="Activ">Activ</option>
                                <option value="Inactiv">Inactiv</option>
                            </Select>
                            <div className="pt-2 sm:pt-5">
                                <Switch label="Participă la antrenamentele din vacanță" name="participa_vacanta" checked={formData.participa_vacanta || false} onChange={handleChange} />
                            </div>
                        </div>
                    </FormSection>
                </div>
            )}
        </div>
    );
};
