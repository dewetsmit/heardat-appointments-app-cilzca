
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import SideNav from '@/components/SideNav';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [sideNavVisible, setSideNavVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  async function handleLogout() {
    console.log('User initiated logout');
    setLogoutModalVisible(true);
  }

  async function confirmLogout() {
    setLogoutModalVisible(false);
    try {
      await signOut();
      console.log('Logout successful, navigating to auth');
      router.replace('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Extract username from Login property and email from Email property
  const usernameDisplay = user?.Login || user?.Username || user?.username || 'N/A';
  const emailDisplay = user?.Email || user?.email || 'N/A';
  const fullNameDisplay = user?.full_name || user?.name || 'User';
  const roleText = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';

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
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar,
        ]}
      >
        <View style={[styles.profileCard, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={48}
              color="#FFFFFF"
            />
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {fullNameDisplay}
          </Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>
            {emailDisplay}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Text style={[styles.roleText, { color: theme.colors.primary }]}>
              {roleText}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Account Information
          </Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <IconSymbol
                  ios_icon_name="person.text.rectangle"
                  android_material_icon_name="badge"
                  size={20}
                  color={theme.dark ? '#98989D' : '#666'}
                />
                <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                  Username
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {usernameDisplay}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <IconSymbol
                  ios_icon_name="envelope.fill"
                  android_material_icon_name="email"
                  size={20}
                  color={theme.dark ? '#98989D' : '#666'}
                />
                <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                  Email
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {emailDisplay}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <IconSymbol
                  ios_icon_name="briefcase.fill"
                  android_material_icon_name="work"
                  size={20}
                  color={theme.dark ? '#98989D' : '#666'}
                />
                <Text style={[styles.infoLabel, { color: theme.dark ? '#98989D' : '#666' }]}>
                  Role
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {roleText}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: '#FF6B6B' }]}
          onPress={handleLogout}
        >
          <IconSymbol
            ios_icon_name="arrow.right.square.fill"
            android_material_icon_name="logout"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.logoutButtonText}>
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <SideNav visible={sideNavVisible} onClose={() => setSideNavVisible(false)} />

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Logout
            </Text>
            <Text style={[styles.modalMessage, { color: theme.dark ? '#98989D' : '#666' }]}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FF6B6B' }]}
                onPress={confirmLogout}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 16,
  },
  menuButton: {
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
    gap: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 32,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoList: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalMessage: {
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
