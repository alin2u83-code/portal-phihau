import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
// FIX: Aliased `View` from `../types` to `AppView` to resolve name conflict with `View` from `react-native`.
import { User, AnuntPrezenta, Grad, View as AppView, Sportiv } from '../types';

// Simple Icon components for mobile
const UsersIcon = () => <Text style={{ fontSize: 24, color: '#94a3b8' }}>👥</Text>;
const FileTextIcon = () => <Text style={{ fontSize: 24, color: '#94a3b8' }}>📄</Text>;
const TrophyIcon = () => <Text style={{ fontSize: 24, color: '#94a3b8' }}>🏆</Text>;
const CheckCircleIcon = () => <Text style={{ fontSize: 24, color: '#22c55e' }}>✅</Text>;
const XCircleIcon = () => <Text style={{ fontSize: 24, color: '#ef4444' }}>❌</Text>;

interface MobileDashboardProps {
    currentUser: User;
    user_role: 'instructor' | 'sportiv';
    anunturiPrezenta: AnuntPrezenta[];
    view_istoric_grade_sportivi: any[]; // Use any for simplicity as it's a view
    // FIX: Updated `View` to `AppView` to use the aliased type.
    onNavigate: (view: AppView) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <View style={styles.kpiCard}>
        {icon}
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiTitle}>{title}</Text>
    </View>
);

const ActionButton: React.FC<{ title: string; onPress: () => void; icon: React.ReactNode }> = ({ title, onPress, icon }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
        {icon}
        <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
);

const InstructorDashboard: React.FC<{ anunturiPrezenta: AnuntPrezenta[]; onNavigate: (view: AppView) => void; }> = ({ anunturiPrezenta, onNavigate }) => {
    const prezentiAzi = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        // Acest calcul presupune că anunturiPrezenta conține doar anunturile pentru ziua curentă
        // Pentru o logică mai robustă, ar trebui filtrat după dată.
        // Pentru simplicitate, vom număra toate anunturile cu status 'Confirm'.
        return anunturiPrezenta.filter(a => a.status === 'Confirm').length;
    }, [anunturiPrezenta]);

    return (
        <>
            <KpiCard title="Sportivi Prezenți Azi" value={prezentiAzi} icon={<UsersIcon />} />
            <ActionButton title="Generare Factură Examen" onPress={() => onNavigate('gestiune-facturi')} icon={<FileTextIcon />} />
        </>
    );
};

const SportivDashboard: React.FC<{ currentUser: Sportiv }> = ({ currentUser }) => {
    const { grad_actual, status_viza_medicala } = currentUser;
    const vizaValida = status_viza_medicala === 'Valid';

    return (
        <View style={styles.sportivCard}>
            <View style={{ alignItems: 'center' }}>
                <TrophyIcon />
                <Text style={styles.sportivCardTitle}>Grad Actual</Text>
                <Text style={styles.sportivCardValue}>{grad_actual || 'Începător'}</Text>
            </View>
            <View style={styles.vizaStatusContainer}>
                {vizaValida ? <CheckCircleIcon /> : <XCircleIcon />}
                <Text style={[styles.vizaStatusText, { color: vizaValida ? '#22c55e' : '#ef4444' }]}>
                    Viza Medicală {vizaValida ? 'Validă' : 'Expirată'}
                </Text>
            </View>
        </View>
    );
};


export const MobileDashboard: React.FC<MobileDashboardProps> = ({ currentUser, user_role, anunturiPrezenta, view_istoric_grade_sportivi, onNavigate }) => {
    
    // Simulating view_istoric_grade_sportivi logic for the current user
    const sportivWithGrade = useMemo(() => {
        const history = view_istoric_grade_sportivi.find(h => h.sportiv_id === currentUser.id);
        return {
            ...currentUser,
            grad_actual: history?.grad_actual || 'Începător',
        };
    }, [currentUser, view_istoric_grade_sportivi]);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeTitle}>Bun venit, {currentUser.prenume}!</Text>
                <Text style={styles.welcomeSubtitle}>
                    {user_role === 'instructor' ? 'Consola instructorului' : 'Portalul tău de sportiv'}
                </Text>
            </View>
            <View style={styles.content}>
                {user_role === 'instructor' ? (
                    <InstructorDashboard anunturiPrezenta={anunturiPrezenta} onNavigate={onNavigate} />
                ) : (
                    <SportivDashboard currentUser={sportivWithGrade} />
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a192f',
    },
    header: {
        padding: 24,
        paddingTop: 48,
        backgroundColor: '#112240',
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 4,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    kpiCard: {
        backgroundColor: '#112240',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    kpiValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 8,
    },
    kpiTitle: {
        fontSize: 16,
        color: '#94a3b8',
    },
    actionButton: {
        backgroundColor: '#1d4ed8',
        borderRadius: 12,
        minHeight: 60, // Ensure touch target is large enough
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sportivCard: {
        backgroundColor: '#112240',
        borderRadius: 12,
        padding: 24,
        borderWidth: 1,
        borderColor: '#334155',
        gap: 24,
    },
    sportivCardTitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 8,
        textTransform: 'uppercase',
    },
    sportivCardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    vizaStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    vizaStatusText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});