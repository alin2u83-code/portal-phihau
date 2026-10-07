import { Sportiv } from '../types';
import { calculeazaVarstaLaData } from './eligibilitateCompetitie';
import { valideazaParola } from './parola';

export const validateSportiv = (data: Partial<Sportiv>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!data.nume?.trim()) newErrors.nume = "Numele este obligatoriu.";
    if (!data.prenume?.trim()) newErrors.prenume = "Prenumele este obligatoriu.";
    if (!data.data_nasterii) newErrors.data_nasterii = "Data nașterii este obligatorie.";
    if (!data.id && data.parola) {
        const validare = valideazaParola(data.parola);
        if (!validare.valid) newErrors.parola = validare.mesaj!;
    }

    if (data.data_nasterii) {
        const varsta = calculeazaVarstaLaData(data.data_nasterii, new Date().toISOString().split('T')[0]);
        // Doar la adaugare: sportivii existenti (ex. importati) fara consimtamant nu trebuie sa blocheze
        // salvarea altor modificari (grupa etc.) — butonul disabled + eroare ascunsa pe alt tab = "nu se intampla nimic".
        if (!data.id && varsta < 16 && !data.consimtamant_parinte_nume?.trim()) {
            newErrors.consimtamant_parinte_nume = "Consimțământul părintelui/tutorelui este obligatoriu pentru sportivii sub 16 ani.";
        }
    }

    return newErrors;
};
