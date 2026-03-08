import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { createAccount, CreateAccountParams } from '../services/authService';
import { getAuthErrorMessage } from '../utils/error';

export function useAuth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const clearStates = () => {
        setError(null);
        setSuccess(null);
    };

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        clearStates();
        try {
            if (!supabase) throw new Error('Clientul Supabase nu este inițializat.');

            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                throw new Error(getAuthErrorMessage(authError));
            }

            return data;
        } catch (err: any) {
            setError(err.message || 'A apărut o eroare la autentificare.');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (params: CreateAccountParams) => {
        setLoading(true);
        clearStates();
        try {
            const result = await createAccount(params);
            
            if (!result.success) {
                throw new Error(result.error || 'Eroare la înregistrare.');
            }
            
            setSuccess('Cont creat cu succes! Vă rugăm să verificați email-ul pentru confirmare.');
            return result;
        } catch (err: any) {
            setError(err.message || 'A apărut o eroare la înregistrare.');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        login,
        register,
        loading,
        error,
        success,
        clearStates
    };
}
