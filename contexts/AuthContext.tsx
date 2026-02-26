
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Network from "expo-network";
import { getUserAppointments, formatDateForAPI } from "@/utils/api";

interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  image?: string;
  // Heardat specific fields
  UserKey?: string;
  SessionKey?: string;
  CompanyKey?: string;
  CompanyID?: string;
  BranchID?: string;
  UserID?: string;
  Username?: string;
  Login?: string;
  Email?: string;
  role?: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  sessionKey: string | null;
  userKey: string | null;
  loading: boolean;
  signInWithEmail: (username: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Heardat API configuration
const HEARDAT_API_URL = "https://www.heardatonline.co.za/api";

// Platform-specific storage
export const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      deleteItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    }
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

// Helper to get user's IP address
async function getUserIP(): Promise<string> {
  try {
    const ipAddress = await Network.getIpAddressAsync();
    console.log('User IP address:', ipAddress);
    return ipAddress;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return '0.0.0.0'; // Fallback IP
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      console.log('Fetching user session from storage...');
      setLoading(true);
      
      const storedSessionKey = await storage.getItem("session_key");
      const storedUserKey = await storage.getItem("UserKey");
      const storedUserData = await storage.getItem("CurrentUser");
      
      if (storedSessionKey && storedUserKey && storedUserData) {
        console.log('Found stored session, verifying with API...');
        
        // Verify session is still valid by making a test API call
        try {
          const userData = JSON.parse(storedUserData);
          const today = new Date();
          const todayStr = formatDateForAPI(today);
          
          // Try to fetch appointments to verify session is valid
          const params = new URLSearchParams({
            UserID: userData.UserID || '',
            Key: storedUserKey,
            Userkey: storedUserKey,
            Companykey: userData.CompanyKey || '',
            Sessionkey: storedSessionKey,
            DateFrom: todayStr,
            DateTo: todayStr,
          });
          
          const appointmentsUrl = `${HEARDAT_API_URL}/Appointments?${params.toString()}`;
          const response = await fetch(appointmentsUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          if (!response.ok) {
            console.log('Session verification failed - API returned error:', response.status);
            throw new Error('Session expired');
          }
          
          const responseText = await response.text();
          const parsedResponse = JSON.parse(JSON.parse(responseText).toString());
          
          // Check if the response indicates an expired session
          if (parsedResponse.Error && parsedResponse.Error.toLowerCase().includes('session')) {
            console.log('Session expired - API returned session error:', parsedResponse.Error);
            throw new Error('Session expired');
          }
          
          // Session is valid, restore user
          console.log('Session verified successfully');
          setUser(userData);
          setSessionKey(storedSessionKey);
          setUserKey(storedUserKey);
          setToken(storedSessionKey);
          console.log('User session restored:', userData.full_name || userData.name);
        } catch (verifyError) {
          console.log('Session verification failed:', verifyError);
          // Clear expired session
          await storage.deleteItem("session_key");
          await storage.deleteItem("UserKey");
          await storage.deleteItem("Username");
          await storage.deleteItem("Password");
          await storage.deleteItem("CurrentUser");
          
          setUser(null);
          setToken(null);
          setSessionKey(null);
          setUserKey(null);
        }
      } else {
        console.log('No active session found');
        setUser(null);
        setToken(null);
        setSessionKey(null);
        setUserKey(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      setToken(null);
      setSessionKey(null);
      setUserKey(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (username: string, password: string) => {
    try {
      console.log('Attempting sign in with username:', username);
      setLoading(true);
      
      // Get user's IP address
      const ipAddress = await getUserIP();
      
      // Build query parameters
      const params = new URLSearchParams({
        Login: username,
        Password: password,
        IP: ipAddress,
      });
      
      // Call Heardat Access API
      const accessUrl = `${HEARDAT_API_URL}/Access?${params.toString()}`;
      console.log('Calling Heardat Access API...');
      
      const response = await fetch(accessUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Access API error:', response.status, response.statusText);
        throw new Error('Invalid username or password');
      }
      
      const responseText = await response.text();
      console.log('Access API raw response:', responseText);
      
      // Parse the response as JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(JSON.parse(responseText).toString());
        console.log('Parsed response:', parsedResponse.toString());
        
        // Wait a moment for the object to be fully constructed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('After timeout - Parsed response.access:', parsedResponse.access);

      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }
      
      // Check if access array exists and has items
      console.log('Checking access data...');
      console.log('  - parsedResponse.access exists?', !!parsedResponse.access);
      console.log('  - Is array?', Array.isArray(parsedResponse.access));
      console.log('  - Has items?', parsedResponse.access?.length > 0);
      
      if (!parsedResponse.access || !Array.isArray(parsedResponse.access) || parsedResponse.access.length === 0) {
        console.error('No access data in response:', parsedResponse);
        throw new Error('Invalid username or password');
      }
      
      console.log('Access data validation passed!');
      
      // Get the first access item
      const accessData = parsedResponse.access[0];
      console.log('Access data:', accessData);
      
      // Check the Error field - if it says "SUCCESS", authentication is successful
      if (accessData.Error !== 'SUCCESS') {
        console.error('Authentication failed. Error field:', accessData.Error);
        throw new Error(accessData.Error || 'Authentication failed - invalid credentials');
      }
      
      // Verify SessionKey and UserKey exist
      if (!accessData.SessionKey || !accessData.UserKey) {
        console.error('Missing SessionKey or UserKey in access data:', accessData);
        throw new Error('Authentication failed - missing session data');
      }
      
      const sessionKeyValue = accessData.SessionKey;
      const userKeyValue = accessData.UserKey;
      
      console.log('Authentication successful!');
      console.log('SessionKey:', sessionKeyValue);
      console.log('UserKey:', userKeyValue);
      
      // Store authentication data
      await storage.setItem("session_key", sessionKeyValue);
      await storage.setItem("UserKey", userKeyValue);
      await storage.setItem("Username", username);
      await storage.setItem("Password", password);
      
      setSessionKey(sessionKeyValue);
      setUserKey(userKeyValue);
      setToken(sessionKeyValue);
      
      // Now fetch user details
      console.log('Fetching user details...');
      await fetchUserDetails({
        User: accessData.User,
        UserKey: userKeyValue,
        CompanyKey: accessData.CompanyKey,
        SessionKey: sessionKeyValue,
        Company: accessData.Company,
        Branch: accessData.Branch,
      });
      
      // Fetch today's appointments for the current user
      console.log('Fetching today\'s appointments...');
      try {
        const today = new Date();
        const todayStr = formatDateForAPI(today);
        
        const appointmentsData = await getUserAppointments(todayStr, todayStr);
        console.log('Today\'s appointments fetched:', appointmentsData);
      } catch (appointmentError) {
        console.error('Failed to fetch appointments on login:', appointmentError);
        // Don't fail login if appointments fetch fails
      }
      
      console.log('Sign in complete - user authenticated successfully');
    } catch (error: any) {
      console.error("Email sign in failed:", error);
      // Clear any partial data
      await storage.deleteItem("session_key");
      await storage.deleteItem("UserKey");
      await storage.deleteItem("Username");
      await storage.deleteItem("Password");
      await storage.deleteItem("CurrentUser");
      
      setUser(null);
      setToken(null);
      setSessionKey(null);
      setUserKey(null);
      
      throw new Error(error.message || 'Invalid username or password. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (accessData: any) => {
    try {
      const params = new URLSearchParams({
        UserID: accessData.User,
        Key: accessData.UserKey,
        Userkey: accessData.UserKey,
        Companykey: accessData.CompanyKey,
        Sessionkey: accessData.SessionKey,
      });
      
      const usersUrl = `${HEARDAT_API_URL}/Users?${params.toString()}`;
      console.log('Calling Heardat Users API...');
      
      const response = await fetch(usersUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Users API error:', response.status, response.statusText);
        throw new Error('Failed to fetch user details');
      }
      
      const responseText = await response.text();
      console.log('Users API raw response:', responseText);
      
      // Parse the response as JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(JSON.parse(responseText).toString());
        console.log('Parsed users response:', parsedResponse);
      } catch (parseError) {
        console.error('Failed to parse users response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!parsedResponse.users || !Array.isArray(parsedResponse.users) || parsedResponse.users.length === 0) {
        console.error('No users data in response:', parsedResponse);
        throw new Error('User details not found');
      }
      
      const userData = parsedResponse.users[0];
      console.log('User data:', userData);
      
      // Enhance user data with session information
      // Map Login property to username and Email property to email
      const currentUser: User = {
        ...userData,
        id: accessData.User,
        email: userData.Email || userData.email || '',
        Email: userData.Email || userData.email || '',
        name: userData.Name || userData.name || userData.full_name || '',
        full_name: userData.Name || userData.name || userData.full_name || '',
        username: userData.Login || userData.Username || '',
        Login: userData.Login || userData.Username || '',
        SessionKey: accessData.SessionKey,
        CompanyKey: accessData.CompanyKey,
        CompanyID: accessData.Company,
        BranchID: accessData.Branch,
        UserID: accessData.User,
        UserKey: accessData.UserKey,
      };
      
      console.log('User details fetched successfully:', currentUser.full_name || currentUser.name);
      console.log('Username (Login):', currentUser.username);
      console.log('Email:', currentUser.email);
      
      // Store user data
      await storage.setItem("CurrentUser", JSON.stringify(currentUser));
      
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('Sign up is not supported with Heardat API');
      throw new Error('Sign up is not available. Please contact your administrator to create an account.');
    } catch (error: any) {
      console.error("Email sign up failed:", error);
      throw new Error(error.message || 'Sign up failed. Please try again.');
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('Google sign in is not supported with Heardat API');
      throw new Error('Google sign in is not available. Please use your username and password.');
    } catch (error: any) {
      console.error('Google sign in failed:', error);
      throw new Error(error.message || 'Google sign in failed');
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('Apple sign in is not supported with Heardat API');
      throw new Error('Apple sign in is not available. Please use your username and password.');
    } catch (error: any) {
      console.error('Apple sign in failed:', error);
      throw new Error(error.message || 'Apple sign in failed');
    }
  };

  const signInWithGitHub = async () => {
    try {
      console.log('GitHub sign in is not supported with Heardat API');
      throw new Error('GitHub sign in is not available. Please use your username and password.');
    } catch (error: any) {
      console.error('GitHub sign in failed:', error);
      throw new Error(error.message || 'GitHub sign in failed');
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Clear all stored data
      await storage.deleteItem("session_key");
      await storage.deleteItem("UserKey");
      await storage.deleteItem("Username");
      await storage.deleteItem("Password");
      await storage.deleteItem("CurrentUser");
      
      setUser(null);
      setToken(null);
      setSessionKey(null);
      setUserKey(null);
      
      console.log('Sign out successful');
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionKey,
        userKey,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
