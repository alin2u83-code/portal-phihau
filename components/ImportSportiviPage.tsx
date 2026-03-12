import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export const ImportSportiviPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [existingSportivi, setExistingSportivi] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);

    useEffect(() => {
        const fetchSportivi = async () => {
            const { data } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii');
            if (data) setExistingSportivi(data);
        };
        fetchSportivi();
    }, []);

    const downloadTemplate = () => {
        const csvContent = "Nr.crt,NUME SPORTIV,PRENUME SPORTIV,CATEGORIE SPORTIV ,SEX,CNP,DATA NASTERII,JUDETUL,LOCUL NASTERII,ADRESA, NR. PASAPORT SPORTIV ,CETATENIA,JUDET UNDE ESTE INREGISTRAT CLUBUL,DENUMIRE CLUB,DEPARTAMENT,MAESTRU EMERIT AL SPORTULUI /MAESTRU AL SPORTULUI DA/NU\n";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_sportivi.csv';
        a.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const levenshteinDistance = (a: string, b: string): number => {
        const tmp = [];
        for (let i = 0; i <= a.length; i++) tmp[i] = [i];
        for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                tmp[i][j] = Math.min(
                    tmp[i - 1][j] + 1,
                    tmp[i][j - 1] + 1,
                    tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                );
            }
        }
        return tmp[a.length][b.length];
    };

    const isSimilar = (a: string, b: string): boolean => {
        const dist = levenshteinDistance(a.toLowerCase().trim(), b.toLowerCase().trim());
        const maxLength = Math.max(a.length, b.length);
        if (maxLength === 0) return true;
        // Allow at most 1 typo for short names, 2 for longer ones
        const threshold = maxLength < 5 ? 1 : 2;
        return dist <= threshold;
    };

    const handleImport = async () => {
        if (!file) return;
        setImporting(true);
        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const newMatches: any[] = [];
                const toImport: any[] = [];

                results.data.forEach((row: any) => {
                    const numeCSV = row['NUME SPORTIV']?.trim() || '';
                    const prenumeCSV = row['PRENUME SPORTIV']?.trim() || '';
                    const dataNasteriiCSV = row['DATA NAȘTERII'];

                    // Potrivire 1: Nume (fuzzy) + Prenume (fuzzy) + Data Nașterii (exact)
                    const match1 = existingSportivi.find(s => 
                        isSimilar(s.nume, numeCSV) &&
                        isSimilar(s.prenume, prenumeCSV) &&
                        s.data_nasterii === dataNasteriiCSV
                    );

                    // Potrivire 2: Nume (fuzzy) + Prenume (fuzzy)
                    const match2 = existingSportivi.find(s => 
                        isSimilar(s.nume, numeCSV) &&
                        isSimilar(s.prenume, prenumeCSV)
                    );

                    if (match1) {
                        newMatches.push({ type: 'strict', csvRow: row, existingSportiv: match1 });
                    } else if (match2) {
                        newMatches.push({ type: 'loose', csvRow: row, existingSportiv: match2 });
                    } else {
                        toImport.push({
                            nume: row['NUME SPORTIV'],
                            prenume: row['PRENUME SPORTIV'],
                            cnp: row['CNP'],
                            data_nasterii: row['DATA NAȘTERII'],
                            adresa: row['ADRESA: LOCALITATE, STRADA, NR., BLOC, ETC.'],
                            locul_nasterii: row['LOCUL NAȘTERII'],
                            cetatenia: row['CETĂȚENIA'],
                            departament: row['DEPARTAMENT'],
                            nr_legitimatie: row['NR. PAȘAPORT SPORTIV/NU ARE '],
                            status: 'Activ',
                            data_inscrierii: new Date().toISOString().split('T')[0],
                        });
                    }
                });

                setMatches(newMatches);

                if (toImport.length > 0) {
                    const { error } = await supabase.from('sportivi').insert(toImport);
                    if (error) toast.error("Eroare la import: " + error.message);
                    else toast.success(`Importat ${toImport.length} sportivi noi.`);
                }
                setImporting(false);
            }
        });
    };

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Import Sportivi</h2>
            <div className="space-y-4">
                <Button onClick={downloadTemplate}>Descarcă Template CSV</Button>
                <input type="file" accept=".csv" onChange={handleFileChange} />
                <Button onClick={handleImport} isLoading={importing}>Importă</Button>
                <Button variant="secondary" onClick={onBack}>Înapoi</Button>
            </div>
            {matches.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-lg font-bold text-red-500">Sportivi găsiți deja (necesită decizie):</h3>
                    <ul>
                        {matches.map((m, i) => (
                            <li key={i} className="text-white">
                                {m.csvRow['NUME SPORTIV']} {m.csvRow['PRENUME SPORTIV']} ({m.csvRow['DATA NAȘTERII']}) - 
                                {m.type === 'strict' ? ' (Potrivire exactă)' : ' (Potrivire doar nume/prenume)'}
                                Seamănă cu: {m.existingSportiv.nume} {m.existingSportiv.prenume}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
};
