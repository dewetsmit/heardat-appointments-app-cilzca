
import React, { useState, useEffect } from 'react';
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
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/contexts/AppointmentContext';
import { apiRequest, getAuthHeader } from '@/utils/api';
import { Audiologist } from '@/types';

export function AudiologistSelector() {
  const theme = useTheme();
  const { token, user } = useAuth();
  const { selectedAudiologistIds, toggleAudiologistSelection } = useAppointments();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [audiologists, setAudiologists] = useState<Audiologist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token && user) {
      loadAudiologists();
    }
  }, [token, user]);

  async function loadAudiologists() {
    console.log('Loading audiologists...');
    setIsLoading(true);
    try {
      const params = user?.practice_id ? `?practice_id=${user.practice_id}` : '';
      const data = await apiRequest(`/api/audiologists${params}`, {
        headers: getAuthHeader(token!),
      });
      setAudiologists(data);
      console.log('Audiologists loaded:', data.length);
    } catch (error) {
      console.error('Failed to load audiologists:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCount = selectedAudiologistIds.length;
  const allSelected = selectedCount === audiologists.length && audiologists.length > 0;
  const buttonText =
    selectedCount === 0
      ? 'All Audiologists'
      : selectedCount === 1
      ? '1 Audiologist'
      : `${selectedCount} Audiologists`;

  return (
    <React.Fragment>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => setIsModalVisible(true)}
      >
        <IconSymbol
          ios_icon_name="person.2.fill"
          android_material_icon_name="group"
          size={20}
          color={theme.colors.primary}
        />
        <Text style={[styles.buttonText, { color: theme.colors.text }]}>{buttonText}</Text>
        <IconSymbol
          ios_icon_name="chevron.down"
          android_material_icon_name="arrow-drop-down"
          size={20}
          color={theme.dark ? '#98989D' : '#666'}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Audiologists
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="close"
                  size={28}
                  color={theme.dark ? '#98989D' : '#666'}
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.audiologistList}>
                {audiologists.map((audiologist) => {
                  const isSelected = selectedAudiologistIds.includes(audiologist.id);
                  return (
                    <TouchableOpacity
                      key={audiologist.id}
                      style={[
                        styles.audiologistItem,
                        { borderBottomColor: theme.colors.border },
                      ]}
                      onPress={() => toggleAudiologistSelection(audiologist.id)}
                    >
                      <View style={styles.audiologistInfo}>
                        <Text style={[styles.audiologistName, { color: theme.colors.text }]}>
                          {audiologist.full_name}
                        </Text>
                        {audiologist.specialization && (
                          <Text
                            style={[styles.audiologistSpecialization, { color: theme.dark ? '#98989D' : '#666' }]}
                          >
                            {audiologist.specialization}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
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

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  buttonText: {
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
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  audiologistList: {
    maxHeight: 400,
  },
  audiologistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  audiologistInfo: {
    flex: 1,
    gap: 4,
  },
  audiologistName: {
    fontSize: 16,
    fontWeight: '600',
  },
  audiologistSpecialization: {
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
