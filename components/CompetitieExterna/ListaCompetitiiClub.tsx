import React, { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Badge } from '../ui';
import { fmtDate, TipuriLabelsContext } from '../Competitii/constants';
import { incarcaCompetitiiClub } from '../../services/accesExternService';
import { faraRetryPeAuth } from './ExternDataProvider';
import type { Competitie } from '../../types';

interface ListaCompetitiiClubProps {
    clubId: string;
    onAlege: (c: Competitie, istoric: boolean) => void;
}

const CardCompetitie: React.FC<{ c: Competitie; istoric: boolean; onAlege: ListaCompetitiiClubProps['onAlege'] }> = ({ c, istoric, onAlege }) => {
    const labels = useContext(TipuriLabelsContext);
    const deschise = c.status === 'inscrieri_deschise';
    return (
        <Card className="space-y-2">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{c.denumire}</h3>
                {istoric ? <Badge variant="slate">Doar citire</Badge> : <Badge variant={deschise ? 'green' : 'amber'}>{deschise ? 'Înscrieri deschise' : 'Înscrieri închise'}</Badge>}
            </div>
            <p className="text-sm opacity-80">{labels.get(c.tip) ?? c.tip}</p>
            <p className="text-sm">Perioada: {fmtDate(c.data_inceput)} – {fmtDate(c.data_sfarsit)}</p>
            {c.locatie && <p className="text-sm">Locația: {c.locatie}</p>}
            <Button size="sm" variant={istoric ? 'secondary' : 'primary'} onClick={() => onAlege(c, istoric)}>
                {istoric ? 'Vezi înscrierile' : 'Deschide'}
            </Button>
        </Card>
    );
};

/** Ecranul-listă al contului de club (D-09): competiții active + istoric (doar cele la care clubul a participat, D-12). */
export const ListaCompetitiiClub: React.FC<ListaCompetitiiClubProps> = ({ clubId, onAlege }) => {
    const q = useQuery({
        queryKey: ['extern', clubId, 'competitii-club'],
        retry: faraRetryPeAuth,
        queryFn: async () => {
            const { data, error } = await incarcaCompetitiiClub(clubId);
            if (error) throw error;
            return data;
        },
    });

    if (q.isLoading) return <p className="text-center text-sm">Se încarcă...</p>;
    if (q.isError || !q.data) {
        return (
            <Card className="space-y-3 text-center">
                <p>Nu am putut încărca competițiile.</p>
                <Button variant="secondary" onClick={() => { void q.refetch(); }}>Reîncearcă</Button>
            </Card>
        );
    }
    const { active, istoric } = q.data;
    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <h2 className="text-lg font-bold">Competiții active</h2>
                {active.length === 0
                    ? <Card><p className="text-sm">Nu sunt competiții active</p></Card>
                    : active.map(c => <CardCompetitie key={c.id} c={c} istoric={false} onAlege={onAlege} />)}
            </section>
            <section className="space-y-3">
                <h2 className="text-lg font-bold">Istoric competiții</h2>
                {istoric.length === 0
                    ? <Card><p className="text-sm">Clubul nu are participări la competiții încheiate.</p></Card>
                    : istoric.map(c => <CardCompetitie key={c.id} c={c} istoric onAlege={onAlege} />)}
            </section>
        </div>
    );
};
