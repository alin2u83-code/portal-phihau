import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sportiv, Grupa, Familie, TipAbonament, Club, User, Grad, Rol } from '../../types';
import { Button, Input, Select, FormSection, Switch, DateInputDMY } from '../ui';
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
    // Erori afisate doar dupa prima interactiune cu campul respectiv (touched)
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

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

    // Resetam touched cand se schimba sportivul (modal reutil)
    useEffect(() => {
        setTouched({});
    }, [formData.id]);

    const markTouched = (name: string) => {
        setTouched(prev => prev[name] ? prev : { ...prev, [name]: true });
    };

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

        markTouched(name);
        const newErrors = validate(updatedData);
        setErrors(newErrors);
        onFormChange(updatedData, Object.keys(newErrors).length === 0);
    };

    // Handler special pentru DateInputDMY care nu emite un SyntheticEvent standard
    const handleDateChange = (fieldName: string) => (v: string) => {
        markTouched(fieldName);
        handleChange({ target: { name: fieldName, value: v, type: 'text' } });
    };

    const visibleErrors = useMemo(() => {
        const result: Record<string, string> = {};
        for (const key of Object.keys(errors)) {
            if (touched[key]) result[key] = errors[key];
        }
        return result;
    }, [errors, touched]);

    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'club'>('general');

    const tabClass = (tab: typeof activeTab) =>
        `px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
            activeTab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
        }`;

    // Numar erori per tab pentru badge
    const generalFields = ['nume', 'prenume', 'data_nasterii'];
    const contactFields = ['email', 'parola'];
    const errorsInTab = (fields: string[]) => fields.filter(f => errors[f]).length;

    return (
        <div className="space-y-4">
            {/* Tab navigation */}
            <div className="flex border-b border-slate-700 mb-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                <button type="button" onClick={() => setActiveTab('general')} className={tabClass('general')}>
                    Date Personale
                    {errorsInTab(generalFields) > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {errorsInTab(generalFields)}
                        </span>
                    )}
                </button>
                <button type="button" onClick={() => setActiveTab('contact')} className={tabClass('contact')}>
                    Contact &amp; Acces
                    {errorsInTab(contactFields) > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {errorsInTab(contactFields)}
                        </span>
                    )}
                </button>
                <button type="button" onClick={() => setActiveTab('club')} className={tabClass('club')}>
                    Club &amp; Status
                </button>
            </div>

            {/* Tab: Date Personale */}
            {activeTab === 'general' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Date Personale">
                        <Input
                            label="Nume *"
                            name="nume"
                            value={formData.nume || ''}
                            onChange={handleChange}
                            onBlur={() => markTouched('nume')}
                            required
                            disabled={loading}
                            error={visibleErrors.nume}
                            placeholder="ex: Popescu"
                        />
                        <Input
                            label="Prenume *"
                            name="prenume"
                            value={formData.prenume || ''}
                            onChange={handleChange}
                            onBlur={() => markTouched('prenume')}
                            required
                            disabled={loading}
                            error={visibleErrors.prenume}
                            placeholder="ex: Ion"
                        />
                        <div className="col-span-full sm:col-span-1">
                            <DateInputDMY
                                label="Data Nașterii *"
                                value={formData.data_nasterii || ''}
                                onChange={handleDateChange('data_nasterii')}
                                required
                                disabled={loading}
                                error={visibleErrors.data_nasterii}
                            />
                        </div>
                        <Select
                            label="Gen"
                            name="gen"
                            value={formData.gen || ''}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="">Nespecificat</option>
                            <option value="Masculin">Masculin</option>
                            <option value="Feminin">Feminin</option>
                        </Select>
                        <Input
                            label="CNP"
                            name="cnp"
                            value={formData.cnp || ''}
                            onChange={handleChange}
                            disabled={loading}
                            maxLength={13}
                            placeholder="13 cifre"
                        />
                        <Input
                            label="Înălțime (cm)"
                            name="inaltime"
                            type="number"
                            value={formData.inaltime || ''}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="ex: 165"
                        />
                    </FormSection>
                </div>
            )}

            {/* Tab: Contact & Acces */}
            {activeTab === 'contact' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Date Contact">
                        <Input
                            label="Telefon"
                            name="telefon"
                            value={formData.telefon || ''}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="ex: 0722 000 000"
                        />
                        <Input
                            label="Adresă"
                            name="adresa"
                            value={formData.adresa || ''}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Strada, nr., oraș"
                        />
                    </FormSection>

                    {!initialData.id ? (
                        <FormSection title="Cont de Acces">
                            <p className="text-xs text-slate-400 col-span-full -mt-1">
                                La salvare se creează automat un cont cu email și parolă generate din nume și prenume.
                            </p>
                            <Input
                                label="Email (Login) *"
                                name="email"
                                type="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                                onBlur={() => markTouched('email')}
                                disabled={loading}
                                required
                                error={visibleErrors.email}
                                placeholder="nume.prenume@club.ro"
                            />
                            <Input
                                label="Username"
                                name="username"
                                value={formData.username || '(generat automat)'}
                                onChange={handleChange}
                                disabled={true}
                                className="opacity-60 cursor-not-allowed"
                            />
                            <Input
                                label="Parolă *"
                                name="parola"
                                value={formData.parola || ''}
                                onChange={handleChange}
                                onBlur={() => markTouched('parola')}
                                disabled={loading}
                                required
                                error={visibleErrors.parola}
                                placeholder="minim 6 caractere"
                            />
                        </FormSection>
                    ) : (
                        <FormSection title="Email &amp; Login">
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
                            <p className="text-xs text-slate-400 mb-3">
                                Selectați rolurile de acces. Rolul <strong className="text-slate-300">SPORTIV</strong> este implicit.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {allRoles.map(role => (
                                    <label
                                        key={role.id}
                                        className="flex items-center gap-2 text-sm cursor-pointer bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors touch-manipulation"
                                    >
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

            {/* Tab: Club & Status */}
            {activeTab === 'club' && (
                <div className="space-y-4 animate-fade-in">
                    <FormSection title="Club &amp; Antrenament">
                        <Input
                            label="Data Înscrierii"
                            name="data_inscrierii"
                            type="date"
                            value={formData.data_inscrierii?.split('T')[0] || ''}
                            onChange={handleChange}
                            disabled={loading}
                        />
                        {isSuperAdmin ? (
                            <div className="col-span-full">
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                                    Club *
                                </label>
                                <select
                                    name="club_id"
                                    value={formData.club_id || ''}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors touch-manipulation"
                                >
                                    <option value="">— Selectează club —</option>
                                    {clubs.filter(c => c.id !== FEDERATIE_ID).map(c => (
                                        <option key={c.id} value={c.id}>{c.nume}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="col-span-full">
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                    Club
                                </label>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300">
                                    <span className="font-medium">
                                        {clubs.find(c => c.id === (formData.club_id || currentUser?.club_id))?.nume || 'Clubul curent'}
                                    </span>
                                    <span className="ml-auto text-xs text-slate-500 select-none">Read-only</span>
                                </div>
                            </div>
                        )}
                        <Select
                            label="Grad Inițial / Actual"
                            name="grad_actual_id"
                            value={formData.grad_actual_id || ''}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="">Începător (fără grad)</option>
                            {grade.sort((a, b) => a.ordine - b.ordine).map(g => (
                                <option key={g.id} value={g.id}>{g.nume}</option>
                            ))}
                        </Select>
                        <div className="flex gap-2 items-end">
                            <Select
                                label="Grupă"
                                name="grupa_id"
                                value={formData.grupa_id || ''}
                                onChange={handleChange}
                                disabled={loading}
                                className="flex-grow"
                            >
                                <option value="">Fără grupă</option>
                                {grupe
                                    .filter(g => !formData.club_id || g.club_id === formData.club_id)
                                    .map(g => (
                                        <option key={g.id} value={g.id}>{g.denumire}</option>
                                    ))
                                }
                            </Select>
                            <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                onClick={() => onQuickAddGrupa()}
                                className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0"
                                title="Adaugă grupă nouă"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex gap-2 items-end">
                            <Select
                                label="Familie"
                                name="familie_id"
                                value={formData.familie_id || ''}
                                onChange={handleChange}
                                disabled={loading}
                                className="flex-grow"
                            >
                                <option value="">Individual</option>
                                {familii.map(f => (
                                    <option key={f.id} value={f.id}>{f.nume}</option>
                                ))}
                            </Select>
                            <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                onClick={() => onQuickAddFamilie()}
                                className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0"
                                title="Adaugă familie nouă"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </Button>
                        </div>
                        <Select
                            label="Status"
                            name="status"
                            value={formData.status || 'Activ'}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="Activ">Activ</option>
                            <option value="Inactiv">Inactiv</option>
                        </Select>
                        <div className="flex items-center pt-2 sm:pt-5">
                            <Switch
                                label="Participă la antrenamentele din vacanță"
                                name="participa_vacanta"
                                checked={formData.participa_vacanta || false}
                                onChange={handleChange}
                            />
                        </div>
                    </FormSection>
                </div>
            )}
        </div>
    );
};
