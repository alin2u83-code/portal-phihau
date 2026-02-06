import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LayoutAdmin } from './components/LayoutAdmin';
import { AuthContainer } from './components/AuthContainer';
import { Card } from './components/ui';

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Card className="text-center p-8">
            <svg className="animate-spin h-8 w-8 text-[var(--brand-primary)] mb-4 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h1 className="text-xl font-bold text-white">Se încarcă sesiunea...</h1>
        </Card>
    </div>
);

function App() {
    const { session, isLoading, checkSession } = useAuthStore();

    useEffect(() => {
        checkSession(); // Initial check on app load
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Re-check user context on sign-in or token refresh
            if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'SIGNED_OUT') {
                checkSession();
            } else {
                useAuthStore.setState({ session });
            }
        });
        return () => subscription.unsubscribe();
    }, [checkSession]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <Routes>
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthContainer />} />
            <Route path="/*" element={session ? <LayoutAdmin /> : <Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
