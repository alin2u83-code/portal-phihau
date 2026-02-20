import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TextInput, Modal,
  StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl,
  TouchableWithoutFeedback, Keyboard, Alert
} from 'react-native';
import { supabase } from '../supabaseClient';
import { TranzactieClub } from '../types';

const PriceCard: React.FC<{ item: TranzactieClub }> = ({ item }) => {
    const isInactive = item.status === 'Inactiv';
    return (
        <View style={[styles.card, isInactive && { opacity: 0.5 }]}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.nume_articol}</Text>
                <Text style={styles.cardPrice}>{item.pret.toFixed(2)} RON</Text>
            </View>
            <Text style={styles.cardCategory}>{item.categorie}</Text>
        </View>
    );
};

export const GestiunePreturi: React.FC = () => {
    const [prices, setPrices] = useState<TranzactieClub[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newArticle, setNewArticle] = useState({ nume_articol: '', categorie: '', pret: '' });
    const [isSaving, setIsSaving] = useState(false);

    const fetchPrices = useCallback(async () => {
        if (!supabase) { setError("Client Supabase neconfigurat."); return; }
        setError(null);

        try {
            const { data, error: dbError } = await supabase
                .from('tranzactie_club') // Utilizează vederea specificată
                .select('*');
            
            if (dbError) throw dbError;

            setPrices(data || []);
        } catch (err: any) {
            setError(err.message || 'A apărut o eroare la preluarea prețurilor.');
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchPrices().finally(() => setLoading(false));
    }, [fetchPrices]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPrices();
        setRefreshing(false);
    }, [fetchPrices]);

    const handleSave = async () => {
        if (!newArticle.nume_articol || !newArticle.categorie || !newArticle.pret) {
            Alert.alert("Date Incomplete", "Toate câmpurile sunt obligatorii.");
            return;
        }
        const pretNum = parseFloat(newArticle.pret);
        if (isNaN(pretNum) || pretNum <= 0) {
            Alert.alert("Preț Invalid", "Vă rugăm introduceți un număr valid pentru preț.");
            return;
        }
        
        setIsSaving(true);
        const { error: insertError } = await supabase
            .from('preturi_config')
            .insert({
                denumire_serviciu: newArticle.nume_articol,
                categorie: newArticle.categorie,
                suma: pretNum
                // club_id este omis intenționat, va fi setat de trigger-ul din DB
            });
        
        setIsSaving(false);
        if (insertError) {
            Alert.alert("Eroare la Salvare", insertError.message);
        } else {
            Alert.alert("Succes", "Articolul a fost adăugat.");
            setIsModalVisible(false);
            setNewArticle({ nume_articol: '', categorie: '', pret: '' });
            onRefresh();
        }
    };

    if (loading && prices.length === 0) {
        return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#64ffda" /></SafeAreaView>;
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Gestiune Prețuri</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(true)} style={styles.addButton}>
                    <Text style={styles.addButtonText}>Adaugă Articol</Text>
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <FlatList
                data={prices}
                renderItem={({ item }) => <PriceCard item={item} />}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#64ffda" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Nu s-au găsit prețuri configurate.</Text>
                        <Text style={styles.diagnosticText}>Verifică dacă ai un rol activ în context.</Text>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Adaugă Articol Nou</Text>
                            <TextInput
                                placeholder="Nume Articol (ex: Abonament Lunar)"
                                style={styles.input}
                                value={newArticle.nume_articol}
                                onChangeText={text => setNewArticle(p => ({...p, nume_articol: text}))}
                                placeholderTextColor="#9ca3af"
                            />
                            <TextInput
                                placeholder="Categorie (ex: Abonament, Echipament)"
                                style={styles.input}
                                value={newArticle.categorie}
                                onChangeText={text => setNewArticle(p => ({...p, categorie: text}))}
                                placeholderTextColor="#9ca3af"
                            />
                            <TextInput
                                placeholder="Preț (RON)"
                                style={styles.input}
                                value={newArticle.pret}
                                onChangeText={text => setNewArticle(p => ({...p, pret: text}))}
                                keyboardType="numeric"
                                placeholderTextColor="#9ca3af"
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalButton}>
                                    <Text style={styles.modalButtonText}>Anulează</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSave} style={[styles.modalButton, styles.saveButton]} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalButtonText, { color: '#fff' }]}>Salvează</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a192f' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  addButton: { backgroundColor: '#1d4ed8', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  listContent: { padding: 16 },
  card: { backgroundColor: '#112240', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', flex: 1, marginRight: 8 },
  cardPrice: { fontSize: 18, fontWeight: 'bold', color: '#64ffda' },
  cardCategory: { fontSize: 14, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
  diagnosticText: { color: '#f59e0b', fontSize: 14, marginTop: 8 },
  errorText: { color: '#ef4444', textAlign: 'center', margin: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '90%', backgroundColor: '#112240', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveButton: { backgroundColor: '#1d4ed8' },
  modalButtonText: { color: '#94a3b8', fontWeight: 'bold' },
});