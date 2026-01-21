
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { LoadingButton } from '@/components/LoadingButton';

type AuthMode = 'login' | 'register' | 'reset';

export default function AuthScreen() {
  const theme = useTheme();
  const { login, register, resetPassword } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('audiologist');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    console.log('Auth form submitted, mode:', mode);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!username || !password) {
          Alert.alert('Error', 'Please enter username and password');
          return;
        }
        await login(username, password);
        console.log('Login successful, navigating to tabs');
        router.replace('/(tabs)/(home)/');
      } else if (mode === 'register') {
        if (!username || !email || !password || !fullName) {
          Alert.alert('Error', 'Please fill in all fields');
          return;
        }
        await register(username, email, password, fullName, role);
        console.log('Registration successful, navigating to tabs');
        router.replace('/(tabs)/(home)/');
      } else if (mode === 'reset') {
        if (!email) {
          Alert.alert('Error', 'Please enter your email');
          return;
        }
        await resetPassword(email);
        Alert.alert('Success', 'Password reset instructions sent to your email');
        setMode('login');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  }

  const isLoginMode = mode === 'login';
  const isRegisterMode = mode === 'register';
  const isResetMode = mode === 'reset';

  const titleText = isLoginMode ? 'Welcome Back' : isRegisterMode ? 'Create Account' : 'Reset Password';
  const subtitleText = isLoginMode
    ? 'Sign in to manage appointments'
    : isRegisterMode
    ? 'Join Heardat to get started'
    : 'Enter your email to reset password';
  const buttonText = isLoginMode ? 'Sign In' : isRegisterMode ? 'Register' : 'Send Reset Link';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
              <IconSymbol
                ios_icon_name="waveform.path.ecg"
                android_material_icon_name="hearing"
                size={48}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.logoText, { color: theme.colors.text }]}>Heardat</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{titleText}</Text>
            <Text style={[styles.subtitle, { color: theme.dark ? '#98989D' : '#666' }]}>
              {subtitleText}
            </Text>

            <View style={styles.form}>
              {!isResetMode && (
                <View style={styles.inputContainer}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={20}
                    color={theme.dark ? '#98989D' : '#666'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.dark ? '#1C1F26' : '#F8F9FA',
                        borderColor: theme.colors.border,
                      },
                    ]}
                    placeholder="Username"
                    placeholderTextColor={theme.dark ? '#98989D' : '#999'}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {(isRegisterMode || isResetMode) && (
                <View style={styles.inputContainer}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={20}
                    color={theme.dark ? '#98989D' : '#666'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.dark ? '#1C1F26' : '#F8F9FA',
                        borderColor: theme.colors.border,
                      },
                    ]}
                    placeholder="Email"
                    placeholderTextColor={theme.dark ? '#98989D' : '#999'}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              )}

              {!isResetMode && (
                <View style={styles.inputContainer}>
                  <IconSymbol
                    ios_icon_name="lock.fill"
                    android_material_icon_name="lock"
                    size={20}
                    color={theme.dark ? '#98989D' : '#666'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.dark ? '#1C1F26' : '#F8F9FA',
                        borderColor: theme.colors.border,
                      },
                    ]}
                    placeholder="Password"
                    placeholderTextColor={theme.dark ? '#98989D' : '#999'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {isRegisterMode && (
                <React.Fragment>
                  <View style={styles.inputContainer}>
                    <IconSymbol
                      ios_icon_name="person.text.rectangle.fill"
                      android_material_icon_name="badge"
                      size={20}
                      color={theme.dark ? '#98989D' : '#666'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: theme.colors.text,
                          backgroundColor: theme.dark ? '#1C1F26' : '#F8F9FA',
                          borderColor: theme.colors.border,
                        },
                      ]}
                      placeholder="Full Name"
                      placeholderTextColor={theme.dark ? '#98989D' : '#999'}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.roleContainer}>
                    <Text style={[styles.roleLabel, { color: theme.colors.text }]}>Role:</Text>
                    <View style={styles.roleButtons}>
                      {['audiologist', 'assistant', 'admin'].map((roleOption) => {
                        const isSelected = role === roleOption;
                        const roleDisplayText = roleOption.charAt(0).toUpperCase() + roleOption.slice(1);
                        return (
                          <TouchableOpacity
                            key={roleOption}
                            style={[
                              styles.roleButton,
                              {
                                backgroundColor: isSelected
                                  ? theme.colors.primary
                                  : theme.dark
                                  ? '#1C1F26'
                                  : '#F8F9FA',
                                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                              },
                            ]}
                            onPress={() => setRole(roleOption)}
                          >
                            <Text
                              style={[
                                styles.roleButtonText,
                                { color: isSelected ? '#FFFFFF' : theme.colors.text },
                              ]}
                            >
                              {roleDisplayText}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </React.Fragment>
              )}

              <LoadingButton
                onPress={handleSubmit}
                title={buttonText}
                loading={isLoading}
                variant="primary"
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              />

              <View style={styles.linksContainer}>
                {isLoginMode && (
                  <React.Fragment>
                    <TouchableOpacity onPress={() => setMode('reset')}>
                      <Text style={[styles.link, { color: theme.colors.primary }]}>
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMode('register')}>
                      <Text style={[styles.link, { color: theme.colors.primary }]}>
                        Create Account
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                )}

                {(isRegisterMode || isResetMode) && (
                  <TouchableOpacity onPress={() => setMode('login')}>
                    <Text style={[styles.link, { color: theme.colors.primary }]}>
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  formCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 48,
    fontSize: 16,
    borderWidth: 1,
  },
  roleContainer: {
    gap: 8,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
