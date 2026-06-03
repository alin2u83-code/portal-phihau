import { SportivCard, PereacheDuplicat } from './types';

export const normalizeazaNume = (s: string): string =>
    s.toLowerCase()
     .normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/\s+/g, ' ').trim();

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

export const suntSimilare = (a: SportivCard, b: SportivCard): { similar: boolean; score: number; motiv: string } => {
    const na = normalizeazaNume(`${a.prenume} ${a.nume}`);
    const nb = normalizeazaNume(`${b.prenume} ${b.nume}`);
    const naInv = normalizeazaNume(`${a.nume} ${a.prenume}`);

    if (a.cnp && b.cnp && a.cnp === b.cnp)
        return { similar: true, score: 1.0, motiv: 'CNP identic' };

    if (na === nb) {
        if (a.data_nasterii && b.data_nasterii && a.data_nasterii === b.data_nasterii)
            return { similar: true, score: 0.98, motiv: 'Nume identic + dată naștere identică' };
        if (!a.data_nasterii || !b.data_nasterii)
            return { similar: true, score: 0.95, motiv: 'Nume identic (dată naștere lipsă)' };
        return { similar: true, score: 0.94, motiv: 'Nume identic, date naștere diferite' };
    }

    if (naInv === nb)
        return { similar: true, score: 0.90, motiv: 'Posibil prenume/nume inversate' };

    const dist = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
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
