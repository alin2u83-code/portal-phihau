import React, { useCallback, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { Button, Card, Badge } from '../ui';
import ErrorBoundary from '../ErrorBoundary';
import { CompetitieDetail } from '../Competitii';
import { fmtDate, TipuriLabelsContext } from '../Competitii/constants';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import { applyTheme, DEFAULT_THEME } from '../../lib/themes';
import { extrageCompetitieId, construiestePermisiuniExtern } from '../../utils/accesExtern';
import { incarcaCompetitiePublica, incarcaContexteEligibile, seteazaContextActiv, deconecteaza } from '../../services/accesExternService';
import { LoginOtp } from './LoginOtp';
import { SolicitaContForm } from './SolicitaContForm';
import { ShellExtern } from './ShellExtern';
import { ExternDataProvider } from './ExternDataProvider';
import type { Competitie, CompetitiePublica, ContextAccesExtern } from '../../types';

const CHEIE_CONTEXT = 'phi-hau-active-role-context-id';
const MSG_LINK_INVALID = 'Link invalid sau competiție indisponibilă.';

type Stare =
    | { t: 'incarcare' }
    | { t: 'link_invalid' }
    | { t: 'login' }
    | { t: 'solicita'; email: string }
    | { t: 'cerere_trimisa' }
    | { t: 'fara_acces'; email: string }
    | { t: 'alege_context'; contexte: ContextAccesExtern[]; user: any }
    | { t: 'activ'; ctx: ContextAccesExtern; contexte: ContextAccesExtern[]; user: any; competitie: Competitie }
    | { t: 'eroare'; mesaj: string };

const ROL_LABEL: Record<string, string> = {
    ADMIN_CLUB: 'Administrator club',
    INSTRUCTOR: 'Instructor',
    REPREZENTANT_COMPETITIE: 'Reprezentant',
};

const Centrat: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-[var(--t-bg)] text-[var(--t-text)] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-4">{children}</div>
    </div>
);

const CardPublic: React.FC<{ c: CompetitiePublica; tipLabel: string }> = ({ c, tipLabel }) => {
    const deschise = c.status === 'inscrieri_deschise';
    return (
        <Card className="space-y-2">
            <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg font-bold">{c.denumire}</h1>
                <Badge variant={deschise ? 'green' : 'amber'}>{deschise ? 'Înscrieri deschise' : 'Înscrieri închise'}</Badge>
            </div>
            <p className="text-sm opacity-80">{tipLabel}</p>
            <p className="text-sm">Perioada: {fmtDate(c.data_inceput)} – {fmtDate(c.data_sfarsit)}</p>
            {c.locatie && <p className="text-sm">Locația: {c.locatie}</p>}
            <p className="text-sm">Termen înscrieri: {fmtDate(c.deadline_inscrieri)}</p>
            {c.probe?.length > 0 && <p className="text-sm">Probe: {c.probe.join(', ')}</p>}
        </Card>
    );
};

const CompetitieExternaPage: React.FC = () => {
    const [id] = useState(() => extrageCompetitieId(window.location.pathname));
    const [stare, setStare] = useState<Stare>({ t: id ? 'incarcare' : 'link_invalid' });
    const [teaser, setTeaser] = useState<CompetitiePublica | null>(null);
    const { labels } = useTipuriCompetitie();

    const activeaza = useCallback(async (ctx: ContextAccesExtern, contexte: ContextAccesExtern[], user: any) => {
        if (!id) return;
        seteazaContextActiv(ctx.roleRowId); // înainte de prima citire: headerul RLS se ia din localStorage
        const { data, error } = await supabase.from('competitii').select('*').eq('id', id).maybeSingle();
        if (error || !data) {
            setStare({ t: 'eroare', mesaj: 'Competiția nu este disponibilă pentru contul tău.' });
            return;
        }
        setStare({ t: 'activ', ctx, contexte, user, competitie: data as Competitie });
    }, [id]);

    const finalizeaza = useCallback(async (user: any) => {
        if (!id) return;
        const { data: contexte, error } = await incarcaContexteEligibile(user.id, id);
        if (error) { setStare({ t: 'eroare', mesaj: 'Nu am putut verifica accesul. Încearcă din nou.' }); return; }
        if (contexte.length === 0) { setStare({ t: 'fara_acces', email: user.email ?? '' }); return; }
        if (contexte.length === 1) { await activeaza(contexte[0], contexte, user); return; }
        let salvat: string | null = null;
        try { salvat = JSON.parse(localStorage.getItem(CHEIE_CONTEXT) ?? 'null'); } catch { /* valoare invalidă */ }
        const potrivit = contexte.find(c => c.roleRowId === salvat);
        if (potrivit) await activeaza(potrivit, contexte, user);
        else setStare({ t: 'alege_context', contexte, user });
    }, [id, activeaza]);

    useEffect(() => {
        if (!id) return;
        applyTheme(DEFAULT_THEME); // ThemeProvider nu se montează în zona externă
        let anulat = false;
        (async () => {
            const [{ data: pub }, { data: sesiune }] = await Promise.all([incarcaCompetitiePublica(id), supabase.auth.getSession()]);
            if (anulat) return;
            if (!pub) { setStare({ t: 'link_invalid' }); return; }
            setTeaser(pub);
            if (sesiune.session?.user) await finalizeaza(sesiune.session.user);
            else if (!anulat) setStare({ t: 'login' });
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') setStare(s => (s.t === 'link_invalid' || s.t === 'incarcare' ? s : { t: 'login' }));
        });
        return () => { anulat = true; sub.subscription.unsubscribe(); };
    }, [id, finalizeaza]);

    const tipLabel = teaser ? (labels.get(teaser.tip) ?? teaser.tip) : '';
    const publica = teaser && id ? <CardPublic c={teaser} tipLabel={tipLabel} /> : null;

    let continut: React.ReactNode;
    switch (stare.t) {
        case 'incarcare':
            continut = <Centrat><p className="text-center text-sm">Se încarcă...</p></Centrat>;
            break;
        case 'link_invalid':
            continut = <Centrat><Card><p className="text-center">{MSG_LINK_INVALID}</p></Card></Centrat>;
            break;
        case 'login':
            continut = (
                <Centrat>
                    {publica}
                    <LoginOtp
                        onAutentificat={finalizeaza}
                        onFaraCont={email => setStare({ t: 'solicita', email })}
                        onSolicita={email => setStare({ t: 'solicita', email })}
                    />
                </Centrat>
            );
            break;
        case 'solicita':
            continut = (
                <Centrat>
                    {publica}
                    <SolicitaContForm
                        competitieId={id!}
                        emailInitial={stare.email}
                        onTrimis={() => setStare({ t: 'cerere_trimisa' })}
                        onInapoi={() => setStare({ t: 'login' })}
                    />
                </Centrat>
            );
            break;
        case 'cerere_trimisa':
            continut = (
                <Centrat>
                    {publica}
                    <Card className="space-y-3 text-center">
                        <p>Cererea a fost trimisă. Vei primi acces după ce este aprobată de organizatori.</p>
                        <Button variant="secondary" onClick={() => setStare({ t: 'login' })}>Înapoi la autentificare</Button>
                    </Card>
                </Centrat>
            );
            break;
        case 'fara_acces':
            continut = (
                <Centrat>
                    {publica}
                    <Card className="space-y-3 text-center">
                        <p>Contul tău nu are acces la această competiție. Dacă ești reprezentantul unui club, solicită acces.</p>
                        <div className="flex gap-2 justify-center">
                            <Button onClick={() => setStare({ t: 'solicita', email: stare.email })}>Solicită acces</Button>
                            <Button variant="secondary" onClick={() => { void deconecteaza(); }}>Deconectare</Button>
                        </div>
                    </Card>
                </Centrat>
            );
            break;
        case 'alege_context': {
            const { contexte, user } = stare;
            continut = (
                <Centrat>
                    {publica}
                    <Card className="space-y-3">
                        <p className="font-semibold">Alege contextul</p>
                        {contexte.map(c => (
                            <Button key={c.roleRowId} variant="secondary" className="w-full justify-start" onClick={() => { void activeaza(c, contexte, user); }}>
                                {c.clubNume} · {ROL_LABEL[c.rol] ?? c.rol}
                            </Button>
                        ))}
                        <Button variant="secondary" size="sm" onClick={() => { void deconecteaza(); }}>Deconectare</Button>
                    </Card>
                </Centrat>
            );
            break;
        }
        case 'eroare':
            continut = (
                <Centrat>
                    <Card className="space-y-3 text-center">
                        <p>{stare.mesaj}</p>
                        <Button variant="secondary" onClick={() => { void deconecteaza(); }}>Deconectare</Button>
                    </Card>
                </Centrat>
            );
            break;
        case 'activ': {
            const { ctx, contexte, user, competitie } = stare;
            continut = (
                <TipuriLabelsContext.Provider value={labels}>
                    <ErrorBoundary onNavigate={() => window.location.reload()}>
                        <ShellExtern
                            email={user.email ?? ''}
                            contexte={contexte}
                            contextActiv={ctx}
                            competitieDenumire={competitie.denumire}
                            onSchimbaContext={c => { void activeaza(c, contexte, user); }}
                            onDeconecteaza={() => { void deconecteaza(); }}
                        >
                            <ExternDataProvider
                                key={ctx.roleRowId}
                                clubId={ctx.clubId}
                                clubNume={ctx.clubNume}
                                competitieId={competitie.id}
                                userId={user.id}
                                contextId={ctx.roleRowId}
                                rol={ctx.rol}
                            >
                                <CompetitieDetail
                                    competitie={competitie}
                                    permissions={construiestePermisiuniExtern(ctx.clubId)}
                                    mode="extern"
                                    externRol={ctx.rol}
                                />
                            </ExternDataProvider>
                        </ShellExtern>
                    </ErrorBoundary>
                </TipuriLabelsContext.Provider>
            );
            break;
        }
    }

    return <><Toaster />{continut}</>;
};

export default CompetitieExternaPage;
