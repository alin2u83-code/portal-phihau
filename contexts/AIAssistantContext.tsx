import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useNavigation } from './NavigationContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAIStore } from '../src/store/useAIStore';
import { orchestrate } from '../services/agents';
import { getTutorialStepsForRole } from '../components/Tutorial/tutorialSteps';
import { User, Permissions } from '../types';

interface AIAssistantContextType {
  sendMessage: (text: string) => Promise<void>;
  startTutorial: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

interface AIAssistantProviderProps {
  children: React.ReactNode;
  currentUser: User | null;
  activeRole: string;
  permissions?: Permissions;
  clubs: any[];
}

export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({
  children,
  currentUser,
  activeRole,
  permissions,
  clubs,
}) => {
  const { activeView } = useNavigation();
  const {
    messages,
    addMessage,
    setIsLoading,
    setActiveAgentId,
    startTutorial: storeStartTutorial,
    isTutorialActive,
  } = useAIStore();

  // Persist tutorial completion per user
  const [tutorialCompleted, setTutorialCompleted] = useLocalStorage<Record<string, boolean>>(
    'phi-hau-tutorial-completed',
    {}
  );

  // Auto-trigger tutorial for admin roles on first login
  useEffect(() => {
    if (!currentUser?.user_id) return;
    const isAdminRole =
      permissions?.isFederationAdmin ||
      permissions?.isAdminClub ||
      activeRole === 'ADMIN' ||
      activeRole === 'ADMIN_CLUB' ||
      activeRole === 'SUPER_ADMIN_FEDERATIE';

    if (!isAdminRole) return;
    if (tutorialCompleted[currentUser.user_id]) return;
    if (isTutorialActive) return;

    const steps = getTutorialStepsForRole(activeRole);
    if (steps.length === 0) return;

    const timer = setTimeout(() => {
      storeStartTutorial(steps);
      setTutorialCompleted((prev) => ({ ...prev, [currentUser.user_id!]: true }));
    }, 1500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, activeRole]);

  const startTutorial = useCallback(() => {
    const steps = getTutorialStepsForRole(activeRole);
    if (steps.length > 0) storeStartTutorial(steps);
  }, [activeRole, storeStartTutorial]);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message
    addMessage({ role: 'user', content: text });
    setIsLoading(true);
    setActiveAgentId(null);

    try {
      const clubName = clubs.find((c) => c.id === currentUser?.club_id)?.nume;

      // Prepare message history for API (only role + content)
      const apiMessages = [...messages, { role: 'user' as const, content: text }].map(
        (m) => ({ role: m.role, content: m.content })
      );

      // Orchestrator selects agent and gets response
      const result = await orchestrate(apiMessages, {
        activeView,
        userRole: activeRole,
        userName: currentUser
          ? `${currentUser.prenume || ''} ${currentUser.nume || ''}`.trim()
          : 'Utilizator',
        clubName,
      });

      // Add assistant message with agent metadata
      addMessage({
        role: 'assistant',
        content: result.text,
        agentId: result.agentId,
        agentName: result.agentName,
        agentEmoji: result.agentEmoji,
        agentColorClass: result.agentColorClass,
        agentTextColorClass: result.agentTextColorClass,
      });

      setActiveAgentId(result.agentId);
    } catch (e: any) {
      addMessage({
        role: 'assistant',
        content: `Îmi pare rău, a apărut o eroare: ${e.message}. Te rog încearcă din nou.`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, activeView, activeRole, currentUser, clubs, addMessage, setIsLoading, setActiveAgentId]);

  return (
    <AIAssistantContext.Provider value={{ sendMessage, startTutorial }}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = () => {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant must be used within AIAssistantProvider');
  return ctx;
};
