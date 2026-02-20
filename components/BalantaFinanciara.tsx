import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, SafeAreaView, RefreshControl, TextInput
} from 'react-native';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../supabaseClient';
import { BalantaClub } from '../types';

const SummaryCard: React.FC<{ title: string; value: string; subtext: string; }> = ({ title, value, subtext }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryTitle}>{title}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summarySubtext}>{subtext}</Text>
  </View>
);

export const BalantaFinanciara: React.FC = () => {
  const [transactions, setTransactions] = useState<BalantaClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'lunar' | 'zilnic'>('lunar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchTransactions = useCallback(async () => {
    if (!supabase) { setError("Client Supabase neconfigurat."); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase.from('balanta_club').select('*').order('data_platii', { ascending: false });
      if (dbError) throw dbError;
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const summaryData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyTransactions = transactions.filter(t => {
      const tDate = new Date(t.data_platii);
      return tDate >= startOfMonth && tDate <= endOfMonth;
    });

    const total = monthlyTransactions.reduce((sum, t) => sum + t.suma, 0);
    return { total: total.toFixed(2), count: monthlyTransactions.length };
  }, [transactions]);

  const chartData = useMemo(() => {
    if (viewMode === 'lunar') {
      const monthlyTotals: { [key: string]: number } = {};
      const currentYear = new Date().getFullYear();
      transactions.forEach(t => {
        const tDate = new Date(t.data_platii);
        if (tDate.getFullYear() === currentYear) {
          const monthKey = tDate.toLocaleString('ro-RO', { month: 'short' });
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + t.suma;
        }
      });
      const monthOrder = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      return monthOrder.map(month => ({ name: month, suma: monthlyTotals[month] || 0 }));
    } else {
      // Zilnic
      const dailyTotals: { [key: string]: number } = {};
      const selectedMonth = new Date(selectedDate).getMonth();
      const selectedYear = new Date(selectedDate).getFullYear();
      transactions.forEach(t => {
        const tDate = new Date(t.data_platii);
        if (tDate.getFullYear() === selectedYear && tDate.getMonth() === selectedMonth) {
          const day = tDate.getDate();
          dailyTotals[day] = (dailyTotals[day] || 0) + t.suma;
        }
      });
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        suma: dailyTotals[i + 1] || 0
      }));
    }
  }, [transactions, viewMode, selectedDate]);

  const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);

  if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#d4af37" /></SafeAreaView>;
  if (error) return <SafeAreaView style={styles.container}><Text style={styles.errorText}>{error}</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Balanța Financiară</Text>
            <SummaryCard
              title="Total Încasat Luna Curentă"
              value={`${summaryData.total} RON`}
              subtext={`din ${summaryData.count} încasări`}
            />
            <View style={styles.controlsContainer}>
              <View style={styles.segmentedControl}>
                <TouchableOpacity onPress={() => setViewMode('lunar')} style={[styles.segmentButton, viewMode === 'lunar' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, viewMode === 'lunar' && styles.segmentTextActive]}>Lunar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode('zilnic')} style={[styles.segmentButton, viewMode === 'zilnic' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, viewMode === 'zilnic' && styles.segmentTextActive]}>Zilnic</Text>
                </TouchableOpacity>
              </View>
              {viewMode === 'zilnic' && (
                <TextInput
                  style={styles.dateInput}
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                />
              )}
            </View>
            <Text style={styles.chartTitle}>Evoluție Încasări ({viewMode})</Text>
            <View style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #52525b' }} />
                  <Bar dataKey="suma" name="Încasări" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.suma > 0 ? '#d4af37' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </View>
            <Text style={styles.listTitle}>Ultimele 10 Tranzacții</Text>
          </>
        }
        data={recentTransactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View>
              <Text style={styles.listItemName}>{item.sportiv_nume_complet}</Text>
              <Text style={styles.listItemDesc}>{new Date(item.data_platii).toLocaleDateString('ro-RO')} - {item.descriere}</Text>
            </View>
            <Text style={styles.listItemAmount}>{item.suma.toFixed(2)} RON</Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTransactions} tintColor="#d4af37" />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#18181b' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', padding: 16, textAlign: 'center' },
  summaryCard: { backgroundColor: '#27272a', borderRadius: 12, padding: 20, marginHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#d4af37' },
  summaryTitle: { color: '#a1a1aa', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  summaryValue: { color: '#ffffff', fontSize: 36, fontWeight: 'bold', marginVertical: 4 },
  summarySubtext: { color: '#a1a1aa', fontSize: 12 },
  controlsContainer: { margin: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#27272a', borderRadius: 8, padding: 2 },
  segmentButton: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6 },
  segmentActive: { backgroundColor: '#d4af37' },
  segmentText: { color: '#e4e4e7', fontWeight: 'bold' },
  segmentTextActive: { color: '#18181b' },
  dateInput: { backgroundColor: '#27272a', color: '#ffffff', padding: 8, borderRadius: 8, borderColor: '#52525b', borderWidth: 1, width: 120 },
  chartTitle: { color: '#e4e4e7', fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 16 },
  chartContainer: { height: 200, paddingHorizontal: 10, marginTop: 8 },
  listTitle: { color: '#e4e4e7', fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  listContent: { paddingBottom: 16 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272a', padding: 16, marginHorizontal: 16, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46' },
  listItemName: { color: '#ffffff', fontWeight: 'bold' },
  listItemDesc: { color: '#a1a1aa', fontSize: 12, marginTop: 2 },
  listItemAmount: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: '#ef4444', textAlign: 'center', margin: 16 },
});