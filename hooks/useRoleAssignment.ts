import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Rol, Sportiv, User } from '../types';
import { getAuthErrorMessage } from '../utils/error';
import { PHI_HAU_IASI_CLUB_ID } from '../constants';

export const useRoleAssignment = (currentUser: User, allRoles: Rol[]) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const roleWeights: Record<string, number> = useMemo(() => ({
        'SUPER_ADMIN_FEDERATIE': 5,
        'ADMIN': 4,
        'ADMIN_CLUB': 3,
        'INSTRUCTOR': 2,
        'SPORTIV': 1,
    }), []);

    const currentUserMaxWeight = useMemo(() => {
        const roles = currentUser?.roluri || [];
        if (!Array.isArray(roles)) return 0;
        return Math.max(0, ...roles.map(r => roleWeights[r.nume] || 0));
    }, [currentUser?.roluri, roleWeights]);

    const getAvailableRoles = useCallback(() => {
        return allRoles.filter(r => (roleWeights[r.nume] || 0) <= currentUserMaxWeight);
    }, [allRoles, currentUserMaxWeight, roleWeights]);

    const createAccountAndAssignRole = async (email: string, parola: string, sportivData: Partial<Sportiv>, rolesToAssign: Rol[]): Promise<{ success: boolean; sportiv?: Sportiv; error?: string }> => {
        setLoading(true);
        try {
            // 1. Apelăm API-ul nostru securizat din backend
            const response = await fetch('/api/creare-cont', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password: parola,
                    userData: {
                        nume: sportivData.nume,
                        prenume: sportivData.prenume,
                        username: sportivData.username || email.split('@')[0],
                        club_id: sportivData.club_id || PHI_HAU_IASI_CLUB_ID,
                        data_nasterii: sportivData.data_nasterii || '1900-01-01',
                        status: sportivData.status || 'Activ',
                        data_inscrierii: sportivData.data_inscrierii || new Date().toISOString().split('T')[0],
                        gen: sportivData.gen || 'Masculin',
                        cnp: sportivData.cnp,
                        telefon: sportivData.telefon,
                        adresa: sportivData.adresa,
                        grad_actual_id: sportivData.grad_actual_id,
                        grupa_id: sportivData.grupa_id
                    },
                    roles: rolesToAssign.map(r => r.nume)
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Eroare la crearea contului.");
            }

            // 2. Recuperăm datele complete ale sportivului creat
            const { data: finalSportiv, error: fetchError } = await supabase
                .from('sportivi')
                .select('*, cluburi(*)')
                .eq('user_id', result.userId)
                .single();

            if (fetchError) throw fetchError;

            return { success: true, sportiv: { ...finalSportiv, roluri: rolesToAssign } };
        } catch (err: any) {
            console.error('Account Creation Error:', err);
            return { success: false, error: err.message || "A apărut o eroare neașteptată." };
        } finally {
            setLoading(false);
        }
    };

    const updateRoles = async (sportiv: Sportiv, newRoleIds: string[]) => {
        if (!supabase) {
            showError("Eroare", "Conexiunea la baza de date nu a putut fi stabilită.");
            return false;
        }
        if (!sportiv.user_id) {
            showError("Eroare", "Acest sportiv nu are un cont de utilizator asociat.");
            return false;
        }

        const targetUserMaxWeight = Math.max(0, ...(sportiv.roluri || []).map(r => roleWeights[r.nume] || 0));
        if (currentUserMaxWeight <= targetUserMaxWeight && currentUser.id !== sportiv.id) {
             showError("Permisiune Refuzată", "Nu puteți modifica rolurile unui utilizator cu privilegii egale sau mai mari.");
             return false;
        }

        const assignedRolesWeight = newRoleIds.map(roleId => roleWeights[allRoles.find(r => r.id === roleId)?.nume || 'SPORTIV'] || 0);
        if (assignedRolesWeight.some(weight => weight > currentUserMaxWeight)) {
            showError("Permisiune Refuzată", "Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră.");
            return false;
        }

        let finalRoleIds = [...newRoleIds];
        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (finalRoleIds.length === 0 && sportivRole) {
            finalRoleIds.push(sportivRole.id);
        }

        setLoading(true);
        try {
            // 1. Ștergem rolurile vechi pentru a permite trigger-ului să gestioneze is_primary
            const { error: deleteError } = await supabase
                .from('utilizator_roluri_multicont')
                .delete()
                .eq('sportiv_id', sportiv.id);
            if (deleteError) throw deleteError;

            // 2. Inserăm noile roluri (trigger-ul va seta is_primary corect)
            const rolesToInsert = finalRoleIds.map(roleId => {
                const role = allRoles.find(r => r.id === roleId);
                if (!role) return null;
                return {
                    user_id: sportiv.user_id,
                    rol_denumire: role.nume,
                    club_id: sportiv.club_id,
                    sportiv_id: sportiv.id,
                    is_primary: false // Trigger-ul va seta unul singur ca true
                };
            }).filter(Boolean);

            if (rolesToInsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('utilizator_roluri_multicont')
                    .upsert(rolesToInsert as any[], { onConflict: 'user_id,rol_denumire,sportiv_id' });
                if (upsertError) throw upsertError;
            }

            // 3. Sincronizare metadate
            await supabase.rpc('sync_user_metadata');

            showSuccess("Succes", `Rolurile pentru ${sportiv.nume} au fost salvate!`);
            return allRoles.filter(r => finalRoleIds.includes(r.id));
        } catch (error: any) {
            let errorMessage = "A apărut o eroare neașteptată la actualizarea rolurilor.";
            
            if (error.code === '23505') {
                errorMessage = "Conflict de unicitate. Vă rugăm să faceți un 'Reset Context' sau să contactați un administrator.";
            } else if (error.code === '42501') {
                errorMessage = "Nu aveți permisiunea necesară pentru a modifica aceste roluri.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showError("Eroare la schimbarea rolului", errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        getAvailableRoles,
        createAccountAndAssignRole,
        updateRoles,
        loading
    };
};
