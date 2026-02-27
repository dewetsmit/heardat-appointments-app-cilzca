
import { useTheme } from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { Audiologist } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';

interface Appointment {
  AppointmentID: string;
  ClientName: string;
  UserName: string;
  DateAppointment: string;
  Duration?: string;
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
const START_HOUR = 6; // 6am
const END_HOUR = 19; // 7pm (19:00)

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

// Helper to parse duration string (HH:MM:SS) to minutes
function parseDurationToMinutes(duration: string | undefined): number {
  if (!duration) return 30;
  
  const parts = duration.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }
  
  return 30;
}

// Check if appointment is a full-day event (> 8 hours)
function isFullDayEvent(duration: string | undefined): boolean {
  const minutes = parseDurationToMinutes(duration);
  return minutes > 480; // 8 hours = 480 minutes
}

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
  const [legendModalVisible, setLegendModalVisible] = useState(false);

  // Separate full-day events from regular appointments
  const fullDayEvents = appointments.filter(apt => isFullDayEvent(apt.Duration));
  const regularAppointments = appointments.filter(apt => !isFullDayEvent(apt.Duration));

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

  // Generate time slots (6am to 7pm)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
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
    
    // Calculate minutes from START_HOUR (6am)
    const totalMinutesFromStart = (time.hour - START_HOUR) * 60 + time.minute;
    const pixelsPerMinute = SLOT_HEIGHT / 60;
    
    const top = totalMinutesFromStart * pixelsPerMinute;
    const durationMinutes = parseDurationToMinutes(appointment.Duration);
    const height = durationMinutes * pixelsPerMinute;
    
    return { top, height };
  };

  // Group appointments by date and audiologist
  const appointmentsByDateAndAudiologist: { [dateKey: string]: { [audiologistId: string]: Appointment[] } } = {};
  const fullDayEventsByDate: { [dateKey: string]: Appointment[] } = {};
  
  weekDates.forEach((date) => {
    const dateKey = formatDateKey(date);
    appointmentsByDateAndAudiologist[dateKey] = {};
    fullDayEventsByDate[dateKey] = [];
    
    selectedAudiologists.forEach((audiologist) => {
      appointmentsByDateAndAudiologist[dateKey][audiologist.user_id] = regularAppointments.filter((apt) => {
        const aptDate = new Date(apt.DateAppointment);
        const aptDateKey = formatDateKey(aptDate);
        return aptDateKey === dateKey && apt.audiologistId === audiologist.user_id;
      });
    });

    // Get full-day events for this date
    fullDayEventsByDate[dateKey] = fullDayEvents.filter((apt) => {
      const aptDate = new Date(apt.DateAppointment);
      const aptDateKey = formatDateKey(aptDate);
      return aptDateKey === dateKey;
    });
  });

  const timeSlots = generateTimeSlots();
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  
  // Calculate current time position relative to START_HOUR
  const currentMinutesFromStart = (currentHour - START_HOUR) * 60 + currentMinute;
  const currentTimePosition = currentMinutesFromStart * (SLOT_HEIGHT / 60);

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const weekDisplay = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Get color for audiologist
  const getAudiologistColor = (audiologistId: string): string => {
    const index = selectedAudiologists.findIndex((a) => a.user_id === audiologistId);
    return AUDIOLOGIST_COLORS[index % AUDIOLOGIST_COLORS.length];
  };

  // Calculate total appointments per audiologist for legend
  const appointmentCountsByAudiologist: { [audiologistId: string]: number } = {};
  selectedAudiologists.forEach((audiologist) => {
    let count = 0;
    weekDates.forEach((date) => {
      const dateKey = formatDateKey(date);
      const dayAppointments = appointmentsByDateAndAudiologist[dateKey]?.[audiologist.user_id] || [];
      count += dayAppointments.length;
    });
    appointmentCountsByAudiologist[audiologist.user_id] = count;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: `${theme.colors.primary}20` }]}
          onPress={onSwipeRight}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="chevron-left"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={[styles.weekText, { color: theme.colors.text }]}>
          {weekDisplay}
        </Text>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: `${theme.colors.primary}20` }]}
          onPress={onSwipeLeft}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.legendButton, { backgroundColor: `${theme.colors.primary}20` }]}
          onPress={() => {
            console.log('[CalendarWeekView] Legend button tapped');
            setLegendModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={20}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={[styles.dayHeadersContainer, { backgroundColor: theme.colors.card }]}>
        <View style={{ width: TIME_COLUMN_WIDTH }} />
        {weekDates.map((date, index) => {
          const CalDateStringToDate = new Date(date);
          const dateKey = formatDateKey(CalDateStringToDate);
          const dayAppointments = regularAppointments.filter((apt) => {
            const AptDateStringToDate = new Date(apt.DateAppointment);
            const aptDateKey = formatDateKey(AptDateStringToDate);
            return aptDateKey === dateKey;
          });
          const dayFullDayEvents = fullDayEventsByDate[dateKey] || [];
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
              {(dayAppointments.length > 0 || dayFullDayEvents.length > 0) && (
                <View style={styles.appointmentCountBadge}>
                  <Text style={styles.appointmentCountText}>
                    {dayAppointments.length + dayFullDayEvents.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Full-day events row */}
      {fullDayEvents.length > 0 && (
        <View style={[styles.fullDayEventsRow, { backgroundColor: theme.colors.card }]}>
          <View style={{ width: TIME_COLUMN_WIDTH, paddingRight: 8 }}>
            <Text style={[styles.fullDayLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
              All Day
            </Text>
          </View>
          <View style={styles.fullDayEventsGrid}>
            {weekDates.map((date, index) => {
              const dateKey = formatDateKey(date);
              const dayFullDayEvents = fullDayEventsByDate[dateKey] || [];

              return (
                <View key={index} style={[styles.fullDayEventCell, { width: dayWidth }]}>
                  {dayFullDayEvents.map((event) => {
                    const color = getAudiologistColor(event.audiologistId || '');
                    
                    return (
                      <TouchableOpacity
                        key={event.AppointmentID}
                        style={[styles.fullDayEventBadge, { backgroundColor: color }]}
                        onPress={() => onAppointmentPress?.(event)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.fullDayEventText} numberOfLines={1}>
                          {event.Type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
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
              const showCurrentTimeIndicator = isTodayDate && currentHour >= START_HOUR && currentHour <= END_HOUR;

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
                  {showCurrentTimeIndicator && (
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
          Tap arrows to navigate • Tap info for legend • {regularAppointments.length} appointment{regularAppointments.length !== 1 ? 's' : ''} this week
        </Text>
      </View>

      {/* Legend Modal */}
      <Modal
        visible={legendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLegendModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.legendModalOverlay}
          activeOpacity={1}
          onPress={() => setLegendModalVisible(false)}
        >
          <View style={[styles.legendModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.legendModalHeader}>
              <Text style={[styles.legendModalTitle, { color: theme.colors.text }]}>
                Audiologist Legend
              </Text>
              <TouchableOpacity
                style={[styles.legendCloseButton, { backgroundColor: `${theme.colors.primary}20` }]}
                onPress={() => setLegendModalVisible(false)}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.legendList}>
              {selectedAudiologists.map((audiologist, index) => {
                const color = getAudiologistColor(audiologist.user_id);
                const appointmentCount = appointmentCountsByAudiologist[audiologist.user_id] || 0;

                return (
                  <View key={audiologist.user_id} style={styles.legendItem}>
                    <View style={[styles.legendColorBox, { backgroundColor: color }]} />
                    <View style={styles.legendTextContainer}>
                      <Text style={[styles.legendName, { color: theme.colors.text }]}>
                        {audiologist.full_name}
                      </Text>
                      <Text style={[styles.legendCount, { color: theme.dark ? '#98989D' : '#666' }]}>
                        {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''} this week
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  legendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  fullDayEventsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  fullDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    paddingTop: 4,
  },
  fullDayEventsGrid: {
    flex: 1,
    flexDirection: 'row',
  },
  fullDayEventCell: {
    paddingHorizontal: 2,
    gap: 4,
  },
  fullDayEventBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  fullDayEventText: {
    fontSize: 9,
    fontWeight: '600',
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
  legendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  legendModalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  legendModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  legendModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  legendCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendList: {
    maxHeight: 400,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  legendColorBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  legendCount: {
    fontSize: 13,
  },
});
