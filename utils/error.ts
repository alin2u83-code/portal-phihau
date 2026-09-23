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

const MESAJ_FALLBACK_UNICITATE = 'Există deja un sportiv cu aceste date. Verificați CNP-ul, emailul și numele introduse.';

export const mapeazaEroareUnicitateSportiv = (error: any): any => {
    if (!error) return error;

    const mesajOriginal: string | undefined = typeof error.message === 'string' ? error.message : undefined;
    const esteUnicitate = error.code === '23505'
        || (mesajOriginal && mesajOriginal.includes('duplicate key value violates unique constraint'));

    if (!esteUnicitate) return error;

    const numeConstrangere = mesajOriginal?.match(/constraint "([^"]+)"/)?.[1] ?? null;
    const coloane = typeof error.details === 'string'
        ? (error.details.match(/Key \((.+?)\)=\(/)?.[1] ?? '')
        : '';

    const semnal = `${numeConstrangere ?? ''} ${coloane}`.toLowerCase();

    let mesaj: string;
    if (semnal.includes('username')) {
        mesaj = 'Există deja un sportiv cu acest nume de utilizator.';
    } else if (semnal.includes('cnp')) {
        mesaj = 'Există deja un sportiv cu acest CNP.';
    } else if (semnal.includes('email')) {
        mesaj = 'Există deja un sportiv cu această adresă de email.';
    } else if (semnal.includes('legitimatie')) {
        mesaj = 'Există deja un sportiv cu acest număr de legitimație.';
    } else if (semnal.includes('unique_sportiv_phi_hau') || (semnal.includes('nume') && semnal.includes('prenume'))) {
        mesaj = 'Există deja în acest club un sportiv cu același nume, prenume și aceeași dată de naștere.';
    } else {
        mesaj = MESAJ_FALLBACK_UNICITATE;
    }

    return Object.assign(new Error(mesaj), { code: '23505', constraint: numeConstrangere });
};
