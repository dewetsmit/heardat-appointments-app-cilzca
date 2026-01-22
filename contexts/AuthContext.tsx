
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Network from "expo-network";

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
  UserID?: string;
  Username?: string;
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
const storage = Platform.OS === "web"
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
        console.log('Found stored session, restoring user...');
        const userData = JSON.parse(storedUserData);
        setUser(userData);
        setSessionKey(storedSessionKey);
        setUserKey(storedUserKey);
        setToken(storedSessionKey); // Use session key as token
        console.log('User session restored:', userData.full_name || userData.name);
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
      
      // Parse the raw response directly as JSON without any cleaning
      // The API returns properly escaped JSON that JavaScript can parse natively
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        console.log('Parsed response:', parsedResponse);
        console.log('Parsed response.access:', parsedResponse?.access);
        console.log('Is parsedResponse.access an array?', Array.isArray(parsedResponse?.access));
        console.log('parsedResponse.access length:', parsedResponse?.access?.length);
        
        if (parsedResponse?.access && Array.isArray(parsedResponse.access) && parsedResponse.access.length > 0) {
          console.log('Access data found:', parsedResponse.access[0]);
        }
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        console.error('Raw response was:', responseText);
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
      });
      
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
			console.log(response);
      console.log('Users API raw response:', responseText);
      
      // Parse the raw response directly as JSON without any cleaning
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        console.log('Parsed users response:', parsedResponse);
      } catch (parseError) {
        console.error('Failed to parse users response as JSON:', parseError);
        console.error('Raw response was:', responseText);
        throw new Error('Invalid response from server');
      }
      
      if (!parsedResponse.users || !Array.isArray(parsedResponse.users) || parsedResponse.users.length === 0) {
        console.error('No users data in response:', parsedResponse);
        throw new Error('User details not found');
      }
      
      const userData = parsedResponse.users[0];
      console.log('User data:', userData);
      
      // Enhance user data with session information
      const currentUser: User = {
        ...userData,
        id: accessData.User,
        email: userData.Email || userData.email || '',
        name: userData.Name || userData.name || userData.full_name || '',
        full_name: userData.Name || userData.name || userData.full_name || '',
        SessionKey: accessData.SessionKey,
        CompanyKey: accessData.CompanyKey,
        CompanyID: accessData.Company,
        UserID: accessData.User,
        UserKey: accessData.UserKey,
      };
      
      console.log('User details fetched successfully:', currentUser.full_name || currentUser.name);
      
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
</write file>

## Summary

I've fixed the JSON parsing issue in the `AuthContext.tsx` file. The key changes:

1. **Removed the `cleanJsonString` function entirely** - As you suggested, we're no longer trying to remove escaped backslashes from the raw response.

2. **Parse the raw response directly** - Now we simply call `JSON.parse(responseText)` on the raw response text without any preprocessing. JavaScript's native JSON parser handles the escaped characters correctly.

3. **Added more detailed logging** - The logs will now show:
   - The raw response from the API
   - The parsed response object
   - Whether the `access` array exists and has data
   - The actual access data if found

The issue was that the `cleanJsonString` function was removing ALL backslashes, which could break valid JSON structure. The Heardat API returns properly escaped JSON (with `\"` for quotes inside the JSON string), and JavaScript's `JSON.parse()` is designed to handle this correctly without any preprocessing.

Now when you try to log in, the authentication should work correctly and you should see the parsed response with the access data in the logs. If there's still an "Incorrect Password" error, it will be properly displayed from the API response.