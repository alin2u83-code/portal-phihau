
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, SafeAreaView,
  ScrollView, TouchableOpacity, ActivityIndicator, Switch, KeyboardAvoidingView, Platform, Modal, FlatList
} from 'react-native';
import { supabase } from '../supabaseClient';
import { Sportiv, Grad, Grupa } from '../types';

// Componentă custom pentru Picker, adaptată pentru React Native
const PickerModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  items: { label: string; value: string | null }[];
  onSelect: (value: string | null) => void;
  title: string;
}> = ({ isVisible, onClose, items, onSelect, title }) => (
  <Modal
    transparent={true}
    animationType="fade"
    visible={isVisible}
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.value)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => {
                onSelect(item.value);
                onClose();
              }}
            >
              <Text style={styles.pickerItemText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

export const EditeazaSportiv: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { sportivId } = route.params;

  const [formData, setFormData] = useState<Partial<Sportiv>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [allGrades, setAllGrades] = useState<Grad[]>([]);
  const [allGrupe, setAllGrupe] = useState<Grupa[]>([]);
  
  const [isGradePickerVisible, setGradePickerVisible] = useState(false);
  const [isGrupaPickerVisible, setGrupaPickerVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!sportivId || !supabase) return;
      setLoading(true);

      try {
        const [sportivRes, gradeRes, grupeRes] = await Promise.all([
          supabase.from('sportivi').select('*').eq('id', sportivId).single(),
          supabase.from('grade').select('*').order('ordine', { ascending: true }),
          supabase.from('grupe').select('*').order('denumire')
        ]);
        
        if (sportivRes.error) throw sportivRes.error;
        if (gradeRes.error) throw gradeRes.error;
        if (grupeRes.error) throw grupeRes.error;
        
        setFormData(sportivRes.data || {});
        setAllGrades(gradeRes.data || []);
        setAllGrupe(grupeRes.data || []);

      } catch (error: any) {
        Alert.alert("Eroare la încărcare", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sportivId]);

  const handleSave = async () => {
    if (!formData.nume || !formData.prenume || !supabase) {
      Alert.alert("Date Incomplete", "Numele și prenumele sunt obligatorii.");
      return;
    }
    setIsSaving(true);
    
    // Obiectul `updatePayload` conține DOAR coloanele din tabela `sportivi`.
    // Câmpul `roluri` este exclus automat, prevenind eroarea.
    const updatePayload = {
      nume: formData.nume,
      prenume: formData.prenume,
      email: formData.email,
      data_nasterii: formData.data_nasterii,
      cnp: formData.cnp,
      grad_actual_id: formData.grad_actual_id,
      grupa_id: formData.grupa_id,
      participa_vacanta: formData.participa_vacanta,
    };
    
    try {
      const { error } = await supabase
        .from('sportivi')
        .update(updatePayload)
        .eq('id', sportivId);

      if (error) throw error;
      
      Alert.alert("Succes", "Datele sportivului au fost actualizate.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      Alert.alert("Eroare la Salvare", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }
  
  const gradeItems = [{ label: "Fără Grad (Începător)", value: null }, ...allGrades.map(g => ({ label: g.nume, value: g.id }))];
  const grupaItems = [{ label: "Fără Grupă", value: null }, ...allGrupe.map(g => ({ label: g.denumire, value: g.id }))];

  const selectedGradName = allGrades.find(g => g.id === formData.grad_actual_id)?.nume || 'Fără Grad';
  const selectedGrupaName = allGrupe.find(g => g.id === formData.grupa_id)?.denumire || 'Fără Grupă';
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Editează Profil Sportiv</Text>
          <Text style={styles.subtitle}>{formData.nume} {formData.prenume}</Text>

          <Text style={styles.label}>Nume</Text>
          <TextInput style={styles.input} value={formData.nume} onChangeText={text => setFormData(p => ({...p, nume: text}))} />
          
          <Text style={styles.label}>Prenume</Text>
          <TextInput style={styles.input} value={formData.prenume} onChangeText={text => setFormData(p => ({...p, prenume: text}))} />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={formData.email || ''} onChangeText={text => setFormData(p => ({...p, email: text}))} keyboardType="email-address" autoCapitalize="none" />
          
          <Text style={styles.label}>Grad Actual</Text>
          <TouchableOpacity onPress={() => setGradePickerVisible(true)} style={styles.input}>
            <Text style={styles.pickerText}>{selectedGradName}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Grupă</Text>
          <TouchableOpacity onPress={() => setGrupaPickerVisible(true)} style={styles.input}>
            <Text style={styles.pickerText}>{selectedGrupaName}</Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.label}>Participă în vacanță?</Text>
            <Switch
              trackColor={{ false: "#6b7280", true: "#FFD700" }}
              thumbColor={formData.participa_vacanta ? "#1e293b" : "#f4f3f4"}
              onValueChange={value => setFormData(p => ({...p, participa_vacanta: value}))}
              value={formData.participa_vacanta}
            />
          </View>
          
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#0a192f" /> : <Text style={styles.saveButtonText}>Salvează Modificările</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal 
        title="Selectează Gradul"
        isVisible={isGradePickerVisible}
        onClose={() => setGradePickerVisible(false)}
        items={gradeItems}
        onSelect={value => setFormData(p => ({...p, grad_actual_id: value}))}
      />
      <PickerModal 
        title="Selectează Grupa"
        isVisible={isGrupaPickerVisible}
        onClose={() => setGrupaPickerVisible(false)}
        items={grupaItems}
        onSelect={value => setFormData(p => ({...p, grupa_id: value}))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    height: 48,
    justifyContent: 'center',
  },
  pickerText: {
    color: '#ffffff',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#FFD700',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#0a192f',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Stiluri pentru PickerModal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#112240',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerItemText: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
  },
});
