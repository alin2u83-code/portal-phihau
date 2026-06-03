import React, { useState } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie, User, Club, Grad, VizualizarePlata } from '../../types';
import { Button, Input, Modal } from '../ui';
import { SportivFormModal } from './SportivFormModal';
import { SportivWallet } from './SportivWallet';
import { SportivAccountSettingsModal } from './SportivAccountSettings';
import { DeleteAuditModal } from './DeleteAuditModal';
import toast from 'react-hot-toast';

interface SportivModalsProps {
    // Form Modal (Add/Edit)
    isFormModalOpen: boolean;
    onCloseFormModal: () => void;
    onSaveSportiv: (formData: Partial<Sportiv>) => Promise<{ success: boolean; error?: any; data?: Sportiv }>;
    sportivToEdit: Sportiv | null;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    grade: Grad[];
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    tipuriAbonament: TipAbonament[];
    clubs: Club[];
    currentUser: User;
    clubFilter?: string;

    // Account Settings Modal
    accountSettingsSportiv: Sportiv | null;
    onCloseAccountSettings: () => void;
    allRoles: Rol[];
    onOpenCreateAccount: (user: Sportiv) => void;

    // Create Account Modal
    sportivForAccountCreation: Sportiv | null;
    onCloseCreateAccount: () => void;
    createAccountForm: { email: string; username: string; parola: string };
    onCreateAccountFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCreateAccount: (e: React.FormEvent) => void;
    createAccountError: string;
    createAccountLoading: boolean;

    // Wallet Modal
    isWalletModalOpen: boolean;
    onCloseWalletModal: () => void;
    sportivForWallet: Sportiv | null;
    allSportivi: Sportiv[];
    vizualizarePlati: VizualizarePlata[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;

    // Delete Modal
    sportivToDelete: Sportiv | null;
    onCloseDeleteModal: () => void;
    onDeactivate: (sportiv: Sportiv) => Promise<void>;
    onDelete: (sportiv: Sportiv) => Promise<void>;

    // Reset Password Modal
    sportivForResetParola: Sportiv | null;
    onCloseResetParola: () => void;
}

export const SportivModals: React.FC<SportivModalsProps> = ({
    isFormModalOpen,
    onCloseFormModal,
    onSaveSportiv,
    sportivToEdit,
    grupe,
    setGrupe,
    grade,
    familii,
    setFamilii,
    tipuriAbonament,
    clubs,
    currentUser,
    clubFilter,
    accountSettingsSportiv,
    onCloseAccountSettings,
    allRoles,
    onOpenCreateAccount,
    sportivForAccountCreation,
    onCloseCreateAccount,
    createAccountForm,
    onCreateAccountFormChange,
    onCreateAccount,
    createAccountError,
    createAccountLoading,
    isWalletModalOpen,
    onCloseWalletModal,
    sportivForWallet,
    allSportivi,
    vizualizarePlati,
    plati,
    setPlati,
    setTranzactii,
    sportivToDelete,
    onCloseDeleteModal,
    onDeactivate,
    onDelete,
    sportivForResetParola,
    onCloseResetParola,
}) => {
    const [parolaNoua, setParolaNoua] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleResetParola = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sportivForResetParola?.user_id) {
            toast.error('Sportivul nu are un cont asociat.');
            return;
        }
        if (parolaNoua.length < 8) {
            toast.error('Parola trebuie să aibă cel puțin 8 caractere.');
            return;
        }
        setResetLoading(true);
        try {
            const res = await fetch('/api/reset-parola-sportiv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: sportivForResetParola.user_id, parola_noua: parolaNoua }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Eroare la resetarea parolei.');
            toast.success('Parola a fost resetată. Sportivul va trebui să o schimbe la prima autentificare.');
            setParolaNoua('');
            onCloseResetParola();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <>
            {isFormModalOpen && (
                 <SportivFormModal 
                    isOpen={isFormModalOpen}
                    onClose={onCloseFormModal}
                    onSave={onSaveSportiv}
                    sportivToEdit={sportivToEdit}
                    grupe={grupe}
                    setGrupe={setGrupe}
                    grade={grade}
                    familii={familii}
                    setFamilii={setFamilii}
                    tipuriAbonament={tipuriAbonament}
                    clubs={clubs}
                    currentUser={currentUser}
                    clubFilter={clubFilter}
                    allRoles={allRoles}
                />
            )}

            <SportivAccountSettingsModal
                isOpen={!!accountSettingsSportiv}
                onClose={onCloseAccountSettings}
                sportiv={accountSettingsSportiv}
                allRoles={allRoles}
                currentUser={currentUser}
                onOpenCreateAccount={onOpenCreateAccount}
            />

            {sportivForAccountCreation && (
                <Modal isOpen={!!sportivForAccountCreation} onClose={onCloseCreateAccount} title={`Creează Cont pentru ${sportivForAccountCreation.nume}`}>
                    <form onSubmit={onCreateAccount} className="space-y-4">
                        <Input label="Email (Login)" name="email" type="email" value={createAccountForm.email} onChange={onCreateAccountFormChange} required />
                        <Input label="Parolă Inițială" name="parola" type="password" value={createAccountForm.parola} onChange={onCreateAccountFormChange} required />
                        {createAccountError && <p className="text-red-400 text-sm text-center bg-red-900/50 p-2 rounded">{createAccountError}</p>}
                        <div className="flex justify-end pt-4 space-x-2">
                            <Button type="button" variant="secondary" onClick={onCloseCreateAccount} disabled={createAccountLoading}>Anulează</Button>
                            <Button type="submit" variant="success" disabled={createAccountLoading} isLoading={createAccountLoading}>Creează Cont</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isWalletModalOpen && sportivForWallet && (
                <SportivWallet
                    sportiv={sportivForWallet}
                    familie={familii.find(f => f.id === sportivForWallet.familie_id)}
                    allSportivi={allSportivi}
                    vizualizarePlati={vizualizarePlati}
                    allPlati={plati}
                    setPlati={setPlati}
                    setTranzactii={setTranzactii}
                    onClose={() => {
                        onCloseWalletModal();
                    }}
                />
            )}
            
            {sportivToDelete && (
                <DeleteAuditModal
                    isOpen={!!sportivToDelete}
                    onClose={onCloseDeleteModal}
                    sportiv={sportivToDelete}
                    onDeactivate={onDeactivate}
                    onDelete={onDelete}
                />
            )}

            {sportivForResetParola && (
                <Modal
                    isOpen={!!sportivForResetParola}
                    onClose={() => { setParolaNoua(''); onCloseResetParola(); }}
                    title={`Resetează Parola: ${sportivForResetParola.prenume} ${sportivForResetParola.nume}`}
                >
                    <form onSubmit={handleResetParola} className="space-y-4">
                        {!sportivForResetParola.user_id && (
                            <p className="text-amber-400 text-sm bg-amber-900/30 border border-amber-700/50 p-3 rounded-lg">
                                Acest sportiv nu are un cont de utilizator asociat. Nu se poate reseta parola.
                            </p>
                        )}
                        {sportivForResetParola.user_id && (
                            <>
                                <p className="text-slate-400 text-sm">
                                    Introdu o parolă temporară. Sportivul va fi obligat să o schimbe la prima autentificare.
                                </p>
                                <Input
                                    label="Parolă temporară (min. 8 caractere)"
                                    name="parola_noua"
                                    type="password"
                                    value={parolaNoua}
                                    onChange={e => setParolaNoua(e.target.value)}
                                    placeholder="min. 8 caractere"
                                    required
                                />
                            </>
                        )}
                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => { setParolaNoua(''); onCloseResetParola(); }}
                                disabled={resetLoading}
                            >
                                Anulează
                            </Button>
                            {sportivForResetParola.user_id && (
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={resetLoading}
                                    disabled={parolaNoua.length < 8}
                                >
                                    Resetează Parola
                                </Button>
                            )}
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
};
