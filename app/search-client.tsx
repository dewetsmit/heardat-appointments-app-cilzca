
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { getAllPatients } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Patient {
  PatientsID: string;
  Name: string;
  Surname: string;
  Cell?: string;
  Home?: string;
  Email?: string;
  FileNo?: string;
  DateModified?: string;
}

export default function SearchClientScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    if (!user || !user.BranchID) {
      console.log('[SearchClient] User or BranchID not available');
      setError('User information not available. Please sign in again.');
      setIsLoading(false);
      return;
    }

    console.log('[SearchClient] Loading patients for branch:', user.BranchID);
    try {
      setIsLoading(true);
      setError(null);

      const data = await getAllPatients(user.BranchID, '');
      console.log('[SearchClient] Patients API response:', data);

      if (data && data.patients && Array.isArray(data.patients)) {
        console.log('[SearchClient] Patients loaded:', data.patients.length);
        setPatients(data.patients);
        setFilteredPatients(data.patients);
      } else {
        console.log('[SearchClient] No patients data in response');
        setPatients([]);
        setFilteredPatients([]);
      }
    } catch (err: any) {
      console.error('[SearchClient] Failed to load patients:', err);
      setError(err.message || 'Failed to load patients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('[SearchClient] Component mounted, loading patients');
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = patients.filter((patient) => {
      const name = (patient.Name || '').toLowerCase();
      const surname = (patient.Surname || '').toLowerCase();
      const fullName = `${name} ${surname}`;
      
      return (
        name.includes(query) ||
        surname.includes(query) ||
        fullName.includes(query)
      );
    });

    console.log('[SearchClient] Filtered patients:', filtered.length, 'for query:', searchQuery);
    setFilteredPatients(filtered);
  }, [searchQuery, patients]);

  function handlePatientPress(patient: Patient) {
    console.log('[SearchClient] Patient selected:', patient.PatientsID, patient.Name, patient.Surname);
    router.push({
      pathname: '/patient-detail',
      params: { patientId: patient.PatientsID },
    });
  }

  const fullNameDisplay = (patient: Patient) => {
    const fullName = `${patient.Name || ''} ${patient.Surname || ''}`.trim();
    return fullName || 'Unknown Patient';
  };

  const fileNoDisplay = (patient: Patient) => {
    return patient.FileNo ? `File: ${patient.FileNo}` : '';
  };

  const cellDisplay = (patient: Patient) => {
    return patient.Cell || '';
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <Stack.Screen
        options={{
          title: 'Search Client',
          headerShown: true,
          presentation: 'modal',
        }}
      />

      <View style={styles.container}>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={theme.dark ? '#98989D' : '#666'}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by name or surname..."
            placeholderTextColor={theme.dark ? '#98989D' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.dark ? '#98989D' : '#666' }]}>
              Loading patients...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="error"
              size={48}
              color={theme.colors.notification}
            />
            <Text style={[styles.errorText, { color: theme.colors.notification }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
              onPress={loadPatients}
            >
              <Text style={styles.retryButtonText}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.centerContainer}>
            <IconSymbol
              ios_icon_name="person.slash"
              android_material_icon_name="person-off"
              size={48}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.emptyText, { color: theme.dark ? '#98989D' : '#666' }]}>
              {searchQuery.trim() === ''
                ? 'No patients found'
                : `No patients found matching "${searchQuery}"`}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={[
              styles.listContent,
              Platform.OS !== 'ios' && styles.listContentWithPadding,
            ]}
          >
            {filteredPatients.map((patient) => {
              const displayName = fullNameDisplay(patient);
              const fileNo = fileNoDisplay(patient);
              const cell = cellDisplay(patient);
              
              return (
                <TouchableOpacity
                  key={patient.PatientsID}
                  style={[styles.patientCard, { backgroundColor: theme.colors.card }]}
                  onPress={() => handlePatientPress(patient)}
                >
                  <View style={styles.patientIconContainer}>
                    <View
                      style={[
                        styles.patientIcon,
                        { backgroundColor: `${theme.colors.primary}20` },
                      ]}
                    >
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={24}
                        color={theme.colors.primary}
                      />
                    </View>
                  </View>

                  <View style={styles.patientInfo}>
                    <Text style={[styles.patientName, { color: theme.colors.text }]}>
                      {displayName}
                    </Text>
                    {fileNo && (
                      <View style={styles.infoRow}>
                        <IconSymbol
                          ios_icon_name="doc.text"
                          android_material_icon_name="description"
                          size={14}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {fileNo}
                        </Text>
                      </View>
                    )}
                    {cell && (
                      <View style={styles.infoRow}>
                        <IconSymbol
                          ios_icon_name="phone.fill"
                          android_material_icon_name="phone"
                          size={14}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {cell}
                        </Text>
                      </View>
                    )}
                  </View>

                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={theme.dark ? '#98989D' : '#666'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  listContentWithPadding: {
    paddingBottom: 100,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  patientIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    gap: 6,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
  },
});
