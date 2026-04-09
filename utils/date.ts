/**
 * Normalizează un string de dată din CSV în format ISO YYYY-MM-DD.
 * Acceptă: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY.
 * Returnează null dacă data este invalidă sau lipsă.
 */
export function normalizeDate(dateStr: string | undefined | null): string | null {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const date = new Date(trimmed);
        return isNaN(date.getTime()) ? null : trimmed;
    }

    const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (match) {
        const [, d, m, y] = match;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        const isoDate = `${y}-${month}-${day}`;
        const date = new Date(isoDate);
        if (!isNaN(date.getTime())) {
            if (date.getFullYear() === +y && date.getMonth() + 1 === +m && date.getDate() === +d) {
                return isoDate;
            }
        }
    }
    return null;
}

/**
 * Formatează un string de timp (HH:MM:SS sau HH:MM) la formatul HH:MM.
 * Folosit pentru a elimina secunde din timpii returnați de PostgreSQL.
 */
export const formatTime = (time: string | null | undefined): string => {
    if (!time) return '';
    // PostgreSQL returnează TIME ca "HH:MM:SS" — tăiem la primele 5 caractere
    return time.slice(0, 5);
};

export const getAge = (dateString: string | null | undefined): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(birthDate.getTime())) { return 0; }
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};
