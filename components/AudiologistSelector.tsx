
import { useAppointments } from '@/contexts/AppointmentContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { Audiologist } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { heardatApiCall } from '@/utils/api';

export function AudiologistSelector() {
  const theme = useTheme();
  const { user } = useAuth();
  const { selectedAudiologists, setSelectedAudiologists, toggleAudiologistSelection } = useAppointments();

  const [modalVisible, setModalVisible] = useState(false);
  const [audiologists, setAudiologists] = useState<Audiologist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAudiologists = useCallback(async () => {
    if (!user) {
      console.log('[AudiologistSelector] User not available, skipping audiologist load');
      return;
    }

    console.log('[AudiologistSelector] Loading audiologists');
    try {
      setIsLoading(true);

      const params = {
        Deleted: '0',
        Active: '1',
      };

      const data = await heardatApiCall('Users', params);
      console.log('[AudiologistSelector] Audiologists API raw response:', data);

      // Parse the response if it's a string
      let parsedData = data;
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      }

      console.log('[AudiologistSelector] Parsed audiologists data:', parsedData);

      // Check if we have a users array in the response
      if (parsedData && parsedData.users && Array.isArray(parsedData.users)) {
        const mappedAudiologists: Audiologist[] = parsedData.users.map((user: any) => ({
          id: user.UserID?.toString() || user.id,
          user_id: user.UserID?.toString() || user.id,
          full_name: user.Name || user.FullName || 'Unknown',
          specialization: user.Specialization || '',
          is_active: user.Active === '1' || user.is_active === true,
        }));
        
        console.log('[AudiologistSelector] Audiologists loaded:', mappedAudiologists.length);
        setAudiologists(mappedAudiologists);
        
        // Initialize selectedAudiologists if empty
        if (!selectedAudiologists || selectedAudiologists.length === 0) {
          console.log('[AudiologistSelector] Initializing selectedAudiologists with all audiologists');
          setSelectedAudiologists(mappedAudiologists);
        }
      } else if (Array.isArray(parsedData)) {
        // Fallback: if data is directly an array
        console.log('[AudiologistSelector] Data is array, mapping directly');
        const mappedAudiologists: Audiologist[] = parsedData.map((user: any) => ({
          id: user.UserID?.toString() || user.id,
          user_id: user.UserID?.toString() || user.id,
          full_name: user.Name || user.FullName || 'Unknown',
          specialization: user.Specialization || '',
          is_active: user.Active === '1' || user.is_active === true,
        }));
        
        console.log('[AudiologistSelector] Audiologists loaded:', mappedAudiologists.length);
        setAudiologists(mappedAudiologists);
        
        if (!selectedAudiologists || selectedAudiologists.length === 0) {
          console.log('[AudiologistSelector] Initializing selectedAudiologists with all audiologists');
          setSelectedAudiologists(mappedAudiologists);
        }
      } else {
        console.log('[AudiologistSelector] No audiologists data in response');
        setAudiologists([]);
      }
    } catch (error) {
      console.error('[AudiologistSelector] Failed to load audiologists:', error);
      setAudiologists([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedAudiologists, setSelectedAudiologists]);

  useEffect(() => {
    if (modalVisible) {
      loadAudiologists();
    }
  }, [modalVisible, loadAudiologists]);

  // Ensure selectedAudiologists is always an array
  const selectedCount = (selectedAudiologists || []).length;
  const displayText = selectedCount === 0 ? 'All' : `${selectedCount} selected`;

  return (
    <React.Fragment>
      <TouchableOpacity
        style={[styles.selectorButton, { backgroundColor: `${theme.colors.primary}20` }]}
        onPress={() => {
          console.log('[AudiologistSelector] Selector button pressed');
          setModalVisible(true);
        }}
      >
        <IconSymbol
          ios_icon_name="person.2.fill"
          android_material_icon_name="group"
          size={20}
          color={theme.colors.primary}
        />
        <Text style={[styles.selectorText, { color: theme.colors.primary }]}>
          {displayText}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Audiologists
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: `${theme.colors.primary}20` }]}
                onPress={() => {
                  console.log('[AudiologistSelector] Closing modal');
                  setModalVisible(false);
                }}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.dark ? '#98989D' : '#666' }]}>
                  Loading audiologists...
                </Text>
              </View>
            ) : audiologists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  ios_icon_name="person.slash"
                  android_material_icon_name="person-off"
                  size={48}
                  color={theme.dark ? '#98989D' : '#666'}
                />
                <Text style={[styles.emptyText, { color: theme.dark ? '#98989D' : '#666' }]}>
                  No audiologists found
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.audiologistList}>
                {audiologists.map((audiologist) => {
                  const isSelected = (selectedAudiologists || []).some((a) => a.id === audiologist.id);

                  return (
                    <TouchableOpacity
                      key={audiologist.id}
                      style={[
                        styles.audiologistItem,
                        isSelected && { backgroundColor: `${theme.colors.primary}10` },
                      ]}
                      onPress={() => {
                        console.log('[AudiologistSelector] Toggling audiologist:', audiologist.full_name);
                        toggleAudiologistSelection(audiologist);
                      }}
                    >
                      <View style={styles.audiologistInfo}>
                        <View
                          style={[
                            styles.audiologistIcon,
                            { backgroundColor: `${theme.colors.primary}20` },
                          ]}
                        >
                          <IconSymbol
                            ios_icon_name="person.fill"
                            android_material_icon_name="person"
                            size={24}
                            color={theme.colors.primary}
                          />
                        </View>
                        <Text style={[styles.audiologistName, { color: theme.colors.text }]}>
                          {audiologist.full_name}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <IconSymbol
                            ios_icon_name="checkmark"
                            android_material_icon_name="check"
                            size={16}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  audiologistList: {
    paddingHorizontal: 20,
  },
  audiologistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  audiologistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  audiologistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audiologistName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
