import React, { useMemo } from 'react';
import { User, IstoricPlataDetaliat } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, DownloadIcon } from './icons';

interface IstoricPlatiProps {
    viewedUser: User;
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    onBack: () => void;
}

export const IstoricPlati: React.FC<IstoricPlatiProps> = ({ viewedUser, istoricPlatiDetaliat, onBack }) => {
    const userPlati = useMemo(() => {
        return istoricPlatiDetaliat
            .filter(p => p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id))
            .sort((a, b) => new Date(b.data_emitere).getTime() - new Date(a.data_emitere).getTime());
    }, [viewedUser, istoricPlatiDetaliat]);

    const totalRestant = useMemo(() => {
        // Group by plata_id to avoid double counting if multiple transactions exist for one payment
        const uniquePlati = new Map<string, number>();
        userPlati.forEach(p => {
            uniquePlati.set(p.plata_id, p.rest_de_plata);
        });
        return Array.from(uniquePlati.values()).reduce((sum, rest) => sum + rest, 0);
    }, [userPlati]);

    const formatDescription = (desc: string) => {
        let formatted = desc;
        // Qwan Ki Do Terminology mapping
        const terms: Record<string, string> = {
            'Examen': 'Examen Grad (Thao Quyen)',
            'Arme': 'Co Vo Dao (Arme Tradiționale)',
            'Stagiu': 'Stagiu de Pregătire',
            'Competitie': 'Competiție / Giai',
            'Abonament': 'Cotizație Lunară'
        };

        Object.entries(terms).forEach(([key, value]) => {
            if (formatted.includes(key)) {
                formatted = formatted.replace(key, value);
            }
        });
        return formatted;
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-left">
                 <h1 className="text-3xl font-bold text-white">Istoric Plăți & Tranzacții</h1>
                 <p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p>
            </header>

            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total de Plată Restant</h3>
                        <p className={`text-3xl font-bold mt-1 ${totalRestant > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {totalRestant.toFixed(2)} RON
                        </p>
                    </div>
                    <div className={`p-3 rounded-full ${totalRestant > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {totalRestant > 0 ? '⚠️' : '✅'}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4">
                {userPlati.map((p, idx) => (
                    <Card 
                        key={`${p.plata_id}-${p.tranzactie_id || idx}`}
                        className={`relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] border-l-4 ${
                            p.rest_de_plata > 0 ? 'border-l-red-500' : 'border-l-emerald-500'
                        } bg-slate-800/50 backdrop-blur-sm`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {new Date(p.data_emitere).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <h4 className="text-lg font-bold text-white leading-tight mt-1">
                                    {formatDescription(p.descriere)}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">{p.nume_complet}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-white">
                                    {p.suma_datorata.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">RON</span>
                                </p>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase mt-1 ${
                                    p.status === 'Achitat' ? 'bg-emerald-500/20 text-emerald-400' : 
                                    p.status === 'Achitat Parțial' ? 'bg-amber-500/20 text-amber-400' : 
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                    {p.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase">Rest de plată</span>
                                <span className={`font-bold ${p.rest_de_plata > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {p.rest_de_plata.toFixed(2)} RON
                                </span>
                            </div>
                            
                            {p.tranzactie_id && (
                                <Button 
                                    size="sm" 
                                    variant="info" 
                                    className="h-8 px-3 text-[11px] font-bold rounded-lg flex items-center gap-2"
                                    onClick={() => window.open(`/api/factura/${p.tranzactie_id}`, '_blank')}
                                >
                                    <DownloadIcon className="w-3 h-3" />
                                    Descarcă Factură
                                </Button>
                            )}
                        </div>

                        {p.data_plata && (
                            <div className="mt-2 text-[10px] text-slate-400 italic flex items-center gap-1">
                                <span>Ultima încasare:</span>
                                <span className="text-slate-300 font-medium">{new Date(p.data_plata).toLocaleDateString('ro-RO')}</span>
                                <span className="mx-1">•</span>
                                <span className="text-slate-300 font-medium">{p.suma_incasata?.toFixed(2)} RON</span>
                                <span className="mx-1">•</span>
                                <span className="text-slate-300 font-medium">{p.metoda_plata}</span>
                            </div>
                        )}
                    </Card>
                ))}
                {userPlati.length === 0 && (
                    <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                        <p className="text-slate-500 italic">Nu există înregistrări financiare pentru acest profil.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
