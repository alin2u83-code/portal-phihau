import React from 'react';
import { RowStatus } from './types';

export const KNOWN_COLS: Record<string, string> = {
    'CNP': 'CNP',
    'DATA NASTERII': 'Data nașterii',
    'GEN': 'Gen',
    'ADRESA': 'Adresă',
    'LOCUL NASTERII': 'Localitate naștere',
    'NR. PASAPORT SPORTIV': 'Nr. legitimație',
    'CETATENIA': 'Cetățenie',
    'TELEFON': 'Telefon',
};

export const COL_TO_DB: Record<string, string> = {
    'CNP': 'cnp',
    'DATA NASTERII': 'data_nasterii',
    'GEN': 'gen',
    'ADRESA': 'adresa',
    'LOCUL NASTERII': 'locul_nasterii',
    'NR. PASAPORT SPORTIV': 'nr_legitimatie',
    'CETATENIA': 'cetatenia',
    'TELEFON': 'telefon',
};

export const LOCKED_COLS = ['NUME SPORTIV', 'PRENUME SPORTIV'];

export const formatDateForDisplay = (isoDate: string | null): string => {
    if (!isoDate) return '—';
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return isoDate;
};

export const downloadTemplate = () => {
    const csvContent = "Nr.crt,NUME SPORTIV,PRENUME SPORTIV,CATEGORIE SPORTIV ,SEX,CNP,DATA NASTERII,JUDETUL,LOCUL NASTERII,ADRESA, NR. PASAPORT SPORTIV ,CETATENIA,JUDET UNDE ESTE INREGISTRAT CLUBUL,DENUMIRE CLUB,DEPARTAMENT,MAESTRU EMERIT AL SPORTULUI /MAESTRU AL SPORTULUI DA/NU,TELEFON,GEN\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_sportivi.csv';
    a.click();
};

export const getStatusBadge = (status: RowStatus): React.ReactElement => {
    switch (status) {
        case 'NOU':
            return <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">NOU</span>;
        case 'ACTUALIZARE_AUTO':
            return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">ACTUALIZARE AUTO</span>;
        case 'POSIBIL_DUPLICAT':
            return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">POSIBIL DUPLICAT</span>;
        case 'EROARE':
            return <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">EROARE</span>;
        case 'OMIS':
            return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">OMIS</span>;
    }
};
