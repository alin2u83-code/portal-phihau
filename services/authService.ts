import { supabase } from '../supabaseClient';

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
        const { data, error } = await supabase.auth.signUp({
            email: params.email,
            password: params.parola,
            options: {
                data: {
                    nume: params.nume,
                    prenume: params.prenume,
                    full_name: `${params.prenume} ${params.nume}`
                }
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (data.user) {
            return { success: true, user: data.user };
        }

        return { success: false, error: 'Nu s-a putut crea contul. Vă rugăm reîncercați.' };
    } catch (error: any) {
        return { success: false, error: error.message || 'A apărut o eroare neașteptată la înregistrare.' };
    }
};
