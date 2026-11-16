import { supabase } from '../supabaseClient';
import { getAuthErrorMessage } from '../utils/error';
import { PHI_HAU_IASI_CLUB_ID, DEBUTANT_GRAD_ID } from '../constants';
import { inregistreazaEmailAuth } from './authEmailAuditService';
import { revocaDispozitiveIncredere } from './emailMfaService';

// Faza 43: reset parola prin cod pe email (DEC-COD), folosit de LoginPage si de zona externa; prima setare a parolei = acelasi flux.
export const trimiteCodResetParola = async (email: string): Promise<{ error: any }> => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        inregistreazaEmailAuth('reset_parola', !error);
        return { error };
    } catch (e) {
        inregistreazaEmailAuth('reset_parola', false);
        return { error: e };
    }
};

export const reseteazaParolaCuCod = async (
    email: string,
    cod: string,
    parolaNoua: string,
): Promise<{ user: any | null; error: any; etapa: 'cod' | 'parola' | null; dispozitiveRevocate?: boolean }> => {
    const { data: verif, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cod.trim(),
        type: 'recovery',
    });
    if (verifyError || !verif?.user) return { user: null, error: verifyError, etapa: 'cod' };

    const { data, error: updateError } = await supabase.auth.updateUser({ password: parolaNoua });
    if (updateError) {
        await supabase.auth.signOut({ scope: 'local' }); // nu lasa sesiune de recovery fara parola
        return { user: null, error: updateError, etapa: 'parola' };
    }

    // parola schimbata => dispozitivele de incredere nu mai sunt valide; apelantul avertizeaza daca revocarea a esuat
    const revocate = await revocaDispozitiveIncredere();
    // parola schimbata => inchide si sesiunile deschise pe alte dispozitive (sesiunea curenta ramane)
    let altele = false;
    try { altele = !(await supabase.auth.signOut({ scope: 'others' })).error; } catch { altele = false; }
    const dispozitiveRevocate = revocate && altele;
    return { user: data.user, error: null, etapa: null, dispozitiveRevocate };
};

export interface CreateAccountParams {
    email: string;
    parola: string;
    nume: string;
    prenume: string;
}

export interface CreateAccountResult {
    success: boolean;
    user?: any;
    error?: string;
}

export const createAccount = async (params: CreateAccountParams): Promise<CreateAccountResult> => {
    if (!supabase) {
        return { success: false, error: 'Clientul Supabase nu este configurat.' };
    }

    try {
        const { data: existingSportiv, error: sportivError } = await supabase
            .from('sportivi')
            .select('id, club_id, user_id')
            .eq('email', params.email)
            .maybeSingle();

        if (sportivError) {
            throw sportivError;
        }

        if (existingSportiv && existingSportiv.user_id) {
            return { success: false, error: 'Acest email este deja asociat unui cont activ.' };
        }

        let clubId = existingSportiv?.club_id || PHI_HAU_IASI_CLUB_ID;
        let finalEmail = params.email;

        if (existingSportiv) {
            const tempEmail = `temp_${Date.now()}_${finalEmail}`;
            await supabase.from('sportivi').update({ email: tempEmail }).eq('id', existingSportiv.id);
        }

        const { data, error } = await supabase.auth.signUp({
            email: finalEmail,
            password: params.parola,
            options: {
                data: {
                    nume: params.nume,
                    prenume: params.prenume,
                    first_name: params.nume,
                    last_name: params.prenume,
                    full_name: `${params.prenume} ${params.nume}`,
                    username: finalEmail.split('@')[0],
                    club_id: clubId,
                    data_nasterii: '1900-01-01',
                    status: 'Activ',
                    data_inscrierii: new Date().toISOString().split('T')[0],
                    gen: 'Masculin'
                }
            }
        });

        // Contorizare D-06: emailul de confirmare pleacă doar dacă "Confirm email"
        // e activ în Supabase — contorizăm apelul, nu livrarea.
        inregistreazaEmailAuth('confirmare_cont', !error);

        if (error) {
            if (existingSportiv) {
                await supabase.from('sportivi').update({ email: finalEmail }).eq('id', existingSportiv.id);
            }
            return { success: false, error: getAuthErrorMessage(error) };
        }

        if (data.user) {
            if (existingSportiv) {
                await supabase.from('sportivi').update({ user_id: data.user.id, email: finalEmail }).eq('id', existingSportiv.id);

                // Inserează rolul pentru sportivul existent
                await supabase.from('utilizator_roluri_multicont').upsert({
                    user_id: data.user.id,
                    sportiv_id: existingSportiv.id,
                    club_id: clubId,
                    rol_denumire: 'SPORTIV',
                    is_primary: true,
                }, { onConflict: 'user_id,sportiv_id', ignoreDuplicates: true });
            } else {
                // Check if trigger created it
                const { data: triggerProfile } = await supabase
                    .from('sportivi')
                    .select('id')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                let sportivId: string | null = triggerProfile?.id ?? null;

                if (!triggerProfile) {
                    const { data: inserted, error: insertError } = await supabase.from('sportivi').insert({
                        user_id: data.user.id,
                        nume: params.nume,
                        prenume: params.prenume,
                        email: finalEmail,
                        club_id: clubId,
                        grad_actual_id: DEBUTANT_GRAD_ID,
                        data_nasterii: '1900-01-01',
                        data_inscrierii: new Date().toISOString().split('T')[0],
                        status: 'Activ',
                        trebuie_schimbata_parola: true,
                    }).select('id').single();

                    if (!insertError && inserted) {
                        sportivId = inserted.id;
                        await supabase.from('istoric_grade').insert({
                            sportiv_id: inserted.id,
                            grad_id: DEBUTANT_GRAD_ID,
                            data_obtinere: new Date().toISOString().split('T')[0],
                            observatii: 'Înregistrare cont'
                        });
                    }
                }

                // Inserează rolul pentru sportivul nou creat (trigger sau manual)
                if (sportivId) {
                    await supabase.from('utilizator_roluri_multicont').upsert({
                        user_id: data.user.id,
                        sportiv_id: sportivId,
                        club_id: clubId,
                        rol_denumire: 'SPORTIV',
                        is_primary: true,
                    }, { onConflict: 'user_id,sportiv_id', ignoreDuplicates: true });
                }
            }
            return { success: true, user: data.user };
        }

        if (existingSportiv) {
            await supabase.from('sportivi').update({ email: finalEmail }).eq('id', existingSportiv.id);
        }
        return { success: false, error: 'Nu s-a putut crea contul. Vă rugăm reîncercați.' };
    } catch (error: any) {
        return { success: false, error: getAuthErrorMessage(error) };
    }
};
