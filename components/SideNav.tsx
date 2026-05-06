
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_NAV_WIDTH = SCREEN_WIDTH * 0.75;

interface SideNavProps {
  visible: boolean;
  onClose: () => void;
}

export default function SideNav({ visible, onClose }: SideNavProps) {
  const theme = useTheme();
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-SIDE_NAV_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: -SIDE_NAV_WIDTH,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    }
  }, [visible, slideAnim]);

  const menuItems = [
    {
      label: 'New Appointment',
      androidIcon: 'event',
      iosIcon: 'calendar',
      route: '/create-appointment',
    },
    {
      label: 'Search Client',
      androidIcon: 'search',
      iosIcon: 'magnifyingglass',
      route: '/search-client',
    },
    {
      label: 'New Client',
      androidIcon: 'person-add',
      iosIcon: 'person.badge.plus',
      route: '/new-client',
    },
    {
      label: 'Room Planner',
      androidIcon: 'meeting-room',
      iosIcon: 'building.2',
      route: '/room-planner',
      disabled: true,
    },
    {
      label: 'Profile',
      androidIcon: 'person',
      iosIcon: 'person.fill',
      route: '/profile',
    }
  ];

  function handleMenuItemPress(route: string) {
    console.log('Menu item pressed:', route);
    onClose();
    router.push(route as any);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint={theme.dark ? 'dark' : 'light'}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.sideNavContainer,
            {
              backgroundColor: theme.colors.card,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <IconSymbol
                ios_icon_name="line.3.horizontal"
                android_material_icon_name="menu"
                size={28}
                color={theme.colors.primary}
              />
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                Menu
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: `${theme.colors.primary}20` }]}
              onPress={onClose}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.menuItems}>
            {menuItems.map((item, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      opacity: item.disabled ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (!item.disabled) handleMenuItemPress(item.route);
                  }}
                  disabled={item.disabled}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <IconSymbol
                      ios_icon_name={item.iosIcon as any}
                      android_material_icon_name={item.androidIcon as any}
                      size={24}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                    {item.label} {item.disabled && '(Coming Soon)'}
                  </Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={theme.dark ? '#98989D' : '#666'}
                  />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideNavContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDE_NAV_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 56 : 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItems: {
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
