import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, SafeAreaView,
  ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../supabaseClient';
import { Sportiv } from '../types';

export const AdaugaSportiv: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [nume, setNume] = useState('');
  const [prenume, setPrenume] = useState('');
  const [dataNasterii, setDataNasterii] = useState(''); // Format YYYY-MM-DD
  const [cnp, setCnp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!nume.trim() || !prenume.trim()) {
      Alert.alert("Date Incomplete", "Numele și prenumele sunt obligatorii.");
      return;
    }
    setLoading(true);

    try {
      // 1 & 2. Construiește email și parolă
      const sanitize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
      const sanitizedNume = sanitize(nume);
      if (!sanitizedNume) {
        throw new Error("Numele conține caractere invalide.");
      }
      const generatedEmail = `${sanitizedNume}.${sanitize(prenume)}@phihau.ro`;
      const generatedPassword = `${sanitizedNume}.1234!`;

      // 3. Execută supabase.auth.signUp
      if (!supabase) throw new Error("Clientul Supabase nu este initializat.");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: generatedEmail,
        password: generatedPassword,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Contul de autentificare nu a putut fi creat.");

      const PHI_HAU_IASI_CLUB_ID = 'cbb0b228-b3e0-4735-9658-70999eb256c6';

      // 4. Inserează în public.sportivi. Obiectul este curat, fără proprietăți extra.
      const newSportivData = {
        nume: nume.trim(),
        prenume: prenume.trim(),
        email: generatedEmail,
        user_id: authData.user.id,
        club_id: PHI_HAU_IASI_CLUB_ID,
        data_nasterii: dataNasterii || '1900-01-01',
        cnp: cnp.trim() || null,
        data_inscrierii: new Date().toISOString().split('T')[0],
        status: 'Activ' as const,
        familie_id: null,
        grupa_id: null,
        tip_abonament_id: null,
        participa_vacanta: false,
      };

      const { data: insertedSportiv, error: insertError } = await supabase
        .from('sportivi')
        .insert(newSportivData)
        .select('id')
        .single();
      
      if (insertError) {
        await supabase.auth.signOut().catch(console.error);
        Alert.alert("Eroare Critică", `Contul a fost creat, dar profilul nu a putut fi salvat. Contactați administratorul. Eroare: ${insertError.message}`);
        throw insertError;
      }
      
      if (!insertedSportiv) {
        throw new Error("Profilul sportivului nu a putut fi creat sau ID-ul nu a fost returnat.");
      }

      // 5. Asignează rolul 'Sportiv' în tabela de legătură
      const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
        user_id: authData.user.id,
        rol_denumire: 'Sportiv',
        club_id: PHI_HAU_IASI_CLUB_ID,
        sportiv_id: insertedSportiv.id,
        is_primary: true,
      });

      if (roleError) {
        throw new Error(`Profilul a fost creat, dar rolul nu a putut fi atribuit: ${roleError.message}`);
      }
      
      Alert.alert(
        "Cont Creat cu Succes!",
        `Trimiteți aceste date părintelui:\n\nEmail: ${generatedEmail}\nParolă: ${generatedPassword}`,
        [{ text: "OK", onPress: () => navigation?.goBack() }]
      );
      
    } catch (error: any) {
      Alert.alert("Eroare", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Adaugă Sportiv</Text>
          <Text style={styles.subtitle}>Un cont de acces va fi generat automat.</Text>

          <Text style={styles.label}>Nume de Familie</Text>
          <TextInput
            style={styles.input}
            placeholder="Popescu"
            placeholderTextColor="#6b7280"
            value={nume}
            onChangeText={setNume}
          />

          <Text style={styles.label}>Prenume</Text>
          <TextInput
            style={styles.input}
            placeholder="Ion"
            placeholderTextColor="#6b7280"
            value={prenume}
            onChangeText={setPrenume}
          />
          
          <Text style={styles.label}>Data Nașterii (Opțional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6b7280"
            value={dataNasterii}
            onChangeText={setDataNasterii}
            keyboardType="numeric"
          />

          <Text style={styles.label}>CNP (Opțional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Cod Numeric Personal"
            placeholderTextColor="#6b7280"
            value={cnp}
            onChangeText={setCnp}
            keyboardType="numeric"
            maxLength={13}
          />

          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
            {loading ? <ActivityIndicator color="#0a192f" /> : <Text style={styles.saveButtonText}>Salvează și Creează Cont</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    height: 48, // Echivalent cu h-12
  },
  saveButton: {
    backgroundColor: '#FFD700',
    height: 48, // Echivalent cu h-12
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
});
