/**
 * Generator de parolă temporară criptografic aleatoare (D-05).
 *
 * NOTĂ DE SECURITATE: parola generată aici este afișată o singură dată către
 * SUPER_ADMIN (D-06) — nu se stochează niciodată în clar (nici în DB, nici în
 * localStorage) și nu se loghează nicăieri (console.log/console.error/console.warn).
 *
 * Sursă de entropie: Web Crypto API (`crypto.getRandomValues`) — NU generatorul
 * pseudo-aleator implicit din JavaScript (PRNG neadecvat pentru secrete).
 * Folosește rejection sampling pentru a elimina modulo bias la mapping-ul
 * index aleator -> alfabet.
 */

/** Lungime minimă acceptată pentru o parolă generată. */
export const LUNGIME_MINIMA_PAROLA = 12;

// Alfabete fără caractere ambigue (I/l, O/o/0, 1) — reduce erori de citire/copiere manuală.
const MAJUSCULE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // fără I, O
const MINUSCULE = 'abcdefghijkmnpqrstuvwxyz'; // fără l, o
const CIFRE = '23456789'; // fără 0, 1
const SIMBOLURI = '!@#$%^&*-_=+?';

const ALFABET_COMPLET = MAJUSCULE + MINUSCULE + CIFRE + SIMBOLURI;

/**
 * Returnează un index aleator uniform distribuit în [0, limita) folosind
 * crypto.getRandomValues cu rejection sampling (elimină modulo bias).
 */
function indexAleator(limita: number): number {
    const prag = Math.floor(0xFFFFFFFF / limita) * limita;
    let valoare: number;
    do {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        valoare = buffer[0];
    } while (valoare >= prag);
    return valoare % limita;
}

/**
 * Amestecă un array in-place folosind Fisher-Yates cu indexAleator (NU
 * Array.prototype.sort cu comparator aleator — distribuție neuniformă).
 */
function amestecaFisherYates<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = indexAleator(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generează o parolă temporară criptografic aleatoare.
 *
 * @param lungime Lungimea parolei (implicit 16). Trebuie să fie >= LUNGIME_MINIMA_PAROLA.
 * @throws {Error} dacă `lungime` e sub LUNGIME_MINIMA_PAROLA.
 *
 * Garantează cel puțin un caracter din fiecare clasă (majusculă, minusculă,
 * cifră, simbol) și amestecă poziția finală astfel încât clasa de caractere
 * nu e previzibilă din poziție. Alfabetul concatenat are 69 de caractere —
 * pentru lungimea implicită de 16, entropia e ≈ 97 biți.
 */
export function genereazaParolaTemporara(lungime: number = 16): string {
    if (lungime < LUNGIME_MINIMA_PAROLA) {
        throw new Error(`Lungimea parolei trebuie să fie de cel puțin ${LUNGIME_MINIMA_PAROLA} caractere.`);
    }

    const caractere: string[] = [
        MAJUSCULE[indexAleator(MAJUSCULE.length)],
        MINUSCULE[indexAleator(MINUSCULE.length)],
        CIFRE[indexAleator(CIFRE.length)],
        SIMBOLURI[indexAleator(SIMBOLURI.length)],
    ];

    for (let i = caractere.length; i < lungime; i++) {
        caractere.push(ALFABET_COMPLET[indexAleator(ALFABET_COMPLET.length)]);
    }

    return amestecaFisherYates(caractere).join('');
}
