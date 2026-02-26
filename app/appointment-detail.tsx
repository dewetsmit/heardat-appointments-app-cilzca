
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import moment from 'moment';
import { heardatApiCall, getHeardatCredentials } from '@/utils/api';

interface AppointmentDetail {
  AppointmentID: string;
  ClientName: string;
  ClientEmail?: string;
  ClientPhone?: string;
  UserName: string;
  DateAppointment: string;
  TimeAppointment: string;
  Duration?: string;
  Status?: string;
  Notes?: string;
  Type?: string;
  BranchID?: string;
  BranchName?: string;
  ProcedureName?: string;
  UserIDAssigned?: string;
  UserIDAssignedAssistant?: string;
  AssistantName?: string;
}

export default function AppointmentDetailScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadAppointmentDetails();
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    console.log('[AppointmentDetail] Loading appointment details for ID:', appointmentId);
    
    try {
      setLoading(true);
      
      const params = {
        AppointmentID: appointmentId,
      };
      
      const data = await heardatApiCall('Appointments', params);
      
      let parsedData = data;
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      }
      
      // The API returns an array of appointments
      const appointments = parsedData.appointments || parsedData;
      
      if (Array.isArray(appointments) && appointments.length > 0) {
        const appointmentData = appointments[0];
        console.log('[AppointmentDetail] Appointment loaded:', appointmentData);
        setAppointment(appointmentData);
      } else {
        console.error('[AppointmentDetail] No appointment found');
      }
    } catch (error) {
      console.error('[AppointmentDetail] Error loading appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    console.log('[AppointmentDetail] Edit button pressed');
    
    if (!appointment) {
      return;
    }
    
    // Navigate to create-appointment screen with appointment data
    router.push({
      pathname: '/create-appointment',
      params: {
        appointmentId: appointment.AppointmentID,
        editMode: 'true',
        // Pass appointment data as JSON string
        appointmentData: JSON.stringify(appointment),
      },
    });
  };

  const confirmDelete = () => {
    console.log('[AppointmentDetail] Delete button pressed - showing confirmation');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    console.log('[AppointmentDetail] Confirming delete');
    
    if (!appointment) {
      return;
    }
    
    try {
      setDeleting(true);
      setShowDeleteModal(false);
      
      const credentials = await getHeardatCredentials();
      
      // Mark appointment as deleted in Heardat API
      const params = {
        AppointmentID: appointment.AppointmentID,
        Deleted: '1',
        UserID: credentials.userId || '0',
      };
      
      console.log('[AppointmentDetail] Deleting appointment with params:', params);
      
      await heardatApiCall('Appointments', params, 'PUT');
      
      console.log('[AppointmentDetail] Appointment deleted successfully');
      
      // Navigate back to calendar
      router.back();
    } catch (error) {
      console.error('[AppointmentDetail] Error deleting appointment:', error);
      setDeleting(false);
    }
  };

  const formatTime = (timeString: string): string => {
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
      console.error('[AppointmentDetail] Error formatting time:', err);
    }

    return timeString;
  };

  const formatDate = (dateString: string): string => {
    try {
      return moment(dateString).format('dddd, MMMM D, YYYY');
    } catch (err) {
      console.error('[AppointmentDetail] Error formatting date:', err);
      return dateString;
    }
  };

  const formatDuration = (duration: string | undefined): string => {
    if (!duration) {
      return 'N/A';
    }

    try {
      const parts = duration.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (hours > 0 && minutes > 0) {
          const hoursText = `${hours} hour${hours > 1 ? 's' : ''}`;
          const minsText = `${minutes} min${minutes > 1 ? 's' : ''}`;
          return `${hoursText} ${minsText}`;
        } else if (hours > 0) {
          return `${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          return `${minutes} min${minutes > 1 ? 's' : ''}`;
        }
      }
    } catch (err) {
      console.error('[AppointmentDetail] Error formatting duration:', err);
    }

    return duration;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Appointment Details',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading appointment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Appointment Details',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="error"
            size={64}
            color={theme.dark ? '#666' : '#999'}
          />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            Appointment not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateDisplay = formatDate(appointment.DateAppointment);
  const timeDisplay = formatTime(appointment.TimeAppointment);
  const durationDisplay = formatDuration(appointment.Duration);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Appointment Details',
          headerShown: true,
          headerBackTitle: 'Back',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleEdit}
                disabled={deleting}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={24}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={24}
                  color="#FF3B30"
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Client Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Client Information
          </Text>
          
          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={20}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Name
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {appointment.ClientName}
            </Text>
          </View>

          {appointment.ClientEmail && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Email
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.ClientEmail}
              </Text>
            </View>
          )}

          {appointment.ClientPhone && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="phone.fill"
                android_material_icon_name="phone"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Phone
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.ClientPhone}
              </Text>
            </View>
          )}
        </View>

        {/* Appointment Details */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Appointment Details
          </Text>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Date
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {dateDisplay}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="access-time"
              size={20}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Time
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {timeDisplay}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="timer"
              android_material_icon_name="schedule"
              size={20}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Duration
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {durationDisplay}
            </Text>
          </View>

          {appointment.Type && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="tag.fill"
                android_material_icon_name="label"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Type
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.Type}
              </Text>
            </View>
          )}

          {appointment.Status && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Status
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.Status}
              </Text>
            </View>
          )}
        </View>

        {/* Staff Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Staff Information
          </Text>

          <View style={styles.infoRow}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={20}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Audiologist
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {appointment.UserName}
            </Text>
          </View>

          {appointment.AssistantName && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Assistant
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.AssistantName}
              </Text>
            </View>
          )}

          {appointment.BranchName && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="building.2.fill"
                android_material_icon_name="location-on"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Branch
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.BranchName}
              </Text>
            </View>
          )}

          {appointment.ProcedureName && (
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="description"
                size={20}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                Procedure
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {appointment.ProcedureName}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {appointment.Notes && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Notes
            </Text>
            <Text style={[styles.notesText, { color: theme.colors.text }]}>
              {appointment.Notes}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <IconSymbol
              ios_icon_name="trash.fill"
              android_material_icon_name="delete"
              size={48}
              color="#FF3B30"
            />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Delete Appointment?
            </Text>
            <Text style={[styles.modalMessage, { color: theme.dark ? '#98989D' : '#666' }]}>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deleting Overlay */}
      {deleting && (
        <View style={styles.deletingOverlay}>
          <View style={[styles.deletingContent, { backgroundColor: theme.colors.card }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.deletingText, { color: theme.colors.text }]}>
              Deleting appointment...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 8,
  },
  headerButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletingContent: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  deletingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
