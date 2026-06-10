import { SportivCard, PereacheDuplicat } from './types';

export const normalizeazaNume = (s: string): string =>
    s.toLowerCase()
     .normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/\s+/g, ' ').trim();

export const normalizeazaTelefon = (tel?: string | null): string | null => {
    if (!tel) return null;
    const digits = tel.replace(/\D/g, '');
    // 40722... → 0722... (prefix internațional România)
    if (digits.startsWith('40') && digits.length === 11) return '0' + digits.slice(2);
    return digits.length >= 10 ? digits : null;
};

// "Horatiu Casian" → ["horatiu", "casian"]
export const tokenizeazaPrenume = (prenume: string): string[] =>
    normalizeazaNume(prenume).split(' ').filter(t => t.length >= 3);

export const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
};

export const suntSimilare = (
    a: SportivCard,
    b: SportivCard
): { similar: boolean; score: number; motiv: string } => {
    // CNP exact — identitate certă
    if (a.cnp && b.cnp && a.cnp.trim() === b.cnp.trim())
        return { similar: true, score: 1.0, motiv: 'CNP identic' };

    // Email identic
    if (a.email && b.email && a.email.toLowerCase().trim() === b.email.toLowerCase().trim())
        return { similar: true, score: 0.93, motiv: 'Email identic' };

    // Telefon identic (normalizat, ignoră spații și prefixe internaționale)
    const telA = normalizeazaTelefon(a.telefon);
    const telB = normalizeazaTelefon(b.telefon);
    if (telA && telB && telA === telB)
        return { similar: true, score: 0.88, motiv: 'Telefon identic' };

    const numeA  = normalizeazaNume(a.nume);
    const numeB  = normalizeazaNume(b.nume);
    const prenA  = normalizeazaNume(a.prenume);
    const prenB  = normalizeazaNume(b.prenume);
    const compA  = `${prenA} ${numeA}`;
    const compB  = `${prenB} ${numeB}`;
    const compAInv = `${numeA} ${prenA}`;

    // Nume complet identic
    if (compA === compB) {
        if (a.data_nasterii && b.data_nasterii && a.data_nasterii === b.data_nasterii)
            return { similar: true, score: 0.98, motiv: 'Nume identic + dată naștere identică' };
        if (!a.data_nasterii || !b.data_nasterii)
            return { similar: true, score: 0.95, motiv: 'Nume identic (dată naștere lipsă)' };
        return { similar: true, score: 0.94, motiv: 'Nume identic, date naștere diferite' };
    }

    // Prenume/Nume inversate
    if (compAInv === compB)
        return { similar: true, score: 0.90, motiv: 'Posibil prenume/nume inversate' };

    // Același surname (cu toleranță 1 caracter)
    const acelasiNume = numeA === numeB || levenshtein(numeA, numeB) <= 1;

    if (acelasiNume) {
        const tokA = tokenizeazaPrenume(a.prenume);
        const tokB = tokenizeazaPrenume(b.prenume);

        // Prenume parțial: "Casian" regăsit în "Horatiu Casian"
        const overlapToken = tokA.some(t => tokB.includes(t)) || tokB.some(t => tokA.includes(t));
        if (overlapToken) {
            if (a.data_nasterii && b.data_nasterii && a.data_nasterii === b.data_nasterii)
                return { similar: true, score: 0.93, motiv: 'Prenume parțial + dată naștere identică' };
            return { similar: true, score: 0.79, motiv: 'Prenume parțial (posibil prenume multiplu)' };
        }
    }

    // Cross-field: prenume importat = de fapt numele de familie
    // Ex: importat cu prenume="Casian" dar în DB: prenume="Horatiu", nume="Casian"
    const confuzie = prenA === numeB || numeA === prenB;
    if (confuzie && a.data_nasterii && b.data_nasterii && a.data_nasterii === b.data_nasterii)
        return { similar: true, score: 0.87, motiv: 'Posibil prenume/nume confundat + dată naștere identică' };

    // Fuzzy Levenshtein pe numele complet
    const dist = levenshtein(compA, compB);
    const maxLen = Math.max(compA.length, compB.length);
    if (dist <= 2 && maxLen >= 5) {
        const score = parseFloat((1 - dist / maxLen).toFixed(3));
        return { similar: true, score, motiv: `Nume similare (${dist} caracter${dist > 1 ? 'e' : ''} diferit${dist > 1 ? 'e' : ''})` };
    }

    return { similar: false, score: 0, motiv: '' };
};

export const detecteazaLocalDuplicate = (sportivi: SportivCard[]): PereacheDuplicat[] => {
    const perechi: PereacheDuplicat[] = [];
    const procesati = new Set<string>();

    for (let i = 0; i < sportivi.length; i++) {
        for (let j = i + 1; j < sportivi.length; j++) {
            const cheie = `${sportivi[i].id}_${sportivi[j].id}`;
            if (procesati.has(cheie)) continue;

            const { similar, score, motiv } = suntSimilare(sportivi[i], sportivi[j]);
            if (similar) {
                procesati.add(cheie);
                perechi.push({
                    id: cheie,
                    sportiv_a: sportivi[i],
                    sportiv_b: sportivi[j],
                    similarity_score: score,
                    motiv,
                    sursa: 'local',
                });
            }
        }
    }

    return perechi.sort((a, b) => b.similarity_score - a.similarity_score);
};
