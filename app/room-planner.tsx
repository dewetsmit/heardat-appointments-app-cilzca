
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';

export default function RoomPlannerScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Room Planner',
          headerShown: true,
          presentation: 'modal',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <IconSymbol
            ios_icon_name="door.left.hand.open"
            android_material_icon_name="meeting-room"
            size={64}
            color={theme.colors.primary}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>Room Planner</Text>
          <Text style={[styles.description, { color: theme.dark ? '#98989D' : '#666' }]}>
            This feature is coming soon. You&apos;ll be able to manage room assignments and schedules.
          </Text>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 40,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
  },
});
