
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
  ToastAndroid,
  DeviceEventEmitter,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import moment from 'moment';
import { heardatApiCall, getHeardatCredentials, getAppointmentNotes, getUsers } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface AppointmentDetail {
  AppointmentID: string;
  ClientName?: string;
  FirstName?: string;
  LastName?: string;
  ClientEmail?: string;
  ClientPhone?: string;
  UserName?: string;
  DateAppointment: string;
  TimeAppointment: string;
  Duration?: string;
  Status?: string;
  Notes?: string;
  NotesList?: any[];
  Type?: string;
  BranchID?: string;
  BranchName?: string;
  ProcedureName?: string;
  ProcedureID?: string;
  UserIDAssigned?: string;
  UserIDAssignedAssistant?: string;
  AssistantName?: string;
  AssignedAssistant_FirstName?: string;
  AssignedAssistant_LastName?: string;
}

export default function AppointmentDetailScreen() {
  const { appointmentId, passedClientName, passedAudiologistName } = useLocalSearchParams<{
    appointmentId: string;
    passedClientName?: string;
    passedAudiologistName?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const { procedures } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [audiologists, setAudiologists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadAppointmentDetails();

    // Listen for updates from edit screen
    const subscription = DeviceEventEmitter.addListener('refreshAppointmentDetail', () => {
      console.log('[AppointmentDetail] Refreshing due to update');
      loadAppointmentDetails();
    });

    return () => {
      subscription.remove();
    };
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

        // Merge passedClientName from calendar view if API payload does not have name fields
        const hasApiName = appointmentData.ClientName || appointmentData.FirstName || appointmentData.LastName;
        if (!hasApiName && passedClientName) {
          appointmentData.ClientName = passedClientName;
        }

        // Merge passedAudiologistName from calendar view if API payload does not have UserName
        if (!appointmentData.UserName && passedAudiologistName) {
          appointmentData.UserName = passedAudiologistName;
        }

        // Map assistant name
        const assistantFirstName = appointmentData.AssignedAssistant_FirstName;
        const assistantLastName = appointmentData.AssignedAssistant_LastName;
        if (assistantFirstName || assistantLastName) {
          appointmentData.AssistantName = `${assistantFirstName || ''} ${assistantLastName || ''}`.trim();
        }

        // Fetch users for mapping notes
        try {
          const usersRes = await getUsers();
          setAudiologists(usersRes);
        } catch (err) {
          console.error('[AppointmentDetail] Failed to load users', err);
        }

        // Fetch notes
        try {
          const notesRes = await getAppointmentNotes(appointmentId);
          const parsedNotes = typeof notesRes === 'string' ? JSON.parse(notesRes) : notesRes;
          console.log('[AppointmentDetail] Notes loaded:', parsedNotes.notes);
          if (parsedNotes && parsedNotes.notes && Array.isArray(parsedNotes.notes)) {
            const validNotes = parsedNotes.notes.filter((n: any) => n && (n.Note || n.Notes));
            appointmentData.NotesList = validNotes;

            if (validNotes.length > 0) {
              appointmentData.Notes = validNotes.map((n: any) => n.Note || n.Notes).join('\n\n---\n\n');
            }
          }
        } catch (noteErr) {
          console.error('[AppointmentDetail] Failed to load notes', noteErr);
        }

        // Map ProcedureName from context procedures
        if (appointmentData.ProcedureID && procedures && procedures.length > 0) {
          const procedure = procedures.find((p: any) => 
            String(p.ProcedureID) === String(appointmentData.ProcedureID) || 
            String(p.id) === String(appointmentData.ProcedureID)
          );
          if (procedure) {
            appointmentData.ProcedureName = procedure.Name || procedure.name || procedure.ProcedureName || appointmentData.ProcedureName;
          }
        }

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
        DeleteReason: "",
        AppointmentID: appointment.AppointmentID,
        Deleted: '1',
      };

      console.log('[AppointmentDetail] Deleting appointment with params:', params);

      await heardatApiCall('Appointments', params, 'POST');

      console.log('[AppointmentDetail] Appointment deleted successfully');

      if (Platform.OS === 'android') {
        ToastAndroid.show('Appointment deleted successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Appointment deleted successfully');
      }

      DeviceEventEmitter.emit('refreshCalendar');

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
      let extractedTime = timeString;
      if (extractedTime.includes('T')) {
        extractedTime = extractedTime.split('T')[1];
      } else if (extractedTime.includes(' ')) {
        extractedTime = extractedTime.split(' ')[1];
      }

      const parts = extractedTime.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes}`;
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
  const timeDisplay = formatTime(appointment.TimeAppointment || appointment.DateAppointment);
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
              {appointment.ClientName || `${appointment.FirstName || ''} ${appointment.LastName || ''}`.trim() || 'Unknown'}
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
                {JSON.stringify(appointment)}
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

          {appointment.ProcedureID && (
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
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notes
          </Text>
          {appointment.NotesList && appointment.NotesList.length > 0 ? (
            appointment.NotesList.map((note, index) => {
              const userIdMatch = note.UserID || note.userid;
              const user = audiologists.find(u => String(u.UserID) === String(userIdMatch) || String(u.id) === String(userIdMatch));
              const userName = user ? (user.Name || `${user.FirstName || ''} ${user.LastName || ''}`.trim() || 'Unknown User') : 'Unknown User';
              const dateString = note.DateCreated || note.CreatedDate || note.timestamp || note.DateEntered;
              const dateDisplay = dateString ? moment(dateString).format('dddd, MMMM D, YYYY [at] HH:mm') : '';

              return (
                <View key={index} style={{ marginBottom: index < appointment.NotesList!.length - 1 ? 16 : 0, paddingBottom: index < appointment.NotesList!.length - 1 ? 16 : 0, borderBottomWidth: index < appointment.NotesList!.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
                  <Text style={[styles.notesText, { color: theme.colors.text, marginBottom: 4 }]}>
                    {note.Note || note.Notes}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.dark ? '#98989D' : '#666' }}>
                    {userName}{dateDisplay ? ` • ${dateDisplay}` : ''}
                  </Text>
                </View>
              );
            })
          ) : appointment.Notes && appointment.Notes.trim() !== '' ? (
            <Text style={[styles.notesText, { color: theme.colors.text }]}>
              {appointment.Notes}
            </Text>
          ) : (
            <Text style={[styles.notesText, { color: theme.dark ? '#98989D' : '#666', fontStyle: 'italic' }]}>
              No notes added yet
            </Text>
          )}
        </View>

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
