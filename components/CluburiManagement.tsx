import React, { useState } from 'react';
import { Club, User, Permissions, Rol } from '../types';
import { Button, Modal, Input, Card, CredentialeContModal } from './ui';
import { PlusIcon, EditIcon, TrashIcon, UsersIcon, BuildingOfficeIcon, UserPlusIcon, AlertCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { useNavigation } from '../contexts/NavigationContext';
import { clearCache } from '../utils/cache';
import { useRoleAssignment } from '../hooks/useRoleAssignment';
import { genereazaParolaTemporara } from '../utils/parola';

type ClubSaveData = Partial<Club> & { numeAdmin?: string; prenumeAdmin?: string; emailAdmin?: string };

interface ClubFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (clubData: ClubSaveData) => Promise<boolean>;
    clubToEdit: Club | null;
    adminError: string | null;
    clubCreatNume: string | null;
    onRetryAdmin: () => void;
    retryLoading: boolean;
}

const ClubFormModal: React.FC<ClubFormModalProps> = ({ isOpen, onClose, onSave, clubToEdit, adminError, clubCreatNume, onRetryAdmin, retryLoading }) => {
    const [formData, setFormData] = useState({ nume: '', cif: '', oras: '', numeAdmin: '', prenumeAdmin: '', emailAdmin: '' });
    const [fieldErrors, setFieldErrors] = useState<{ numeAdmin?: string; prenumeAdmin?: string; emailAdmin?: string }>({});
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                nume: clubToEdit?.nume || '',
                cif: clubToEdit?.cif || '',
                oras: clubToEdit?.oras || '',
                numeAdmin: '',
                prenumeAdmin: '',
                emailAdmin: '',
            });
            setFieldErrors({});
        }
    }, [isOpen, clubToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clubToEdit) {
            const errors: { numeAdmin?: string; prenumeAdmin?: string; emailAdmin?: string } = {};
            if (!formData.numeAdmin.trim()) errors.numeAdmin = "Numele administratorului este obligatoriu.";
            if (!formData.prenumeAdmin.trim()) errors.prenumeAdmin = "Prenumele administratorului este obligatoriu.";
            if (!formData.emailAdmin.trim()) {
                errors.emailAdmin = "Emailul administratorului este obligatoriu.";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAdmin.trim())) {
                errors.emailAdmin = "Adresa de email nu este validă.";
            }
            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                return;
            }
        }
        setFieldErrors({});

        setLoading(true);
        const dataToSave = { id: clubToEdit?.id, ...formData };
        const inchide = await onSave(dataToSave);
        setLoading(false);
        if (inchide) onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={clubToEdit ? "Editează Club" : "Adaugă Club Nou"} persistent={!!adminError}>
            {adminError ? (
                <div className="space-y-4">
                    <div
                        className="text-sm rounded-lg px-3 py-2 border flex items-start gap-2"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--t-status-danger) 10%, transparent)',
                            color: 'var(--t-status-danger)',
                            borderColor: 'color-mix(in srgb, var(--t-status-danger) 35%, transparent)',
                        }}
                    >
                        <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                            Clubul '{clubCreatNume}' a fost creat, dar contul de admin nu a putut fi creat: {adminError}. Clubul nu se creează din nou — apăsați mai jos pentru a reîncerca doar crearea contului de admin.
                        </span>
                    </div>
                    <div className="flex justify-end pt-2 space-x-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={retryLoading}>Închide</Button>
                        <Button type="button" variant="success" onClick={onRetryAdmin} isLoading={retryLoading}>Reîncearcă Crearea Contului Admin</Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <BuildingOfficeIcon className="w-4 h-4" style={{ color: 'var(--t-primary)' }} />
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">Date Club</span>
                        </div>
                        <Input label="Nume Club" name="nume" value={formData.nume} onChange={handleChange} required />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="CIF / CUI (Opțional)" name="cif" value={formData.cif} onChange={handleChange} />
                            <Input label="Oraș (Opțional)" name="oras" value={formData.oras} onChange={handleChange} />
                        </div>
                    </div>

                    {!clubToEdit && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <UserPlusIcon className="w-4 h-4" style={{ color: 'var(--t-primary)' }} />
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-300">Date Prim Administrator</span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
                                Parola va fi generată automat și afișată după creare — o veți transmite manual noului admin.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label="Nume Admin" name="numeAdmin" value={formData.numeAdmin} onChange={handleChange} required error={fieldErrors.numeAdmin} />
                                <Input label="Prenume Admin" name="prenumeAdmin" value={formData.prenumeAdmin} onChange={handleChange} required error={fieldErrors.prenumeAdmin} />
                            </div>
                            <Input label="Email Admin" name="emailAdmin" type="email" placeholder="email@exemplu.ro" value={formData.emailAdmin} onChange={handleChange} required error={fieldErrors.emailAdmin} />
                        </div>
                    )}

                    <div className="flex justify-end pt-4 space-x-2">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                        <Button type="submit" variant="success" isLoading={loading}>{clubToEdit ? "Salvează" : "Creează Club și Admin"}</Button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

interface CluburiManagementProps {
    clubs: Club[];
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
    onBack: () => void;
    currentUser: User;
    permissions: Permissions;
    allRoles: Rol[];
}

export const CluburiManagement: React.FC<CluburiManagementProps> = ({ clubs, setClubs, onBack, currentUser, permissions, allRoles }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clubToEdit, setClubToEdit] = useState<Club | null>(null);
    const [clubToDelete, setClubToDelete] = useState<Club | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const { navigateRoot } = useNavigation();
    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);
    const rolAdminClub = allRoles.find(r => r.nume === 'ADMIN_CLUB');

    // Date necesare pentru (re)crearea contului de admin al clubului nou creat.
    // Parola e generată o singură dată la insertul clubului și reutilizată identic
    // la fiecare retry (T-26-13) — nu se re-generează niciodată.
    const [pendingAdmin, setPendingAdmin] = useState<{ clubId: string; clubNume: string; nume: string; prenume: string; email: string; parola: string } | null>(null);
    const [adminError, setAdminError] = useState<string | null>(null);
    const [retryLoading, setRetryLoading] = useState(false);
    const [credentiale, setCredentiale] = useState<{ email: string; parola: string; numeSportiv: string } | null>(null);

    // Creează contul ADMIN_CLUB pentru clubul deja inserat. Reutilizată atât de
    // primul apel (după insert club) cât și de handleRetryAdmin (D-07) — nu
    // atinge niciodată tabela `cluburi`.
    const creeazaAdminClub = async (pending: { clubId: string; clubNume: string; nume: string; prenume: string; email: string; parola: string }): Promise<boolean> => {
        if (!rolAdminClub) {
            setAdminError("Rolul 'ADMIN_CLUB' nu a fost găsit. Reîncărcați pagina.");
            return false;
        }

        const result = await createAccountAndAssignRole(
            pending.email,
            pending.parola,
            { nume: pending.nume, prenume: pending.prenume, email: pending.email, club_id: pending.clubId, status: 'Activ' },
            [rolAdminClub]
        );

        if (!result.success) {
            setAdminError(result.error || "A apărut o eroare neașteptată la crearea contului de admin.");
            return false;
        }

        // Gardă is_primary: RPC-ul refactor_create_user_account setează is_primary
        // doar pentru rolul SPORTIV — un cont creat exclusiv cu ADMIN_CLUB ar rămâne
        // fără rol primar la login (vezi useUserRoles.ts / utils/auth.ts).
        if (result.sportiv?.id && supabase) {
            const { error: primaryError } = await supabase
                .from('utilizator_roluri_multicont')
                .update({ is_primary: true })
                .eq('sportiv_id', result.sportiv.id)
                .eq('rol_denumire', 'ADMIN_CLUB');
            if (primaryError) {
                console.warn('Nu s-a putut seta is_primary pentru contul ADMIN_CLUB nou creat:', primaryError.message);
            }
        }

        setCredentiale({
            email: pending.email,
            parola: result.generatedPassword ?? pending.parola,
            numeSportiv: `${pending.prenume} ${pending.nume} — Admin ${pending.clubNume}`,
        });
        setAdminError(null);
        setPendingAdmin(null);
        showSuccess("Succes", "Clubul și contul de administrator au fost create.");
        return true;
    };

    const handleRetryAdmin = async () => {
        if (!pendingAdmin) return;
        setRetryLoading(true);
        setAdminError(null);
        const reusit = await creeazaAdminClub(pendingAdmin);
        setRetryLoading(false);
        // Pe succes, modalul se închide singur (banner-ul de retry dispare și
        // CredentialeContModal preia ecranul) — fără acest pas ar rămâne
        // deschis pe formularul gol, deasupra ecranului de credențiale.
        if (reusit) setIsModalOpen(false);
    };

    // Închiderea modalului cât timp banner-ul de eroare D-07 e afișat: clubul
    // rămâne creat (fără rollback), doar golim starea de retry și ghidăm
    // SUPER_ADMIN spre calea alternativă (User Management).
    const handleCloseModal = () => {
        if (adminError) {
            setPendingAdmin(null);
            setAdminError(null);
            showError("Club fără administrator", "Clubul a fost creat dar nu are încă administrator. Îi puteți crea contul din User Management.");
        }
        setIsModalOpen(false);
    };

    const handleSave = async (clubData: ClubSaveData): Promise<boolean> => {
        if (!supabase) return false;
        if (!clubToEdit && !permissions.isSuperAdmin) {
            showError("Acces Interzis", "Doar un SUPER_ADMIN_FEDERATIE poate adăuga cluburi noi.");
            return false;
        }
        if (!clubToEdit && !rolAdminClub) {
            showError("Eroare", "Rolul 'ADMIN_CLUB' nu a fost găsit. Reîncărcați pagina.");
            return false;
        }

        try {
            if (clubToEdit) {
                const { id, numeAdmin, prenumeAdmin, emailAdmin, ...updates } = clubData;
                // Curăță CIF gol — evită conflict pe unique constraint cu string gol
                if (updates.cif === '') updates.cif = null as any;
                // Verificare duplicat CIF la editare (alt club cu același CIF)
                if (updates.cif) {
                    const { data: existing } = await supabase
                        .from('cluburi')
                        .select('id')
                        .eq('cif', updates.cif)
                        .neq('id', id!)
                        .maybeSingle();
                    if (existing) {
                        showError("CIF Duplicat", "Există deja un alt club înregistrat cu acest CIF/CUI.");
                        return false;
                    }
                }
                const { data, error } = await supabase.from('cluburi').update(updates).eq('id', id!).select().single();
                if (error) throw error;
                if (data) {
                    clearCache('cache_clubs'); // Invalidează cache-ul local — modificarea trebuie să persiste la re-fetch
                    setClubs(prev => prev.map(c => c.id === id ? data : c));
                    showSuccess("Succes", "Club actualizat.");
                }
                return true;
            } else {
                const { id, numeAdmin, prenumeAdmin, emailAdmin, ...insertData } = clubData;
                // Curăță CIF gol — evită conflict pe unique constraint cu string gol
                if (insertData.cif === '') insertData.cif = null as any;
                // Verificare duplicat CIF la creare
                if (insertData.cif) {
                    const { data: existing } = await supabase
                        .from('cluburi')
                        .select('id')
                        .eq('cif', insertData.cif)
                        .maybeSingle();
                    if (existing) {
                        showError("CIF Duplicat", "Există deja un club înregistrat cu acest CIF/CUI. Verificați datele sau lăsați câmpul gol.");
                        return false;
                    }
                }
                const { data, error } = await supabase.from('cluburi').insert([insertData]).select().single();
                if (error) throw error;
                if (!data) return true;

                clearCache('cache_clubs'); // Invalidează cache-ul local — clubul nou trebuie să apară la re-fetch
                setClubs(prev => [...prev, data]);

                // Clubul e creat — de aici încolo NU mai facem rollback pe `cluburi`
                // (D-07). Generăm parola o singură dată și pornim pasul 2 (cont admin).
                const parola = genereazaParolaTemporara();
                const pending = {
                    clubId: data.id,
                    clubNume: data.nume,
                    nume: (numeAdmin || '').trim(),
                    prenume: (prenumeAdmin || '').trim(),
                    email: (emailAdmin || '').trim(),
                    parola,
                };
                setPendingAdmin(pending);
                return await creeazaAdminClub(pending);
            }
        } catch (err: any) {
            if (err.message.includes('violates row-level security policy') || err.code === '42501') {
                showError("Permisiune Refuzată (RLS)", "Politica de securitate a bazei de date a blocat acțiunea. Asigurați-vă că rolul dumneavoastră ('SUPER_ADMIN_FEDERATIE') este corect configurat.");
            } else if (err.code === '23505' && err.message.includes('cif')) {
                showError("CIF Duplicat", "Există deja un club înregistrat cu acest CIF/CUI. Verificați datele introduse sau lăsați câmpul CIF gol.");
            } else if (err.code === '23505') {
                showError("Date Duplicate", "Un club cu aceste date există deja în baza de date.");
            } else {
                showError("Eroare la Salvare", err.message);
            }
            return false;
        }
    };

    const confirmDelete = async (id: string) => {
        if (!supabase) return;
        setIsDeleting(true);
        try {
            // Check if any sportivi are assigned to this club
            const { count, error: checkError } = await supabase.from('sportivi').select('id', { count: 'exact', head: true }).eq('club_id', id);
            if (checkError) throw checkError;
            if (count && count > 0) {
                throw new Error(`Nu se poate șterge: ${count} sportivi sunt asignați acestui club.`);
            }

            const { error } = await supabase.from('cluburi').delete().eq('id', id);
            if (error) throw error;
            clearCache('cache_clubs'); // Invalidează cache-ul local — ștergerea trebuie să persiste la re-fetch
            setClubs(prev => prev.filter(c => c.id !== id));
            showSuccess("Succes", "Clubul a fost șters.");
        } catch (err: any) {
            showError("Eroare la ștergere", err.message);
        } finally {
            setIsDeleting(false);
            setClubToDelete(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl md:text-3xl font-bold text-white">Gestiune Cluburi</h1>
                {permissions.isSuperAdmin && (
                    <Button onClick={() => { setClubToEdit(null); setIsModalOpen(true); }} variant="info">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Club
                    </Button>
                )}
            </div>
            {(clubs || []).length === 0 ? (
                <Card className="text-center p-8">
                    <p className="text-slate-400 italic">Nu există cluburi înregistrate. Adăugați primul club — formularul creează automat și primul admin al clubului. Folosiți butonul de mai sus.</p>
                </Card>
            ) : (
                <>
                    {/* Tabel desktop */}
                    <Card className="p-0 overflow-hidden hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                                        <th className="p-4 font-semibold">Nume</th>
                                        <th className="p-4 font-semibold">Oraș</th>
                                        <th className="p-4 font-semibold">CIF</th>
                                        <th className="p-4 font-semibold text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {(clubs || []).map(club => (
                                        <tr key={club.id} className="hover:bg-[var(--t-table-row-hover)] transition-colors">
                                            <td className="p-4 font-medium text-white">{club.id === FEDERATIE_ID ? FEDERATIE_NAME : club.nume}</td>
                                            <td className="p-4 text-slate-300">{club.oras || '-'}</td>
                                            <td className="p-4 text-slate-300 font-mono text-sm">{club.cif || '-'}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        type="button"
                                                        title="Gestionează utilizatorii acestui club"
                                                        onClick={() => navigateRoot('user-management')}
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        <UsersIcon className="w-4 h-4 mr-1" />
                                                        <span className="hidden lg:inline">Utilizatori</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={club.id === FEDERATIE_ID || !permissions.isSuperAdmin}
                                                        onClick={() => { setClubToEdit(club); setIsModalOpen(true); }}
                                                        variant="primary"
                                                        size="sm"
                                                        title="Editează club"
                                                    >
                                                        <EditIcon />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={club.id === FEDERATIE_ID || !permissions.isSuperAdmin}
                                                        onClick={() => setClubToDelete(club)}
                                                        variant="danger"
                                                        size="sm"
                                                        title="Șterge club"
                                                    >
                                                        <TrashIcon />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Carduri mobile */}
                    <div className="md:hidden space-y-3">
                        {(clubs || []).map(club => (
                            <Card key={club.id} className="border-l-4 border-sky-500">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-base truncate">
                                            {club.id === FEDERATIE_ID ? FEDERATIE_NAME : club.nume}
                                        </p>
                                        <p className="text-sm text-slate-400">{club.oras || 'Oraș necunoscut'}</p>
                                        {club.cif && (
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">CIF: {club.cif}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-[var(--t-border)]">
                                    <Button
                                        type="button"
                                        onClick={() => navigateRoot('user-management')}
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1 justify-center"
                                    >
                                        <UsersIcon className="w-4 h-4 mr-1" /> Utilizatori
                                    </Button>
                                    {permissions.isSuperAdmin && club.id !== FEDERATIE_ID && (
                                        <>
                                            <Button
                                                type="button"
                                                onClick={() => { setClubToEdit(club); setIsModalOpen(true); }}
                                                variant="primary"
                                                size="sm"
                                                className="flex-1 justify-center"
                                            >
                                                <EditIcon className="w-4 h-4 mr-1" /> Editează
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => setClubToDelete(club)}
                                                variant="danger"
                                                size="sm"
                                            >
                                                <TrashIcon />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}
            <ClubFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                clubToEdit={clubToEdit}
                adminError={adminError}
                clubCreatNume={pendingAdmin?.clubNume ?? null}
                onRetryAdmin={handleRetryAdmin}
                retryLoading={retryLoading}
            />
            {credentiale && (
                <CredentialeContModal
                    isOpen={true}
                    onClose={() => setCredentiale(null)}
                    email={credentiale.email}
                    parola={credentiale.parola}
                    numeSportiv={credentiale.numeSportiv}
                />
            )}
            <ConfirmDeleteModal isOpen={!!clubToDelete} onClose={() => setClubToDelete(null)} onConfirm={() => { if (clubToDelete) confirmDelete(clubToDelete.id); }} tableName="Club" isLoading={isDeleting} />
        </div>
    );
};
