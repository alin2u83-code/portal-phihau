import type { Grupa, Locatie } from '../../types';

// Sala afișată pentru o grupă: locația (nom_locatii) are prioritate, apoi textul legacy `grupe.sala`.
export const numeSalaGrupa = (
    grupa: Pick<Grupa, 'locatie_id' | 'sala'> | null | undefined,
    locatii: Locatie[] | null | undefined
): string | null => {
    if (!grupa) return null;
    const dinLocatie = grupa.locatie_id ? (locatii || []).find(l => l.id === grupa.locatie_id)?.nume : null;
    return dinLocatie || (grupa.sala && grupa.sala.trim()) || null;
};
