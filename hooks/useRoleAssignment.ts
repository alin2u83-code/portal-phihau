import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Rol, Sportiv, User } from '../types';

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

    const currentUserMaxWeight = useMemo(() =>
        Math.max(0, ...currentUser.roluri.map(r => roleWeights[r.nume] || 0)),
        [currentUser.roluri, roleWeights]
    );

    const getAvailableRoles = useCallback(() => {
        return allRoles.filter(r => (roleWeights[r.nume] || 0) <= currentUserMaxWeight);
    }, [allRoles, currentUserMaxWeight, roleWeights]);

    const createAccountAndAssignRole = async (email: string, parola: string, sportivData: Partial<Sportiv>, rolesToAssign: Rol[]): Promise<{ success: boolean; sportiv?: Sportiv; error?: string }> => {
        if (!supabase) {
            return { success: false, error: "Client Supabase neconfigurat." };
        }
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                body: { email, password: parola },
            });

            if (authError || authData?.error) {
                const errorMessage = authError?.message || authData?.error;
                if (String(errorMessage).includes('User already exists')) {
                    return { success: false, error: 'Un utilizator cu acest email există deja în sistem. Asociați-l manual.' };
                }
                return { success: false, error: errorMessage || 'Eroare la crearea contului de autentificare.' };
            }
            
            const newAuthUser = authData.user;
            if (!newAuthUser) return { success: false, error: "Contul de autentificare nu a putut fi creat." };
            
            let finalSportiv: Sportiv;

            if (sportivData.id) {
                // Update existing sportiv
                const { data, error: updateError } = await supabase.from('sportivi').update({ user_id: newAuthUser.id, email, username: sportivData.username }).eq('id', sportivData.id).select('*, cluburi(*)').single();
                if (updateError) return { success: false, error: updateError.message };
                finalSportiv = data;
            } else {
                // Create new sportiv
                const newProfile = { ...sportivData, user_id: newAuthUser.id, email, status_viza_medicala: 'Expirat' as const };
                const { data, error: insertError } = await supabase.from('sportivi').insert(newProfile).select('*, cluburi(*)').single();
                if (insertError) {
                    await supabase.functions.invoke('delete-user-admin', { body: { user_id: newAuthUser.id } });
                    return { success: false, error: insertError.message };
                }
                finalSportiv = data;
            }
            
            const rolesToInsert = rolesToAssign.map(role => ({
                user_id: newAuthUser.id,
                sportiv_id: finalSportiv.id,
                club_id: finalSportiv.club_id,
                rol_denumire: role.nume,
                is_primary: role.nume === 'SPORTIV'
            }));

            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert(rolesToInsert);
            if (roleError) return { success: false, error: roleError.message };

            return { success: true, sportiv: { ...finalSportiv, roluri: rolesToAssign } };
        } catch (err: any) {
            return { success: false, error: err.message };
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
            const { data: currentRoles, error: fetchError } = await supabase
                .from('utilizator_roluri_multicont')
                .select('*')
                .eq('sportiv_id', sportiv.id);
                
            if (fetchError) throw fetchError;

            const rolesToDelete = currentRoles?.filter(cr => !finalRoleIds.some(id => allRoles.find(r => r.id === id)?.nume === cr.rol_denumire)) || [];
            if (rolesToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('utilizator_roluri_multicont')
                    .delete()
                    .in('id', rolesToDelete.map(r => r.id));
                if (deleteError) throw deleteError;
            }

            const rolesToUpsert = finalRoleIds.map(roleId => {
                const role = allRoles.find(r => r.id === roleId);
                if (!role) return null;
                const existingRole = currentRoles?.find(cr => cr.rol_denumire === role.nume);
                return {
                    id: existingRole?.id,
                    user_id: sportiv.user_id,
                    rol_denumire: role.nume,
                    club_id: sportiv.club_id,
                    sportiv_id: sportiv.id,
                };
            }).filter(Boolean);

            if (rolesToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('utilizator_roluri_multicont')
                    .upsert(rolesToUpsert as any[], { onConflict: 'user_id,rol_denumire,club_id' });
                if (upsertError) throw upsertError;
            }

            showSuccess("Succes", `Rolurile pentru ${sportiv.nume} au fost salvate!`);
            return allRoles.filter(r => finalRoleIds.includes(r.id));
        } catch (error: any) {
            console.error("Error updating roles:", error);
            showError("Eroare la schimbarea rolului", error.message);
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
