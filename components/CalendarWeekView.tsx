
import { useTheme } from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Audiologist } from '@/types';

interface Appointment {
  AppointmentID: string;
  ClientName: string;
  UserName: string;
  DateAppointment: string;
  Duration?: number;
  Status?: string;
  audiologistId?: string;
  Type: string;
  audiologistName?: string;
}

interface CalendarWeekViewProps {
  selectedDate: string;
  appointments: Appointment[];
  selectedAudiologists: Audiologist[];
  onAppointmentPress?: (appointment: Appointment) => void;
  onDayPress?: (date: string) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TIME_COLUMN_WIDTH = 60;
const SLOT_HEIGHT = 60;

// Color palette for audiologists
const AUDIOLOGIST_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#5AC8FA', // Light Blue
  '#FF2D55', // Pink
  '#FFCC00', // Yellow
];

export function CalendarWeekView({ 
  selectedDate, 
  appointments, 
  selectedAudiologists, 
  onAppointmentPress, 
  onDayPress,
  onSwipeLeft,
  onSwipeRight 
}: CalendarWeekViewProps) {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // Get the week dates
  const getWeekDates = () => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      weekDates.push(currentDate);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();
  const dayWidth = (SCREEN_WIDTH - TIME_COLUMN_WIDTH - 40) / 7;

  // Swipe gesture handlers
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      const SWIPE_THRESHOLD = 50;
      
      if (event.translationX > SWIPE_THRESHOLD && onSwipeRight) {
        console.log('[CalendarWeekView] Swipe right detected - going to previous week');
        onSwipeRight();
      } else if (event.translationX < -SWIPE_THRESHOLD && onSwipeLeft) {
        console.log('[CalendarWeekView] Swipe left detected - going to next week');
        onSwipeLeft();
      }
    });

  // Generate time slots (hourly)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        displayTime: formatHourDisplay(hour),
      });
    }
    return slots;
  };

  const formatHourDisplay = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseTime = (timeString: string): { hour: number; minute: number } => {
    const parts = timeString.split(':');
    return {
      hour: parseInt(parts[0], 10),
      minute: parseInt(parts[1], 10),
    };
  };

  const getAppointmentPosition = (appointment: Appointment) => {
        const DateStringToDate = new Date(appointment.DateAppointment);
    const time = {hour: DateStringToDate.getHours(), minute: DateStringToDate.getMinutes()};
    const totalMinutes = time.hour * 60 + time.minute;
    const pixelsPerMinute = SLOT_HEIGHT / 60;
    
    const top = totalMinutes * pixelsPerMinute;
    const duration = appointment.Duration || 30;
    const height = duration * pixelsPerMinute;
    
    return { top, height };
  };

  // Group appointments by date and audiologist
  const appointmentsByDateAndAudiologist: { [dateKey: string]: { [audiologistId: string]: Appointment[] } } = {};
  
  weekDates.forEach((date) => {
    const dateKey = formatDateKey(date);
    appointmentsByDateAndAudiologist[dateKey] = {};
    
    selectedAudiologists.forEach((audiologist) => {
      appointmentsByDateAndAudiologist[dateKey][audiologist.user_id] = appointments.filter(
        (apt) => apt.DateAppointment === dateKey && apt.audiologistId === audiologist.user_id
      );
    });
  });

  const timeSlots = generateTimeSlots();
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimePosition = (currentHour * 60 + currentMinute) * (SLOT_HEIGHT / 60);

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const weekDisplay = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Get color for audiologist
  const getAudiologistColor = (audiologistId: string): string => {
    const index = selectedAudiologists.findIndex((a) => a.user_id === audiologistId);
    return AUDIOLOGIST_COLORS[index % AUDIOLOGIST_COLORS.length];
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.weekText, { color: theme.colors.text }]}>
            {weekDisplay}
          </Text>
        </View>

        {/* Day headers */}
        <View style={[styles.dayHeadersContainer, { backgroundColor: theme.colors.card }]}>
          <View style={{ width: TIME_COLUMN_WIDTH }} />
          {weekDates.map((date, index) => {
            const CalDateStringToDate = new Date(date);
            const dateKey = formatDateKey(CalDateStringToDate);
            const dayAppointments = appointments.filter((apt) => {
              const AptDateStringToDate = new Date(apt.DateAppointment);
              const aptDateKey = formatDateKey(AptDateStringToDate);
              return aptDateKey === dateKey
            });
            const isTodayDate = isToday(date);
            const isSelected = dateKey === selectedDate;

            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = date.getDate().toString();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayHeader,
                  { width: dayWidth },
                  isSelected && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => onDayPress?.(dateKey)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: isSelected ? '#FFFFFF' : theme.dark ? '#98989D' : '#666' },
                  ]}
                >
                  {dayName}
                </Text>
                <View
                  style={[
                    styles.dayNumberContainer,
                    isTodayDate && !isSelected && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: isSelected
                          ? '#FFFFFF'
                          : isTodayDate
                          ? '#FFFFFF'
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {dayNumber}
                  </Text>
                </View>
                {dayAppointments.length > 0 && (
                  <View style={styles.appointmentCountBadge}>
                    <Text style={styles.appointmentCountText}>
                      {dayAppointments.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.timelineContainer}>
            {/* Time labels */}
            <View style={[styles.timeLabelsColumn, { width: TIME_COLUMN_WIDTH }]}>
              {timeSlots.map((slot, index) => (
                <View key={index} style={[styles.timeSlot, { height: SLOT_HEIGHT }]}>
                  <Text style={[styles.timeLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                    {slot.displayTime}
                  </Text>
                </View>
              ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGridContainer}>
              {weekDates.map((date, dayIndex) => {
                const dateKey = formatDateKey(date);
                const isTodayDate = isToday(date);

                return (
                  <View key={dayIndex} style={[styles.dayColumn, { width: dayWidth }]}>
                    {/* Grid lines */}
                    {timeSlots.map((slot, index) => (
                      <View
                        key={index}
                        style={[
                          styles.gridCell,
                          { height: SLOT_HEIGHT, borderColor: theme.dark ? '#2C2C2E' : '#E5E5EA' },
                        ]}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isTodayDate && (
                      <View
                        style={[
                          styles.currentTimeIndicator,
                          { top: currentTimePosition, backgroundColor: theme.colors.primary },
                        ]}
                      />
                    )}

                    {/* Appointments for all audiologists */}
                    {selectedAudiologists.map((audiologist, audiologistIndex) => {
                      const audiologistAppointments = appointmentsByDateAndAudiologist[dateKey]?.[audiologist.user_id] || [];
                      const color = getAudiologistColor(audiologist.user_id);
                      const numAudiologists = selectedAudiologists.length;
                      const appointmentWidth = (dayWidth - 4) / numAudiologists;
                      const leftOffset = 2 + (audiologistIndex * appointmentWidth);

                      return (
                        <React.Fragment key={audiologist.user_id}>
                          {audiologistAppointments.map((appointment) => {
                            const position = getAppointmentPosition(appointment);
                                const DateStringToDate = new Date(appointment.DateAppointment);
    const time = {hour: DateStringToDate.getHours(), minute: DateStringToDate.getMinutes()};
                            const timeText = `${time.hour % 12 || 12}:${time.minute.toString().padStart(2, '0')}`;

                            return (
                              <TouchableOpacity
                                key={appointment.AppointmentID}
                                style={[
                                  styles.appointmentBlock,
                                  {
                                    top: position.top,
                                    left: leftOffset,
                                    width: appointmentWidth - 2,
                                    height: Math.max(position.height, 30),
                                    backgroundColor: color,
                                  },
                                ]}
                                onPress={() => onAppointmentPress?.(appointment)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.appointmentTime} numberOfLines={1}>
                                  {timeText}
                                </Text>
                                <Text style={styles.appointmentClient} numberOfLines={1}>
                                  {appointment.ClientName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.footerText, { color: theme.dark ? '#98989D' : '#666' }]}>
            Swipe to navigate • {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} this week
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  dayHeadersContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 20,
  },
  dayHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentCountBadge: {
    position: 'absolute',
    top: 8,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  appointmentCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  timelineContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  timeLabelsColumn: {
    paddingTop: 0,
  },
  timeSlot: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
  },
  timeLabel: {
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '500',
  },
  daysGridContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  dayColumn: {
    position: 'relative',
  },
  gridCell: {
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
  },
  appointmentBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 4,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  appointmentTime: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appointmentClient: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
