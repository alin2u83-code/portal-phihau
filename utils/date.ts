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
