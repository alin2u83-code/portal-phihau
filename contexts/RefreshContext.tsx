import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type RefreshFn = () => unknown;

interface RefreshContextValue {
  registerRefresh: (fn: RefreshFn) => void;
  unregisterRefresh: (fn: RefreshFn) => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

const RefreshContext = createContext<RefreshContextValue | undefined>(undefined);

// Buton unic de refresh, în Header — orice view își poate înregistra propriul
// handler de reîncărcare date; dacă nu există unul, se cade pe invalidarea
// cache-ului React Query.
export const RefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeFn = useRef<RefreshFn | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const registerRefresh = useCallback((fn: RefreshFn) => {
    activeFn.current = fn;
  }, []);

  const unregisterRefresh = useCallback((fn: RefreshFn) => {
    if (activeFn.current === fn) activeFn.current = null;
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (activeFn.current) {
        await activeFn.current();
      } else {
        await queryClient.invalidateQueries();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return (
    <RefreshContext.Provider value={{ registerRefresh, unregisterRefresh, refresh, isRefreshing }}>
      {children}
    </RefreshContext.Provider>
  );
};

export function useRefresh(): RefreshContextValue {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefresh must be used within RefreshProvider');
  return ctx;
}

// Helper pt view-uri: înregistrează handler-ul de refresh cât timp componenta e montată.
export function useRegisterRefresh(fn: RefreshFn) {
  const { registerRefresh, unregisterRefresh } = useRefresh();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  React.useEffect(() => {
    const wrapped: RefreshFn = () => fnRef.current();
    registerRefresh(wrapped);
    return () => unregisterRefresh(wrapped);
  }, [registerRefresh, unregisterRefresh]);
}
