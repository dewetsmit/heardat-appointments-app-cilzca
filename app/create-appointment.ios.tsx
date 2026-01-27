
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import { 
  apiRequest, 
  getAuthHeader, 
  getAllPatients, 
  getBranches, 
  getAppointmentProcedures,
  heardatApiCall,
  getHeardatCredentials
} from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Client, Branch, Procedure, Audiologist } from '@/types';

// Helper to resolve image sources
function resolveImageSource(source: string | number | any): any {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source;
}

interface DropdownOption {
  id: string;
  label: string;
}

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useAuth();

  // Form state
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<DropdownOption | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<DropdownOption | null>(null);
  const [selectedExaminer, setSelectedExaminer] = useState<DropdownOption | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<DropdownOption | null>(null);
  const [duration, setDuration] = useState(30);
  const [sendReminders, setSendReminders] = useState(true);
  const [repeatAppointment, setRepeatAppointment] = useState(false);
  const [notes, setNotes] = useState('');

  // Data from API
  const [clients, setClients] = useState<Client[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [examiners, setExaminers] = useState<Audiologist[]>([]);
  const [assistants, setAssistants] = useState<Audiologist[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadFormData();
  }, [token]);

  const loadFormData = async () => {
    console.log('Loading form data for create appointment');
    if (!token) {
      console.log('No token available');
      return;
    }

    try {
      setLoading(true);
      
      // Get user credentials for branch ID
      const credentials = await getHeardatCredentials();
      const branchId = credentials.branchId || "0";
      
      console.log('Loading data with branchId:', branchId);

      // Load clients, branches, and procedures from Heardat API
      // Load audiologists from Heardat API (AppointmentUsers endpoint)
      const [clientsRes, branchesRes, proceduresRes, audiologistsRes] = await Promise.all([
        getAllPatients(branchId, ''),
        getBranches(),
        getAppointmentProcedures(),
        heardatApiCall('AppointmentUsers', {
          BranchId: "0",
          CompanyID: credentials.companyId || "0",
          Active: "1",
          Deleted: "0"
        }),
      ]);

      console.log('Form data loaded from Heardat API:', {
        clients: clientsRes?.length || 0,
        branches: branchesRes?.length || 0,
        procedures: proceduresRes?.length || 0,
        audiologists: audiologistsRes?.length || 0,
      });

      // Map Heardat API responses to our Client, Branch, Procedure types
      const mappedClients: Client[] = (clientsRes || []).map((patient: any) => ({
        id: patient.PatientsID || patient.id,
        name: patient.Name || patient.FullName || 'Unknown',
        email: patient.Email || patient.email,
        phone: patient.Phone || patient.phone,
      }));

      const mappedBranches: Branch[] = (branchesRes || []).map((branch: any) => ({
        id: branch.BranchID || branch.id,
        name: branch.BranchName || branch.Name || 'Unknown',
        address: branch.Address || branch.address,
      }));

      const mappedProcedures: Procedure[] = (proceduresRes || []).map((proc: any) => ({
        id: proc.ProceduresID || proc.id,
        name: proc.ProcedureName || proc.Name || 'Unknown',
        description: proc.Description || proc.description,
        duration_minutes: proc.Duration || proc.duration_minutes || 30,
      }));

      const mappedAudiologists: Audiologist[] = (audiologistsRes || []).map((user: any) => ({
        id: user.UserID?.toString() || user.id,
        user_id: user.UserID?.toString() || user.id,
        full_name: user.FullName || user.Name || 'Unknown',
        specialization: user.Specialization || user.specialization,
        is_active: user.Active === "1" || user.is_active === true,
      }));

      setClients(mappedClients);
      setBranches(mappedBranches);
      setProcedures(mappedProcedures);
      setExaminers(mappedAudiologists);
      setAssistants(mappedAudiologists); // Use same list for assistants
      
      console.log('Form data mapped and set successfully');
    } catch (error) {
      console.error('Error loading form data:', error);
      Alert.alert('Error', 'Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      console.log('Date selected:', selectedDate.toISOString());
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
      console.log('Time selected:', selectedTime.toISOString());
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button pressed');

    // Validation
    if (!selectedClient) {
      Alert.alert('Validation Error', 'Please select a client');
      return;
    }
    if (!selectedBranch) {
      Alert.alert('Validation Error', 'Please select a branch');
      return;
    }
    if (!selectedProcedure) {
      Alert.alert('Validation Error', 'Please select a procedure');
      return;
    }
    if (!selectedExaminer) {
      Alert.alert('Validation Error', 'Please select an examiner');
      return;
    }

    // Combine date and time
    const appointmentDateTime = new Date(date);
    appointmentDateTime.setHours(time.getHours());
    appointmentDateTime.setMinutes(time.getMinutes());
    appointmentDateTime.setSeconds(0);
    appointmentDateTime.setMilliseconds(0);

    const appointmentData = {
      client_id: selectedClient.id,
      branch_id: selectedBranch.id,
      procedure_id: selectedProcedure.id,
      audiologist_id: selectedExaminer.id,
      assistant_id: selectedAssistant?.id || null,
      appointment_date: appointmentDateTime.toISOString(),
      duration_minutes: duration,
      send_reminders: sendReminders,
      is_recurring: repeatAppointment,
      recurrence_pattern: repeatAppointment ? 'weekly' : null,
      notes: notes.trim() || null,
    };

    console.log('Creating appointment with data:', appointmentData);

    try {
      setSubmitting(true);
      const headers = await getAuthHeader();

      const response = await apiRequest('/api/appointments', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      console.log('Appointment created successfully:', response);
      Alert.alert('Success', 'Appointment created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to create appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (time: Date): string => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      const hoursText = `${hours} hour${hours > 1 ? 's' : ''}`;
      const minsText = `${mins} min${mins > 1 ? 's' : ''}`;
      return `${hoursText} ${minsText}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${mins} min${mins > 1 ? 's' : ''}`;
    }
  };

  const renderDropdown = (
    label: string,
    value: DropdownOption | null,
    options: DropdownOption[],
    onSelect: (option: DropdownOption) => void,
    dropdownKey: string
  ) => {
    const isOpen = activeDropdown === dropdownKey;
    const displayValue = value ? value.label : 'Select...';

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            console.log(`Dropdown ${dropdownKey} pressed`);
            setActiveDropdown(isOpen ? null : dropdownKey);
          }}
        >
          <Text style={[styles.dropdownText, { color: value ? colors.text : colors.text + '80' }]}>
            {displayValue}
          </Text>
          <IconSymbol
            ios_icon_name={isOpen ? 'chevron.up' : 'chevron.down'}
            android_material_icon_name={isOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveDropdown(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActiveDropdown(null)}
          >
            <View style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
              <ScrollView style={styles.dropdownList}>
                {options.map((option, index) => (
                  <React.Fragment key={option.id}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        console.log(`Selected ${dropdownKey}:`, option.label);
                        onSelect(option);
                        setActiveDropdown(null);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                        {option.label}
                      </Text>
                      {value?.id === option.id && (
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={20}
                          color="#4A90E2"
                        />
                      )}
                    </TouchableOpacity>
                    {index < options.length - 1 && (
                      <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
                    )}
                  </React.Fragment>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Create Appointment',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading form data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateDisplay = formatDate(date);
  const timeDisplay = formatTime(time);
  const durationDisplay = formatDuration(duration);

  const clientOptions: DropdownOption[] = clients.map(c => ({ id: c.id, label: c.name }));
  const branchOptions: DropdownOption[] = branches.map(b => ({ id: b.id, label: b.name }));
  const procedureOptions: DropdownOption[] = procedures.map(p => ({ id: p.id, label: p.name }));
  const examinerOptions: DropdownOption[] = examiners.map(e => ({ id: e.id, label: e.full_name }));
  const assistantOptions: DropdownOption[] = assistants.map(a => ({ id: a.id, label: a.full_name }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Create Appointment',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Date Picker */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Date</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              console.log('Date picker opened');
              setShowDatePicker(true);
            }}
          >
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={colors.text}
            />
            <Text style={[styles.inputText, { color: colors.text }]}>{dateDisplay}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Time Picker */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Time</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              console.log('Time picker opened');
              setShowTimePicker(true);
            }}
          >
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="access-time"
              size={20}
              color={colors.text}
            />
            <Text style={[styles.inputText, { color: colors.text }]}>{timeDisplay}</Text>
          </TouchableOpacity>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}

        {/* Client Dropdown */}
        {renderDropdown(
          'Client',
          selectedClient,
          clientOptions,
          setSelectedClient,
          'client'
        )}

        {/* Branch Dropdown */}
        {renderDropdown(
          'Branch',
          selectedBranch,
          branchOptions,
          setSelectedBranch,
          'branch'
        )}

        {/* Procedure Dropdown */}
        {renderDropdown(
          'Procedure',
          selectedProcedure,
          procedureOptions,
          (option) => {
            setSelectedProcedure(option);
            const procedure = procedures.find(p => p.id === option.id);
            if (procedure) {
              setDuration(procedure.duration_minutes);
              console.log('Procedure selected, duration set to:', procedure.duration_minutes);
            }
          },
          'procedure'
        )}

        {/* Examiner Dropdown */}
        {renderDropdown(
          'Examiner',
          selectedExaminer,
          examinerOptions,
          setSelectedExaminer,
          'examiner'
        )}

        {/* Assistant Dropdown */}
        {renderDropdown(
          'Assistant (Optional)',
          selectedAssistant,
          assistantOptions,
          setSelectedAssistant,
          'assistant'
        )}

        {/* Duration Picker */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Duration</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              console.log('Duration picker opened');
              setShowDurationPicker(true);
            }}
          >
            <IconSymbol
              ios_icon_name="timer"
              android_material_icon_name="schedule"
              size={20}
              color={colors.text}
            />
            <Text style={[styles.inputText, { color: colors.text }]}>{durationDisplay}</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showDurationPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDurationPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDurationPicker(false)}
          >
            <View style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
              <ScrollView style={styles.dropdownList}>
                {[15, 30, 45, 60, 90, 120].map((mins, index) => {
                  const durationLabel = formatDuration(mins);
                  return (
                    <React.Fragment key={mins}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          console.log('Duration selected:', mins);
                          setDuration(mins);
                          setShowDurationPicker(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                          {durationLabel}
                        </Text>
                        {duration === mins && (
                          <IconSymbol
                            ios_icon_name="checkmark"
                            android_material_icon_name="check"
                            size={20}
                            color="#4A90E2"
                          />
                        )}
                      </TouchableOpacity>
                      {index < 5 && (
                        <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Send Reminders Toggle */}
        <View style={styles.fieldContainer}>
          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: colors.text }]}>Send appointment reminders</Text>
            <TouchableOpacity
              style={[
                styles.toggle,
                sendReminders ? styles.toggleActive : styles.toggleInactive,
                { borderColor: colors.border }
              ]}
              onPress={() => {
                console.log('Send reminders toggled:', !sendReminders);
                setSendReminders(!sendReminders);
              }}
            >
              <View
                style={[
                  styles.toggleThumb,
                  sendReminders ? styles.toggleThumbActive : styles.toggleThumbInactive
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Repeat Appointment Toggle */}
        <View style={styles.fieldContainer}>
          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: colors.text }]}>Repeat appointment</Text>
            <TouchableOpacity
              style={[
                styles.toggle,
                repeatAppointment ? styles.toggleActive : styles.toggleInactive,
                { borderColor: colors.border }
              ]}
              onPress={() => {
                console.log('Repeat appointment toggled:', !repeatAppointment);
                setRepeatAppointment(!repeatAppointment);
              }}
            >
              <View
                style={[
                  styles.toggleThumb,
                  repeatAppointment ? styles.toggleThumbActive : styles.toggleThumbInactive
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Add any additional notes..."
            placeholderTextColor={colors.text + '80'}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Appointment</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  inputText: {
    fontSize: 16,
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    width: '100%',
    maxHeight: 400,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    marginHorizontal: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleActive: {
    backgroundColor: '#4A90E2',
  },
  toggleInactive: {
    backgroundColor: '#E0E0E0',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    alignSelf: 'flex-start',
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
