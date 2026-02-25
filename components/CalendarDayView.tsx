
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/IconSymbol';
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

interface CalendarDayViewProps {
  selectedDate: string;
  appointments: Appointment[];
  selectedAudiologists: Audiologist[];
  onAppointmentPress?: (appointment: Appointment) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const MIN_SLOT_HEIGHT = 40;
const DEFAULT_SLOT_HEIGHT = 60;
const MAX_SLOT_HEIGHT = 120;
const TIME_COLUMN_WIDTH = 70;

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

export function CalendarDayView({ selectedDate, appointments, selectedAudiologists, onAppointmentPress }: CalendarDayViewProps) {
  const theme = useTheme();
  const [slotHeight, setSlotHeight] = useState(DEFAULT_SLOT_HEIGHT);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate time slots based on current zoom level
  const generateTimeSlots = () => {
    const slots = [];
    let interval = 30;
    
    if (slotHeight <= MIN_SLOT_HEIGHT) {
      interval = 60;
    } else if (slotHeight >= MAX_SLOT_HEIGHT) {
      interval = 15;
    }

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          displayTime: formatTimeDisplay(hour, minute),
        });
      }
    }
    
    return slots;
  };

  const formatTimeDisplay = (hour: number, minute: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute === 0 ? '00' : minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
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
    const minutesPerSlot = slotHeight <= MIN_SLOT_HEIGHT ? 60 : slotHeight >= MAX_SLOT_HEIGHT ? 15 : 30;
    const pixelsPerMinute = slotHeight / minutesPerSlot;
    
    const top = totalMinutes * pixelsPerMinute;
    const duration = appointment.Duration || 30;
    const height = duration * pixelsPerMinute;
    
    return { top, height };
  };

  const updateSlotHeight = (newHeight: number) => {
    const clampedHeight = Math.max(MIN_SLOT_HEIGHT, Math.min(MAX_SLOT_HEIGHT, newHeight));
    setSlotHeight(clampedHeight);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      const newHeight = slotHeight * scale.value;
      runOnJS(updateSlotHeight)(newHeight);
      savedScale.value = 1;
      scale.value = 1;
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const timeSlots = generateTimeSlots();
  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimePosition = (currentHour * 60 + currentMinute) * (slotHeight / (slotHeight <= MIN_SLOT_HEIGHT ? 60 : slotHeight >= MAX_SLOT_HEIGHT ? 15 : 30));

  const isToday = new Date(selectedDate).toDateString() === new Date().toDateString();

  const dateDisplay = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const intervalText = slotHeight <= MIN_SLOT_HEIGHT ? '60 min' : slotHeight >= MAX_SLOT_HEIGHT ? '15 min' : '30 min';

  // Calculate column width based on number of audiologists
  const numAudiologists = selectedAudiologists.length;
  const availableWidth = SCREEN_WIDTH - TIME_COLUMN_WIDTH - 40;
  const columnWidth = availableWidth / numAudiologists;

  // Group appointments by audiologist
  const appointmentsByAudiologist: { [key: string]: Appointment[] } = {};
  selectedAudiologists.forEach((audiologist) => {
    appointmentsByAudiologist[audiologist.user_id] = appointments.filter(
      (apt) => apt.audiologistId === audiologist.user_id
    );
  });

  // Get color for audiologist
  const getAudiologistColor = (index: number): string => {
    return AUDIOLOGIST_COLORS[index % AUDIOLOGIST_COLORS.length];
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          {dateDisplay}
        </Text>
        <View style={styles.zoomIndicator}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={16}
            color={theme.dark ? '#98989D' : '#666'}
          />
          <Text style={[styles.zoomText, { color: theme.dark ? '#98989D' : '#666' }]}>
            {intervalText}
          </Text>
        </View>
      </View>

      {/* Audiologist headers */}
      <View style={[styles.audiologistHeaders, { backgroundColor: theme.colors.card }]}>
        <View style={{ width: TIME_COLUMN_WIDTH }} />
        {selectedAudiologists.map((audiologist, index) => {
          const color = getAudiologistColor(index);
          const appointmentCount = appointmentsByAudiologist[audiologist.user_id]?.length || 0;
          
          return (
            <View key={audiologist.user_id} style={[styles.audiologistHeader, { width: columnWidth }]}>
              <View style={[styles.audiologistColorDot, { backgroundColor: color }]} />
              <Text style={[styles.audiologistName, { color: theme.colors.text }]} numberOfLines={1}>
                {audiologist.full_name}
              </Text>
              {appointmentCount > 0 && (
                <View style={[styles.appointmentCountBadge, { backgroundColor: color }]}>
                  <Text style={styles.appointmentCountText}>
                    {appointmentCount}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[styles.calendarContainer, animatedStyle]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View style={styles.timelineContainer}>
              {/* Time labels */}
              <View style={styles.timeLabelsColumn}>
                {timeSlots.map((slot, index) => (
                  <View key={index} style={[styles.timeSlot, { height: slotHeight }]}>
                    <Text style={[styles.timeLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                      {slot.displayTime}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Audiologist columns */}
              <View style={styles.columnsContainer}>
                {selectedAudiologists.map((audiologist, audiologistIndex) => {
                  const color = getAudiologistColor(audiologistIndex);
                  const audiologistAppointments = appointmentsByAudiologist[audiologist.user_id] || [];

                  return (
                    <View key={audiologist.user_id} style={[styles.audiologistColumn, { width: columnWidth }]}>
                      {/* Grid lines */}
                      {timeSlots.map((slot, index) => (
                        <View
                          key={index}
                          style={[
                            styles.gridLine,
                            { height: slotHeight, borderTopColor: theme.dark ? '#2C2C2E' : '#E5E5EA' },
                          ]}
                        />
                      ))}

                      {/* Current time indicator */}
                      {isToday && (
                        <View
                          style={[
                            styles.currentTimeIndicator,
                            { top: currentTimePosition, backgroundColor: theme.colors.primary },
                          ]}
                        />
                      )}

                      {/* Appointments */}
                      {audiologistAppointments.map((appointment) => {
                        console.log('[CalendarDayView]', appointment);
                        const position = getAppointmentPosition(appointment);
                        const DateStringToDate = new Date(appointment.DateAppointment);
                        const time = {hour: DateStringToDate.getHours(), minute: DateStringToDate.getMinutes()};
                        const timeText = formatTimeDisplay(time.hour, time.minute);

                        return (
                          <TouchableOpacity
                            key={appointment.AppointmentID}
                            style={[
                              styles.appointmentBlock,
                              {
                                top: position.top,
                                height: Math.max(position.height, 40),
                                backgroundColor: color,
                              },
                            ]}
                            onPress={() => onAppointmentPress?.(appointment)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.appointmentTime} numberOfLines={1}>
                              {timeText}
                            </Text>
                            <Text style={styles.appointmentClient} numberOfLines={2}>
                              {appointment.Type}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      <View style={[styles.footer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.footerText, { color: theme.dark ? '#98989D' : '#666' }]}>
          Pinch to zoom • {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </Text>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  zoomIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '600',
  },
  audiologistHeaders: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  audiologistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  audiologistColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  audiologistName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  appointmentCountBadge: {
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
  calendarContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  timelineContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  timeLabelsColumn: {
    width: TIME_COLUMN_WIDTH,
    paddingTop: 0,
  },
  timeSlot: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 8,
  },
  timeLabel: {
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  audiologistColumn: {
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  gridLine: {
    borderTopWidth: 1,
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
    left: 2,
    right: 2,
    borderRadius: 6,
    padding: 6,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  appointmentTime: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  appointmentClient: {
    fontSize: 11,
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
