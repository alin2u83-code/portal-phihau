/**
 * Verifică dacă o parolă apare în baza de date HaveIBeenPwned.
 * Folosește API-ul k-anonymity — parola completă nu este trimisă niciodată extern.
 * Doar primele 5 caractere ale hash-ului SHA-1 sunt trimise.
 */
export async function checkLeakedPassword(password: string): Promise<{ leaked: boolean; count: number }> {
    // 1. Calculează SHA-1 hash al parolei folosind Web Crypto API (nativ în browser)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // 2. Trimite doar primele 5 caractere (k-anonymity)
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    // 3. Interogează API-ul HIBP
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' }
    });

    if (!response.ok) {
        // Dacă API-ul nu răspunde, nu blocăm utilizatorul (fail open)
        return { leaked: false, count: 0 };
    }

    const text = await response.text();

    // 4. Caută suffix-ul în răspuns (format: SUFFIX:COUNT)
    const lines = text.split('\n');
    for (const line of lines) {
        const [hashSuffix, countStr] = line.split(':');
        if (hashSuffix.trim() === suffix) {
            return { leaked: true, count: parseInt(countStr.trim(), 10) };
        }
    }

    return { leaked: false, count: 0 };
}
