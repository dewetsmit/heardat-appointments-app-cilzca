
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
import { IconSymbol } from '@/components/IconSymbol';
import { AudiologistSelector } from '@/components/AudiologistSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/contexts/AppointmentContext';
import { apiRequest, getAuthHeader } from '@/utils/api';
import { Appointment } from '@/types';

export default function CalendarScreen() {
  const theme = useTheme();
  const { token } = useAuth();
  const { selectedAudiologistIds } = useAppointments();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (token) {
      loadAppointments();
    }
  }, [token, selectedAudiologistIds, filterStatus]);

  async function loadAppointments() {
    console.log('Loading appointments...');
    try {
      let params = '';
      if (selectedAudiologistIds.length > 0) {
        params += `?audiologist_ids=${selectedAudiologistIds.join(',')}`;
      }
      if (filterStatus !== 'all') {
        params += params ? `&status=${filterStatus}` : `?status=${filterStatus}`;
      }

      const data = await apiRequest(`/api/appointments${params}`, {
        headers: getAuthHeader(token!),
      });

      setAppointments(data);
      console.log('Appointments loaded:', data.length);
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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return 'Today';
    }
    if (isTomorrow) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      scheduled: '#FFA500',
      completed: '#50C878',
      cancelled: '#FF6B6B',
      'no-show': '#9B59B6',
    };
    return statusColors[status] || '#666';
  }

  function getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      'no-show': 'No Show',
    };
    return statusLabels[status] || status;
  }

  const groupedAppointments: Record<string, Appointment[]> = {};
  appointments.forEach((appointment) => {
    const dateKey = formatDate(appointment.appointment_date);
    if (!groupedAppointments[dateKey]) {
      groupedAppointments[dateKey] = [];
    }
    groupedAppointments[dateKey].push(appointment);
  });

  const dateKeys = Object.keys(groupedAppointments);

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (isLoading) {
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {filterOptions.map((option) => {
            const isSelected = filterStatus === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setFilterStatus(option.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
        {dateKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="calendar.badge.exclamationmark"
              android_material_icon_name="event-busy"
              size={64}
              color={theme.dark ? '#98989D' : '#666'}
            />
            <Text style={[styles.emptyStateText, { color: theme.dark ? '#98989D' : '#666' }]}>
              No appointments found
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsContainer}>
            {dateKeys.map((dateKey) => {
              const dayAppointments = groupedAppointments[dateKey];
              return (
                <View key={dateKey} style={styles.dateSection}>
                  <Text style={[styles.dateHeader, { color: theme.colors.text }]}>{dateKey}</Text>
                  <View style={styles.appointmentsList}>
                    {dayAppointments.map((appointment) => {
                      const timeText = formatTime(appointment.appointment_date);
                      const statusColor = getStatusColor(appointment.status);
                      const statusLabel = getStatusLabel(appointment.status);
                      return (
                        <View
                          key={appointment.id}
                          style={[
                            styles.appointmentCard,
                            { backgroundColor: theme.colors.card, borderLeftColor: statusColor },
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
                            <View style={styles.appointmentHeader}>
                              <Text style={[styles.patientName, { color: theme.colors.text }]}>
                                {appointment.patient_name}
                              </Text>
                              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                  {statusLabel}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.appointmentDetails}>
                              <View style={styles.detailRow}>
                                <IconSymbol
                                  ios_icon_name="person.fill"
                                  android_material_icon_name="person"
                                  size={14}
                                  color={theme.dark ? '#98989D' : '#666'}
                                />
                                <Text style={[styles.detailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                                  {appointment.audiologist.full_name}
                                </Text>
                              </View>
                              {appointment.patient_phone && (
                                <View style={styles.detailRow}>
                                  <IconSymbol
                                    ios_icon_name="phone.fill"
                                    android_material_icon_name="phone"
                                    size={14}
                                    color={theme.dark ? '#98989D' : '#666'}
                                  />
                                  <Text style={[styles.detailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                                    {appointment.patient_phone}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
  filterScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 18,
  },
  appointmentsContainer: {
    gap: 24,
  },
  dateSection: {
    gap: 12,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
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
  },
});
