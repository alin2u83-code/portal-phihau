import { useCallback, useState } from 'react';

// Memorie de sesiune (modul-level): supraviețuiește demontării componentelor la schimbarea meniului,
// dar se pierde la închiderea/reîncărcarea aplicației.
const memorie = new Map<string, unknown>();

/** `useState` care își amintește valoarea per `cheie` cât timp aplicația rămâne deschisă. */
export function useMemorieSesiune<T>(cheie: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
    const [valoare, setValoare] = useState<T>(() => (memorie.has(cheie) ? (memorie.get(cheie) as T) : initial));
    const seteaza = useCallback((v: T | ((prev: T) => T)) => {
        setValoare(prev => {
            const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
            memorie.set(cheie, next);
            return next;
        });
    }, [cheie]);
    return [valoare, seteaza];
}
