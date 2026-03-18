import { create } from 'zustand';
import { AIMessage, AgentId } from '../../services/agents/types';

export type { AIMessage };

export interface TutorialStep {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  navigateTo?: string;
}

interface AIStoreState {
  // Chat
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: AIMessage[];
  addMessage: (msg: AIMessage) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeAgentId: AgentId | null;
  setActiveAgentId: (id: AgentId | null) => void;

  // Tutorial
  isTutorialActive: boolean;
  currentStepIndex: number;
  tutorialSteps: TutorialStep[];
  startTutorial: (steps: TutorialStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
}

export const useAIStore = create<AIStoreState>((set, get) => ({
  // Chat state
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [], activeAgentId: null }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  activeAgentId: null,
  setActiveAgentId: (id) => set({ activeAgentId: id }),

  // Tutorial state
  isTutorialActive: false,
  currentStepIndex: 0,
  tutorialSteps: [],
  startTutorial: (steps) => set({ isTutorialActive: true, currentStepIndex: 0, tutorialSteps: steps }),
  nextStep: () => {
    const { currentStepIndex, tutorialSteps } = get();
    if (currentStepIndex < tutorialSteps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ isTutorialActive: false, currentStepIndex: 0, tutorialSteps: [] });
    }
  },
  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) set({ currentStepIndex: currentStepIndex - 1 });
  },
  skipTutorial: () => set({ isTutorialActive: false, currentStepIndex: 0, tutorialSteps: [] }),
}));
