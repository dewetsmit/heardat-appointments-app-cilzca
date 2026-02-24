
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/IconSymbol';
import moment from 'moment';
import { 
  getAllPatients, 
  getBranches, 
  getAppointmentProcedures,
  heardatApiCall,
  getHeardatCredentials,
  createNewAppointment,
  formatDateForAPI,
  formatTimeForAPI,
  getUsers,
  getUserAppointments
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

interface HeardatAppointment {
  AppointmentID: string;
  DateAppointment: string;
  Duration: string;
  UserIDAssigned?: string;
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

  // Client search state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);

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

  const loadFormData = useCallback(async () => {
    console.log('[CreateAppointment] Loading form data');
    if (!token) {
      console.log('[CreateAppointment] No token available');
      return;
    }

    try {
      setLoading(true);
      
      // Get user credentials for branch ID
      const credentials = await getHeardatCredentials();
      const branchId = credentials.branchId || "0";
      
      console.log('[CreateAppointment] Loading data with branchId:', branchId);

      // Load branches, procedures, and audiologists from Heardat API
      // Don't load clients here - they'll be loaded on-demand with search
      const [branchesRes, proceduresRes, audiologistsRes] = await Promise.all([
        getBranches(),
        getAppointmentProcedures(),
        getUsers()
      ]);

      console.log('[CreateAppointment] Form data loaded from Heardat API:', {
        branches: branchesRes?.length || 0,
        procedures: proceduresRes?.length || 0,
        audiologists: audiologistsRes?.length || 0,
      });

      const mappedBranches: Branch[] = (branchesRes || []).map((branch: any) => ({
        id: branch.BranchID || branch.id,
        name: branch.Name || 'Unknown',
        address: branch.Address || branch.address,
      }));

      const mappedProcedures: Procedure[] = (proceduresRes || []).map((proc: any) => ({
        id: proc.ProcedureID || proc.id,
        name: proc.Name || 'Unknown',
        description: proc.Description || proc.description,
        duration_minutes: proc.Duration || proc.duration_minutes || 30,
      }));

      // Map audiologists from Users endpoint
      const mappedAudiologists: Audiologist[] = (audiologistsRes || []).map((user: any) => ({
        id: user.UserID?.toString() || user.id,
        user_id: user.UserID?.toString() || user.id,
        full_name: user.Name || user.FirstName + ' ' + user.LastName || 'Unknown',
        specialization: user.Specialization || user.specialization,
        is_active: user.Active === "1" || user.is_active === true,
      }));

      console.log('[CreateAppointment] Mapped audiologists:', mappedAudiologists);

      setBranches(mappedBranches);
      setProcedures(mappedProcedures);
      setExaminers(mappedAudiologists);
      setAssistants(mappedAudiologists); // Use same list for assistants
      
      console.log('[CreateAppointment] Form data mapped and set successfully');
      console.log('[CreateAppointment] Examiners available:', mappedAudiologists.length);
      console.log('[CreateAppointment] Assistants available:', mappedAudiologists.length);
    } catch (error) {
      console.error('[CreateAppointment] Error loading form data:', error);
      Alert.alert('Error', 'Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load clients with search query
  const loadClients = useCallback(async (searchQuery: string) => {
    console.log('[CreateAppointment] Loading clients with search:', searchQuery);
    setIsLoadingClients(true);
    
    try {
      const credentials = await getHeardatCredentials();
      const branchId = credentials.branchId || "0";
      
      const clientsRes = await getAllPatients(branchId, searchQuery);
      
      const mappedClients: Client[] = (clientsRes || []).map((patient: any) => ({
        id: patient.PatientID || patient.id,
        name: `${patient.FirstName || ''} ${patient.LastName || ''}`.trim() || 'Unknown',
        email: patient.Email || patient.email,
        phone: patient.Cell || patient.phone,
      }));
      
      console.log('[CreateAppointment] Clients loaded:', mappedClients.length);
      setClients(mappedClients);
    } catch (error) {
      console.error('[CreateAppointment] Error loading clients:', error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  // Load clients when search query changes (with debounce effect)
  useEffect(() => {
    // Only load clients when the client dropdown is open
    if (activeDropdown === 'client') {
      const timeoutId = setTimeout(() => {
        loadClients(clientSearchQuery);
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [clientSearchQuery, activeDropdown, loadClients]);

  // Load initial clients when dropdown opens
  useEffect(() => {
    if (activeDropdown === 'client' && clients.length === 0) {
      loadClients('');
    }
  }, [activeDropdown, clients.length, loadClients]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker dismisses automatically after selection
    // On iOS, we keep it open until user taps outside
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
      console.log('[CreateAppointment] Date selected:', selectedDate.toISOString());
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    // On Android, the picker dismisses automatically after selection
    // On iOS, we keep it open until user taps outside
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTime(selectedTime);
      console.log('[CreateAppointment] Time selected:', selectedTime.toISOString());
    }
  };

  const doubleBookingAlert = useCallback(() => {
    Alert.alert(
      'Double Booking Detected',
      'This appointment overlaps with an existing appointment. Please choose a different time.',
      [{ text: 'OK' }]
    );
  }, []);

  const createAppointment = useCallback(async () => {
    const credentials = await getHeardatCredentials();
    console.log('[CreateAppointment] Creating appointment');

    try {
      setSubmitting(true);

      // Build appointment form data matching Heardat API expectations
      const appointmentFormData: Record<string, any> = {
        AppointmentID: "0",
        DateAppointment: date.toISOString(),
        Active: "1",
        Deleted: "0",
        BranchID: selectedBranch!.id,
        Source: "0",
        UserIDAssigned: selectedExaminer!.id,
        Duration: reformatDurationForAPI(duration),
        ProceduresID: selectedProcedure!.id,
        ConsoltationID: "0",
        Type: "Booked Out",
        UserIDAssignedAssistant: selectedAssistant ? selectedAssistant.id : "0",
        RemindMe: sendReminders ? "1" : "0",
        DateEndAppointment: date.toISOString(),
        UserID: credentials.userId,
        Userkey: credentials.userKey,
        Companykey: credentials.companyKey,
        Sessionkey: credentials.sessionKey,
        CompanyID: credentials.companyId,
        PatientID: selectedClient!.id,
      };

      console.log('[CreateAppointment] Creating appointment with form data:', appointmentFormData);

      // Call the createNewAppointment function
      const response = await createNewAppointment(appointmentFormData);

      console.log('[CreateAppointment] Appointment created successfully:', response);
      Alert.alert('Success', 'Appointment created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('[CreateAppointment] Error creating appointment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create appointment';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [date, selectedBranch, selectedExaminer, duration, selectedProcedure, selectedAssistant, sendReminders, selectedClient, router]);

  const checkIfDoubleBooking = useCallback(async () => {
    console.log('[CreateAppointment] Checking for double bookings');

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

    try {
      const appointmentDate = new Date(date);
      const selectedDay = appointmentDate.getDate();

      const firstDayOfMonth = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth() + 1, 0);

      const credentials = await getHeardatCredentials();

      // Fetch appointments for the selected examiner for the month
      const searchUser = {
        UserID: selectedExaminer.id,
        CompanyID: credentials.companyId || "0",
        BranchID: selectedBranch.id,
      };

      console.log('[CreateAppointment] Fetching appointments for double booking check:', searchUser);

      let selectedDayAppointments: HeardatAppointment[] = [];

      try {
        const response = await getUserAppointments(
          formatDateForAPI(firstDayOfMonth),
          formatDateForAPI(lastDayOfMonth),
          searchUser
        );

        console.log('[CreateAppointment] Appointments response:', response);

        if (response) {
          // Parse response - it might be a string or already parsed
          let calendarData: HeardatAppointment[] = [];
          
          if (typeof response === 'string') {
            const parsed = JSON.parse(response);
            calendarData = parsed.appointments || parsed;
          } else if (response.appointments) {
            calendarData = response.appointments;
          } else if (Array.isArray(response)) {
            calendarData = response;
          }

          // Filter appointments for the selected day
          selectedDayAppointments = calendarData.filter((appointment: HeardatAppointment) => {
            const appointmentDay = new Date(appointment.DateAppointment).getDate();
            return appointmentDay === selectedDay;
          });

          console.log('[CreateAppointment] Appointments on selected day:', selectedDayAppointments.length);
        }
      } catch (error) {
        console.error('[CreateAppointment] Error fetching appointments for double booking check:', error);
        Alert.alert('Error', 'Could not check for double bookings. Please try again.');
        return;
      }

      // If no appointments on this day, proceed with creation
      if (selectedDayAppointments.length === 0) {
        console.log('[CreateAppointment] No appointments on selected day, proceeding with creation');
        createAppointment();
        return;
      }

      // Map existing appointments to time ranges
      const existingAppointmentTimes = selectedDayAppointments.map((appointment: HeardatAppointment) => {
        const appointmentTimeStart = moment(appointment.DateAppointment);
        
        // Parse duration (format: "HH:MM")
        const durationParts = appointment.Duration.split(':');
        const hours = parseInt(durationParts[0], 10) || 0;
        const minutes = parseInt(durationParts[1], 10) || 0;
        
        const appointmentTimeEnd = appointmentTimeStart.clone().add(hours, 'hours').add(minutes, 'minutes');

        return {
          appointmentTimeStart,
          appointmentTimeEnd,
        };
      });

      // Calculate selected appointment time range
      // Combine date and time into a single moment object
      const selectedDateTime = moment(date);
      selectedDateTime.hours(time.getHours());
      selectedDateTime.minutes(time.getMinutes());
      selectedDateTime.seconds(0);
      selectedDateTime.milliseconds(0);

      const selectedAppointmentTimeStart = selectedDateTime;
      const selectedAppointmentTimeEnd = selectedDateTime.clone().add(duration, 'minutes');

      console.log('[CreateAppointment] Selected appointment time:', {
        start: selectedAppointmentTimeStart.format(),
        end: selectedAppointmentTimeEnd.format(),
      });

      // Check for overlaps
      let isDoubleBooking = false;

      for (const existingApp of existingAppointmentTimes) {
        console.log('[CreateAppointment] Checking overlap with existing appointment:', {
          start: existingApp.appointmentTimeStart.format(),
          end: existingApp.appointmentTimeEnd.format(),
        });

        // Overlap condition: (StartA < EndB) && (EndA > StartB)
        if (
          selectedAppointmentTimeStart.isBefore(existingApp.appointmentTimeEnd) &&
          selectedAppointmentTimeEnd.isAfter(existingApp.appointmentTimeStart)
        ) {
          console.log('[CreateAppointment] Double booking detected!');
          isDoubleBooking = true;
          break;
        }
      }

      if (isDoubleBooking) {
        doubleBookingAlert();
      } else {
        console.log('[CreateAppointment] No double booking, proceeding with creation');
        createAppointment();
      }
    } catch (error) {
      console.error('[CreateAppointment] Error in double booking check:', error);
      Alert.alert('Error', 'Failed to check for double bookings. Please try again.');
    }
  }, [date, time, duration, selectedClient, selectedBranch, selectedProcedure, selectedExaminer, createAppointment, doubleBookingAlert]);

  const handleSubmit = async () => {
    console.log('[CreateAppointment] Submit button pressed - checking for double bookings');
    checkIfDoubleBooking();
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

  const reformatDurationForAPI = (totalMinutes: number):string => {
  const hours = Math.floor(totalMinutes / 60); // Get the whole number of hours
  const minutes = totalMinutes % 60;           // Get the remainder minutes

  // Optional: Add leading zero to minutes if less than 10
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}`;
}

  const renderDropdown = (
    label: string,
    value: DropdownOption | null,
    options: DropdownOption[],
    onSelect: (option: DropdownOption) => void,
    dropdownKey: string
  ) => {
    const isOpen = activeDropdown === dropdownKey;
    const displayValue = value ? value.label : 'Select...';
    const isClientDropdown = dropdownKey === 'client';

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            console.log(`[CreateAppointment] Dropdown ${dropdownKey} pressed`);
            setActiveDropdown(isOpen ? null : dropdownKey);
            if (dropdownKey === 'client' && !isOpen) {
              setClientSearchQuery('');
            }
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
          onRequestClose={() => {
            setActiveDropdown(null);
            if (isClientDropdown) {
              setClientSearchQuery('');
            }
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setActiveDropdown(null);
              if (isClientDropdown) {
                setClientSearchQuery('');
              }
            }}
          >
            <View style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
              {isClientDropdown && (
                <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                  <IconSymbol
                    ios_icon_name="magnifyingglass"
                    android_material_icon_name="search"
                    size={20}
                    color={colors.text + '80'}
                  />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search clients..."
                    placeholderTextColor={colors.text + '80'}
                    value={clientSearchQuery}
                    onChangeText={setClientSearchQuery}
                    autoFocus
                  />
                  {clientSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                      <IconSymbol
                        ios_icon_name="xmark.circle.fill"
                        android_material_icon_name="cancel"
                        size={20}
                        color={colors.text + '80'}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <ScrollView style={styles.dropdownList}>
                {isLoadingClients && isClientDropdown ? (
                  <View style={styles.loadingDropdown}>
                    <ActivityIndicator size="small" color="#4A90E2" />
                    <Text style={[styles.loadingDropdownText, { color: colors.text + '80' }]}>
                      Loading clients...
                    </Text>
                  </View>
                ) : options.length === 0 ? (
                  <View style={styles.emptyDropdown}>
                    <Text style={[styles.emptyDropdownText, { color: colors.text + '80' }]}>
                      {isClientDropdown && clientSearchQuery ? 'No clients found' : 'No options available'}
                    </Text>
                  </View>
                ) : (
                  options.map((option, index) => (
                    <React.Fragment key={option.id}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          console.log(`[CreateAppointment] Selected ${dropdownKey}:`, option.label);
                          onSelect(option);
                          setActiveDropdown(null);
                          if (isClientDropdown) {
                            setClientSearchQuery('');
                          }
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
                  ))
                )}
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

  console.log('[CreateAppointment] Rendering form with options:', {
    clients: clientOptions.length,
    branches: branchOptions.length,
    procedures: procedureOptions.length,
    examiners: examinerOptions.length,
    assistants: assistantOptions.length,
  });

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
              console.log('[CreateAppointment] Date picker button tapped');
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
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
              console.log('[CreateAppointment] Time picker button tapped');
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
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Client Dropdown with Search */}
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
              console.log('[CreateAppointment] Procedure selected, duration set to:', procedure.duration_minutes);
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
              console.log('[CreateAppointment] Duration picker opened');
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
                          console.log('[CreateAppointment] Duration selected:', mins);
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
                console.log('[CreateAppointment] Send reminders toggled:', !sendReminders);
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
                console.log('[CreateAppointment] Repeat appointment toggled:', !repeatAppointment);
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
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
  emptyDropdown: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: 16,
  },
  loadingDropdown: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingDropdownText: {
    fontSize: 16,
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
