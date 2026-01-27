
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

interface Appointment {
  AppointmentID: string;
  ClientName: string;
  UserName: string;
  TimeAppointment: string;
  Duration?: number;
  Status?: string;
}

interface CalendarDayViewProps {
  selectedDate: string;
  appointments: Appointment[];
  onAppointmentPress?: (appointment: Appointment) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const MIN_SLOT_HEIGHT = 40; // 60-minute slots
const DEFAULT_SLOT_HEIGHT = 60; // 30-minute slots
const MAX_SLOT_HEIGHT = 120; // 15-minute slots

export function CalendarDayView({ selectedDate, appointments, onAppointmentPress }: CalendarDayViewProps) {
  const theme = useTheme();
  const [slotHeight, setSlotHeight] = useState(DEFAULT_SLOT_HEIGHT);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate time slots based on current zoom level
  const generateTimeSlots = () => {
    const slots = [];
    let interval = 30; // Default 30-minute intervals
    
    if (slotHeight <= MIN_SLOT_HEIGHT) {
      interval = 60; // 60-minute intervals (zoomed out)
    } else if (slotHeight >= MAX_SLOT_HEIGHT) {
      interval = 15; // 15-minute intervals (zoomed in)
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
    const time = parseTime(appointment.TimeAppointment);
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

              {/* Grid and appointments */}
              <View style={styles.gridColumn}>
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
                  >
                    <View style={[styles.currentTimeDot, { backgroundColor: theme.colors.primary }]} />
                    <View style={[styles.currentTimeLine, { backgroundColor: theme.colors.primary }]} />
                  </View>
                )}

                {/* Appointments */}
                {appointments.map((appointment) => {
                  const position = getAppointmentPosition(appointment);
                  const timeText = formatTimeDisplay(
                    parseTime(appointment.TimeAppointment).hour,
                    parseTime(appointment.TimeAppointment).minute
                  );

                  return (
                    <TouchableOpacity
                      key={appointment.AppointmentID}
                      style={[
                        styles.appointmentBlock,
                        {
                          top: position.top,
                          height: Math.max(position.height, 40),
                          backgroundColor: theme.colors.primary,
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
                      {position.height > 60 && (
                        <Text style={styles.appointmentAudiologist} numberOfLines={1}>
                          {appointment.UserName}
                        </Text>
                      )}
                    </TouchableOpacity>
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
  calendarContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  timelineContainer: {
    flexDirection: 'row',
  },
  timeLabelsColumn: {
    width: 70,
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
  gridColumn: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    borderTopWidth: 1,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
  },
  appointmentBlock: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 8,
    padding: 8,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  appointmentTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  appointmentClient: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appointmentAudiologist: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
