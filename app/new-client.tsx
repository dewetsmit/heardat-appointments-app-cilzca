
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import DateTimePicker from '@react-native-community/datetimepicker';
import { heardatApiCall, getHeardatCredentials, getBranches, createNewPatient } from '@/utils/api';

interface DropdownOption {
  id: string;
  label: string;
}

const GENDER_OPTIONS: DropdownOption[] = [
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Other', label: 'Other' },
];

const LANGUAGE_OPTIONS: DropdownOption[] = [
  { id: 'English', label: 'English' },
  { id: 'Afrikaans', label: 'Afrikaans' },
  { id: 'Zulu', label: 'Zulu' },
  { id: 'Xhosa', label: 'Xhosa' },
  { id: 'Other', label: 'Other' },
];

const TITLE_OPTIONS: DropdownOption[] = [
  { id: 'Mr', label: 'Mr' },
  { id: 'Mrs', label: 'Mrs' },
  { id: 'Ms', label: 'Ms' },
  { id: 'Dr', label: 'Dr' },
  { id: 'Prof', label: 'Prof' },
];

const MAIN_MEMBER_OPTIONS: DropdownOption[] = [
  { id: 'Yes', label: 'Yes' },
  { id: 'No', label: 'No' },
];

export default function NewClientScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Client form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initials, setInitials] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [cellphoneNumber, setCellphoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [selectedGender, setSelectedGender] = useState<DropdownOption | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<DropdownOption | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<DropdownOption | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<DropdownOption | null>(null);
  const [medicalAid, setMedicalAid] = useState('');
  const [medicalAidPlan, setMedicalAidPlan] = useState('');
  const [memberNumber, setMemberNumber] = useState('');
  const [selectedMainMember, setSelectedMainMember] = useState<DropdownOption | null>(null);

  // Main member form fields (shown when client is not main member)
  const [mmFirstName, setMmFirstName] = useState('');
  const [mmLastName, setMmLastName] = useState('');
  const [mmInitials, setMmInitials] = useState('');
  const [mmIdNumber, setMmIdNumber] = useState('');
  const [mmDateOfBirth, setMmDateOfBirth] = useState(new Date());
  const [mmCellphoneNumber, setMmCellphoneNumber] = useState('');
  const [mmEmail, setMmEmail] = useState('');
  const [mmSelectedGender, setMmSelectedGender] = useState<DropdownOption | null>(null);
  const [mmSelectedLanguage, setMmSelectedLanguage] = useState<DropdownOption | null>(null);
  const [mmSelectedTitle, setMmSelectedTitle] = useState<DropdownOption | null>(null);
  const [mmSelectedBranch, setMmSelectedBranch] = useState<DropdownOption | null>(null);
  const [mmMedicalAid, setMmMedicalAid] = useState('');
  const [mmMedicalAidPlan, setMmMedicalAidPlan] = useState('');
  const [mmMemberNumber, setMmMemberNumber] = useState('');

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMmDatePicker, setShowMmDatePicker] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [branches, setBranches] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      setLoadingBranches(true);
      console.log('[NewClient] Loading branches');
      const branchesData = await getBranches();
      const branchOptions = branchesData.map((branch: any) => ({
        id: branch.BranchID,
        label: branch.Name,
      }));
      setBranches(branchOptions);
      console.log('[NewClient] Branches loaded:', branchOptions.length);
    } catch (error) {
      console.error('[NewClient] Failed to load branches:', error);
      Alert.alert('Error', 'Failed to load branches. Please try again.');
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleMmDateChange = (event: any, selectedDate?: Date) => {
    setShowMmDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setMmDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const isNotMainMember = selectedMainMember?.id === 'No';

  const isFormValid = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    idNumber.trim() &&
    cellphoneNumber.trim() &&
    selectedBranch &&
    selectedMainMember &&
    (!isNotMainMember || (
      mmFirstName.trim() &&
      mmLastName.trim() &&
      mmIdNumber.trim()
    ))
  );

  const handleSubmit = async () => {
    console.log('[NewClient] Submit button pressed');

    // Validation
    if (!firstName.trim()) {
      setErrorMessage('First Name is required');
      return;
    }
    if (!lastName.trim()) {
      setErrorMessage('Last Name is required');
      return;
    }
    if (!idNumber.trim()) {
      setErrorMessage('ID Number is required');
      return;
    }
    if (!cellphoneNumber.trim()) {
      setErrorMessage('Cellphone Number is required');
      return;
    }
    if (!selectedBranch) {
      setErrorMessage('Branch is required');
      return;
    }
    if (!selectedMainMember) {
      setErrorMessage('Please specify if client is main member');
      return;
    }

    // Validate main member details if not main member
    if (isNotMainMember) {
      if (!mmFirstName.trim()) {
        setErrorMessage('Main Member First Name is required');
        return;
      }
      if (!mmLastName.trim()) {
        setErrorMessage('Main Member Last Name is required');
        return;
      }
      if (!mmIdNumber.trim()) {
        setErrorMessage('Main Member ID Number is required');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('[NewClient] Creating new client');

      const clientData: Record<string, string> = {
        PatientID: "0",
        LastName: lastName,
        FirstName: firstName,
        NickName: "",
        IDNumber: idNumber,
        DateOfBirth: formatDate(dateOfBirth),
        Home: "",
        Cell: cellphoneNumber,
        Email: email,
        Gender: selectedGender?.id || '',
        TitleID: selectedTitle?.id || '',
        LanguageID: selectedLanguage?.id || '',
        BranchID: selectedBranch.id,
        MedicalAidID: '0',
        MedicalAidPlanID: medicalAidPlan,
        MemberNo: memberNumber,
        CompanyName: "",
        SpecialNote: "",
        MainMember: selectedMainMember?.id === 'Yes' ? '1' : '0',
        Intials: initials,
        DepCode: "",
        Occupation: "",
        Agree: "1"
      };

      console.log('[NewClient] Client data:', clientData);

      // Call API to create the primary patient
      const response = await createNewPatient(clientData);

      if (!response ||
        (typeof response === 'object' && (response.error || response.status === 'error' || response.success === false)) ||
        (typeof response === 'string' && response.toLowerCase().includes('error'))) {

        throw new Error(
          (typeof response === 'object' ? (response.message || response.error) : response)
          || 'The API failed to create the new client.'
        );
      }

      // Create main member as a SEPARATE patient record if applicable
      if (isNotMainMember) {
        console.log('[NewClient] User is not main member. Creating Main Member patient record...');
        const mainMemberData: Record<string, string> = {
          PatientID: "0",
          LastName: mmLastName,
          FirstName: mmFirstName,
          NickName: "",
          IDNumber: mmIdNumber,
          DateOfBirth: formatDate(mmDateOfBirth),
          Home: "",
          Cell: mmCellphoneNumber,
          Email: mmEmail,
          Gender: mmSelectedGender?.id || '',
          TitleID: mmSelectedTitle?.id || '',
          LanguageID: mmSelectedLanguage?.id || '',
          BranchID: mmSelectedBranch?.id || selectedBranch.id, // Fallback to main branch
          MedicalAidID: '0',
          MedicalAidPlanID: mmMedicalAidPlan,
          MemberNo: mmMemberNumber,
          CompanyName: "",
          SpecialNote: "",
          MainMember: "1",
          Intials: mmInitials,
          DepCode: "",
          Occupation: "",
          Agree: "1"
        };

        const mmResponse = await createNewPatient(mainMemberData);

        if (!mmResponse ||
          (typeof mmResponse === 'object' && (mmResponse.error || mmResponse.status === 'error' || mmResponse.success === false)) ||
          (typeof mmResponse === 'string' && mmResponse.toLowerCase().includes('error'))) {

          throw new Error(
            (typeof mmResponse === 'object' ? (mmResponse.message || mmResponse.error) : mmResponse)
            || 'The API failed to create the main member client.'
          );
        }
        console.log('[NewClient] Main Member created successfully:', mmResponse);
      }

      console.log('[NewClient] Client created successfully:', response);

      Alert.alert('Success', 'Client created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('[NewClient] Failed to create client:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create client. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderDropdown = (
    label: string,
    value: DropdownOption | null,
    options: DropdownOption[],
    onSelect: (option: DropdownOption) => void,
    dropdownKey: string
  ) => {
    const isOpen = activeDropdown === dropdownKey;
    const displayValue = value ? value.label : 'Select...';

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            { backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', borderColor: theme.colors.border },
          ]}
          onPress={() => setActiveDropdown(isOpen ? null : dropdownKey)}
        >
          <Text style={[styles.dropdownText, { color: value ? theme.colors.text : '#999' }]}>
            {displayValue}
          </Text>
          <IconSymbol
            ios_icon_name="chevron.down"
            android_material_icon_name="arrow-drop-down"
            size={20}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <Modal visible={isOpen} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActiveDropdown(null)}
          >
            <View style={[styles.dropdownModal, { backgroundColor: theme.colors.card }]}>
              <ScrollView style={styles.dropdownList}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: theme.colors.border },
                    ]}
                    onPress={() => {
                      onSelect(option);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                      {option.label}
                    </Text>
                    {value?.id === option.id && (
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name="check"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderTextInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string = '',
    keyboardType: 'default' | 'email-address' | 'numeric' | 'phone-pad' = 'default'
  ) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', color: theme.colors.text },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
        />
      </View>
    );
  };

  const renderDatePicker = (
    label: string,
    date: Date,
    showPicker: boolean,
    onPress: () => void,
    onChange: (event: any, selectedDate?: Date) => void
  ) => {
    const dateDisplay = formatDate(date);

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            { backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', borderColor: theme.colors.border },
          ]}
          onPress={onPress}
        >
          <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{dateDisplay}</Text>
          <IconSymbol
            ios_icon_name="calendar"
            android_material_icon_name="calendar-today"
            size={20}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Create Client',
          headerShown: true,
          presentation: 'modal',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Client Information</Text>

          {renderTextInput('First Name *', firstName, setFirstName, 'Enter first name')}
          {renderTextInput('Last Name *', lastName, setLastName, 'Enter last name')}
          {renderTextInput('Initials', initials, setInitials, 'Enter initials')}
          {renderTextInput('ID Number *', idNumber, setIdNumber, 'Enter ID number')}
          {renderDatePicker('Date of Birth', dateOfBirth, showDatePicker, () => setShowDatePicker(true), handleDateChange)}
          {renderTextInput('Cellphone Number *', cellphoneNumber, setCellphoneNumber, 'Enter cellphone number', 'phone-pad')}
          {renderTextInput('Email', email, setEmail, 'Enter email address', 'email-address')}
          {renderDropdown('Gender', selectedGender, GENDER_OPTIONS, setSelectedGender, 'gender')}
          {renderDropdown('Language', selectedLanguage, LANGUAGE_OPTIONS, setSelectedLanguage, 'language')}
          {renderDropdown('Title', selectedTitle, TITLE_OPTIONS, setSelectedTitle, 'title')}
          {renderDropdown('Branch *', selectedBranch, branches, setSelectedBranch, 'branch')}
          {renderTextInput('Medical Aid', medicalAid, setMedicalAid, 'Enter medical aid name')}
          {renderTextInput('Medical Aid Plan', medicalAidPlan, setMedicalAidPlan, 'Enter medical aid plan')}
          {renderTextInput('Member Number', memberNumber, setMemberNumber, 'Enter member number')}
          {renderDropdown('Main Member *', selectedMainMember, MAIN_MEMBER_OPTIONS, setSelectedMainMember, 'mainMember')}
        </View>

        {isNotMainMember && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Main Member Information</Text>

            {renderTextInput('First Name *', mmFirstName, setMmFirstName, 'Enter first name')}
            {renderTextInput('Last Name *', mmLastName, setMmLastName, 'Enter last name')}
            {renderTextInput('Initials', mmInitials, setMmInitials, 'Enter initials')}
            {renderTextInput('ID Number *', mmIdNumber, setMmIdNumber, 'Enter ID number')}
            {renderDatePicker('Date of Birth', mmDateOfBirth, showMmDatePicker, () => setShowMmDatePicker(true), handleMmDateChange)}
            {renderTextInput('Cellphone Number', mmCellphoneNumber, setMmCellphoneNumber, 'Enter cellphone number', 'phone-pad')}
            {renderTextInput('Email', mmEmail, setMmEmail, 'Enter email address', 'email-address')}
            {renderDropdown('Gender', mmSelectedGender, GENDER_OPTIONS, setMmSelectedGender, 'mmGender')}
            {renderDropdown('Language', mmSelectedLanguage, LANGUAGE_OPTIONS, setMmSelectedLanguage, 'mmLanguage')}
            {renderDropdown('Title', mmSelectedTitle, TITLE_OPTIONS, setMmSelectedTitle, 'mmTitle')}
            {renderDropdown('Branch', mmSelectedBranch, branches, setMmSelectedBranch, 'mmBranch')}
            {renderTextInput('Medical Aid', mmMedicalAid, setMmMedicalAid, 'Enter medical aid name')}
            {renderTextInput('Medical Aid Plan', mmMedicalAidPlan, setMmMedicalAidPlan, 'Enter medical aid plan')}
            {renderTextInput('Member Number', mmMemberNumber, setMmMemberNumber, 'Enter member number')}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.colors.primary },
            (!isFormValid || loading) && { opacity: 0.5 }
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Client</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Error Modal */}
      <Modal
        visible={errorMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorMessage(null)}
      >
        <TouchableOpacity
          style={styles.errorModalOverlay}
          activeOpacity={1}
          onPress={() => setErrorMessage(null)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.errorModalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="error"
              size={40}
              color="#E74C3C"
            />
            <Text style={[styles.errorModalTitle, { color: theme.colors.text }]}>Oops! Something went wrong.</Text>
            <Text style={[styles.errorModalMessage, { color: theme.colors.text }]}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setErrorMessage(null)}
            >
              <Text style={styles.errorModalButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  dropdown: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorModalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  errorModalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
