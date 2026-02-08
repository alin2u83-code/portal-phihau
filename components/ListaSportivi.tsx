import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator,
  TouchableOpacity, SafeAreaView, RefreshControl, Linking, Alert
} from 'react-native';
import { supabase } from '../supabaseClient';
import { SportivDetaliu } from '../types';
// Folosim iconițe simple sau putem instala un pachet precum react-native-vector-icons
const PhoneIcon = () => <Text style={{color: '#fff'}}>📞</Text>; 
const SearchIcon = () => <Text style={{color: '#9ca3af'}}>🔍</Text>; 

// Componentă individuală pentru afișarea unui sportiv
const SportivCard: React.FC<{ item: SportivDetaliu }> = ({ item }) => {
  const handleCall = () => {
    if (!item.telefon) {
      Alert.alert("Număr Indisponibil", "Acest sportiv nu are un număr de telefon înregistrat.");
      return;
    }
    Alert.alert(
      "Confirmare Apel",
      `Doriți să apelați ${item.nume_complet}?`,
      [
        { text: "Anulează", style: "cancel" },
        { text: "Apelează", onPress: () => Linking.openURL(`tel:${item.telefon}`).catch(() => Alert.alert("Eroare", "Nu s-a putut iniția apelul.")) }
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: item.status === 'Activ' ? '#22c55e' : '#6b7280' }]} />
          <Text style={styles.nameText}>{item.nume_complet}</Text>
        </View>
        <TouchableOpacity onPress={handleCall} style={styles.callButton} disabled={!item.telefon}>
          <PhoneIcon />
        </TouchableOpacity>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>Grad: <Text style={styles.detailValue}>{item.grad_actual || 'Începător'}</Text></Text>
        <Text style={styles.detailText}>Grupă: <Text style={styles.detailValue}>{item.grupa_denumire || 'Neasignat'}</Text></Text>
      </View>
    </View>
  );
};

// Componenta principală a paginii
export const ListaSportivi: React.FC = () => {
  const [sportivi, setSportivi] = useState<SportivDetaliu[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSportivi = useCallback(async () => {
    if (!supabase) {
      setError("Clientul Supabase nu este configurat.");
      return;
    }
    setError(null);
    try {
      // RLS se va ocupa de filtrarea pe club_id
      const { data, error: dbError } = await supabase
        .from('sportiv_detaliu')
        .select('*');
      
      if (dbError) throw dbError;

      setSportivi(data || []);
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la preluarea datelor.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSportivi().finally(() => setLoading(false));
  }, [fetchSportivi]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSportivi();
    setRefreshing(false);
  }, [fetchSportivi]);

  const filteredSportivi = useMemo(() => {
    if (!searchTerm) {
      return sportivi;
    }
    return sportivi.filter(s =>
      s.nume_complet.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sportivi, searchTerm]);

  if (loading && sportivi.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#64ffda" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Listă Sportivi</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <SearchIcon />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Caută după nume..."
          placeholderTextColor="#9ca3af"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={filteredSportivi}
        renderItem={({ item }) => <SportivCard item={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#64ffda"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Niciun sportiv găsit.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  searchIcon: {
    paddingLeft: 12,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#112240',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flexShrink: 1,
  },
  callButton: {
    backgroundColor: '#1d4ed8',
    padding: 10,
    borderRadius: 20,
    marginLeft: 12,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  detailText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginHorizontal: 16,
  },
});
