
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
import { DashboardStats, Appointment } from '@/types';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const { selectedAudiologistIds } = useAppointments();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token, selectedAudiologistIds]);

  async function loadDashboardData() {
    console.log('Loading dashboard data...');
    try {
      const audiologistIdsParam =
        selectedAudiologistIds.length > 0 ? `?audiologist_ids=${selectedAudiologistIds.join(',')}` : '';

      const [statsData, appointmentsData] = await Promise.all([
        apiRequest(`/api/dashboard/stats${audiologistIdsParam}`, {
          headers: getAuthHeader(token!),
        }),
        apiRequest(`/api/appointments${audiologistIdsParam}&status=scheduled`, {
          headers: getAuthHeader(token!),
        }),
      ]);

      setStats(statsData);
      setUpcomingAppointments(appointmentsData.slice(0, 5));
      console.log('Dashboard data loaded');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadDashboardData();
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Today at ${timeStr}`;
    }
    if (isTomorrow) {
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Tomorrow at ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} at ${timeStr}`;
  }

  const greetingText = user ? `Hello, ${user.full_name}` : 'Hello';

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
          <View>
            <Text style={[styles.greeting, { color: theme.dark ? '#98989D' : '#666' }]}>
              {greetingText}
            </Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Dashboard</Text>
          </View>
          <AudiologistSelector />
        </View>
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
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats?.total_appointments || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Total
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={24}
              color="#FFA500"
            />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats?.scheduled || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Scheduled
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={24}
              color="#50C878"
            />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats?.completed || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Completed
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <IconSymbol
              ios_icon_name="xmark.circle.fill"
              android_material_icon_name="cancel"
              size={24}
              color="#FF6B6B"
            />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats?.cancelled || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              Cancelled
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Upcoming Appointments
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {upcomingAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="calendar.badge.exclamationmark"
                android_material_icon_name="event-busy"
                size={48}
                color={theme.dark ? '#98989D' : '#666'}
              />
              <Text style={[styles.emptyStateText, { color: theme.dark ? '#98989D' : '#666' }]}>
                No upcoming appointments
              </Text>
            </View>
          ) : (
            <View style={styles.appointmentsList}>
              {upcomingAppointments.map((appointment) => {
                const dateText = formatDate(appointment.appointment_date);
                return (
                  <View
                    key={appointment.id}
                    style={[styles.appointmentCard, { borderColor: theme.colors.border }]}
                  >
                    <View style={styles.appointmentHeader}>
                      <Text style={[styles.patientName, { color: theme.colors.text }]}>
                        {appointment.patient_name}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: '#FFA50020' }]}>
                        <Text style={[styles.statusText, { color: '#FFA500' }]}>Scheduled</Text>
                      </View>
                    </View>
                    <View style={styles.appointmentDetails}>
                      <View style={styles.appointmentDetailRow}>
                        <IconSymbol
                          ios_icon_name="clock"
                          android_material_icon_name="access-time"
                          size={16}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.appointmentDetailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {dateText}
                        </Text>
                      </View>
                      <View style={styles.appointmentDetailRow}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={16}
                          color={theme.dark ? '#98989D' : '#666'}
                        />
                        <Text style={[styles.appointmentDetailText, { color: theme.dark ? '#98989D' : '#666' }]}>
                          {appointment.audiologist.full_name}
                        </Text>
                      </View>
                    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentDetailText: {
    fontSize: 14,
  },
});
