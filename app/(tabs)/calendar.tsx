
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { AudiologistSelector } from '@/components/AudiologistSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/contexts/AppointmentContext';
import { getUserAppointments, formatDateForAPI } from '@/utils/api';
import { Calendar } from 'react-native-calendars';
import { CalendarDayView } from '@/components/CalendarDayView';
import { CalendarWeekView } from '@/components/CalendarWeekView';

type ViewMode = 'day' | 'week' | 'month';

interface HeardatAppointment {
  AppointmentID: string;
  ClientName: string;
  ClientEmail?: string;
  ClientPhone?: string;
  UserName: string;
  DateAppointment: string;
  TimeAppointment: string;
  Duration?: number;
  Status?: string;
  Notes?: string;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedAudiologistIds } = useAppointments();

  const [appointments, setAppointments] = useState<HeardatAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user, selectedAudiologistIds, selectedDate, viewMode]);

  async function loadAppointments() {
    console.log('Loading appointments for calendar...');
    try {
      setIsLoading(true);
      
      let startDate = selectedDate;
      let endDate = selectedDate;
      
      if (viewMode === 'week') {
        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        startDate = formatDateForAPI(startOfWeek);
        endDate = formatDateForAPI(endOfWeek);
      } else if (viewMode === 'month') {
        const date = new Date(selectedDate);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        startDate = formatDateForAPI(startOfMonth);
        endDate = formatDateForAPI(endOfMonth);
      }
      
      console.log('Fetching appointments from', startDate, 'to', endDate);
      
      let allAppointments: HeardatAppointment[] = [];
      
      if (selectedAudiologistIds.length > 0) {
        for (const audiologistId of selectedAudiologistIds) {
          try {
            const data = await getUserAppointments(startDate, endDate, {
              UserID: audiologistId,
            });
            
            if (data && data.appointments && Array.isArray(data.appointments)) {
              allAppointments = [...allAppointments, ...data.appointments];
            }
          } catch (error) {
            console.error('Failed to load appointments for audiologist:', audiologistId, error);
          }
        }
      } else {
        const data = await getUserAppointments(startDate, endDate);
        
        if (data && data.appointments && Array.isArray(data.appointments)) {
          allAppointments = data.appointments;
        }
      }
      
      setAppointments(allAppointments);
      console.log('Appointments loaded:', allAppointments.length);
      
      const marked: any = {};
      allAppointments.forEach((appointment) => {
        const dateKey = appointment.DateAppointment;
        if (dateKey) {
          marked[dateKey] = {
            marked: true,
            dotColor: theme.colors.primary,
          };
        }
      });
      
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: theme.colors.primary,
      };
      
      setMarkedDates(marked);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadAppointments();
  }

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
    } catch (error) {
      console.error('Error formatting time:', error);
    }
    
    return timeString;
  }

  function onDayPress(day: any) {
    console.log('Day pressed:', day.dateString);
    setSelectedDate(day.dateString);
    if (viewMode === 'month') {
      setViewMode('day');
    }
  }

  function handleDayPressFromWeek(date: string) {
    console.log('Day pressed from week view:', date);
    setSelectedDate(date);
    setViewMode('day');
  }

  const selectedDateAppointments = appointments.filter(
    (appointment) => appointment.DateAppointment === selectedDate
  );

  const viewModeButtons = [
    { mode: 'day' as ViewMode, label: 'Day', icon: 'calendar-today' },
    { mode: 'week' as ViewMode, label: 'Week', icon: 'date-range' },
    { mode: 'month' as ViewMode, label: 'Month', icon: 'event' },
  ];

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Calendar</Text>
          <AudiologistSelector />
        </View>

        <View style={styles.viewModeContainer}>
          {viewModeButtons.map((button) => {
            const isSelected = viewMode === button.mode;
            return (
              <TouchableOpacity
                key={button.mode}
                style={[
                  styles.viewModeButton,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setViewMode(button.mode)}
              >
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name={button.icon}
                  size={18}
                  color={isSelected ? '#FFFFFF' : theme.colors.text}
                />
                <Text
                  style={[
                    styles.viewModeButtonText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {button.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {viewMode === 'day' && (
        <CalendarDayView
          selectedDate={selectedDate}
          appointments={selectedDateAppointments}
          onAppointmentPress={(appointment) => {
            console.log('Appointment pressed:', appointment);
          }}
        />
      )}

      {viewMode === 'week' && (
        <CalendarWeekView
          selectedDate={selectedDate}
          appointments={appointments}
          onAppointmentPress={(appointment) => {
            console.log('Appointment pressed:', appointment);
          }}
          onDayPress={handleDayPressFromWeek}
        />
      )}

      {viewMode === 'month' && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
          ]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
        >
          <View style={styles.calendarContainer}>
            <Calendar
              current={selectedDate}
              onDayPress={onDayPress}
              markedDates={markedDates}
              theme={{
                backgroundColor: theme.colors.background,
                calendarBackground: theme.colors.card,
                textSectionTitleColor: theme.colors.text,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.text,
                textDisabledColor: theme.dark ? '#4A4A4A' : '#D3D3D3',
                dotColor: theme.colors.primary,
                selectedDotColor: '#FFFFFF',
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.text,
                indicatorColor: theme.colors.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              style={[styles.calendar, { backgroundColor: theme.colors.card }]}
            />
          </View>

          <View style={styles.appointmentsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Appointments for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>

            {selectedDateAppointments.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="calendar.badge.exclamationmark"
                  android_material_icon_name="event-busy"
                  size={48}
                  color={theme.dark ? '#98989D' : '#666'}
                />
                <Text style={[styles.emptyStateText, { color: theme.dark ? '#98989D' : '#666' }]}>
                  No appointments for this date
                </Text>
              </View>
            ) : (
              <View style={styles.appointmentsList}>
                {selectedDateAppointments.map((appointment) => {
                  const timeText = formatTime(appointment.TimeAppointment);
                  return (
                    <View
                      key={appointment.AppointmentID}
                      style={[
                        styles.appointmentCard,
                        { backgroundColor: theme.colors.card },
                      ]}
                    >
                      <View style={styles.appointmentTime}>
                        <IconSymbol
                          ios_icon_name="clock"
                          android_material_icon_name="access-time"
                          size={16}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.timeText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {timeText}
                        </Text>
                      </View>
                      <View style={styles.appointmentContent}>
                        <Text style={[styles.patientName, { color: theme.colors.text }]}>
                          {appointment.ClientName}
                        </Text>
                        <View style={styles.appointmentDetails}>
                          <View style={styles.detailRow}>
                            <IconSymbol
                              ios_icon_name="person.fill"
                              android_material_icon_name="person"
                              size={14}
                              color={theme.dark ? '#98989D' : '#666'}
                            />
                            <Text style={[styles.detailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                              {appointment.UserName}
                            </Text>
                          </View>
                          {appointment.ClientPhone && (
                            <View style={styles.detailRow}>
                              <IconSymbol
                                ios_icon_name="phone.fill"
                                android_material_icon_name="phone"
                                size={14}
                                color={theme.dark ? '#98989D' : '#666'}
                              />
                              <Text style={[styles.detailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                                {appointment.ClientPhone}
                              </Text>
                            </View>
                          )}
                          {appointment.Notes && (
                            <View style={styles.detailRow}>
                              <IconSymbol
                                ios_icon_name="note.text"
                                android_material_icon_name="description"
                                size={14}
                                color={theme.dark ? '#98989D' : '#666'}
                              />
                              <Text style={[styles.detailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                                {appointment.Notes}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          console.log('Create appointment button pressed');
          router.push('/create-appointment');
        }}
      >
        <IconSymbol
          ios_icon_name="plus"
          android_material_icon_name="add"
          size={28}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  calendar: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  appointmentsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentTime: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentContent: {
    flex: 1,
    gap: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
