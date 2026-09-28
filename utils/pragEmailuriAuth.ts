import type { TipEmailAuth } from '../types';

export type NivelPrag = 'normal' | 'atentie' | 'depasit';

export const PROCENT_ATENTIE = 80;

/** Calculează nivelul pragului atins (D-06). */
export function calculeazaNivelPrag(trimise: number, prag: number): NivelPrag {
    if (prag <= 0) return 'normal';
    if (trimise >= prag) return 'depasit';
    if (trimise * 100 >= prag * PROCENT_ATENTIE) return 'atentie';
    return 'normal';
}

/** Procentul din prag atins, neplafonat la 100. */
export function calculeazaProcentPrag(trimise: number, prag: number): number {
    if (prag <= 0) return 0;
    return Math.round((trimise / prag) * 100);
}

/** Cel mai grav dintre două niveluri. */
export function nivelMaxim(a: NivelPrag, b: NivelPrag): NivelPrag {
    const ordine: Record<NivelPrag, number> = { normal: 0, atentie: 1, depasit: 2 };
    return ordine[a] >= ordine[b] ? a : b;
}

export const ETICHETE_TIP_EMAIL_AUTH: Record<TipEmailAuth, string> = {
    reset_parola: 'Resetare parolă',
    confirmare_cont: 'Confirmare cont',
    cod_mfa: 'Cod MFA',
    schimbare_email: 'Schimbare email',
};
