import { create } from 'zustand';
import { View } from '../../types';

interface AppState {
  activeView: View;
  setActiveView: (view: View) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  // Faza 38 D-02: contextul de rol pentru care MFA a trecut; datele pornesc doar dupa.
  mfaContextId: string | null;
  setMfaContextId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mfaContextId: null,
  // Aceeasi valoare = aceeasi stare: guard-ul MFA ruleaza la fiecare schimbare de view si nu trebuie sa re-randeze abonatii.
  setMfaContextId: (id) => set((s) => (s.mfaContextId === id ? s : { mfaContextId: id })),
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  isSidebarExpanded: true,
  setIsSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
}));
