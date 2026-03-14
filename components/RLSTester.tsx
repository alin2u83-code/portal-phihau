import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button } from './ui';

export const RLSTester: React.FC = () => {
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const log = (msg: string) => {
        setResults(prev => [...prev, msg]);
    };

    const runTests = async () => {
        setLoading(true);
        setResults([]);
        log("--- Începere Testare RLS ---");

        try {
            // 1. Test acces cluburi
            log("Testare acces tabel 'cluburi'...");
            const { data: cluburi, error: cluburiError } = await supabase.from('cluburi').select('*');
            if (cluburiError) {
                log(`❌ Eroare acces cluburi: ${cluburiError.message}`);
            } else {
                log(`✅ Succes: S-au preluat ${cluburi.length} cluburi.`);
            }

            // 2. Test acces sportivi
            log("Testare acces tabel 'sportivi'...");
            const { data: sportivi, error: sportiviError } = await supabase.from('sportivi').select('*');
            if (sportiviError) {
                log(`❌ Eroare acces sportivi: ${sportiviError.message}`);
            } else {
                log(`✅ Succes: S-au preluat ${sportivi.length} sportivi.`);
            }

            // 3. Test acces plăți
            log("Testare acces tabel 'plati'...");
            const { data: plati, error: platiError } = await supabase.from('plati').select('*');
            if (platiError) {
                log(`❌ Eroare acces plăți: ${platiError.message}`);
            } else {
                log(`✅ Succes: S-au preluat ${plati.length} plăți.`);
            }

            // 4. Test acces user_roles
            log("Testare acces tabel 'user_roles'...");
            const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
            if (rolesError) {
                log(`❌ Eroare acces user_roles: ${rolesError.message}`);
            } else {
                log(`✅ Succes: S-au preluat ${roles.length} roluri.`);
            }

        } catch (err: any) {
            log(`❌ Eroare neașteptată: ${err.message}`);
        } finally {
            log("--- Testare Finalizată ---");
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 bg-slate-900 border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4">Testare RLS (Row Level Security)</h2>
            <p className="text-slate-400 mb-6">
                Acest utilitar rulează interogări pe tabelele principale pentru a verifica politicile RLS în contextul rolului activ curent.
            </p>
            <Button onClick={runTests} disabled={loading} className="mb-6">
                {loading ? 'Se rulează testele...' : 'Rulează Testele RLS'}
            </Button>
            
            <div className="bg-black p-4 rounded-lg font-mono text-sm overflow-y-auto max-h-96">
                {results.length === 0 ? (
                    <span className="text-slate-600">Niciun rezultat. Apasă butonul pentru a rula testele.</span>
                ) : (
                    results.map((msg, idx) => (
                        <div key={idx} className={msg.startsWith('❌') ? 'text-red-400' : msg.startsWith('✅') ? 'text-green-400' : 'text-slate-300'}>
                            {msg}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};
