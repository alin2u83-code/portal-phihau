import { supabase } from '../supabaseClient';
import { getAuthErrorMessage } from '../utils/error';
import { PHI_HAU_IASI_CLUB_ID, DEBUTANT_GRAD_ID } from '../constants';

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

        if (error) {
            if (existingSportiv) {
                await supabase.from('sportivi').update({ email: finalEmail }).eq('id', existingSportiv.id);
            }
            return { success: false, error: getAuthErrorMessage(error) };
        }

        if (data.user) {
            if (existingSportiv) {
                await supabase.from('sportivi').update({ user_id: data.user.id, email: finalEmail }).eq('id', existingSportiv.id);
            } else {
                // Check if trigger created it
                const { data: triggerProfile } = await supabase
                    .from('sportivi')
                    .select('id')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

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
                        await supabase.from('istoric_grade').insert({
                            sportiv_id: inserted.id,
                            grad_id: DEBUTANT_GRAD_ID,
                            data_obtinere: new Date().toISOString().split('T')[0],
                            observatii: 'Înregistrare cont'
                        });
                    }
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
