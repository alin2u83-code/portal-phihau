export const formatErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    
    // Supabase Auth Errors
    if (error?.code === 'invalid_credentials') return 'Email sau parolă incorectă.';
    if (error?.code === 'user_already_exists') return 'Acest email este deja înregistrat.';
    if (error?.code === 'weak_password') return 'Parola este prea slabă. Trebuie să aibă cel puțin 6 caractere.';
    if (error?.code === 'over_email_send_rate_limit') return 'Prea multe cereri. Vă rugăm așteptați câteva minute.';
    if (error?.message?.includes('rate limit')) return 'Prea multe încercări. Vă rugăm așteptați.';
    if (error?.message?.includes('Email not confirmed')) return 'Vă rugăm să confirmați adresa de email înainte de autentificare.';

    if (error?.message) return error.message;
    return "A apărut o eroare necunoscută.";
};

export const getAuthErrorMessage = formatErrorMessage;
