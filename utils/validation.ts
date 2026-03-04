import { Sportiv } from '../types';

export const validateSportiv = (data: Partial<Sportiv>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
    if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
    if (!data.data_nasterii) newErrors.data_nasterii = "Data nașterii este obligatorie.";
    if (!data.id && data.parola && data.parola.length < 6) newErrors.parola = "Parola trebuie să aibă minim 6 caractere.";
    return newErrors;
};
