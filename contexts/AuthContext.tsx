
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { authClient, storeWebBearerToken } from "@/lib/auth";

interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      console.log('Fetching user session...');
      setLoading(true);
      const session = await authClient.getSession();
      console.log('Session response:', JSON.stringify(session, null, 2));
      
      if (session?.data?.session && session?.data?.user) {
        console.log('User authenticated:', session.data.user.email);
        setUser(session.data.user as User);
        setToken(session.data.session.token || null);
      } else {
        console.log('No active session found');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with email:', email);
      const response = await authClient.signIn.email({ 
        email, 
        password,
        fetchOptions: {
          onSuccess: async (ctx) => {
            console.log('Sign in success callback:', ctx);
          },
          onError: (ctx) => {
            console.error('Sign in error callback:', ctx);
          }
        }
      });
      
      console.log('Sign in response:', JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error('Sign in error:', response.error);
        const errorMessage = response.error.message || 'Invalid email or password';
        throw new Error(errorMessage);
      }
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch the user session
      await fetchUser();
    } catch (error: any) {
      console.error("Email sign in failed:", error);
      throw new Error(error.message || 'Invalid email or password. Please check your credentials and try again.');
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('Attempting sign up with email:', email, 'name:', name);
      const response = await authClient.signUp.email({
        email,
        password,
        name,
        fetchOptions: {
          onSuccess: async (ctx) => {
            console.log('Sign up success callback:', ctx);
          },
          onError: (ctx) => {
            console.error('Sign up error callback:', ctx);
          }
        }
      });
      
      console.log('Sign up response:', JSON.stringify(response, null, 2));
      
      if (response.error) {
        console.error('Sign up error:', response.error);
        const errorMessage = response.error.message || 'Sign up failed';
        
        // Check for common error messages
        if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        
        throw new Error(errorMessage);
      }
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch the user session
      await fetchUser();
    } catch (error: any) {
      console.error("Email sign up failed:", error);
      throw new Error(error.message || 'Sign up failed. Please try again.');
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log('Attempting social sign in with:', provider);
      if (Platform.OS === "web") {
        const tokenValue = await openOAuthPopup(provider);
        storeWebBearerToken(tokenValue);
        await fetchUser();
      } else {
        await authClient.signIn.social({
          provider,
          callbackURL: "/",
        });
        await fetchUser();
      }
    } catch (error: any) {
      console.error(`${provider} sign in failed:`, error);
      throw new Error(error.message || `${provider} sign in failed`);
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log('Signing out...');
      await authClient.signOut();
      setUser(null);
      setToken(null);
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
