
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';

interface FABMenuProps {
  onCreateAppointment?: () => void;
  onCreateClient?: () => void;
}

export function FABMenu({ onCreateAppointment, onCreateClient }: FABMenuProps) {
  const theme = useTheme();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.spring(animation, {
      toValue,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    setIsOpen(!isOpen);
  };

  const handleCreateAppointment = () => {
    console.log('[FABMenu] Create Appointment pressed');
    setIsOpen(false);
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (onCreateAppointment) {
        onCreateAppointment();
      } else {
        router.push('/create-appointment');
      }
    });
  };

  const handleCreateClient = () => {
    console.log('[FABMenu] Create Client pressed');
    setIsOpen(false);
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (onCreateClient) {
        onCreateClient();
      } else {
        router.push('/new-client');
      }
    });
  };

  const appointmentTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const clientTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <>
      {isOpen && (
        <Modal
          transparent
          visible={isOpen}
          animationType="none"
          onRequestClose={toggleMenu}
        >
          <TouchableWithoutFeedback onPress={toggleMenu}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        </Modal>
      )}

      <View style={styles.fabContainer}>
        <Animated.View
          style={[
            styles.menuItem,
            {
              transform: [{ translateY: clientTranslateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
            onPress={handleCreateClient}
            activeOpacity={0.8}
          >
            <IconSymbol
              ios_icon_name="person.badge.plus"
              android_material_icon_name="person-add"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.menuLabel, { color: theme.colors.text }]}>
              Create Client
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.menuItem,
            {
              transform: [{ translateY: appointmentTranslateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
            onPress={handleCreateAppointment}
            activeOpacity={0.8}
          >
            <IconSymbol
              ios_icon_name="calendar.badge.plus"
              android_material_icon_name="event"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.menuLabel, { color: theme.colors.text }]}>
              Create Appointment
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <IconSymbol
              ios_icon_name="plus"
              android_material_icon_name="add"
              size={28}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    gap: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
