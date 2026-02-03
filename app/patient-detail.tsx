
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { getSelectedPatient, getUserAppointments } from '@/utils/api';
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

interface Appointment {
  AppointmentID: string;
  DateAppointment: string;
  TimeAppointment: string;
  UserName?: string;
  Duration?: number;
  Notes?: string;
  Status?: string;
  ClientID?: string;
  ClientName?: string;
}

export default function PatientDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatientDetails = useCallback(async () => {
    if (!patientId) {
      console.log('[PatientDetail] No patient ID provided');
      setError('Patient ID not provided');
      setIsLoading(false);
      return;
    }

    console.log('[PatientDetail] Loading patient details for ID:', patientId);
    try {
      setIsLoading(true);
      setError(null);

      const data = await getSelectedPatient(patientId);
      console.log('[PatientDetail] Patient API response:', data);

      if (data && data.patients && Array.isArray(data.patients) && data.patients.length > 0) {
        const patientData = data.patients[0];
        console.log('[PatientDetail] Patient loaded:', patientData);
        setPatient(patientData);
      } else {
        console.log('[PatientDetail] No patient data in response');
        setError('Patient not found');
      }
    } catch (err: any) {
      console.error('[PatientDetail] Failed to load patient details:', err);
      setError(err.message || 'Failed to load patient details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  const loadPatientAppointments = useCallback(async () => {
    if (!patient || !user) {
      console.log('[PatientDetail] Patient or user not available for appointments');
      return;
    }

    console.log('[PatientDetail] Loading appointments for patient:', patient.PatientsID);
    try {
      setIsLoadingAppointments(true);

      const data = await getUserAppointments();
      console.log('[PatientDetail] Appointments API response:', data);

      if (data && data.appointments && Array.isArray(data.appointments)) {
        const patientFullName = `${patient.Name || ''} ${patient.Surname || ''}`.trim();
        const patientAppointments = data.appointments.filter((apt: Appointment) => {
          return (
            apt.ClientID === patient.PatientsID ||
            apt.ClientName === patientFullName
          );
        });

        console.log('[PatientDetail] Patient appointments loaded:', patientAppointments.length);
        setAppointments(patientAppointments);
      } else {
        console.log('[PatientDetail] No appointments data in response');
        setAppointments([]);
      }
    } catch (err: any) {
      console.error('[PatientDetail] Failed to load patient appointments:', err);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [patient, user]);

  useEffect(() => {
    console.log('[PatientDetail] Component mounted, loading patient details');
    loadPatientDetails();
  }, [loadPatientDetails]);

  useEffect(() => {
    if (patient) {
      console.log('[PatientDetail] Patient loaded, loading appointments');
      loadPatientAppointments();
    }
  }, [loadPatientAppointments, patient]);

  function formatTime(timeString: string): string {
    if (!timeString) {
      return '';
    }

    try {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      }
    } catch (err) {
      console.error('[PatientDetail] Error formatting time:', err);
    }

    return timeString;
  }

  function formatDate(dateString: string): string {
    if (!dateString) {
      return '';
    }

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (err) {
      console.error('[PatientDetail] Error formatting date:', err);
      return dateString;
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <Stack.Screen
          options={{
            title: 'Patient Details',
            headerShown: true,
            presentation: 'modal',
          }}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.dark ? '#98989D' : '#666' }]}>
            Loading patient details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !patient) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <Stack.Screen
          options={{
            title: 'Patient Details',
            headerShown: true,
            presentation: 'modal',
          }}
        />
        <View style={styles.centerContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={48}
            color={theme.colors.notification}
          />
          <Text style={[styles.errorText, { color: theme.colors.notification }]}>
            {error || 'Patient not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadPatientDetails}
          >
            <Text style={styles.retryButtonText}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${patient.Name || ''} ${patient.Surname || ''}`.trim();
  const displayName = fullName || 'Unknown Patient';
  const cellValue = patient.Cell || '';
  const homeValue = patient.Home || '';
  const emailValue = patient.Email || '';
  const fileNoValue = patient.FileNo || '';
  const dateModifiedValue = patient.DateModified ? formatDate(patient.DateModified) : '';
  const patientIdValue = patient.PatientsID || '';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <Stack.Screen
        options={{
          title: displayName,
          headerShown: true,
          presentation: 'modal',
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithPadding,
        ]}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.headerSection}>
            <View style={[styles.avatarContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={48}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.patientName, { color: theme.colors.text }]}>
              {displayName}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Contact Information
            </Text>

            {cellValue && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <IconSymbol
                    ios_icon_name="phone.fill"
                    android_material_icon_name="phone"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                    Cell
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {cellValue}
                  </Text>
                </View>
              </View>
            )}

            {homeValue && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <IconSymbol
                    ios_icon_name="house.fill"
                    android_material_icon_name="home"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                    Home
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {homeValue}
                  </Text>
                </View>
              </View>
            )}

            {emailValue && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                    Email
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {emailValue}
                  </Text>
                </View>
              </View>
            )}

            {fileNoValue && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <IconSymbol
                    ios_icon_name="doc.text.fill"
                    android_material_icon_name="description"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                    File No
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {fileNoValue}
                  </Text>
                </View>
              </View>
            )}

            {dateModifiedValue && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                    Last Modified
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {dateModifiedValue}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <IconSymbol
                  ios_icon_name="number"
                  android_material_icon_name="tag"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                  Patient ID
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {patientIdValue}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.appointmentsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Appointments
            </Text>
            {isLoadingAppointments && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>

          {appointments.length === 0 ? (
            <View style={styles.emptyAppointments}>
              <IconSymbol
                ios_icon_name="calendar.badge.exclamationmark"
                android_material_icon_name="event-busy"
                size={32}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.emptyText, { color: theme.dark ? '#98989D' : '#666' }]}>
                No appointments found
              </Text>
            </View>
          ) : (
            <View style={styles.appointmentsList}>
              {appointments.map((appointment) => {
                const dateText = formatDate(appointment.DateAppointment);
                const timeText = formatTime(appointment.TimeAppointment);
                const userName = appointment.UserName || '';
                const duration = appointment.Duration ? `${appointment.Duration} minutes` : '';
                const notes = appointment.Notes || '';

                return (
                  <View
                    key={appointment.AppointmentID}
                    style={[styles.appointmentCard, { backgroundColor: theme.colors.background }]}
                  >
                    <View style={styles.appointmentHeader}>
                      <Text style={[styles.appointmentDate, { color: theme.colors.text }]}>
                        {dateText}
                      </Text>
                      <Text style={[styles.appointmentTime, { color: theme.colors.primary }]}>
                        {timeText}
                      </Text>
                    </View>

                    {userName && (
                      <View style={styles.appointmentDetail}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={14}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.appointmentDetailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {userName}
                        </Text>
                      </View>
                    )}

                    {duration && (
                      <View style={styles.appointmentDetail}>
                        <IconSymbol
                          ios_icon_name="clock"
                          android_material_icon_name="access-time"
                          size={14}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.appointmentDetailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {duration}
                        </Text>
                      </View>
                    )}

                    {notes && (
                      <View style={styles.appointmentDetail}>
                        <IconSymbol
                          ios_icon_name="note.text"
                          android_material_icon_name="description"
                          size={14}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.appointmentDetailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {notes}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
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
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  contentContainerWithPadding: {
    paddingBottom: 100,
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
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerSection: {
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  detailsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
  },
  appointmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyAppointments: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentDetailText: {
    fontSize: 14,
  },
});
