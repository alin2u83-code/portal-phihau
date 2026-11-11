import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { Button, Card, Badge, Modal } from '../ui';
import ErrorBoundary from '../ErrorBoundary';
import { CompetitieDetail } from '../Competitii';
import { fmtDate, TipuriLabelsContext } from '../Competitii/constants';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import { applyTheme, DEFAULT_THEME } from '../../lib/themes';
import { extrageCompetitieId, esteListaZona, construiestePermisiuniExtern } from '../../utils/accesExtern';
import { incarcaCompetitiePublica, incarcaContexteEligibile, seteazaContextActiv, deconecteaza } from '../../services/accesExternService';
import { sesiuneActorCurenta, inchideSesiuneActor } from '../../services/autorModificariService';
import { AlegeActorModal } from './AlegeActorModal';
import { LoginOtp } from './LoginOtp';
import { SolicitaContForm } from './SolicitaContForm';
import { ShellExtern } from './ShellExtern';
import { ExternDataProvider } from './ExternDataProvider';
import { ListaCompetitiiClub } from './ListaCompetitiiClub';
import type { Competitie, CompetitiePublica, ContextAccesExtern, SesiuneActor } from '../../types';

const CHEIE_CONTEXT = 'phi-hau-active-role-context-id';
const CALE_LISTA = '/competitie';
const MSG_LINK_INVALID = 'Link invalid sau competiție indisponibilă.';

type Stare =
    | { t: 'incarcare' }
    | { t: 'link_invalid' }
    | { t: 'login' }
    | { t: 'solicita'; email: string }
    | { t: 'cerere_trimisa' }
    | { t: 'fara_acces'; email: string }
    | { t: 'alege_context'; contexte: ContextAccesExtern[]; user: any }
    | { t: 'lista'; ctx: ContextAccesExtern; contexte: ContextAccesExtern[]; user: any; mesaj?: string }
    | { t: 'confirma'; sursa: 'link' | 'lista'; ctx: ContextAccesExtern; contexte: ContextAccesExtern[]; user: any; competitie: Competitie }
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

/** Doar contul de club partajat are sesiune de actor; închiderea e best effort. */
const iesiDinZona = async (rol: ContextAccesExtern['rol']) => {
    if (rol === 'REPREZENTANT_COMPETITIE') { try { await inchideSesiuneActor(); } catch { /* ignorat intenționat */ } }
    await deconecteaza();
};

interface EcranActivProps {
    ctx: ContextAccesExtern;
    contexte: ContextAccesExtern[];
    user: any;
    competitie: Competitie;
    onSchimbaContext: (c: ContextAccesExtern) => void;
    onInapoiLaLista: () => void;
}

// D-07: o singură sesiune de actor per cont — nu există logică de sesiuni concurente.
const EcranActiv: React.FC<EcranActivProps> = ({ ctx, contexte, user, competitie, onSchimbaContext, onInapoiLaLista }) => {
    const esteCont = ctx.rol === 'REPREZENTANT_COMPETITIE';
    const qc = useQueryClient();
    const cheie = ['extern', 'sesiune-actor', ctx.roleRowId];
    const [schimba, setSchimba] = useState(false);

    // Reapare la expirare (4h) prin refetch la revenirea în fereastră și la 5 minute (D-19).
    const { data: sesiune, isLoading } = useQuery({
        queryKey: cheie,
        queryFn: async () => (await sesiuneActorCurenta()).data,
        enabled: esteCont,
        refetchOnWindowFocus: true,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 0,
    });

    const actor: SesiuneActor | null = esteCont && sesiune && sesiune.competitie_id === competitie.id ? sesiune : null;
    const trebuieAlegere = esteCont && !isLoading && !actor;
    const onAles = (s: SesiuneActor) => { qc.setQueryData(cheie, s); setSchimba(false); };

    return (
        <>
            <ShellExtern
                email={user.email ?? ''}
                contexte={contexte}
                contextActiv={ctx}
                competitieDenumire={competitie.denumire}
                onSchimbaContext={onSchimbaContext}
                onDeconecteaza={() => { void iesiDinZona(ctx.rol); }}
                onInapoiLaLista={onInapoiLaLista}
                actor={actor}
                onSchimbaActor={() => setSchimba(true)}
            >
                {esteCont && isLoading && <p className="text-center text-sm">Se încarcă...</p>}
                {(!esteCont || actor) && (
                    <ExternDataProvider
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
                )}
            </ShellExtern>
            {esteCont && (
                <AlegeActorModal
                    isOpen={trebuieAlegere || schimba}
                    obligatoriu={trebuieAlegere}
                    competitieId={competitie.id}
                    onAles={onAles}
                    onClose={() => setSchimba(false)}
                />
            )}
        </>
    );
};

const CompetitieExternaPage: React.FC = () => {
    const [id] = useState(() => extrageCompetitieId(window.location.pathname));
    const [lista] = useState(() => esteListaZona(window.location.pathname));
    const [stare, setStare] = useState<Stare>({ t: id || lista ? 'incarcare' : 'link_invalid' });
    const [teaser, setTeaser] = useState<CompetitiePublica | null>(null);
    const { labels } = useTipuriCompetitie();

    // D-09: după login se ajunge MEREU în listă; linkul direct (D-10) doar deschide dialogul de confirmare, niciodată competiția.
    const intraInZona = useCallback(async (ctx: ContextAccesExtern, contexte: ContextAccesExtern[], user: any, cuLink = true) => {
        seteazaContextActiv(ctx.roleRowId); // înainte de prima citire: headerul RLS se ia din localStorage
        if (!id || !cuLink) { setStare({ t: 'lista', ctx, contexte, user }); return; }
        const { data } = await supabase.from('competitii').select('*').eq('id', id).maybeSingle();
        if (!data) {
            window.history.replaceState(null, '', CALE_LISTA);
            setStare({ t: 'lista', ctx, contexte, user, mesaj: 'Competiția din link nu este disponibilă pentru clubul tău.' });
            return;
        }
        setStare({ t: 'confirma', sursa: 'link', ctx, contexte, user, competitie: data as Competitie });
    }, [id]);

    const finalizeaza = useCallback(async (user: any) => {
        const { data: contexte, error } = await incarcaContexteEligibile(user.id);
        if (error) { setStare({ t: 'eroare', mesaj: 'Nu am putut verifica accesul. Încearcă din nou.' }); return; }
        if (contexte.length === 0) { setStare({ t: 'fara_acces', email: user.email ?? '' }); return; }
        if (contexte.length === 1) { await intraInZona(contexte[0], contexte, user); return; }
        let salvat: string | null = null;
        try { salvat = JSON.parse(localStorage.getItem(CHEIE_CONTEXT) ?? 'null'); } catch { /* valoare invalidă */ }
        const potrivit = contexte.find(c => c.roleRowId === salvat);
        if (potrivit) await intraInZona(potrivit, contexte, user);
        else setStare({ t: 'alege_context', contexte, user });
    }, [intraInZona]);

    useEffect(() => {
        if (!id && !lista) return;
        applyTheme(DEFAULT_THEME); // ThemeProvider nu se montează în zona externă
        let anulat = false;
        (async () => {
            const [{ data: pub }, { data: sesiune }] = await Promise.all([
                id ? incarcaCompetitiePublica(id) : Promise.resolve({ data: null }),
                supabase.auth.getSession(),
            ]);
            if (anulat) return;
            if (id && !pub) { setStare({ t: 'link_invalid' }); return; }
            if (pub) setTeaser(pub);
            if (sesiune.session?.user) await finalizeaza(sesiune.session.user);
            else if (!anulat) setStare({ t: 'login' });
        })();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') setStare(s => (s.t === 'link_invalid' || s.t === 'incarcare' ? s : { t: 'login' }));
        });
        return () => { anulat = true; sub.subscription.unsubscribe(); };
    }, [id, lista, finalizeaza]);

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
                        <p>{id ? 'Contul tău nu are acces la această competiție. Dacă ești reprezentantul unui club, solicită acces.' : 'Contul tău nu are un cont de competiție pentru un club. Conturile de club se creează de administratorul aplicației.'}</p>
                        <div className="flex gap-2 justify-center">
                            {id && <Button onClick={() => setStare({ t: 'solicita', email: stare.email })}>Solicită acces</Button>}
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
                            <Button key={c.roleRowId} variant="secondary" className="w-full justify-start" onClick={() => { void intraInZona(c, contexte, user); }}>
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
        case 'lista':
        case 'confirma': {
            const { ctx, contexte, user } = stare;
            const inapoiLaLista = () => {
                window.history.replaceState(null, '', CALE_LISTA);
                setStare({ t: 'lista', ctx, contexte, user });
            };
            continut = (
                <ErrorBoundary onNavigate={() => window.location.reload()}>
                    <ShellExtern
                        email={user.email ?? ''}
                        contexte={contexte}
                        contextActiv={ctx}
                        onSchimbaContext={c => { void intraInZona(c, contexte, user, false); }}
                        onDeconecteaza={() => { void iesiDinZona(ctx.rol); }}
                    >
                        {stare.t === 'lista' && stare.mesaj && <Card className="mb-4"><p className="text-sm">{stare.mesaj}</p></Card>}
                        <ListaCompetitiiClub
                            key={ctx.roleRowId}
                            clubId={ctx.clubId}
                            onAlege={competitie => setStare({ t: 'confirma', sursa: 'lista', ctx, contexte, user, competitie })}
                        />
                    </ShellExtern>
                    {stare.t === 'confirma' && (() => {
                        const { sursa, competitie } = stare;
                        return (
                            <Modal
                                isOpen
                                persistent
                                onClose={inapoiLaLista}
                                title={sursa === 'link' ? `Ai fost trimis la competiția ${competitie.denumire}` : `Intri în competiția ${competitie.denumire}?`}
                            >
                                <div className="flex flex-wrap gap-2 justify-end">
                                    <Button variant="secondary" onClick={inapoiLaLista}>{sursa === 'link' ? 'Vezi toate competițiile' : 'Anulează'}</Button>
                                    <Button onClick={() => {
                                        if (sursa === 'lista') window.history.replaceState(null, '', `${CALE_LISTA}/${competitie.id}`);
                                        setStare({ t: 'activ', ctx, contexte, user, competitie });
                                    }}>Intră</Button>
                                </div>
                            </Modal>
                        );
                    })()}
                </ErrorBoundary>
            );
            break;
        }
        case 'activ': {
            const { ctx, contexte, user, competitie } = stare;
            const inapoiLaLista = () => {
                window.history.replaceState(null, '', CALE_LISTA);
                setStare({ t: 'lista', ctx, contexte, user });
            };
            continut = (
                <ErrorBoundary onNavigate={() => window.location.reload()}>
                    <EcranActiv
                        key={ctx.roleRowId}
                        ctx={ctx}
                        contexte={contexte}
                        user={user}
                        competitie={competitie}
                        onSchimbaContext={c => { void intraInZona(c, contexte, user, false); }}
                        onInapoiLaLista={inapoiLaLista}
                    />
                </ErrorBoundary>
            );
            break;
        }
    }

    return <><Toaster /><TipuriLabelsContext.Provider value={labels}>{continut}</TipuriLabelsContext.Provider></>;
};

export default CompetitieExternaPage;
