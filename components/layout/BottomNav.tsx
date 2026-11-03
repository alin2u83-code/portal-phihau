import React from 'react';
import { View } from '../../types';
import { useNavigation } from '../../contexts/NavigationContext';
import { MenuItem } from '../menuConfig';
import { HomeIcon, UsersIcon, BanknotesIcon, CalendarDaysIcon, ClipboardCheckIcon, Bars3Icon } from '../icons';

interface BottomNavProps {
    activeRole: string;
    menu: MenuItem[];
    onNavigate: (view: View) => void;
    onOpenMenu: () => void;
}

interface Slot { label: string; view: View; icon: React.ElementType }

const SLOTS_FEDERATIE: Slot[] = [
    { label: 'Acasă', view: 'dashboard', icon: HomeIcon },
    { label: 'Sportivi', view: 'sportivi', icon: UsersIcon },
    { label: 'Plăți', view: 'plati-hub', icon: BanknotesIcon },
];
const SLOTS_CLUB: Slot[] = [
    { label: 'Acasă', view: 'dashboard', icon: HomeIcon },
    { label: 'Sportivi', view: 'sportivi', icon: UsersIcon },
    { label: 'Antrenamente', view: 'prezenta', icon: CalendarDaysIcon },
];
const SLOTS_INSTRUCTOR: Slot[] = [
    { label: 'Acasă', view: 'dashboard', icon: HomeIcon },
    { label: 'Sportivi', view: 'sportivi', icon: UsersIcon },
    { label: 'Antrenamente', view: 'prezenta-instructor', icon: CalendarDaysIcon },
];
const SLOTS_SPORTIV: Slot[] = [
    { label: 'Portalul Meu', view: 'my-portal', icon: HomeIcon },
    { label: 'Prezențe', view: 'istoric-prezenta', icon: ClipboardCheckIcon },
    { label: 'Plăți', view: 'istoric-plati', icon: BanknotesIcon },
];

const SLOTS_BY_ROLE: Record<string, Slot[]> = {
    SUPER_ADMIN_FEDERATIE: SLOTS_FEDERATIE,
    ADMIN: SLOTS_FEDERATIE,
    ADMIN_CLUB: SLOTS_CLUB,
    INSTRUCTOR: SLOTS_INSTRUCTOR,
    SPORTIV: SLOTS_SPORTIV,
};

const BASE = 'flex-1 min-h-11 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)]';

type Navish = { view?: View; aliases?: View[] };

export const BottomNav: React.FC<BottomNavProps> = ({ activeRole, menu, onNavigate, onOpenMenu }) => {
    const { activeView } = useNavigation();
    const role = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase();
    const slots = SLOTS_BY_ROLE[role] ?? SLOTS_SPORTIV;

    // Slotul e activ dacă activeView aparține intrării de meniu care conține view-ul slotului (fără liste duplicate)
    const isSlotActive = (slotView: View) => {
        const covers = (e: Navish) => e.view === slotView || !!e.aliases?.includes(slotView);
        const owner = menu.find(item => covers(item) || item.submenu?.some(covers));
        if (!owner) return activeView === slotView;
        const matches = (e: Navish) => e.view === activeView || !!e.aliases?.includes(activeView);
        return matches(owner) || !!owner.submenu?.some(matches);
    };

    return (
        <nav
            aria-label="Navigare rapidă"
            className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--t-border)] bg-[var(--t-surface)] pb-[env(safe-area-inset-bottom)]"
        >
            <div className="h-16 flex">
                {slots.map(slot => {
                    const active = isSlotActive(slot.view);
                    return (
                        <button
                            key={slot.view}
                            type="button"
                            onClick={() => onNavigate(slot.view)}
                            aria-current={active ? 'page' : undefined}
                            className={BASE}
                            style={{ color: active ? 'var(--t-primary)' : 'var(--t-text-muted)' }}
                        >
                            <slot.icon className="w-5 h-5" />
                            <span>{slot.label}</span>
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={onOpenMenu}
                    className={BASE}
                    style={{ color: 'var(--t-text-muted)' }}
                >
                    <Bars3Icon className="w-5 h-5" />
                    <span>Meniu</span>
                </button>
            </div>
        </nav>
    );
};
