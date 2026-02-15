
import "react-native-reanimated";
import React, { useEffect, useCallback } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppointmentProvider } from "@/contexts/AppointmentContext";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  const handleAuthRedirect = useCallback(() => {
    if (loading || !loaded) {
      console.log('Auth loading or fonts loading...');
      return;
    }

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'auth-popup' || segments[0] === 'auth-callback';

    console.log('Auth state changed:', { user: !!user, inAuthGroup, segments });

    // Redirect logic: If user is logged in, go to calendar. If not, go to auth.
    if (user && inAuthGroup) {
      console.log('User authenticated, redirecting to calendar');
      router.replace('/(tabs)/calendar');
    } else if (!user && !inAuthGroup) {
      console.log('User not authenticated (session expired), redirecting to auth');
      router.replace('/auth');
      // Show session expired message after a brief delay to ensure navigation completes
      setTimeout(() => {
        Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
      }, 500);
    }
  }, [user, segments, loading, loaded, router]);

  useEffect(() => {
    handleAuthRedirect();
  }, [handleAuthRedirect]);

  if (!loaded || loading) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "#4A90E2",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "#4A90E2",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };

  return (
    <React.Fragment>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <WidgetProvider>
          <AppointmentProvider>
            <GestureHandlerRootView>
              <Stack>
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="create-appointment" 
                  options={{ 
                    presentation: 'modal',
                    title: 'Create Appointment',
                  }} 
                />
                <Stack.Screen 
                  name="new-client" 
                  options={{ 
                    presentation: 'modal',
                    title: 'New Client',
                  }} 
                />
                <Stack.Screen 
                  name="search-client" 
                  options={{ 
                    presentation: 'modal',
                    title: 'Search Client',
                  }} 
                />
                <Stack.Screen 
                  name="patient-detail" 
                  options={{ 
                    presentation: 'modal',
                    title: 'Patient Details',
                  }} 
                />
                <Stack.Screen 
                  name="room-planner" 
                  options={{ 
                    presentation: 'modal',
                    title: 'Room Planner',
                  }} 
                />
              </Stack>
              <SystemBars style={"auto"} />
            </GestureHandlerRootView>
          </AppointmentProvider>
        </WidgetProvider>
      </ThemeProvider>
    </React.Fragment>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
