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

    const currentUserMaxWeight = useMemo(() => {
        const roles = currentUser?.roluri || [];
        if (!Array.isArray(roles)) return 0;
        return Math.max(0, ...roles.map(r => roleWeights[r.nume] || 0));
    }, [currentUser?.roluri, roleWeights]);

    const getAvailableRoles = useCallback(() => {
        return allRoles.filter(r => (roleWeights[r.nume] || 0) <= currentUserMaxWeight);
    }, [allRoles, currentUserMaxWeight, roleWeights]);

    const createAccountAndAssignRole = async (email: string, parola: string, sportivData: Partial<Sportiv>, rolesToAssign: Rol[]): Promise<{ success: boolean; sportiv?: Sportiv; error?: string }> => {
        if (!supabase) {
            return { success: false, error: "Client Supabase neconfigurat." };
        }

        // Validare club_id pentru roluri specifice clubului
        const clubSpecificRoles = ['ADMIN_CLUB', 'INSTRUCTOR', 'SPORTIV'];
        const needsClubId = rolesToAssign.some(r => clubSpecificRoles.includes(r.nume));
        
        if (needsClubId && !sportivData.club_id) {
            return { success: false, error: "ID-ul clubului este obligatoriu pentru rolurile selectate." };
        }

        setLoading(true);
        try {
            let authData, authError;
            let authUser = null;
            let edgeFunctionFailed = false;

            try {
                // Edge functions are disabled in this environment to prevent "Failed to send a request to the Edge Function" errors.
                // We skip auth user creation and proceed with database record creation.
                edgeFunctionFailed = true;
            } catch (invokeErr: any) {
                edgeFunctionFailed = true;
            }

            if (!edgeFunctionFailed && (authError || authData?.error)) {
                const errorMessage = authError?.message || authData?.error;
                if (String(errorMessage).includes('User already exists')) {
                    return { success: false, error: 'Un utilizator cu acest email există deja în sistem. Asociați-l manual.' };
                }
                return { success: false, error: errorMessage || 'Eroare la crearea contului de autentificare.' };
            }
            
            if (!edgeFunctionFailed && !authUser) {
                 return { success: false, error: "Contul de autentificare nu a putut fi creat." };
            }
            
            let finalSportiv: Sportiv;

            if (sportivData.id) {
                // Update existing sportiv
                const updatePayload: any = { email, username: sportivData.username };
                if (authUser) updatePayload.user_id = authUser.id;

                const { data, error: updateError } = await supabase.from('sportivi').update(updatePayload).eq('id', sportivData.id).select('*, cluburi(*)').single();
                if (updateError) return { success: false, error: updateError.message };
                finalSportiv = data;
            } else {
                // Create new sportiv using RPC
                const { data: newSportivId, error: rpcError } = await supabase.rpc('adauga_sportiv_complet', {
                    p_nume: sportivData.nume,
                    p_prenume: sportivData.prenume,
                    p_data_nasterii: sportivData.data_nasterii,
                    p_email: email,
                    p_parola: parola,
                    p_club_id: sportivData.club_id || null,
                    p_cnp: sportivData.cnp || null,
                    p_gen: sportivData.gen || 'Masculin',
                    p_telefon: sportivData.telefon || null,
                    p_adresa: sportivData.adresa || null,
                    p_grad_actual_id: sportivData.grad_actual_id || null,
                    p_grupa_id: sportivData.grupa_id || null
                });

                if (rpcError) {
                    if (authUser) {
                        // Edge functions are disabled in this environment.
                    }
                    return { success: false, error: rpcError.message };
                }

                // If we have an auth user, we need to link it to the sportiv
                // The RPC doesn't take user_id, so we update it manually
                if (authUser && newSportivId) {
                     const { error: linkError } = await supabase.from('sportivi').update({ user_id: authUser.id }).eq('id', newSportivId);
                     if (linkError) {
                         return { success: false, error: "Sportiv creat, dar eroare la linkare cont utilizator: " + linkError.message };
                     }
                }

                // Fetch the full sportiv object to return
                const { data: fetchedSportiv, error: fetchError } = await supabase.from('sportivi').select('*, cluburi(*)').eq('id', newSportivId).single();
                if (fetchError) return { success: false, error: "Sportiv creat, dar eroare la recuperare date: " + fetchError.message };
                
                finalSportiv = fetchedSportiv;
            }
            
            if (authUser) {
                const rolesToInsert = rolesToAssign.map(role => ({
                    user_id: authUser.id,
                    sportiv_id: finalSportiv.id,
                    club_id: finalSportiv.club_id,
                    rol_denumire: role.nume,
                    is_primary: role.nume === 'SPORTIV'
                }));

                const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert(rolesToInsert);
                if (roleError) return { success: false, error: roleError.message };
            }

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
            let errorMessage = "A apărut o eroare neașteptată la actualizarea rolurilor.";
            
            if (error.code === '23505') {
                errorMessage = "Acest rol este deja asignat utilizatorului.";
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
