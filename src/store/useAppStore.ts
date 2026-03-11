import { create } from 'zustand';
import { View } from '../../types';

interface AppState {
  activeView: View;
  setActiveView: (view: View) => void;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  isSidebarExpanded: true,
  setIsSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
}));
