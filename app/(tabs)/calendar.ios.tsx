
import { useAppointments } from '@/contexts/AppointmentContext';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'react-native-calendars';
import { getUserAppointments, formatDateForAPI } from '@/utils/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { CalendarWeekView } from '@/components/CalendarWeekView';
import { AudiologistSelector } from '@/components/AudiologistSelector';
import SideNav from '@/components/SideNav';
import { CalendarDayView } from '@/components/CalendarDayView';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import moment from 'moment';

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
  UserIDAssigned?: string;
  audiologistId?: string;
  audiologistName?: string;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedAudiologists } = useAppointments();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(formatDateForAPI(new Date()));
  const [appointments, setAppointments] = useState<HeardatAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sideNavVisible, setSideNavVisible] = useState(false);

  const loadAppointments = useCallback(async () => {
    if (!user || selectedAudiologists.length === 0) {
      console.log('[Calendar] No user or no audiologists selected, clearing appointments');
      setAppointments([]);
      return;
    }

    console.log('[Calendar] Loading appointments for', selectedAudiologists.length, 'audiologists on date:', selectedDate);
    try {
      setIsLoading(true);

      // Calculate date range based on view mode
      let startDate = selectedDate;
      let endDate = selectedDate;

      if (viewMode === 'week') {
        // Get the week range
        const date = moment(selectedDate);
        startDate = date.clone().startOf('week').format('YYYY-MM-DD');
        endDate = date.clone().endOf('week').format('YYYY-MM-DD');
      } else if (viewMode === 'month') {
        // Get the month range
        const date = moment(selectedDate);
        startDate = date.clone().startOf('month').format('YYYY-MM-DD');
        endDate = date.clone().endOf('month').format('YYYY-MM-DD');
      }

      console.log('[Calendar] Fetching appointments from', startDate, 'to', endDate);

      // Fetch appointments for each selected audiologist
      const allAppointments: HeardatAppointment[] = [];

      for (const audiologist of selectedAudiologists) {
        console.log('[Calendar] Fetching appointments for audiologist:', audiologist.full_name, 'ID:', audiologist.user_id);
        
        try {
          const searchUser = {
            CompanyID: user.CompanyID,
            BranchID: user.BranchID,
            UserID: audiologist.user_id,
          };

          const data = await getUserAppointments(startDate, endDate, searchUser);
          
          if (data && data.appointments && Array.isArray(data.appointments)) {
            console.log('[Calendar] Found', data.appointments.length, 'appointments for', audiologist.full_name);
            
            // Add audiologist info to each appointment
            const appointmentsWithAudiologist = data.appointments.map((apt: HeardatAppointment) => ({
              ...apt,
              audiologistName: audiologist.full_name,
              audiologistId: audiologist.user_id,
            }));
            
            allAppointments.push(...appointmentsWithAudiologist);
          } else {
            console.log('[Calendar] No appointments found for', audiologist.full_name);
          }
        } catch (error) {
          console.error('[Calendar] Error fetching appointments for audiologist', audiologist.full_name, ':', error);
        }
      }

      console.log('[Calendar] Total appointments loaded:', allAppointments.length);
      setAppointments(allAppointments);
    } catch (error) {
      console.error('[Calendar] Failed to load appointments:', error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, user, selectedAudiologists, viewMode]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleRefresh = async () => {
    console.log('[Calendar] User triggered refresh');
    setIsRefreshing(true);
    await loadAppointments();
    setIsRefreshing(false);
  };

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
      console.error('[Calendar] Error formatting time:', err);
    }

    return timeString;
  }

  function onDayPress(day: any) {
    console.log('[Calendar] Day pressed:', day.dateString);
    setSelectedDate(day.dateString);
    setViewMode('day');
  }

  function handleDayPressFromWeek(date: string) {
    console.log('[Calendar] Day pressed from week view:', date);
    setSelectedDate(date);
    setViewMode('day');
  }

  const markedDates = appointments.reduce((acc, apt) => {
    const dateKey = apt.DateAppointment;
    if (dateKey) {
      acc[dateKey] = {
        marked: true,
        dotColor: theme.colors.primary,
      };
    }
    return acc;
  }, {} as any);

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: theme.colors.primary,
  };

  // Filter appointments for selected date (for month view)
  const selectedDateAppointments = appointments.filter(
    (apt) => apt.DateAppointment === selectedDate
  );

  const noAudiologistsSelectedText = 'No audiologists selected';
  const selectAudiologistsText = 'Please select audiologists from the dropdown above';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSideNavVisible(true)}
        >
          <IconSymbol
            ios_icon_name="line.3.horizontal"
            android_material_icon_name="menu"
            size={28}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Calendar
        </Text>

        <AudiologistSelector />
      </View>

      <View style={styles.viewModeSelector}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'day' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setViewMode('day')}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === 'day' ? '#FFFFFF' : theme.colors.text },
            ]}
          >
            Day
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'week' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setViewMode('week')}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === 'week' ? '#FFFFFF' : theme.colors.text },
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'month' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setViewMode('month')}
        >
          <Text
            style={[
              styles.viewModeText,
              { color: viewMode === 'month' ? '#FFFFFF' : theme.colors.text },
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {selectedAudiologists.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <IconSymbol
            ios_icon_name="person.3.fill"
            android_material_icon_name="group"
            size={64}
            color="#666"
          />
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
            {noAudiologistsSelectedText}
          </Text>
          <Text style={[styles.emptyStateText, { color: '#666' }]}>
            {selectAudiologistsText}
          </Text>
        </View>
      ) : isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {viewMode === 'day' && (
            <CalendarDayView
              selectedDate={selectedDate}
              appointments={appointments}
              selectedAudiologists={selectedAudiologists}
              onAppointmentPress={(apt) => console.log('[Calendar] Appointment pressed:', apt)}
            />
          )}

          {viewMode === 'week' && (
            <CalendarWeekView
              selectedDate={selectedDate}
              appointments={appointments}
              selectedAudiologists={selectedAudiologists}
              onAppointmentPress={(apt) => console.log('[Calendar] Appointment pressed:', apt)}
              onDayPress={handleDayPressFromWeek}
            />
          )}

          {viewMode === 'month' && (
            <View style={styles.monthViewContainer}>
              <Calendar
                current={selectedDate}
                onDayPress={onDayPress}
                markedDates={markedDates}
                theme={{
                  backgroundColor: theme.colors.background,
                  calendarBackground: theme.colors.card,
                  textSectionTitleColor: theme.colors.text,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.text,
                  textDisabledColor: '#666',
                  dotColor: theme.colors.primary,
                  selectedDotColor: '#ffffff',
                  arrowColor: theme.colors.primary,
                  monthTextColor: theme.colors.text,
                  textDayFontWeight: '400',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                }}
              />

              <View style={styles.appointmentsList}>
                <Text style={[styles.appointmentsTitle, { color: theme.colors.text }]}>
                  Appointments for {selectedDate}
                </Text>

                {selectedDateAppointments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <IconSymbol
                      ios_icon_name="calendar.badge.exclamationmark"
                      android_material_icon_name="event-busy"
                      size={48}
                      color="#666"
                    />
                    <Text style={[styles.emptyText, { color: '#666' }]}>
                      No appointments scheduled
                    </Text>
                  </View>
                ) : (
                  selectedDateAppointments.map((apt) => {
                    const timeText = formatTime(apt.TimeAppointment);

                    return (
                      <View
                        key={apt.AppointmentID}
                        style={[styles.appointmentCard, { backgroundColor: theme.colors.card }]}
                      >
                        <View style={styles.appointmentHeader}>
                          <Text style={[styles.appointmentTime, { color: theme.colors.primary }]}>
                            {timeText}
                          </Text>
                          {apt.Duration && (
                            <Text style={[styles.appointmentDuration, { color: '#98989D' }]}>
                              {apt.Duration} min
                            </Text>
                          )}
                        </View>

                        <Text style={[styles.appointmentClient, { color: theme.colors.text }]}>
                          {apt.ClientName}
                        </Text>

                        {apt.audiologistName && (
                          <View style={styles.appointmentDetail}>
                            <IconSymbol
                              ios_icon_name="person.fill"
                              android_material_icon_name="person"
                              size={14}
                              color="#98989D"
                            />
                            <Text style={[styles.appointmentDetailText, { color: '#98989D' }]}>
                              {apt.audiologistName}
                            </Text>
                          </View>
                        )}

                        {apt.Notes && (
                          <Text style={[styles.appointmentNotes, { color: '#98989D' }]}>
                            {apt.Notes}
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <SideNav visible={sideNavVisible} onClose={() => setSideNavVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  viewModeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  monthViewContainer: {
    padding: 16,
  },
  appointmentsList: {
    marginTop: 24,
    gap: 12,
  },
  appointmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  appointmentCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentDuration: {
    fontSize: 12,
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  appointmentDetailText: {
    fontSize: 14,
  },
  appointmentNotes: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
