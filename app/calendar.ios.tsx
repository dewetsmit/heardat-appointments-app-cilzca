
import { AudiologistSelector } from '@/components/AudiologistSelector';
import { CalendarWeekView } from '@/components/CalendarWeekView';
import { getUserAppointments, formatDateForAPI } from '@/utils/api';
import SideNav from '@/components/SideNav';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { CalendarDayView } from '@/components/CalendarDayView';
import moment from 'moment';
import { useAppointments } from '@/contexts/AppointmentContext';
import { useAuth } from '@/contexts/AuthContext';

type ViewMode = 'month' | 'week' | 'day';

interface HeardatAppointment {
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
  UserIDAssigned?: string;
  audiologistId?: string;
  audiologistName?: string;
}

const AUDIOLOGIST_COLORS = [
  '#4A90E2',
  '#E94B3C',
  '#6BCF7F',
  '#F5A623',
  '#9013FE',
  '#50E3C2',
  '#FF6B9D',
  '#4ECDC4',
];

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [sideNavVisible, setSideNavVisible] = useState(false);

  const theme = useTheme();
  const { appointments, selectedAudiologists, loadAppointments } = useAppointments();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    console.log('CalendarScreen mounted, loading appointments');
    loadAppointments();
  }, [loadAppointments]);

  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};
    appointments.forEach((apt) => {
      const date = apt.DateAppointment;
      if (!marked[date]) {
        marked[date] = { marked: true, dots: [] };
      }
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: theme.colors.primary,
    };
    return marked;
  }, [appointments, selectedDate, theme.colors.primary]);

  const handleRefresh = useCallback(async () => {
    console.log('User initiated refresh');
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, [loadAppointments]);

  function formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function onDayPress(day: any) {
    console.log('Day pressed:', day.dateString);
    setSelectedDate(day.dateString);
    setViewMode('day');
  }

  function handleDayPressFromWeek(date: string) {
    console.log('Day pressed from week view:', date);
    setSelectedDate(date);
    setViewMode('day');
  }

  function navigatePrevious() {
    let newDate;
    if (viewMode === 'day') {
      newDate = moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    } else if (viewMode === 'week') {
      newDate = moment(selectedDate).subtract(1, 'week').format('YYYY-MM-DD');
    } else {
      newDate = moment(selectedDate).subtract(1, 'month').format('YYYY-MM-DD');
    }
    console.log('Navigating to previous:', newDate);
    setSelectedDate(newDate);
  }

  function navigateNext() {
    let newDate;
    if (viewMode === 'day') {
      newDate = moment(selectedDate).add(1, 'day').format('YYYY-MM-DD');
    } else if (viewMode === 'week') {
      newDate = moment(selectedDate).add(1, 'week').format('YYYY-MM-DD');
    } else {
      newDate = moment(selectedDate).add(1, 'month').format('YYYY-MM-DD');
    }
    console.log('Navigating to next:', newDate);
    setSelectedDate(newDate);
  }

  const selectedDateDisplay = moment(selectedDate).format('MMMM D, YYYY');
  const todayText = 'Today';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: `${theme.colors.primary}20` }]}
          onPress={() => {
            console.log('Menu button pressed');
            setSideNavVisible(true);
          }}
        >
          <IconSymbol
            ios_icon_name="line.3.horizontal"
            android_material_icon_name="menu"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Calendar
        </Text>

        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: `${theme.colors.primary}20` }]}
          onPress={() => {
            console.log('Profile button pressed');
            router.push('/profile');
          }}
        >
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <AudiologistSelector />

        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'month' && { backgroundColor: theme.colors.primary },
              { borderColor: theme.colors.border },
            ]}
            onPress={() => {
              console.log('Switching to month view');
              setViewMode('month');
            }}
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
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'week' && { backgroundColor: theme.colors.primary },
              { borderColor: theme.colors.border },
            ]}
            onPress={() => {
              console.log('Switching to week view');
              setViewMode('week');
            }}
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
              viewMode === 'day' && { backgroundColor: theme.colors.primary },
              { borderColor: theme.colors.border },
            ]}
            onPress={() => {
              console.log('Switching to day view');
              setViewMode('day');
            }}
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
        </View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.colors.card }]}
            onPress={navigatePrevious}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="chevron-left"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <View style={styles.dateDisplay}>
            <Text style={[styles.dateText, { color: theme.colors.text }]}>
              {selectedDateDisplay}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.colors.card }]}
            onPress={navigateNext}
          >
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.todayButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              const today = moment().format('YYYY-MM-DD');
              console.log('Navigating to today:', today);
              setSelectedDate(today);
            }}
          >
            <Text style={styles.todayButtonText}>
              {todayText}
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'month' && (
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
              textDisabledColor: theme.dark ? '#444' : '#d9e1e8',
              dotColor: theme.colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.text,
              indicatorColor: theme.colors.primary,
            }}
            style={[styles.calendar, { backgroundColor: theme.colors.card }]}
          />
        )}

        {viewMode === 'week' && (
          <CalendarWeekView
            selectedDate={selectedDate}
            appointments={appointments}
            selectedAudiologists={selectedAudiologists}
            onDayPress={handleDayPressFromWeek}
            onSwipeLeft={navigateNext}
            onSwipeRight={navigatePrevious}
          />
        )}

        {viewMode === 'day' && (
          <CalendarDayView
            selectedDate={selectedDate}
            appointments={appointments}
            selectedAudiologists={selectedAudiologists}
            onSwipeLeft={navigateNext}
            onSwipeRight={navigatePrevious}
          />
        )}
      </ScrollView>

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
    paddingTop: 16,
    paddingBottom: 16,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  todayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  calendar: {
    borderRadius: 12,
    padding: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
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
