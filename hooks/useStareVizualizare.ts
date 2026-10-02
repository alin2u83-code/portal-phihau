import React, { useState, useCallback } from 'react';

// Stare de vizualizare (tab, filtru) reținută cât timp ține sesiunea, ca la revenirea
// dintr-o altă pagină (prin traseul de navigare) utilizatorul să regăsească ce lăsase.
const memorie = new Map<string, unknown>();

export function useStareVizualizare<T>(cheie: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [valoare, setValoare] = useState<T>(() => (memorie.has(cheie) ? (memorie.get(cheie) as T) : initial));

    const seteaza = useCallback((v: React.SetStateAction<T>) => {
        setValoare(prev => {
            const urmator = v instanceof Function ? v(prev) : v;
            memorie.set(cheie, urmator);
            return urmator;
        });
    }, [cheie]);

    return [valoare, seteaza];
}
